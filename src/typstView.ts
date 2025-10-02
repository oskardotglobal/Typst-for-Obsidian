import { TextFileView, setIcon, WorkspaceLeaf } from "obsidian";
import { TypstEditor } from "./TypstEditor";
import TypstForObsidian from "./main";
import * as pdfjsLib from "pdfjs-dist";

export class TypstView extends TextFileView {
  private currentMode: "source" | "reading" = "source";
  private modeIconContainer: HTMLElement | null = null;
  private typstEditor: TypstEditor | null = null;
  private fileContent: string = "";
  private plugin: TypstForObsidian;

  constructor(leaf: WorkspaceLeaf, plugin: TypstForObsidian) {
    super(leaf);
    this.plugin = plugin;
    this.currentMode = plugin.settings.defaultMode;

    // Configure PDF.js worker - use CDN for browser compatibility
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }

  getViewType(): string {
    return "typst-view";
  }

  getDisplayText(): string {
    return this.file?.basename || "Typst File";
  }

  getIcon(): string {
    return "typst-file";
  }

  async onOpen(): Promise<void> {
    await super.onOpen();
    this.addModeIcon();
    this.applySettings();
  }

  onResize(): void {
    super.onResize();
    this.applySettings();
  }

  private applySettings(): void {
    // Apply readable width setting
    if (this.plugin.settings.editorReadableWidth) {
      this.containerEl.addClass("typst-readable-width");
      console.log("🔍 TypstView: Applied typst-readable-width class");
    } else {
      this.containerEl.removeClass("typst-readable-width");
      console.log("🔍 TypstView: Removed typst-readable-width class");
    }

    // Log CSS variable values
    const styles = getComputedStyle(document.body);
    const fileLineWidth = styles.getPropertyValue("--file-line-width").trim();
    const fileMargins = styles.getPropertyValue("--file-margins").trim();
    console.log("🔍 TypstView: --file-line-width CSS value:", fileLineWidth);
    console.log("🔍 TypstView: --file-margins CSS value:", fileMargins);
  }

  onClose(): Promise<void> {
    this.cleanupEditor();
    return super.onClose();
  }

  private addModeIcon(): void {
    const viewActions = this.containerEl.querySelector(".view-actions");
    if (viewActions) {
      this.modeIconContainer = viewActions.createDiv("clickable-icon");
      this.modeIconContainer.addClass("view-action");
      this.modeIconContainer.addEventListener("click", () => {
        this.toggleMode();
      });
      this.updateModeIcon();
    }
  }

  public async toggleMode(): Promise<void> {
    if (this.currentMode === "source") {
      await this.switchToReadingMode();
    } else {
      this.switchToSourceMode();
    }
  }

  public getCurrentMode(): string {
    return this.currentMode;
  }

  public async recompileIfInReadingMode(): Promise<void> {
    if (this.currentMode === "reading") {
      const pdfData = await this.compile();
      if (pdfData) {
        await this.showReadingMode(pdfData);
      }
    }
  }

  private async switchToReadingMode(): Promise<void> {
    const pdfData = await this.compile();
    if (!pdfData) return;

    this.setMode("reading");
    await this.showReadingMode(pdfData);
  }

  private switchToSourceMode(): void {
    this.setMode("source");
    this.showSourceMode();
  }

  private setMode(mode: "source" | "reading"): void {
    this.currentMode = mode;
    this.updateModeIcon();
  }

  private async compile(): Promise<Uint8Array | null> {
    console.log("🟡 TypstView: Starting PDF compile()");
    const content = this.getViewData();
    console.log("🟡 TypstView: Got content, length:", content.length);

    console.log("🟡 TypstView: Calling plugin's compileToPdf");
    try {
      const result = await this.plugin.compileToPdf(content);
      console.log("🟡 TypstView: PDF compilation completed successfully");
      return result;
    } catch (error) {
      console.error("🔴 TypstView: PDF compilation failed:", error);
      throw error;
    }
  }
  private updateModeIcon(): void {
    if (!this.modeIconContainer) return;

    this.modeIconContainer.empty();

    if (this.currentMode === "source") {
      setIcon(this.modeIconContainer, "pencil-line");
      this.modeIconContainer.setAttribute(
        "aria-label",
        "Currently in source mode. Click to switch to reading mode."
      );
    } else {
      setIcon(this.modeIconContainer, "book-open");
      this.modeIconContainer.setAttribute(
        "aria-label",
        "Currently in reading mode. Click to switch to source mode."
      );
    }
  }

  async setViewData(data: string, clear: boolean): Promise<void> {
    this.fileContent = data;

    if (this.currentMode === "source") {
      this.showSourceMode();
    } else {
      await this.loadReadingMode(data);
    }
  }

  private async loadReadingMode(data: string): Promise<void> {
    const pdfData = await this.compile();

    if (!pdfData) {
      // Fall back to source mode
      this.setMode("source");
      this.showSourceMode();
    } else {
      await this.showReadingMode(pdfData);
    }
  }

  getViewData(): string {
    if (this.currentMode === "source" && this.typstEditor) {
      return this.typstEditor.getContent();
    }
    return this.fileContent;
  }

  private getContentElement(): HTMLElement | null {
    return this.containerEl.querySelector(".view-content") as HTMLElement;
  }

  private cleanupEditor(): void {
    if (this.typstEditor) {
      this.typstEditor.destroy();
      this.typstEditor = null;
    }
  }

  private showSourceMode(): void {
    const contentEl = this.getContentElement();
    if (!contentEl) return;

    contentEl.empty();
    this.cleanupEditor();

    this.typstEditor = new TypstEditor(
      contentEl,
      this.app,
      (content: string) => {
        this.fileContent = content;
        this.requestSave();
      }
    );

    this.typstEditor.initialize(this.fileContent);
  }

  private async showReadingMode(pdfData: Uint8Array): Promise<void> {
    const contentEl = this.getContentElement();
    if (!contentEl) return;

    contentEl.empty();
    this.cleanupEditor();

    const readingDiv = contentEl.createDiv("typst-reading-mode");
    console.log(
      "🔍 TypstView: Reading div created, clientWidth:",
      readingDiv.clientWidth,
      "offsetWidth:",
      readingDiv.offsetWidth
    );
    console.log(
      "🔍 TypstView: ContentEl clientWidth:",
      contentEl.clientWidth,
      "offsetWidth:",
      contentEl.offsetWidth
    );

    try {
      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdfDocument = await loadingTask.promise;

      console.log(
        `🟡 TypstView: PDF loaded with ${pdfDocument.numPages} pages`
      );

      // Render each page
      for (
        let pageNumber = 1;
        pageNumber <= pdfDocument.numPages;
        pageNumber++
      ) {
        await this.renderPage(pdfDocument, pageNumber, readingDiv);
      }
    } catch (error) {
      console.error("🔴 TypstView: PDF rendering failed:", error);
    }
  }

  private async renderPage(
    pdfDocument: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    container: HTMLElement
  ): Promise<void> {
    try {
      const page = await pdfDocument.getPage(pageNumber);

      // Use fixed 1.5 scale as required
      const scale = 1.5;
      const viewport = page.getViewport({ scale: scale });

      console.log(
        `🔍 TypstView: Page ${pageNumber} - Scale: ${scale}, PDF Viewport: ${viewport.width}x${viewport.height}`
      );
      console.log(
        `🔍 TypstView: Container clientWidth: ${container.clientWidth}, offsetWidth: ${container.offsetWidth}`
      );

      // Support HiDPI screens for sharp rendering
      const outputScale = window.devicePixelRatio || 1;
      console.log(
        `🔍 TypstView: OutputScale (devicePixelRatio): ${outputScale}`
      );

      // Create page container - let CSS handle sizing
      const pageContainer = container.createDiv("typst-pdf-page");

      console.log(
        `🔍 TypstView: Page container created with class 'typst-pdf-page'`
      );

      // Create canvas
      const canvas = pageContainer.createEl("canvas");
      const context = canvas.getContext("2d")!;

      // Set canvas size for HiDPI
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = Math.floor(viewport.width) + "px";
      canvas.style.height = Math.floor(viewport.height) + "px";

      console.log(
        `🔍 TypstView: Canvas actual size: ${canvas.width}x${canvas.height}`
      );
      console.log(
        `🔍 TypstView: Canvas CSS size: ${canvas.style.width} x ${canvas.style.height}`
      );

      // Apply transform for HiDPI rendering
      const transform =
        outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

      const renderContext = {
        canvasContext: context,
        transform: transform,
        viewport: viewport,
        canvas: canvas,
      };

      // Render the page
      await page.render(renderContext).promise;

      // Add text layer for selection
      const textLayerDiv = pageContainer.createDiv("textLayer");
      // textLayerDiv.style.position = "absolute";
      // textLayerDiv.style.left = "0";
      // textLayerDiv.style.top = "0";
      // textLayerDiv.style.width = Math.floor(viewport.width) + "px";
      // textLayerDiv.style.height = Math.floor(viewport.height) + "px";
      // textLayerDiv.style.pointerEvents = "auto"; // Enable text selection

      const textContent = await page.getTextContent();
      const textLayer = new pdfjsLib.TextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport: viewport,
      });

      await textLayer.render();

      // Add annotation layer for links
      const annotationLayer = pageContainer.createDiv("annotationLayer");
      annotationLayer.style.position = "absolute";
      annotationLayer.style.left = "0";
      annotationLayer.style.top = "0";
      annotationLayer.style.width = Math.floor(viewport.width) + "px";
      annotationLayer.style.height = Math.floor(viewport.height) + "px";

      const annotations = await page.getAnnotations();

      if (annotations.length > 0) {
        const { AnnotationLayerBuilder } = pdfjsLib as any;

        if (AnnotationLayerBuilder) {
          const annotationLayerBuilder = new AnnotationLayerBuilder({
            pageDiv: annotationLayer,
            pdfPage: page,
            linkService: {
              getDestinationHash: (dest: any) => `#${JSON.stringify(dest)}`,
              getAnchorUrl: (hash: string) => `#${hash}`,
              executeNamedAction: (action: string) => {
                console.log("Named action:", action);
              },
              executeSetOCGState: (action: any) => {
                console.log("OCG state:", action);
              },
            },
            renderInteractiveForms: false,
            viewport: viewport,
          });
          annotationLayerBuilder.render(viewport);
        }
      }
    } catch (error) {
      console.error(
        `🔴 TypstView: Failed to render page ${pageNumber}:`,
        error
      );
    }
  }

  clear(): void {
    this.fileContent = "";
    if (this.typstEditor) {
      this.typstEditor.setContent("");
    }
  }
}
