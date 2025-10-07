import { init, WrappedPdfiumModule } from "@embedpdf/pdfium";

export class PdfRenderer {
  private pdfium: WrappedPdfiumModule | null = null;
  private initPromise: Promise<void> | null = null;
  private measureCanvas: HTMLCanvasElement | null = null;
  private measureCtx: CanvasRenderingContext2D | null = null;

  constructor() {}

  private ensureMeasureCanvas(): CanvasRenderingContext2D {
    if (!this.measureCtx) {
      this.measureCanvas = document.createElement("canvas");
      this.measureCtx = this.measureCanvas.getContext("2d", {
        alpha: false,
        willReadFrequently: true,
      });
      if (!this.measureCtx) {
        throw new Error("Failed to create measurement canvas context");
      }
    }
    return this.measureCtx;
  }

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

      const textLayerDiv = pageContainer.createDiv("textLayer");
      const ctx = this.ensureMeasureCanvas();
      const rectCount = this.pdfium.FPDFText_CountRects(
        textPagePtr,
        0,
        charCount
      );
      if (rectCount <= 0) return;

      const pdfiumModule = this.pdfium.pdfium as any;
      const leftPtr = pdfiumModule._malloc(8);
      const topPtr = pdfiumModule._malloc(8);
      const rightPtr = pdfiumModule._malloc(8);
      const bottomPtr = pdfiumModule._malloc(8);

      const textBufferSize = 1000;
      const textBufferPtr = pdfiumModule._malloc(textBufferSize * 2);

      let lastFontSize = -1;
      let lastFontString = "";

      try {
        for (let rectIndex = 0; rectIndex < rectCount; rectIndex++) {
          const success = this.pdfium.FPDFText_GetRect(
            textPagePtr,
            rectIndex,
            leftPtr,
            topPtr,
            rightPtr,
            bottomPtr
          );

          if (!success) continue;

          const left = pdfiumModule.HEAPF64[leftPtr >> 3];
          const top = pdfiumModule.HEAPF64[topPtr >> 3];
          const right = pdfiumModule.HEAPF64[rightPtr >> 3];
          const bottom = pdfiumModule.HEAPF64[bottomPtr >> 3];

          const textLength = this.pdfium.FPDFText_GetBoundedText(
            textPagePtr,
            left,
            top,
            right,
            bottom,
            textBufferPtr,
            textBufferSize
          );

          if (textLength > 1) {
            const text = this.pdfium.pdfium.UTF16ToString(textBufferPtr);
            const midX = (left + right) / 2;
            const midY = (top + bottom) / 2;
            const charIndex = this.pdfium.FPDFText_GetCharIndexAtPos(
              textPagePtr,
              midX,
              midY,
              2.0,
              2.0
            );

            let fontSize = (top - bottom) * scale;
            if (charIndex >= 0) {
              const pdfFontSize = this.pdfium.FPDFText_GetFontSize(
                textPagePtr,
                charIndex
              );
              if (pdfFontSize > 0) {
                fontSize = pdfFontSize * scale;
              }
            }

            const textSpan = textLayerDiv.createEl("span");
            textSpan.textContent = text;

            const x = left * scale;
            const y = (pageHeight - top) * scale;
            const pdfWidth = (right - left) * scale;

            textSpan.style.left = `${x}px`;
            textSpan.style.top = `${y}px`;
            textSpan.style.fontSize = `${fontSize}px`;
            textSpan.style.fontFamily = "sans-serif";

            if (fontSize !== lastFontSize) {
              lastFontSize = fontSize;
              lastFontString = `${fontSize}px sans-serif`;
              ctx.font = lastFontString;
            }

            const metrics = ctx.measureText(text);
            const browserWidth = metrics.width;

            if (browserWidth > 0 && text.length > 1) {
              const scaleX = pdfWidth / browserWidth;
              textSpan.style.transform = `scaleX(${scaleX})`;
              textSpan.style.transformOrigin = "0 0";
            }
          }
        }
      } finally {
        pdfiumModule._free(textBufferPtr);
        pdfiumModule._free(leftPtr);
        pdfiumModule._free(topPtr);
        pdfiumModule._free(rightPtr);
        pdfiumModule._free(bottomPtr);
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
