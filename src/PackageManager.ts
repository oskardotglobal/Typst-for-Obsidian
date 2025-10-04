import { Platform, normalizePath } from "obsidian";
import type TypstPlugin from "./main";
import { decompressSync } from "fflate";
// @ts-ignore
import untar from "js-untar";

export class PackageManager {
  private fs: any;

  constructor(private plugin: TypstPlugin) {
    if (Platform.isDesktopApp) {
      this.fs = require("fs");
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

    const folder = this.plugin.packagePath + spec + "/";
    if (await this.plugin.app.vault.adapter.exists(folder)) {
      return folder;
    }

    if (
      spec.startsWith("preview") &&
      this.plugin.settings.autoDownloadPackages
    ) {
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

  private async fetchPackage(
    folder: string,
    name: string,
    version: string
  ): Promise<void> {
    console.log("Fetching package:", name, version);
    const url = `https://packages.typst.org/preview/${name}-${version}.tar.gz`;
    const response = await fetch(url);
    if (response.status == 404) {
      throw 2;
    }
    await this.plugin.app.vault.adapter.mkdir(folder);
    const decompressed = decompressSync(
      new Uint8Array(await response.arrayBuffer())
    );
    const untarrer = untar(decompressed.buffer as ArrayBuffer);
    await (untarrer as any).progress(async (file: any) => {
      if (file.type == "5" && file.name != ".") {
        await this.plugin.app.vault.adapter.mkdir(folder + file.name);
      }
      if (file.type === "0") {
        await this.plugin.app.vault.adapter.writeBinary(
          folder + file.name,
          file.buffer
        );
      }
    });
  }

  async getFileString(path: string): Promise<string> {
    try {
      if (Platform.isDesktopApp && require("path").isAbsolute(path)) {
        return await this.fs.promises.readFile(path, { encoding: "utf8" });
      } else {
        return await this.plugin.app.vault.adapter.read(normalizePath(path));
      }
    } catch (error) {
      console.error("Failed to read file:", path, error);
      throw 2;
    }
  }

  private getDataDir(): string {
    if (Platform.isLinux) {
      if ("XDG_DATA_HOME" in process.env) {
        return process.env["XDG_DATA_HOME"]!;
      } else {
        return process.env["HOME"] + "/.local/share";
      }
    } else if (Platform.isWin) {
      return process.env["APPDATA"]!;
    } else if (Platform.isMacOS) {
      return process.env["HOME"] + "/Library/Application Support";
    }
    throw "Cannot find data directory on an unknown platform";
  }

  private getCacheDir(): string {
    if (Platform.isLinux) {
      if ("XDG_CACHE_HOME" in process.env) {
        return process.env["XDG_CACHE_HOME"]!;
      } else {
        return process.env["HOME"] + "/.cache";
      }
    } else if (Platform.isWin) {
      return process.env["LOCALAPPDATA"]!;
    } else if (Platform.isMacOS) {
      return process.env["HOME"] + "/Library/Caches";
    }
    throw "Cannot find cache directory on an unknown platform";
  }
}
