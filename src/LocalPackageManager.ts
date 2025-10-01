import { Platform } from "obsidian";
import * as fs from "fs";
import * as path from "path";

export default class LocalPackageManager {
  constructor() {}

  async findLocalPackage(
    name: string,
    version: string
  ): Promise<Map<string, string> | null> {
    const dataDir = this.getDataDir();
    if (!dataDir) {
      return null;
    }

    const packagePath = path.join(
      dataDir,
      "typst",
      "packages",
      "local",
      name,
      version
    );

    try {
      await fs.promises.access(path.join(packagePath, "typst.toml"));
      return this.readPackageFiles(packagePath);
    } catch (error) {
      return null;
    }
  }

  private async readPackageFiles(
    basePath: string
  ): Promise<Map<string, string>> {
    const files = new Map<string, string>();
    const entries = await fs.promises.readdir(basePath, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = path.join(basePath, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await this.readPackageFiles(fullPath);
        for (const [subPath, content] of subFiles.entries()) {
          files.set(path.join(entry.name, subPath), content);
        }
      } else {
        const content = await fs.promises.readFile(fullPath, "utf-8");
        files.set(entry.name, content);
      }
    }

    return files;
  }

  private getDataDir(): string | null {
    if (Platform.isLinux) {
      return (
        process.env.XDG_DATA_HOME ||
        path.join(process.env.HOME || "", ".local", "share")
      );
    } else if (Platform.isWin) {
      return process.env.APPDATA || null;
    } else if (Platform.isMacOS) {
      return path.join(
        process.env.HOME || "",
        "Library",
        "Application Support"
      );
    }
    return null;
  }
}
