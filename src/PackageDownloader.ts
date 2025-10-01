import { App, Notice } from "obsidian";
import untar from "js-untar";
import { ungzip } from "pako";

export default class PackageDownloader {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  // Download and extract a Typst preview package from URL
  async downloadPackage(name: string, version: string, targetPath: string) {
    const url = `https://packages.typst.app/preview/${name}-${version}.tar.gz`;

    try {
      // Check if package exists at URL
      const exists = await this.packageExists(url);
      if (!exists) {
        throw new Error(`Package ${name}:${version} not found`);
      }

      // Download the package
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Download failed: ${response.status} ${response.statusText}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();

      // Decompress and extract the tar.gz file
      const decompressed = ungzip(new Uint8Array(arrayBuffer));
      const files = await untar(decompressed.buffer);

      // DEBUG
      console.log(
        `[PackageDownloader] Extracted ${files.length} files from ${name}:${version}`
      );

      // Write files to target path
      await this.writePackageFiles(files, targetPath);
    } catch (error) {
      const msg = `Failed to download package ${name}:${version}: ${error.message}`;
      new Notice(msg);
      throw new Error(msg);
    }
  }

  private async packageExists(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async writePackageFiles(files: any[], targetPath: string) {
    // DEBUG
    console.log(
      `[PackageDownloader] Writing ${files.length} files to ${targetPath}`
    );

    // Check if target directory exists
    const targetExists = await this.app.vault.adapter.exists(targetPath);
    if (!targetExists) {
      // DEBUG
      console.log(
        `[PackageDownloader] Creating target directory: ${targetPath}`
      );
      await this.app.vault.adapter.mkdir(targetPath);
    }

    for (const file of files) {
      const filePath = `${targetPath}/${file.name}`;

      // DEBUG
      console.log(
        `[PackageDownloader] Writing file: ${file.name} to ${filePath}`
      );

      try {
        if (file.type === "directory") {
          // Create directory
          const dirExists = await this.app.vault.adapter.exists(filePath);
          if (!dirExists) {
            await this.app.vault.adapter.mkdir(filePath);
          }
        } else if (file.type === "file") {
          // Write file
          await this.app.vault.adapter.writeBinary(filePath, file.buffer);
          // DEBUG
          console.log(
            `[PackageDownloader] Wrote file: ${file.name} to ${filePath}`
          );
        }
      } catch (error) {
        throw new Error(`Failed to write file ${file.name}: ${error.message}`);
      }
    }
  }
}
