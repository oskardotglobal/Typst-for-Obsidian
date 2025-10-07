import { Plugin, addIcon, Notice, Platform } from "obsidian";
import { TypstView } from "./TypstView";
import { registerCommands } from "./commands";
import { TypstIcon } from "./util";
import { TypstSettings, DEFAULT_SETTINGS, TypstSettingTab } from "./settings";
import { TemplateVariableProvider } from "./TemplateVariableProvider";
import { PackageManager } from "./PackageManager";
import { SnippetManager } from "./SnippetManager";
// @ts-ignore
import CompilerWorker from "./compiler.worker.ts";
import { WorkerRequest } from "./types";
import { pluginId } from "./util";

declare const PLUGIN_VERSION: string;

export default class TypstForObsidian extends Plugin {
  settings: TypstSettings;
  compilerWorker: Worker;
  templateProvider: TemplateVariableProvider;
  packageManager: PackageManager;
  snippetManager: SnippetManager;
  textEncoder: TextEncoder;
  fs: any;
  wasmPath: string;
  pluginPath: string;
  packagePath: string;
  private isWorkerReady: boolean = false;

  async onload() {
    this.textEncoder = new TextEncoder();
    this.templateProvider = new TemplateVariableProvider();
    this.snippetManager = new SnippetManager();
    await this.loadSettings();

    this.pluginPath = this.app.vault.configDir + `/plugins/${pluginId}/`;
    this.packagePath = this.pluginPath + "packages/";
    this.wasmPath = this.pluginPath + "obsidian_typst_bg.wasm";

    this.packageManager = new PackageManager(this);
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
          this.isWorkerReady = true;
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

  async loadFonts() {
    if (!Platform.isDesktopApp) {
      console.log("Font loading is only supported on desktop");
      return;
    }

    if (!this.isWorkerReady) {
      return;
    }

    this.compilerWorker.postMessage({ type: "reset_fonts" });

    if (this.settings.fontFamilies.length === 0) {
      return;
    }

    try {
      //@ts-expect-error
      const availableFonts = await window.queryLocalFonts();
      const matchedFonts = availableFonts.filter(
        (font: {
          family: string;
          fullName: string;
          postscriptName: string;
        }) => {
          const familyLower = font.family.toLowerCase();
          const fullNameLower = font.fullName?.toLowerCase() || "";
          const postscriptLower = font.postscriptName?.toLowerCase() || "";

          return this.settings.fontFamilies.some((configuredFont) => {
            const configured = configuredFont.toLowerCase();
            return (
              familyLower.includes(configured) ||
              configured.includes(familyLower) ||
              fullNameLower.includes(configured) ||
              postscriptLower.includes(configured)
            );
          });
        }
      );

      const familyGroups = new Map<string, number>();
      matchedFonts.forEach((font: any) => {
        const count = familyGroups.get(font.family) || 0;
        familyGroups.set(font.family, count + 1);
      });

      if (matchedFonts.length === 0) {
        console.warn(
          `None of the configured fonts were found on system. Run \`typst fonts\` in the terminal to get the correct names`
        );
        return;
      }

      const fonts = await Promise.all(
        matchedFonts.map(
          async (font: { family: string; blob: () => Promise<Blob> }) => {
            return await (await font.blob()).arrayBuffer();
          }
        )
      );

      this.compilerWorker.postMessage({ type: "fonts", data: fonts }, fonts);
    } catch (error) {
      console.error("Could not load system fonts:", error);
      new Notice("Failed to load custom fonts. Check console for details.");
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

    if (!this.snippetManager.parseSnippets(this.settings.customSnippets)) {
      const error = this.snippetManager.getLastError();
      new Notice(`Snippet configuration error: ${error}`);
      console.error("Snippet parsing failed:", error);
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);

    if (!this.snippetManager.parseSnippets(this.settings.customSnippets)) {
      const error = this.snippetManager.getLastError();
      new Notice(`Snippet configuration error: ${error}`);
      console.error("Snippet parsing failed:", error);
    }
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
      finalSource = finalSource + "\n#linebreak()\n#linebreak()";
    }

    finalSource = this.templateProvider.replaceVariables(finalSource);

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
        await this.handleWorkerRequest(result);
        continue;
      } else {
        console.error("Unexpected PDF response format:", result);
        throw new Error("Invalid PDF response format");
      }
    }
  }

  async handleWorkerRequest({ buffer: wbuffer, path }: WorkerRequest) {
    try {
      const isBinary = path.endsWith(":binary");
      const actualPath = isBinary ? path.slice(0, -7) : path;

      if (actualPath.startsWith("@")) {
        const text = await this.packageManager.preparePackage(
          actualPath.slice(1)
        );
        if (text) {
          const encoded = this.textEncoder.encode(text);
          const numInt32s = Math.ceil((encoded.byteLength + 4) / 4);

          if (wbuffer.byteLength < numInt32s * 4) {
            // @ts-ignore
            wbuffer.buffer.grow(numInt32s * 4);
          }

          wbuffer[1] = encoded.byteLength;
          const dataView = new Uint8Array(wbuffer.buffer, 8);
          dataView.set(encoded);

          wbuffer[0] = 0;
        }
      } else if (isBinary) {
        const binaryData = await this.packageManager.getFileBinary(actualPath);
        if (binaryData) {
          const byteLength = binaryData.byteLength;
          const numInt32s = Math.ceil((byteLength + 8) / 4);

          if (wbuffer.byteLength < numInt32s * 4) {
            // @ts-ignore
            wbuffer.buffer.grow(numInt32s * 4);
          }

          wbuffer[1] = byteLength;
          const dataView = new Uint8Array(wbuffer.buffer, 8, byteLength);
          dataView.set(new Uint8Array(binaryData));

          wbuffer[0] = 0;
        }
      } else {
        const text = await this.packageManager.getFileString(actualPath);
        if (text) {
          const encoded = this.textEncoder.encode(text);
          const numInt32s = Math.ceil((encoded.byteLength + 4) / 4);

          if (wbuffer.byteLength < numInt32s * 4) {
            // @ts-ignore
            wbuffer.buffer.grow(numInt32s * 4);
          }

          wbuffer[1] = encoded.byteLength;
          const dataView = new Uint8Array(wbuffer.buffer, 8);
          dataView.set(encoded);

          wbuffer[0] = 0;
        }
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
}
