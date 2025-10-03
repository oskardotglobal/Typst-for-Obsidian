import { TextFileView, setIcon, WorkspaceLeaf } from "obsidian";
import { TypstEditor } from "./TypstEditor";
import TypstForObsidian from "./main";
import * as pdfjsLib from "pdfjs-dist";
import { TextLayer } from "pdfjs-dist";
import { AnnotationLayer } from "pdfjs-dist";
import "./pdf_viewer.css";
// import PDFWorker from 'pdfjs-dist/build/pdf.worker.min.mjs';

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

    try {
      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdfDocument = await loadingTask.promise;

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
      console.log(`📄 Starting to render page ${pageNumber}`);
      const page = await pdfDocument.getPage(pageNumber);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      console.log(
        `📐 Viewport dimensions: ${viewport.width}x${viewport.height}, scale: ${scale}`
      );

      // --- Page container ---
      const pageContainer = container.createDiv("typst-pdf-page");
      pageContainer.style.position = "relative";
      pageContainer.style.width = `${viewport.width}px`;
      pageContainer.style.height = `${viewport.height}px`;
      pageContainer.style.marginBottom = "20px";
      pageContainer.style.setProperty("--scale-factor", scale.toString());
      console.log(
        `📦 Page container created with dimensions: ${viewport.width}x${viewport.height}`
      );

      // --- Canvas layer (bottom) ---
      const canvas = pageContainer.createEl("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.display = "block";
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const context = canvas.getContext("2d")!;
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      };

      console.log(`🎨 Rendering canvas for page ${pageNumber}...`);
      const renderTask = page.render(renderContext);
      await renderTask.promise;
      console.log(`✅ Canvas rendered successfully for page ${pageNumber}`);

      // --- Text layer (middle) ---
      console.log(`📝 Getting text content for page ${pageNumber}...`);
      const textContent = await page.getTextContent();
      console.log(`📝 Text content retrieved:`, {
        items: textContent.items.length,
        styles: Object.keys(textContent.styles || {}).length,
      });

      const textLayerDiv = pageContainer.createDiv("textLayer");
      textLayerDiv.style.position = "absolute";
      textLayerDiv.style.left = "0";
      textLayerDiv.style.top = "0";
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;
      textLayerDiv.style.overflow = "hidden";
      textLayerDiv.style.lineHeight = "1.0";

      console.log(
        `🎭 Text layer div created with dimensions: ${viewport.width}x${viewport.height}`
      );

      // Create TextLayer instance using the modern API
      console.log(`🔧 Creating TextLayer instance...`);
      const textLayer = new TextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport: viewport,
      });

      console.log(`⚙️ Rendering text layer...`);
      await textLayer.render();
      console.log(`✅ Text layer rendered successfully`);
      console.log(
        `📊 Text layer children count: ${textLayerDiv.children.length}`
      );
      console.log(
        `📊 Text layer HTML:`,
        textLayerDiv.innerHTML.substring(0, 500)
      );

      // Add endOfContent div - official PDF.js solution for selection gaps
      const endOfContent = textLayerDiv.createDiv("endOfContent");
      console.log(`✅ Added endOfContent element to prevent selection jumping`);

      // Implement proper PDF.js selection handling
      let prevRange: Range | null = null;

      const resetEndOfContent = () => {
        textLayerDiv.append(endOfContent);
        endOfContent.style.width = "";
        endOfContent.style.height = "";
        textLayerDiv.classList.remove("selecting");
        console.log(`🔄 Reset endOfContent to bottom`);
      };

      textLayerDiv.addEventListener("mousedown", () => {
        textLayerDiv.classList.add("selecting");
        console.log(`🟢 Started selecting`);
      });

      document.addEventListener("pointerup", () => {
        resetEndOfContent();
      });

      document.addEventListener("selectionchange", () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
          resetEndOfContent();
          return;
        }

        // Check if selection is in this text layer
        const range = selection.getRangeAt(0);
        if (!range.intersectsNode(textLayerDiv)) {
          resetEndOfContent();
          return;
        }

        textLayerDiv.classList.add("selecting");

        // Move endOfContent element to limit selection jumping
        // Determine which side of selection is being modified
        const modifyStart =
          prevRange &&
          (range.compareBoundaryPoints(Range.END_TO_END, prevRange) === 0 ||
            range.compareBoundaryPoints(Range.START_TO_END, prevRange) === 0);

        let anchor = modifyStart ? range.startContainer : range.endContainer;
        if (anchor.nodeType === Node.TEXT_NODE) {
          anchor = anchor.parentNode as Node;
        }

        // If at end of element, move to previous sibling
        if (!modifyStart && range.endOffset === 0) {
          let current = anchor as HTMLElement;
          do {
            while (!current.previousSibling) {
              current = current.parentNode as HTMLElement;
              if (!current || current === textLayerDiv) break;
            }
            if (current === textLayerDiv) break;
            current = current.previousSibling as HTMLElement;
          } while (current && !current.childNodes.length);
          anchor = current;
        }

        // Ensure anchor is valid and reposition endOfContent
        if (anchor && textLayerDiv.contains(anchor)) {
          // Set dimensions to match text layer (fills entire layer)
          endOfContent.style.width = `${viewport.width}px`;
          endOfContent.style.height = `${viewport.height}px`;

          const anchorParent = (anchor as HTMLElement).parentElement;
          if (anchorParent && anchorParent.contains(anchor as HTMLElement)) {
            const insertTarget = modifyStart
              ? (anchor as HTMLElement)
              : (anchor as HTMLElement).nextSibling;

            if (insertTarget) {
              anchorParent.insertBefore(endOfContent, insertTarget);
              console.log(`📍 Moved endOfContent next to selection anchor`);
            }
          }
        }

        prevRange = range.cloneRange();
      });

      // Check computed styles
      const computedStyle = window.getComputedStyle(textLayerDiv);
      console.log(`🎨 Text layer computed styles:`, {
        position: computedStyle.position,
        zIndex: computedStyle.zIndex,
        pointerEvents: computedStyle.pointerEvents,
        userSelect: computedStyle.userSelect,
        color: computedStyle.color,
        opacity: computedStyle.opacity,
      });

      // --- Annotation layer (top) ---
      const annotations = await page.getAnnotations();
      console.log(`🔖 Annotations found: ${annotations.length}`);

      if (annotations.length > 0) {
        const annotationLayerDiv = pageContainer.createDiv("annotationLayer");
        annotationLayerDiv.style.position = "absolute";
        annotationLayerDiv.style.left = "0";
        annotationLayerDiv.style.top = "0";
        annotationLayerDiv.style.right = "0";
        annotationLayerDiv.style.bottom = "0";

        // Clone viewport with dontFlip for annotations
        const annotationViewport = viewport.clone({ dontFlip: true });

        // Create AnnotationLayer instance
        const annotationLayer = new AnnotationLayer({
          div: annotationLayerDiv,
          accessibilityManager: null,
          annotationCanvasMap: null,
          annotationEditorUIManager: null,
          page: page,
          viewport: annotationViewport,
          structTreeLayer: null,
        });

        console.log(`🔖 Rendering annotation layer...`);
        // Render with parameters
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
        console.log(`✅ Annotation layer rendered successfully`);
      }

      pageContainer.style.opacity = "1";

      console.log(
        `🎉 Page ${pageNumber} fully rendered. Final layer structure:`,
        {
          pageContainer: pageContainer.className,
          canvas: !!canvas,
          textLayer: !!textLayerDiv,
          textLayerSpans: textLayerDiv.querySelectorAll("span").length,
          annotationLayer: annotations.length > 0,
        }
      );
    } catch (error) {
      console.error(`❌ Failed to render page ${pageNumber}:`, error);
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
