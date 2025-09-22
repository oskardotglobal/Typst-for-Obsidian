import { App, Notice, Platform } from "obsidian";

export class PackageManager {
  private app: App;
  private packageCache: Map<string, string>; // packageId -> localPath
  private fs: any;
  private vaultPackagePath: string;
  private vaultCacheFilePath: string;

  constructor(app: App) {
    this.app = app;
    this.packageCache = new Map();
    this.fs = require("fs");
    this.vaultPackagePath = `${app.vault.configDir}/plugins/typst-for-obsidian/packages`;
    this.vaultCacheFilePath = `${app.vault.configDir}/plugins/typst-for-obsidian/package-cache.json`;

    this.loadPersistentCache();
  }

  // get pkg list
  // del pkgs
  //

  private async loadPersistentCache() {
    try {
      const cacheExists = await this.app.vault.adapter.exists(
        this.vaultCacheFilePath
      );

      if (!cacheExists) return;

      const cacheContent = await this.app.vault.adapter.read(
        this.vaultCacheFilePath
      );
      const cacheData = JSON.parse(cacheContent);

      for (const [packageId, packagePath] of Object.entries(cacheData)) {
        if (await this.packageExistsAt(packagePath as string)) {
          this.packageCache.set(packageId, packagePath as string);
        } else {
          console.warn(
            `Package ${packageId} at ${packagePath} not found, removing from cache.`
          );
          this.packageCache.delete(packageId);
        }
      }

      await this.savePersistentCache();
    } catch (error) {
      console.error("Error loading package cache:", error);
    }
  }

  private async savePersistentCache() {
    try {
      const cacheData = Object.fromEntries(this.packageCache);
      const cacheContent = JSON.stringify(cacheData, null, 2);

      await this.app.vault.adapter.write(this.vaultCacheFilePath, cacheContent);
    } catch (error) {
      console.error("Error saving package cache:", error);
    }
  }

  async getPackageEntrypoint(packagePath: string): Promise<string | null> {
    try {
      const tomlPath = `${packagePath}/typst.toml`;
      const tomlContent = await this.fs.promises.readFile(tomlPath, "utf8");
      const entrypointMatch = tomlContent.match(
        /entrypoint\s*=\s*["']([^"']+)["']/
      );

      if (entrypointMatch) {
        return entrypointMatch[1];
      } else {
        console.warn(`Entrypoint not found in ${tomlPath}`);
        return null;
      }
    } catch (error) {
      console.warn(`Error reading entrypoint from ${packagePath}:`, error);
      return null;
    }
  }

  async getLocalPackagePath(
    name: string,
    version: string
  ): Promise<string | null> {
    const dataDir = this.getDataDir();
    const packagePath = `${dataDir}/local/${name}/${version}`;

    if (await this.packageExistsAt(packagePath)) {
      return packagePath;
    } else {
      console.warn(`Local package ${name}:${version} not found.`);
      // fetch?
    }

    return null;
  }

  private async packageExistsAt(path: string): Promise<boolean> {
    try {
      await this.fs.promises.access(path);

      const tomlPath = `${path}/typst.toml`;
      const tomlContent = await this.fs.promises.readFile(tomlPath, "utf8");

      const entrypointMatch = tomlContent.match(
        /entrypoint\s*=\s*["']([^"']+)["']/
      );

      if (entrypointMatch) {
        const entrypointPath = `${path}/${entrypointMatch[1]}`;
        await this.fs.promises.access(entrypointPath);
        return true;
      } else {
        console.warn(`Entrypoint not found in ${tomlPath}`);
        return false;
      }
    } catch (error) {
      console.warn(`Package not found at ${path}:`, error);
      return false;
    }
  }

  getDataDir() {
    if (Platform.isLinux) {
      if ("XDG_DATA_HOME" in process.env) return process.env.XDG_DATA_HOME;
      else return `${process.env.HOME}/.local/share`;
    } else if (Platform.isWin) {
      return process.env.APPDATA;
    } else if (Platform.isMacOS) {
      return `${process.env.HOME}/Library/Application Support`;
    }
    throw new Error("Unknown platform, cannot find data directory");
  }

  getCacheDir() {
    if (Platform.isLinux) {
      if ("XDG_CACHE_HOME" in process.env) return process.env.XDG_CACHE_HOME;
      else return `${process.env.HOME}/.cache`;
    } else if (Platform.isWin) {
      return process.env.LOCALAPPDATA;
    } else if (Platform.isMacOS) {
      return `${process.env.HOME}/Library/Caches`;
    }
    throw new Error("Unknown platform, cannot find cache directory");
  }
}
