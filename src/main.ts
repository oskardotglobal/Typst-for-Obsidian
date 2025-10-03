import {
  Plugin,
  addIcon,
  Notice,
  Platform,
  requestUrl,
  normalizePath,
} from "obsidian";
import { TypstView } from "./TypstView";
import { registerCommands } from "./commands";
import { TypstIcon } from "./util";
import { TypstSettings, DEFAULT_SETTINGS, TypstSettingTab } from "./settings";
import { PackageManager } from "./PackageManager";
// @ts-ignore
import CompilerWorker from "./compiler.worker.ts";
// @ts-ignore
import untar from "js-untar";
import { decompressSync } from "fflate";
import { WorkerRequest, CompileImageCommand, CompileSvgCommand } from "./types";

declare const PLUGIN_VERSION: string;

export default class TypstForObsidian extends Plugin {
  settings: TypstSettings;
  packageManager: PackageManager;

  compilerWorker: Worker;
  textEncoder: TextEncoder;
  fs: any;
  wasmPath: string;
  pluginPath: string;
  packagePath: string;

  async onload() {
    console.log("🔵 TypstForObsidian: Loading Typst Renderer");

    this.textEncoder = new TextEncoder();
    await this.loadSettings();

    this.pluginPath = this.app.vault.configDir + "/plugins/typst-for-obsidian/";
    this.packagePath = this.pluginPath + "packages/";
    this.wasmPath = this.pluginPath + "obsidian_typst_bg.wasm";

    console.log("🔵 TypstForObsidian: Creating compiler worker");
    this.compilerWorker = new CompilerWorker() as Worker;

    if (!(await this.app.vault.adapter.exists(this.wasmPath))) {
      new Notice(
        "Typst Renderer: Downloading required web assembly component!",
        5000
      );
      try {
        await this.fetchWasm();
        new Notice("Typst Renderer: Web assembly component downloaded!", 5000);
      } catch (error) {
        new Notice("Typst Renderer: Failed to fetch component: " + error, 0);
        console.error("Typst Renderer: Failed to fetch component: " + error);
      }
    }

    console.log("🔵 TypstForObsidian: Posting startup message to worker");
    this.compilerWorker.postMessage({
      type: "startup",
      data: {
        wasm: URL.createObjectURL(
          new Blob([await this.app.vault.adapter.readBinary(this.wasmPath)], {
            type: "application/wasm",
          })
        ),
        // @ts-ignore
        basePath: this.app.vault.adapter.basePath,
        packagePath: this.packagePath,
      },
    });

    if (Platform.isDesktopApp) {
      console.log(
        "🔵 TypstForObsidian: Desktop app, enabling SharedArrayBuffer"
      );
      this.compilerWorker.postMessage({
        type: "canUseSharedArrayBuffer",
        data: true,
      });
      this.fs = require("fs");

      // Wait for worker to be ready before loading fonts
      this.compilerWorker.addEventListener("message", (event) => {
        if (event.data?.type === "ready") {
          this.loadFonts();
        }
      });
    } else {
      // Mobile - set up packages
      await this.app.vault.adapter.mkdir(this.packagePath);
      const packages = await this.getPackageList();
      this.compilerWorker.postMessage({ type: "packages", data: packages });
    }

    addIcon("typst-file", TypstIcon);
    this.packageManager = new PackageManager(this.app);
    this.registerExtensions(["typ"], "typst-view");
    this.registerView("typst-view", (leaf) => new TypstView(leaf, this));
    registerCommands(this);
    this.addSettingTab(new TypstSettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on("css-change", () => {
        this.onThemeChange();
      })
    );

    console.log("🔵 TypstForObsidian: onload() completed successfully");
  }

  private async loadFonts() {
    console.log("🔵 TypstForObsidian: Loading system fonts");
    try {
      let fonts = await Promise.all(
        //@ts-expect-error
        ((await window.queryLocalFonts()) as Array)
          .filter((font: { family: string; name: string }) =>
            this.settings.fontFamilies.includes(font.family.toLowerCase())
          )
          .map(
            async (font: { blob: () => Promise<Blob> }) =>
              await (await font.blob()).arrayBuffer()
          )
      );
      console.log(`🔵 TypstForObsidian: Loaded ${fonts.length} fonts`);
      this.compilerWorker.postMessage({ type: "fonts", data: fonts }, fonts);
    } catch (error) {
      console.warn("🟡 TypstForObsidian: Could not load system fonts:", error);
    }
  }

  private onThemeChange() {
    // Find all open Typst views and recompile if they are in reading mode
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof TypstView) {
        const typstView = leaf.view as TypstView;
        typstView.recompileIfInReadingMode();
      }
    });
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private async fetchWasm() {
    // Read the WASM file from the plugin's pkg directory
    try {
      const wasmSourcePath = this.pluginPath + "pkg/obsidian_typst_bg.wasm";
      const wasmData = await this.app.vault.adapter.readBinary(wasmSourcePath);
      await this.app.vault.adapter.mkdir(this.pluginPath);
      await this.app.vault.adapter.writeBinary(this.wasmPath, wasmData);
    } catch (error) {
      console.error("Failed to fetch WASM:", error);
      throw error;
    }
  }

  private async getPackageList(): Promise<string[]> {
    const packages: string[] = [];
    try {
      if (await this.app.vault.adapter.exists(this.packagePath)) {
        const entries = await this.app.vault.adapter.list(this.packagePath);
        for (const entry of entries.folders) {
          packages.push(entry.split("/").slice(-3).join("/"));
        }
      }
    } catch (error) {
      console.error("Failed to get package list:", error);
    }
    return packages;
  }

  // Enhanced compilation method that handles WorkerRequests
  async compileToSvg(
    source: string,
    path: string = "/main.typ"
  ): Promise<string> {
    console.log("🔶 Main: compileToSvg called");

    // Apply styling and layout functions like the old implementation
    let finalSource = source;

    // Add layout functions if enabled
    if (this.settings.useDefaultLayoutFunctions) {
      finalSource = this.settings.customLayoutFunctions + "\n" + source;
    }

    finalSource = finalSource + "#linebreak()\n#linebreak()"; // linebreak to make svg not cut off

    console.log(finalSource);

    // Replace all theme variables
    finalSource = finalSource.replace(
      /%THEMECOLOR%/g,
      this.getThemeTextColor()
    );
    finalSource = finalSource.replace(/%FONTSIZE%/g, this.getCssFontSize());
    finalSource = finalSource.replace(/%ACCENTCOLOR%/g, this.getAccentColor());
    finalSource = finalSource.replace(/%FAINTCOLOR%/g, this.getFaintColor());
    finalSource = finalSource.replace(/%MUTEDCOLOR%/g, this.getMutedColor());
    finalSource = finalSource.replace(/%BGCOLOR%/g, this.getThemeBGColor());
    finalSource = finalSource.replace(
      /%BGPRIMARY%/g,
      this.getBackgroundPrimary()
    );
    finalSource = finalSource.replace(
      /%BGPRIMARYALT%/g,
      this.getBackgroundPrimaryAlt()
    );
    finalSource = finalSource.replace(
      /%BGSECONDARY%/g,
      this.getBackgroundSecondary()
    );
    finalSource = finalSource.replace(
      /%BGSECONDARYALT%/g,
      this.getBackgroundSecondaryAlt()
    );
    finalSource = finalSource.replace(
      /%SUCCESSCOLOR%/g,
      this.getSuccessColor()
    );
    finalSource = finalSource.replace(
      /%WARNINGCOLOR%/g,
      this.getWarningColor()
    );
    finalSource = finalSource.replace(/%ERRORCOLOR%/g, this.getErrorColor());
    finalSource = finalSource.replace(
      /%HEADINGCOLOR%/g,
      this.getHeadingColor()
    );
    finalSource = finalSource.replace(/%FONTTEXT%/g, this.getFontText());
    finalSource = finalSource.replace(/%FONTMONO%/g, this.getFontMonospace());
    finalSource = finalSource.replace(/%BORDERWIDTH%/g, this.getBorderWidth());

    console.log(
      "🔶 Main: Applied layout functions, theme color, and font size"
    );

    const message = {
      type: "compile",
      data: {
        format: "svg",
        path,
        source: finalSource,
      },
    };

    console.log("🔶 Main: Posting SVG compile message to worker");
    this.compilerWorker.postMessage(message);

    while (true) {
      const result = await new Promise<any>((resolve, reject) => {
        const listener = (ev: MessageEvent) => {
          // Ignore ready signals
          if (ev.data && ev.data.type === "ready") {
            console.log("🔶 Main: Ignoring ready signal");
            return; // Don't remove listener, keep waiting
          }

          remove();
          resolve(ev.data);
        };

        const errorListener = (error: ErrorEvent) => {
          console.error("🔴 Main: Worker error during compile:", error);
          remove();
          reject(error);
        };

        const remove = () => {
          this.compilerWorker.removeEventListener("message", listener);
          this.compilerWorker.removeEventListener("error", errorListener);
        };

        this.compilerWorker.addEventListener("message", listener);
        this.compilerWorker.addEventListener("error", errorListener);
      });

      // Handle different response types
      if (typeof result === "string") {
        console.log("🔶 Main: Got SVG string result, optimizing for display");
        // Optimize SVG for better display rendering

        // Then quantize for pixel-perfect rendering

        // Then quantize (optional, but helps)
        const processedSvg = this.quantizeSVG(result, 0.05);
        return processedSvg;
        // return result;
        // const optimizedSvg = this.optimizeSvgForDisplay(result);
        // return optimizedSvg;
      } else if (result && result.error) {
        throw new Error(result.error);
      } else if (result && result.buffer && result.path) {
        // This is a WorkerRequest - handle it
        console.log("🔶 Main: Got WorkerRequest for path:", result.path);
        await this.handleWorkerRequest(result);
        // Continue the loop to wait for the next response
        continue;
      } else {
        console.error("🔴 Main: Unexpected response format:", result);
        throw new Error("Invalid response format");
      }
    }
  }

  // Enhanced compilation method for PDF that mirrors compileToSvg
  async compileToPdf(
    source: string,
    path: string = "/main.typ",
    compileType: "internal" | "export" = "internal"
  ): Promise<Uint8Array> {
    console.log("🔶 Main: compileToPdf called");

    // Apply styling and layout functions
    let finalSource = source;

    // Add PDF export layout functions if enabled and this is an export
    if (
      compileType === "export" &&
      this.settings.usePdfLayoutFunctions &&
      this.settings.pdfLayoutFunctions.trim()
    ) {
      finalSource = this.settings.pdfLayoutFunctions + "\n" + source;
    }
    // Add layout functions if enabled
    else if (this.settings.useDefaultLayoutFunctions) {
      finalSource = this.settings.customLayoutFunctions + "\n" + source;
    } else {
      finalSource = "#set page(margin: (x: 0.25em, y: 0.25em))\n" + source;
    }

    // Add line breaks only for internal (non-export) mode
    if (compileType === "internal") {
      finalSource = finalSource + "#linebreak()\n#linebreak()";
    }

    // Replace all theme variables
    finalSource = finalSource.replace(
      /%THEMECOLOR%/g,
      this.getThemeTextColor()
    );
    finalSource = finalSource.replace(/%FONTSIZE%/g, this.getCssFontSize());
    finalSource = finalSource.replace(/%BGCOLOR%/g, this.getThemeBGColor());
    finalSource = finalSource.replace(
      /%LINEWIDTH%/g,
      this.pxToPt(this.getFileLineWidth())
    );
    finalSource = finalSource.replace(/%ACCENTCOLOR%/g, this.getAccentColor());
    finalSource = finalSource.replace(/%FAINTCOLOR%/g, this.getFaintColor());
    finalSource = finalSource.replace(/%MUTEDCOLOR%/g, this.getMutedColor());
    finalSource = finalSource.replace(
      /%BGPRIMARY%/g,
      this.getBackgroundPrimary()
    );
    finalSource = finalSource.replace(
      /%BGPRIMARYALT%/g,
      this.getBackgroundPrimaryAlt()
    );
    finalSource = finalSource.replace(
      /%BGSECONDARY%/g,
      this.getBackgroundSecondary()
    );
    finalSource = finalSource.replace(
      /%BGSECONDARYALT%/g,
      this.getBackgroundSecondaryAlt()
    );
    finalSource = finalSource.replace(
      /%SUCCESSCOLOR%/g,
      this.getSuccessColor()
    );
    finalSource = finalSource.replace(
      /%WARNINGCOLOR%/g,
      this.getWarningColor()
    );
    finalSource = finalSource.replace(/%ERRORCOLOR%/g, this.getErrorColor());
    finalSource = finalSource.replace(
      /%HEADINGCOLOR%/g,
      this.getHeadingColor()
    );
    finalSource = finalSource.replace(/%FONTTEXT%/g, this.getFontText());
    finalSource = finalSource.replace(/%FONTMONO%/g, this.getFontMonospace());
    finalSource = finalSource.replace(/%BORDERWIDTH%/g, this.getBorderWidth());

    console.log(
      "🔶 Main: Applied layout functions, theme color, and font size for PDF"
    );

    const message = {
      type: "compile",
      data: {
        format: "pdf",
        path,
        source: finalSource,
      },
    };

    console.log("🔶 Main: Posting PDF compile message to worker");
    this.compilerWorker.postMessage(message);

    while (true) {
      const result = await new Promise<any>((resolve, reject) => {
        const listener = (ev: MessageEvent) => {
          // Ignore ready signals
          if (ev.data && ev.data.type === "ready") {
            console.log("🔶 Main: Ignoring ready signal");
            return; // Don't remove listener, keep waiting
          }

          remove();
          resolve(ev.data);
        };

        const errorListener = (error: ErrorEvent) => {
          console.error("🔴 Main: Worker error during PDF compile:", error);
          remove();
          reject(error);
        };

        const remove = () => {
          this.compilerWorker.removeEventListener("message", listener);
          this.compilerWorker.removeEventListener("error", errorListener);
        };

        this.compilerWorker.addEventListener("message", listener);
        this.compilerWorker.addEventListener("error", errorListener);
      });

      // Handle different response types
      if (
        result instanceof Uint8Array ||
        (result &&
          result.constructor &&
          result.constructor.name === "Uint8Array")
      ) {
        console.log("🔶 Main: Got PDF bytes result");

        return result;
      } else if (result && result.error) {
        throw new Error(result.error);
      } else if (result && result.buffer && result.path) {
        // This is a WorkerRequest - handle it
        console.log("🔶 Main: Got WorkerRequest for path:", result.path);
        await this.handleWorkerRequest(result);
        // Continue the loop to wait for the next response
        continue;
      } else {
        console.error("🔴 Main: Unexpected PDF response format:", result);
        throw new Error("Invalid PDF response format");
      }
    }
  }

  private pxToPt(px: string): string {
    const pxValue = parseFloat(px.replace("px", ""));
    // Convert for 1.5 scale: 700px container / 1.5 scale = 466.67pt
    const ptValue = pxValue / 1.5;
    console.log(
      `🔍 Main: Converting ${px} → ${pxValue}px → ${ptValue}pt (for 1.5 scale)`
    );
    return `${ptValue}`;
  }

  quantizeSVG(svg: string, precision = 0.05) {
    // Regex to match numbers (including decimals and scientific notation)
    const numberRegex = /-?\d+\.?\d*(?:[eE][+-]?\d+)?/g;

    // Function to round to nearest precision
    const quantize = (num: string) => {
      const value = parseFloat(num);
      if (isNaN(value)) return num;
      return (Math.round(value / precision) * precision).toFixed(
        precision >= 1 ? 0 : precision.toString().split(".")[1]?.length || 0
      );
    };

    // Attributes that contain coordinate values
    const coordAttrs = [
      "x",
      "y",
      "x1",
      "y1",
      "x2",
      "y2",
      "cx",
      "cy",
      "r",
      "rx",
      "ry",
      "width",
      "height",
      "dx",
      "dy",
      "offset",
    ];

    // Build regex for attributes
    const attrPattern = coordAttrs.join("|");
    const attrRegex = new RegExp(`(${attrPattern})=["']([^"']+)["']`, "g");

    // Process attribute values
    let result = svg.replace(attrRegex, (match, attr, value) => {
      const quantized = value.replace(numberRegex, quantize);
      return `${attr}="${quantized}"`;
    });

    // Process path data (d attribute)
    result = result.replace(/\bd=["']([^"']+)["']/g, (match, pathData) => {
      const quantized = pathData.replace(numberRegex, quantize);
      return `d="${quantized}"`;
    });

    // Process points attribute (for polyline/polygon)
    result = result.replace(/\bpoints=["']([^"']+)["']/g, (match, points) => {
      const quantized = points.replace(numberRegex, quantize);
      return `points="${quantized}"`;
    });

    // Process transform attribute
    result = result.replace(
      /\btransform=["']([^"']+)["']/g,
      (match, transform) => {
        const quantized = transform.replace(numberRegex, quantize);
        return `transform="${quantized}"`;
      }
    );

    // Process style attribute coordinates
    result = result.replace(/\bstyle=["']([^"']+)["']/g, (match, style) => {
      const quantized = style.replace(
        /(stroke-width|font-size):\s*(-?\d+\.?\d*)/g,
        (m: string, prop: string, val: string) => `${prop}: ${quantize(val)}`
      );
      return `style="${quantized}"`;
    });

    return result;
  }

  private cssColorToHex(color: string): string {
    // Already hex format
    if (color.startsWith("#")) {
      return color.slice(1);
    }

    // Handle rgb/rgba format: rgb(r, g, b) or rgba(r, g, b, a)
    const rgbMatch = color.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/
    );
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);

      const toHex = (n: number) => {
        const hex = n.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      };

      return toHex(r) + toHex(g) + toHex(b);
    }

    // Handle hsl/hsla format: hsl(h, s%, l%) or hsla(h, s%, l%, a)
    const hslMatch = color.match(
      /hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*[\d.]+)?\)/
    );
    if (hslMatch) {
      const h = parseInt(hslMatch[1]) / 360;
      const s = parseInt(hslMatch[2]) / 100;
      const l = parseInt(hslMatch[3]) / 100;

      const hslToRgb = (h: number, s: number, l: number) => {
        let r, g, b;

        if (s === 0) {
          r = g = b = l;
        } else {
          const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
          };

          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          r = hue2rgb(p, q, h + 1 / 3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1 / 3);
        }

        const toHex = (x: number) => {
          const hex = Math.round(x * 255).toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        };

        return toHex(r) + toHex(g) + toHex(b);
      };

      return hslToRgb(h, s, l);
    }

    // If it's a named color or unsupported format, try to use a temporary element
    // to get the computed RGB value
    try {
      const tempEl = document.createElement("div");
      tempEl.style.color = color;
      document.body.appendChild(tempEl);
      const computed = getComputedStyle(tempEl).color;
      document.body.removeChild(tempEl);

      // Now computed should be in rgb() format
      return this.cssColorToHex(computed);
    } catch (e) {
      console.warn("Failed to convert color:", color, e);
      return "ffffff"; // fallback to white
    }
  }

  private getThemeTextColor(): string {
    const bodyStyle = getComputedStyle(document.body);
    const textColor = bodyStyle.getPropertyValue("--text-normal").trim();

    if (textColor) {
      return this.cssColorToHex(textColor);
    }

    return "ffffff";
  }

  private getCssFontSize(): string {
    const bodyStyle = getComputedStyle(document.body);
    const fontSize = bodyStyle.getPropertyValue("--font-text-size").trim();

    if (fontSize) {
      // Convert px to pt (1px = 0.75pt)
      const pxValue = parseFloat(fontSize.replace("px", ""));
      const ptValue = pxValue * 0.75;
      console.log(`🔶 Main: Converted font size ${fontSize} to ${ptValue}pt`);
      return `${ptValue}pt`;
    }

    console.log("🔶 Main: Could not determine font size, using fallback");
    return "16pt"; // fallback
  }

  private getThemeBGColor(): string {
    const bodyStyle = getComputedStyle(document.body);
    const bgColor = bodyStyle.getPropertyValue("--background-primary").trim();

    if (bgColor) {
      return this.cssColorToHex(bgColor);
    }

    return "ffffff"; // fallback
  }

  private getFileLineWidth(): string {
    const bodyStyle = getComputedStyle(document.body);
    const fileLineWidth = bodyStyle
      .getPropertyValue("--file-line-width")
      .trim();
    console.log("🔍 Main: --file-line-width CSS variable:", fileLineWidth);
    if (fileLineWidth) {
      return fileLineWidth;
    }
    console.log("🔍 Main: Using fallback width: 700");
    return "700"; // fallback
  }

  private getCssVariable(
    variableName: string,
    fallback: string = "000000"
  ): string {
    const bodyStyle = getComputedStyle(document.body);
    const value = bodyStyle.getPropertyValue(variableName).trim();

    if (value) {
      // If it's a color value, convert to hex
      if (
        variableName.includes("color") ||
        variableName.includes("background") ||
        variableName.includes("text-")
      ) {
        return this.cssColorToHex(value);
      }
      return value;
    }

    return fallback;
  }

  // Color getters
  private getAccentColor(): string {
    return this.getCssVariable("--text-accent", "ffffff");
  }

  private getFaintColor(): string {
    return this.getCssVariable("--text-faint", "888888");
  }

  private getMutedColor(): string {
    return this.getCssVariable("--text-muted", "999999");
  }

  private getBackgroundPrimary(): string {
    return this.getCssVariable("--background-primary", "ffffff");
  }

  private getBackgroundPrimaryAlt(): string {
    return this.getCssVariable("--background-primary-alt", "f5f5f5");
  }

  private getBackgroundSecondary(): string {
    return this.getCssVariable("--background-secondary", "f0f0f0");
  }

  private getBackgroundSecondaryAlt(): string {
    return this.getCssVariable("--background-secondary-alt", "e8e8e8");
  }

  private getSuccessColor(): string {
    return this.getCssVariable("--text-success", "00ff00");
  }

  private getWarningColor(): string {
    return this.getCssVariable("--text-warning", "ffaa00");
  }

  private getErrorColor(): string {
    return this.getCssVariable("--text-error", "ff0000");
  }

  // Font getters
  private getFontText(): string {
    const bodyStyle = getComputedStyle(document.body);
    const fontText = bodyStyle.getPropertyValue("--font-text").trim();
    return fontText || "sans-serif";
  }

  private getFontMonospace(): string {
    const bodyStyle = getComputedStyle(document.body);
    const fontMono = bodyStyle.getPropertyValue("--font-monospace").trim();
    return fontMono || "monospace";
  }

  // Border width
  private getBorderWidth(): string {
    const bodyStyle = getComputedStyle(document.body);
    const borderWidth = bodyStyle.getPropertyValue("--border-width").trim();
    return borderWidth || "1px";
  }

  // Heading color - typically same as text color but can be customized
  private getHeadingColor(): string {
    // Try specific heading color first, fallback to text color
    const bodyStyle = getComputedStyle(document.body);
    const headingColor =
      bodyStyle.getPropertyValue("--text-heading").trim() ||
      bodyStyle.getPropertyValue("--text-normal").trim();

    if (headingColor) {
      return this.cssColorToHex(headingColor);
    }

    return this.getThemeTextColor();
  }

  async handleWorkerRequest({ buffer: wbuffer, path }: WorkerRequest) {
    console.log("🔶 Main: Handling worker request for path:", path);
    try {
      const text = await (path.startsWith("@")
        ? this.preparePackage(path.slice(1))
        : this.getFileString(path));
      if (text) {
        let buffer = Int32Array.from(this.textEncoder.encode(text));
        if (wbuffer.byteLength < buffer.byteLength + 4) {
          // @ts-ignore
          wbuffer.buffer.grow(buffer.byteLength + 4);
        }
        wbuffer.set(buffer, 1);
        wbuffer[0] = 0;
      }
    } catch (error) {
      if (typeof error === "number") {
        wbuffer[0] = error;
      } else {
        wbuffer[0] = 1;
        console.error(error);
      }
    } finally {
      Atomics.notify(wbuffer, 0);
    }
  }

  async preparePackage(spec: string): Promise<string | undefined> {
    console.log("🔶 Main: Preparing package:", spec);

    // Check system directories first (for @local packages)
    if (Platform.isDesktopApp) {
      let subdir = "/typst/packages/" + spec;

      let dir = require("path").normalize(this.getDataDir() + subdir);
      if (this.fs.existsSync(dir)) {
        console.log("🔶 Main: Found package in data directory:", dir);
        return dir;
      }

      dir = require("path").normalize(this.getCacheDir() + subdir);
      if (this.fs.existsSync(dir)) {
        console.log("🔶 Main: Found package in cache directory:", dir);
        return dir;
      }
    }

    // Check plugin's package directory
    const folder = this.packagePath + spec + "/";
    if (await this.app.vault.adapter.exists(folder)) {
      console.log("🔶 Main: Package exists locally in plugin directory");
      return folder;
    }

    // Download preview packages
    if (spec.startsWith("preview") && this.settings.autoDownloadPackages) {
      console.log("🔶 Main: Downloading preview package:", spec);
      const [namespace, name, version] = spec.split("/");
      try {
        await this.fetchPackage(folder, name, version);
        return folder;
      } catch (e) {
        if (e == 2) {
          throw e;
        }
        console.error(e);
        throw 3;
      }
    }
    throw 2; // Package not found
  }

  getDataDir() {
    if (Platform.isLinux) {
      if ("XDG_DATA_HOME" in process.env) {
        return process.env["XDG_DATA_HOME"];
      } else {
        return process.env["HOME"] + "/.local/share";
      }
    } else if (Platform.isWin) {
      return process.env["APPDATA"];
    } else if (Platform.isMacOS) {
      return process.env["HOME"] + "/Library/Application Support";
    }
    throw "Cannot find data directory on an unknown platform";
  }

  getCacheDir() {
    if (Platform.isLinux) {
      if ("XDG_CACHE_HOME" in process.env) {
        return process.env["XDG_CACHE_HOME"];
      } else {
        return process.env["HOME"] + "/.cache";
      }
    } else if (Platform.isWin) {
      return process.env["LOCALAPPDATA"];
    } else if (Platform.isMacOS) {
      return process.env["HOME"] + "/Library/Caches";
    }
    throw "Cannot find cache directory on an unknown platform";
  }

  async fetchPackage(folder: string, name: string, version: string) {
    console.log("🔶 Main: Fetching package:", name, version);
    const url = `https://packages.typst.org/preview/${name}-${version}.tar.gz`;
    const response = await fetch(url);
    if (response.status == 404) {
      throw 2; // Package not found
    }
    await this.app.vault.adapter.mkdir(folder);

    // Copy the exact temp_repo approach
    const decompressed = decompressSync(
      new Uint8Array(await response.arrayBuffer())
    );
    const untarrer = untar(decompressed.buffer as ArrayBuffer);

    // Use progress handler like temp_repo
    await (untarrer as any).progress(async (file: any) => {
      // is folder
      if (file.type == "5" && file.name != ".") {
        await this.app.vault.adapter.mkdir(folder + file.name);
      }
      // is file
      if (file.type === "0") {
        await this.app.vault.adapter.writeBinary(
          folder + file.name,
          file.buffer
        );
      }
    });
    console.log("🔶 Main: Package downloaded successfully");
  }

  async getFileString(path: string): Promise<string> {
    try {
      if (require("path").isAbsolute(path)) {
        return await this.fs.promises.readFile(path, { encoding: "utf8" });
      } else {
        return await this.app.vault.adapter.read(normalizePath(path));
      }
    } catch (error) {
      console.error("Failed to read file:", path, error);
      throw 2; // File not found
    }
  }
}
