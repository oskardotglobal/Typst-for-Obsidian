import { Notice } from "obsidian";
import { $typst } from "@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs";
``;
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

      // Wrap content with page formatting
      const wrappedContent = `
        #set page(
          width: 210mm,  
          height: auto,  
          margin: (
            x: 0cm,   
            y: 0cm
          ),
          fill: none    
        )
        #set text(
          size: 16pt,   
          fill: black   
        )
        #set par(
          justify: true,
          leading: 0.65em
        )
        #set rect(fill: none)
        #set block(fill: none)
        ${content}`;

      const svg = await $typst.svg({
        mainContent: wrappedContent,
      });

      return svg;
    } catch (error) {
      console.error("Typst compilation failed:", error);
      new Notice(`Typst compilation failed`);
      return null;
    }
  }

  public destroy(): void {
    this.initialized = false;
  }
}
