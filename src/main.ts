import { Plugin, addIcon, Notice, Platform, normalizePath } from "obsidian";
import { TypstView } from "./TypstView";
import { registerCommands } from "./commands";
import { TypstIcon } from "./util";
import { TypstSettings, DEFAULT_SETTINGS, TypstSettingTab } from "./settings";
import { TemplateVariableProvider } from "./TemplateVariableProvider";
import { PackageManager } from "./PackageManager";
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
  textEncoder: TextEncoder;
  fs: any;
  wasmPath: string;
  pluginPath: string;
  packagePath: string;

  async onload() {
    this.textEncoder = new TextEncoder();
    this.templateProvider = new TemplateVariableProvider();
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

    // Replace all template variables
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

  async handleWorkerRequest({ buffer: wbuffer, path }: WorkerRequest) {
    try {
      const text = await (path.startsWith("@")
        ? this.packageManager.preparePackage(path.slice(1))
        : this.packageManager.getFileString(path));
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
}
