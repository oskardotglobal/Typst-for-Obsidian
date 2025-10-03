import { TextFileView, WorkspaceLeaf, Notice } from "obsidian";
import { TypstEditor } from "./TypstEditor";
import TypstForObsidian from "./main";
import { PdfRenderer } from "./PdfRenderer";
import { ViewActionBar } from "./ViewActionBar";
import { EditorStateManager } from "./EditorStateManager";

export class TypstView extends TextFileView {
  private currentMode: "source" | "reading" = "source";
  private typstEditor: TypstEditor | null = null;
  private fileContent: string = "";
  private plugin: TypstForObsidian;
  private pdfRenderer: PdfRenderer;
  private actionBar: ViewActionBar | null = null;
  private stateManager: EditorStateManager;

  constructor(leaf: WorkspaceLeaf, plugin: TypstForObsidian) {
    super(leaf);
    this.plugin = plugin;
    this.currentMode = plugin.settings.defaultMode;
    this.pdfRenderer = new PdfRenderer();
    this.stateManager = new EditorStateManager();
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
    this.initializeActionBar();
  }

  onResize(): void {
    super.onResize();
  }

  onClose(): Promise<void> {
    this.cleanupEditor();
    this.actionBar?.destroy();
    this.stateManager.clear();
    return super.onClose();
  }

  private initializeActionBar(): void {
    const viewActions = this.containerEl.querySelector(".view-actions");
    if (viewActions) {
      this.actionBar = new ViewActionBar(
        viewActions,
        () => this.toggleMode(),
        () => this.exportToPdf()
      );
      this.actionBar.initialize(this.currentMode);
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
    this.actionBar?.setMode(mode);
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
    if (this.currentMode === "source") {
      this.stateManager.saveEditorState(this.typstEditor);
    } else if (this.currentMode === "reading") {
      const contentEl = this.getContentElement();
      this.stateManager.saveReadingScrollTop(contentEl);
    }
  }

  private restoreEditorState(): void {
    this.stateManager.restoreEditorState(this.typstEditor);
  }

  private async showReadingMode(pdfData: Uint8Array): Promise<void> {
    const contentEl = this.getContentElement();
    if (!contentEl) return;

    contentEl.empty();
    this.cleanupEditor();

    const readingDiv = contentEl.createDiv("typst-reading-mode");

    try {
      await this.pdfRenderer.renderPdf(pdfData, readingDiv);

      // Restore scroll position
      const savedScroll = this.stateManager.getSavedReadingScrollTop();
      if (savedScroll > 0) {
        this.stateManager.restoreReadingScrollTop(contentEl);
      }
    } catch (error) {
      console.error("🔴 TypstView: PDF rendering failed:", error);
    }
  }

  clear(): void {
    this.fileContent = "";
    if (this.typstEditor) {
      this.typstEditor.setContent("");
    }
  }
}
