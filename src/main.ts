import { Plugin, addIcon, Notice, Platform, normalizePath } from "obsidian";
import { TypstView } from "./TypstView";
import { registerCommands } from "./commands";
import { TypstIcon } from "./util";
import { TypstSettings, DEFAULT_SETTINGS, TypstSettingTab } from "./settings";
// @ts-ignore
import CompilerWorker from "./compiler.worker.ts";
// @ts-ignore
import untar from "js-untar";
import { decompressSync } from "fflate";
import { WorkerRequest } from "./types";
import { pluginId } from "./util";

declare const PLUGIN_VERSION: string;

export default class TypstForObsidian extends Plugin {
  settings: TypstSettings;
  compilerWorker: Worker;
  textEncoder: TextEncoder;
  fs: any;
  wasmPath: string;
  pluginPath: string;
  packagePath: string;

  async onload() {
    this.textEncoder = new TextEncoder();
    await this.loadSettings();

    this.pluginPath = this.app.vault.configDir + `/plugins/${pluginId}/`;
    this.packagePath = this.pluginPath + "packages/";
    this.wasmPath = this.pluginPath + "obsidian_typst_bg.wasm";

    this.compilerWorker = new CompilerWorker() as Worker;

    if (!(await this.app.vault.adapter.exists(this.wasmPath))) {
      try {
        await this.fetchWasm();
      } catch (error) {
        new Notice("Failed to fetch component: " + error, 0);
        console.error("Failed to fetch component: " + error);
      }
    }

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
      this.compilerWorker.postMessage({
        type: "canUseSharedArrayBuffer",
        data: true,
      });
      this.fs = require("fs");

      this.compilerWorker.addEventListener("message", (event) => {
        if (event.data?.type === "ready") {
          this.loadFonts();
        }
      });
    } else {
      await this.app.vault.adapter.mkdir(this.packagePath);
      const packages = await this.getPackageList();
      this.compilerWorker.postMessage({ type: "packages", data: packages });
    }

    addIcon("typst-file", TypstIcon);
    this.registerExtensions(["typ"], "typst-view");
    this.registerView("typst-view", (leaf) => new TypstView(leaf, this));
    registerCommands(this);
    this.addSettingTab(new TypstSettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on("css-change", () => {
        this.onThemeChange();
      })
    );
  }

  private async loadFonts() {
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
      this.compilerWorker.postMessage({ type: "fonts", data: fonts }, fonts);
    } catch (error) {
      console.warn("Could not load system fonts:", error);
    }
  }

  private onThemeChange() {
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

  async compileToPdf(
    source: string,
    path: string = "/main.typ",
    compileType: "internal" | "export" = "internal"
  ): Promise<Uint8Array> {
    let finalSource = source;

    if (
      compileType === "export" &&
      this.settings.usePdfLayoutFunctions &&
      this.settings.pdfLayoutFunctions.trim()
    ) {
      finalSource = this.settings.pdfLayoutFunctions + "\n" + source;
    } else if (this.settings.useDefaultLayoutFunctions) {
      finalSource = this.settings.customLayoutFunctions + "\n" + source;
    } else {
      finalSource = "#set page(margin: (x: 0.25em, y: 0.25em))\n" + source;
    }

    if (compileType === "internal") {
      finalSource = finalSource + "#linebreak()\n#linebreak()";
    }

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

    const message = {
      type: "compile",
      data: {
        format: "pdf",
        path,
        source: finalSource,
      },
    };

    this.compilerWorker.postMessage(message);

    while (true) {
      const result = await new Promise<any>((resolve, reject) => {
        const listener = (ev: MessageEvent) => {
          if (ev.data && ev.data.type === "ready") {
            return;
          }

          remove();
          resolve(ev.data);
        };

        const errorListener = (error: ErrorEvent) => {
          console.error("Worker error during PDF compile:", error);
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

      if (
        result instanceof Uint8Array ||
        (result &&
          result.constructor &&
          result.constructor.name === "Uint8Array")
      ) {
        return result;
      } else if (result && result.error) {
        throw new Error(result.error);
      } else if (result && result.buffer && result.path) {
        // This is a WorkerRequest
        await this.handleWorkerRequest(result);
        // Continue the loop to wait for the next response
        continue;
      } else {
        console.error("Unexpected PDF response format:", result);
        throw new Error("Invalid PDF response format");
      }
    }
  }

  private pxToPt(px: string): string {
    const pxValue = parseFloat(px.replace("px", ""));
    const ptValue = pxValue / 1.5;
    return `${ptValue}`;
  }

  private cssColorToHex(color: string): string {
    if (color.startsWith("#")) {
      return color.slice(1);
    }

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

    try {
      const tempEl = document.createElement("div");
      tempEl.style.color = color;
      document.body.appendChild(tempEl);
      const computed = getComputedStyle(tempEl).color;
      document.body.removeChild(tempEl);

      return this.cssColorToHex(computed);
    } catch (e) {
      console.warn("Failed to convert color:", color, e);
      return "ffffff";
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
      const pxValue = parseFloat(fontSize.replace("px", ""));
      const ptValue = pxValue * 0.75;
      return `${ptValue}pt`;
    }

    return "16pt";
  }

  private getThemeBGColor(): string {
    const bodyStyle = getComputedStyle(document.body);
    const bgColor = bodyStyle.getPropertyValue("--background-primary").trim();

    if (bgColor) {
      return this.cssColorToHex(bgColor);
    }

    return "ffffff";
  }

  private getFileLineWidth(): string {
    const bodyStyle = getComputedStyle(document.body);
    const fileLineWidth = bodyStyle
      .getPropertyValue("--file-line-width")
      .trim();
    if (fileLineWidth) {
      return fileLineWidth;
    }
    return "700";
  }

  private getCssVariable(
    variableName: string,
    fallback: string = "000000"
  ): string {
    const bodyStyle = getComputedStyle(document.body);
    const value = bodyStyle.getPropertyValue(variableName).trim();

    if (value) {
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

  private getBorderWidth(): string {
    const bodyStyle = getComputedStyle(document.body);
    const borderWidth = bodyStyle.getPropertyValue("--border-width").trim();
    return borderWidth || "1px";
  }

  private getHeadingColor(): string {
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
    if (Platform.isDesktopApp) {
      let subdir = "/typst/packages/" + spec;

      let dir = require("path").normalize(this.getDataDir() + subdir);
      if (this.fs.existsSync(dir)) {
        return dir;
      }

      dir = require("path").normalize(this.getCacheDir() + subdir);
      if (this.fs.existsSync(dir)) {
        return dir;
      }
    }

    const folder = this.packagePath + spec + "/";
    if (await this.app.vault.adapter.exists(folder)) {
      return folder;
    }

    if (spec.startsWith("preview") && this.settings.autoDownloadPackages) {
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
    throw 2;
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
    console.log("Fetching package:", name, version);
    const url = `https://packages.typst.org/preview/${name}-${version}.tar.gz`;
    const response = await fetch(url);
    if (response.status == 404) {
      throw 2;
    }
    await this.app.vault.adapter.mkdir(folder);
    const decompressed = decompressSync(
      new Uint8Array(await response.arrayBuffer())
    );
    const untarrer = untar(decompressed.buffer as ArrayBuffer);
    await (untarrer as any).progress(async (file: any) => {
      if (file.type == "5" && file.name != ".") {
        await this.app.vault.adapter.mkdir(folder + file.name);
      }
      if (file.type === "0") {
        await this.app.vault.adapter.writeBinary(
          folder + file.name,
          file.buffer
        );
      }
    });
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
      throw 2;
    }
  }
}
