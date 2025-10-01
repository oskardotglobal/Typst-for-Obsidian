import { App, Notice } from "obsidian";
import { PackageImport } from "./types/packages";
import parsePackageImports from "./PackageParser";
import PackageDownloader from "./PackageDownloader";
import LocalPackageManager from "./LocalPackageManager";
import { pluginId } from "./util";

export class PackageManager {
  private app: App;
  private downloader: PackageDownloader;
  private localPackageManager: LocalPackageManager;
  public resolvedPackages: Map<string, Map<string, string> | string>;

  constructor(app: App) {
    this.app = app;
    this.downloader = new PackageDownloader(app);
    this.localPackageManager = new LocalPackageManager();
    this.resolvedPackages = new Map();
  }

  public async resolvePackages(content: string): Promise<void> {
    const imports = parsePackageImports(content);
    this.resolvedPackages.clear();

    for (const imp of imports) {
      const packageImportString = this.getPackageImportString(imp);

      if (this.resolvedPackages.has(packageImportString)) {
        continue;
      }

      if (imp.namespace === "preview") {
        const previewPath = this.getPreviewPackagePath(imp.name, imp.version);
        if (!(await this.app.vault.adapter.exists(previewPath))) {
          new Notice(`Downloading package ${imp.name}:${imp.version}`);
          await this.downloader.downloadPackage(
            imp.name,
            imp.version,
            previewPath
          );
        }
        this.resolvedPackages.set(packageImportString, previewPath);
      } else if (imp.namespace === "local") {
        const localPackageFiles =
          await this.localPackageManager.findLocalPackage(
            imp.name,
            imp.version
          );
        if (localPackageFiles) {
          this.resolvedPackages.set(packageImportString, localPackageFiles);
        } else {
          new Notice(`Could not find local package ${imp.name}:${imp.version}`);
        }
      }
    }
  }

  private getPackageImportString(packageImport: PackageImport): string {
    return `@${packageImport.namespace}/${packageImport.name}:${packageImport.version}`;
  }

  private getPreviewPackagePath(name: string, version: string): string {
    return `${this.app.vault.configDir}/plugins/${pluginId}/packages/preview/${name}/${version}`;
  }
}
