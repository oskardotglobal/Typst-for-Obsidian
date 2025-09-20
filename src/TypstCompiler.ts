import { Notice } from "obsidian";
import { $typst } from "@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs";

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
        getModule: () =>
          "https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm",
      });

      $typst.setRendererInitOptions({
        getModule: () =>
          "https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm",
      });

      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize Typst compiler:", error);
      new Notice("Failed to initialize Typst compiler");
      throw error;
    }
  }

  public async compileToSvg(content: string): Promise<string | null> {
    try {
      await this.ensureInitialized();
      const svg = await $typst.svg({
        mainContent: content,
      });

      return svg;
    } catch (error) {
      console.error("Typst compilation failed:", error);
      let errorMessage = error.message || "Unknown compilation error";
      new Notice(`Typst compilation failed: ${errorMessage}`);
      return null;
    }
  }

  public destroy(): void {
    this.initialized = false;
  }
}
