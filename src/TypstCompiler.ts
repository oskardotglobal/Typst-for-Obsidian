import { Notice } from "obsidian";
import { $typst } from "@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs";
import { typstWebCompilerModule, typstWebRendererModule } from "./util";
import { TypstSettings } from "./settings";

export class TypstCompiler {
  private static instance: TypstCompiler | null = null;
  private initialized = false;

  private constructor() {}

  public static getInstance(): TypstCompiler {
    if (!TypstCompiler.instance) {
      TypstCompiler.instance = new TypstCompiler();
    }
    return TypstCompiler.instance;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      $typst.setCompilerInitOptions({
        getModule: () => typstWebCompilerModule,
      });

      $typst.setRendererInitOptions({
        getModule: () => typstWebRendererModule,
      });

      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize Typst compiler:", error);
      new Notice("Failed to initialize Typst compiler.");
      throw error;
    }
  }

  public async compileToSvg(
    content: string,
    settings: TypstSettings
  ): Promise<string | null> {
    try {
      await this.ensureInitialized();

      // Get the current theme text color
      const textColor = this.getThemeTextColor();

      let finalContent = content;

      // Add layout funcitons
      if (settings.useDefaultLayoutFunctions) {
        finalContent = settings.customLayoutFunctions + "\n" + content;
      }

      // Replace %THEMECOLOR% with theme text color
      finalContent = finalContent.replace(/%THEMECOLOR%/g, textColor);

      const svg = await $typst.svg({
        mainContent: finalContent,
      });

      return svg;
    } catch (error) {
      console.error("Typst compilation failed:", error);
      new Notice("Typst compilation failed.");
      return null;
    }
  }

  private getThemeTextColor(): string {
    const bodyStyle = getComputedStyle(document.body);
    const textColor = bodyStyle.getPropertyValue("--text-normal").trim();

    if (textColor) {
      return textColor.startsWith("#") ? textColor.slice(1) : textColor;
    }

    return "ffffff";
  }

  public destroy(): void {
    this.initialized = false;
  }
}
