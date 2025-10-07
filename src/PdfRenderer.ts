import * as pdfjsLib from "pdfjs-dist";
import { TextLayer } from "pdfjs-dist";
import { AnnotationLayer } from "pdfjs-dist";

export class PdfRenderer {
  constructor() {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }

  async renderPdf(pdfData: Uint8Array, container: HTMLElement): Promise<void> {
    try {
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdfDocument = await loadingTask.promise;
      for (
        let pageNumber = 1;
        pageNumber <= pdfDocument.numPages;
        pageNumber++
      ) {
        await this.renderPage(pdfDocument, pageNumber, container);
      }
    } catch (error) {
      console.error("PdfRenderer: PDF rendering failed:", error);
      throw error;
    }
  }

  private async renderPage(
    pdfDocument: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    container: HTMLElement
  ): Promise<void> {
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const scale = 1.5;
      const outputScale = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * outputScale });

      const pageContainer = container.createDiv("typst-pdf-page");
      pageContainer.style.position = "relative";
      pageContainer.style.width = `${viewport.width / outputScale}px`;
      pageContainer.style.height = `${viewport.height / outputScale}px`;
      pageContainer.style.marginBottom = "20px";
      pageContainer.style.setProperty("--scale-factor", scale.toString());
      pageContainer.style.opacity = "0";

      // Render canvas
      await this.renderCanvas(page, viewport, pageContainer, outputScale);

      // Render text layer
      await this.renderTextLayer(page, viewport, pageContainer, outputScale);

      // Render annotations
      await this.renderAnnotations(page, viewport, pageContainer, pdfDocument);

      pageContainer.style.opacity = "1";
    } catch (error) {
      console.error(`Failed to render page ${pageNumber}:`, error);
    }
  }

  private async renderCanvas(
    page: pdfjsLib.PDFPageProxy,
    viewport: pdfjsLib.PageViewport,
    pageContainer: HTMLElement,
    outputScale: number
  ): Promise<void> {
    const canvas = pageContainer.createEl("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.display = "block";
    canvas.style.width = `${Math.floor(viewport.width / outputScale)}px`;
    canvas.style.height = `${Math.floor(viewport.height / outputScale)}px`;

    const context = canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    })!;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
      enableWebGL: true,
      renderInteractiveForms: false,
      intent: "display",
    };

    const renderTask = page.render(renderContext);
    await renderTask.promise;
  }

  private async renderTextLayer(
    page: pdfjsLib.PDFPageProxy,
    viewport: pdfjsLib.PageViewport,
    pageContainer: HTMLElement,
    outputScale: number
  ): Promise<void> {
    const textContent = await page.getTextContent();

    const textLayerDiv = pageContainer.createDiv("textLayer");
    textLayerDiv.style.position = "absolute";
    textLayerDiv.style.left = "0";
    textLayerDiv.style.top = "0";
    textLayerDiv.style.width = `${Math.floor(viewport.width / outputScale)}px`;
    textLayerDiv.style.height = `${Math.floor(
      viewport.height / outputScale
    )}px`;
    textLayerDiv.style.overflow = "hidden";
    textLayerDiv.style.lineHeight = "1.0";

    const textLayer = new TextLayer({
      textContentSource: textContent,
      container: textLayerDiv,
      viewport: viewport,
    });

    await textLayer.render();
  }

  private async renderAnnotations(
    page: pdfjsLib.PDFPageProxy,
    viewport: pdfjsLib.PageViewport,
    pageContainer: HTMLElement,
    pdfDocument: pdfjsLib.PDFDocumentProxy
  ): Promise<void> {
    const annotations = await page.getAnnotations();

    if (annotations.length === 0) return;

    const annotationLayerDiv = pageContainer.createDiv("annotationLayer");
    annotationLayerDiv.style.position = "absolute";
    annotationLayerDiv.style.left = "0";
    annotationLayerDiv.style.top = "0";
    annotationLayerDiv.style.right = "0";
    annotationLayerDiv.style.bottom = "0";

    const annotationViewport = viewport.clone({ dontFlip: true });
    const annotationLayer = new AnnotationLayer({
      div: annotationLayerDiv,
      accessibilityManager: null,
      annotationCanvasMap: null,
      annotationEditorUIManager: null,
      page: page,
      viewport: annotationViewport,
      structTreeLayer: null,
    });

    await annotationLayer.render({
      viewport: annotationViewport,
      div: annotationLayerDiv,
      annotations: annotations,
      page: page,
      linkService: this.createLinkService(pdfDocument),
      downloadManager: undefined,
      annotationStorage: undefined,
      imageResourcesPath: "",
      renderForms: true,
      enableScripting: false,
      hasJSActions: false,
      fieldObjects: null,
      annotationCanvasMap: undefined,
      accessibilityManager: undefined,
      annotationEditorUIManager: undefined,
      structTreeLayer: undefined,
    });
  }

  private createLinkService(pdfDocument: pdfjsLib.PDFDocumentProxy): any {
    return {
      externalLinkTarget: 2,
      externalLinkRel: "noopener noreferrer",
      externalLinkEnabled: true,

      getDestinationHash: (dest: any) => {
        return `#page=${dest}`;
      },

      goToDestination: async (dest: any) => {
        if (typeof dest === "string") {
          const explicitDest = await pdfDocument.getDestination(dest);
          if (explicitDest) {
            dest = explicitDest;
          }
        }

        if (Array.isArray(dest)) {
          const pageRef = dest[0];
          const pageIndex = await pdfDocument.getPageIndex(pageRef);
          const pageNum = pageIndex + 1;
        }
      },

      getPageIndex: async (ref: any) => {
        return await pdfDocument.getPageIndex(ref);
      },
    };
  }
}
