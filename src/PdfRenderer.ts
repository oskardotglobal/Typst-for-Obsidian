import { init, WrappedPdfiumModule } from "@embedpdf/pdfium";

export class PdfRenderer {
  private pdfium: WrappedPdfiumModule | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {}

  private async ensurePdfiumInitialized(): Promise<void> {
    if (this.pdfium) return;

    if (!this.initPromise) {
      this.initPromise = this.initializePdfium();
    }

    await this.initPromise;
  }

  private async initializePdfium(): Promise<void> {
    try {
      const pdfiumWasmUrl =
        "https://cdn.jsdelivr.net/npm/@embedpdf/pdfium/dist/pdfium.wasm";
      const response = await fetch(pdfiumWasmUrl);
      const wasmBinary = await response.arrayBuffer();

      this.pdfium = await init({
        wasmBinary,
        locateFile: (path: string, prefix: string) => {
          if (path.endsWith(".wasm")) {
            return pdfiumWasmUrl;
          }
          return prefix + path;
        },
      });

      this.pdfium.PDFiumExt_Init();
    } catch (error) {
      console.error("PdfRenderer: PDFium initialization failed:", error);
      throw error;
    }
  }

  async renderPdf(pdfData: Uint8Array, container: HTMLElement): Promise<void> {
    try {
      await this.ensurePdfiumInitialized();

      if (!this.pdfium) {
        throw new Error("PDFium not initialized");
      }

      // Allocate memory for the PDF data
      const filePtr = this.pdfium.pdfium.wasmExports.malloc(pdfData.length);

      // Write PDF data to WASM memory
      const pdfiumModule = this.pdfium.pdfium as any;
      pdfiumModule.HEAPU8.set(pdfData, filePtr);

      // Load the document
      const docPtr = this.pdfium.FPDF_LoadMemDocument(
        filePtr,
        pdfData.length,
        ""
      );

      if (!docPtr) {
        const error = this.pdfium.FPDF_GetLastError();
        this.pdfium.pdfium.wasmExports.free(filePtr);
        throw new Error(`Failed to load PDF: ${error}`);
      }

      try {
        // Get page count
        const pageCount = this.pdfium.FPDF_GetPageCount(docPtr);

        // Render all pages
        for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
          await this.renderPage(docPtr, pageIndex, container);
        }
      } finally {
        // Clean up document
        this.pdfium.FPDF_CloseDocument(docPtr);
        this.pdfium.pdfium.wasmExports.free(filePtr);
      }
    } catch (error) {
      console.error("PdfRenderer: PDFium rendering failed:", error);
      throw error;
    }
  }

  private async renderPage(
    docPtr: number,
    pageIndex: number,
    container: HTMLElement
  ): Promise<void> {
    if (!this.pdfium) throw new Error("PDFium not initialized");

    // Load the page
    const pagePtr = this.pdfium.FPDF_LoadPage(docPtr, pageIndex);
    if (!pagePtr) {
      throw new Error(`Failed to load page ${pageIndex}`);
    }

    try {
      // Get page dimensions
      const width = this.pdfium.FPDF_GetPageWidthF(pagePtr);
      const height = this.pdfium.FPDF_GetPageHeightF(pagePtr);

      // Calculate scaled dimensions with device pixel ratio
      const scale = 1.5;
      const dpr = window.devicePixelRatio || 1;
      const effectiveScale = scale * dpr;
      const scaledWidth = Math.floor(width * effectiveScale);
      const scaledHeight = Math.floor(height * effectiveScale);

      // Create page container
      const pageContainer = container.createDiv("typst-pdf-page");
      pageContainer.style.position = "relative";
      pageContainer.style.width = `${scaledWidth / dpr}px`;
      pageContainer.style.height = `${scaledHeight / dpr}px`;
      pageContainer.style.marginBottom = "20px";
      pageContainer.style.setProperty("--scale-factor", scale.toString());
      pageContainer.style.opacity = "0";

      // Create canvas
      const canvas = pageContainer.createEl("canvas");
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      canvas.style.display = "block";
      canvas.style.width = `${scaledWidth / dpr}px`;
      canvas.style.height = `${scaledHeight / dpr}px`;

      // Create bitmap for rendering
      const bitmapPtr = this.pdfium.FPDFBitmap_Create(
        scaledWidth,
        scaledHeight,
        0
      );
      if (!bitmapPtr) {
        throw new Error("Failed to create bitmap");
      }

      try {
        this.pdfium.FPDFBitmap_FillRect(
          bitmapPtr,
          0,
          0,
          scaledWidth,
          scaledHeight,
          0xffffffff
        );

        this.pdfium.FPDF_RenderPageBitmap(
          bitmapPtr,
          pagePtr,
          0,
          0,
          scaledWidth,
          scaledHeight,
          0, // No rotation
          16 // FPDF_REVERSE_BYTE_ORDER flag
        );

        // Get the bitmap buffer
        const bufferPtr = this.pdfium.FPDFBitmap_GetBuffer(bitmapPtr);
        if (!bufferPtr) {
          throw new Error("Failed to get bitmap buffer");
        }

        const bufferSize = scaledWidth * scaledHeight * 4; // RGBA
        const pdfiumModule = this.pdfium.pdfium as any;
        const buffer = new Uint8Array(
          pdfiumModule.HEAPU8.buffer,
          pdfiumModule.HEAPU8.byteOffset + bufferPtr,
          bufferSize
        ).slice();
        const imageData = new ImageData(
          new Uint8ClampedArray(buffer.buffer),
          scaledWidth,
          scaledHeight
        );

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Failed to get 2D context from canvas");
        }
        ctx.putImageData(imageData, 0, 0);

        // Render text layer
        await this.renderTextLayer(
          pagePtr,
          pageContainer,
          width,
          height,
          scale,
          dpr
        );

        // Render link layer
        await this.renderLinkLayer(
          pagePtr,
          pageContainer,
          width,
          height,
          scale,
          dpr
        );

        pageContainer.style.opacity = "1";
      } finally {
        this.pdfium.FPDFBitmap_Destroy(bitmapPtr);
      }
    } finally {
      this.pdfium.FPDF_ClosePage(pagePtr);
    }
  }

  private async renderTextLayer(
    pagePtr: number,
    pageContainer: HTMLElement,
    pageWidth: number,
    pageHeight: number,
    scale: number,
    dpr: number
  ): Promise<void> {
    if (!this.pdfium) return;

    const textPagePtr = this.pdfium.FPDFText_LoadPage(pagePtr);
    if (!textPagePtr) {
      console.warn("Failed to load text page");
      return;
    }

    try {
      const charCount = this.pdfium.FPDFText_CountChars(textPagePtr);
      if (charCount <= 0) return;

      const bufferSize = (charCount + 1) * 2;
      const textBufferPtr = this.pdfium.pdfium.wasmExports.malloc(bufferSize);

      try {
        const extractedLength = this.pdfium.FPDFText_GetText(
          textPagePtr,
          0,
          charCount,
          textBufferPtr
        );

        if (extractedLength > 0) {
          const text = this.pdfium.pdfium.UTF16ToString(textBufferPtr);

          const textLayerDiv = pageContainer.createDiv("textLayer");
          const textSpan = textLayerDiv.createEl("span");
          textSpan.textContent = text;
        }
      } finally {
        this.pdfium.pdfium.wasmExports.free(textBufferPtr);
      }
    } finally {
      this.pdfium.FPDFText_ClosePage(textPagePtr);
    }
  }

  private async renderLinkLayer(
    pagePtr: number,
    pageContainer: HTMLElement,
    pageWidth: number,
    pageHeight: number,
    scale: number,
    dpr: number
  ): Promise<void> {}

  cleanup(): void {}
}
