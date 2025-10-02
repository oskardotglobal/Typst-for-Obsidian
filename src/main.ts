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

    // Replace %THEMECOLOR% with actual theme text color
    const textColor = this.getThemeTextColor();
    finalSource = finalSource.replace(/%THEMECOLOR%/g, textColor);

    // Replace %FONTSIZE% with actual CSS font size
    const fontSize = this.getCssFontSize();
    finalSource = finalSource.replace(/%FONTSIZE%/g, fontSize);

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
        const processedSvg = this.quantizeSVG(result, 0.5);
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

  private getThemeTextColor(): string {
    const bodyStyle = getComputedStyle(document.body);
    const textColor = bodyStyle.getPropertyValue("--text-normal").trim();

    if (textColor) {
      return textColor.startsWith("#") ? textColor.slice(1) : textColor;
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
