import { TextFileView, setIcon, WorkspaceLeaf, Notice } from "obsidian";
import { TypstEditor } from "./TypstEditor";
import TypstForObsidian from "./main";
import * as pdfjsLib from "pdfjs-dist";
import { TextLayer } from "pdfjs-dist";
import { AnnotationLayer } from "pdfjs-dist";

export class TypstView extends TextFileView {
  private currentMode: "source" | "reading" = "source";
  private modeIconContainer: HTMLElement | null = null;
  private typstEditor: TypstEditor | null = null;
  private fileContent: string = "";
  private plugin: TypstForObsidian;
  private savedEditorState: {
    cursorPos: number;
    scrollTop: number;
  } | null = null;
  private savedReadingScrollTop: number = 0;

  constructor(leaf: WorkspaceLeaf, plugin: TypstForObsidian) {
    super(leaf);
    this.plugin = plugin;
    this.currentMode = plugin.settings.defaultMode;
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
  }

  onResize(): void {
    super.onResize();
  }

  onClose(): Promise<void> {
    this.cleanupEditor();
    return super.onClose();
  }

  private addModeIcon(): void {
    const viewActions = this.containerEl.querySelector(".view-actions");
    if (viewActions) {
      this.modeIconContainer = createDiv("clickable-icon");
      this.modeIconContainer.addClass("view-action");
      this.modeIconContainer.addEventListener("click", () => {
        this.toggleMode();
      });

      this.updateModeIcon();
      viewActions.prepend(this.modeIconContainer);
      this.addPdfExportButton(viewActions);
    }
  }

  private addPdfExportButton(viewActions: Element): void {
    const exportButton = createDiv("clickable-icon");
    exportButton.addClass("view-action");
    exportButton.setAttribute("aria-label", "Export to PDF");
    setIcon(exportButton, "file-text");
    exportButton.addEventListener("click", async () => {
      await this.exportToPdf();
    });

    if (this.modeIconContainer?.nextSibling) {
      viewActions.insertBefore(
        exportButton,
        this.modeIconContainer.nextSibling
      );
    } else {
      viewActions.appendChild(exportButton);
    }
  }

  public async exportToPdf(): Promise<void> {
    if (!this.file) {
      console.error("No file available for export");
      return;
    }

    try {
      const content = this.getViewData();
      const pdfData = await this.plugin.compileToPdf(
        content,
        "/main.typ",
        "export"
      );
      if (!pdfData) {
        console.error("PDF compilation failed");
        return;
      }

      const filePath = this.file.path;
      const folderPath = filePath.substring(0, filePath.lastIndexOf("/"));
      const baseName = this.file.basename;
      const pdfFileName = `${baseName}.pdf`;
      const pdfPath = folderPath ? `${folderPath}/${pdfFileName}` : pdfFileName;

      const arrayBuffer = pdfData.buffer.slice(
        pdfData.byteOffset,
        pdfData.byteOffset + pdfData.byteLength
      ) as ArrayBuffer;
      const existingFile = this.app.vault.getAbstractFileByPath(pdfPath);
      if (existingFile) {
        await this.app.vault.modifyBinary(existingFile as any, arrayBuffer);
      } else {
        await this.app.vault.createBinary(pdfPath, arrayBuffer);
      }

      new Notice(`PDF exported to: ${pdfPath}`);
    } catch (error) {
      console.error("Failed to export PDF:", error);
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
    this.saveEditorState();

    const pdfData = await this.compile();
    if (!pdfData) return;

    this.setMode("reading");
    await this.showReadingMode(pdfData);
  }

  private switchToSourceMode(): void {
    this.saveEditorState();

    this.setMode("source");
    this.showSourceMode();
    this.restoreEditorState();
  }

  private setMode(mode: "source" | "reading"): void {
    this.currentMode = mode;
    this.updateModeIcon();
  }

  private async compile(): Promise<Uint8Array | null> {
    const content = this.getViewData();
    try {
      const result = await this.plugin.compileToPdf(content);
      return result;
    } catch (error) {
      console.error("PDF compilation failed:", error);
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

  private saveEditorState(): void {
    if (this.typstEditor) {
      const state = this.typstEditor.getEditorState();
      if (state) {
        this.savedEditorState = state;
      }
    } else if (this.currentMode === "reading") {
      const contentEl = this.getContentElement();
      if (contentEl) {
        this.savedReadingScrollTop = contentEl.scrollTop;
      }
    }
  }

  private restoreEditorState(): void {
    if (this.savedEditorState && this.typstEditor) {
      setTimeout(() => {
        if (this.typstEditor && this.savedEditorState) {
          this.typstEditor.restoreEditorState(this.savedEditorState);
          this.typstEditor.focus();
        }
      }, 0);
    } else if (this.typstEditor) {
      setTimeout(() => {
        this.typstEditor?.focus();
      }, 0);
    }
  }

  private async showReadingMode(pdfData: Uint8Array): Promise<void> {
    const contentEl = this.getContentElement();
    if (!contentEl) return;

    contentEl.empty();
    this.cleanupEditor();

    const readingDiv = contentEl.createDiv("typst-reading-mode");

    try {
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdfDocument = await loadingTask.promise;

      for (
        let pageNumber = 1;
        pageNumber <= pdfDocument.numPages;
        pageNumber++
      ) {
        await this.renderPage(pdfDocument, pageNumber, readingDiv);
      }

      if (this.savedReadingScrollTop > 0) {
        setTimeout(() => {
          if (contentEl) {
            contentEl.scrollTop = this.savedReadingScrollTop;
          }
        }, 0);
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

      const canvas = pageContainer.createEl("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.display = "block";
      canvas.style.width = `${Math.floor(viewport.width / outputScale)}px`;
      canvas.style.height = `${Math.floor(viewport.height / outputScale)}px`;

      const context = canvas.getContext("2d")!;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      };

      const renderTask = page.render(renderContext);
      await renderTask.promise;
      const textContent = await page.getTextContent();

      const textLayerDiv = pageContainer.createDiv("textLayer");
      textLayerDiv.style.position = "absolute";
      textLayerDiv.style.left = "0";
      textLayerDiv.style.top = "0";
      textLayerDiv.style.width = `${Math.floor(
        viewport.width / outputScale
      )}px`;
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

      const annotations = await page.getAnnotations();

      if (annotations.length > 0) {
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

      pageContainer.style.opacity = "1";
    } catch (error) {
      console.error(`Failed to render page ${pageNumber}:`, error);
    }
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
          console.log("Navigating to page:", pageNum);
        }
      },

      getPageIndex: async (ref: any) => {
        return await pdfDocument.getPageIndex(ref);
      },
    };
  }

  clear(): void {
    this.fileContent = "";
    if (this.typstEditor) {
      this.typstEditor.setContent("");
    }
  }
}
