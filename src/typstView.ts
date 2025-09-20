import { TextFileView, setIcon, WorkspaceLeaf } from "obsidian";
import { TypstEditor } from "./TypstEditor";
import { TypstCompiler } from "./TypstCompiler";
import TypstForObsidian from "../main";

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

  onClose(): Promise<void> {
    if (this.typstEditor) {
      this.typstEditor.destroy();
      this.typstEditor = null;
    }
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
      // Compile before switching to read mode
      const currentContent = this.getViewData();
      const compiler = TypstCompiler.getInstance();
      const svg = await compiler.compileToSvg(currentContent);

      if (!svg) {
        return;
      }

      this.currentMode = "reading";
      this.updateModeIcon();
      this.showReadingMode(svg);
    } else {
      this.currentMode = "source";
      this.updateModeIcon();
      this.showSourceMode();
    }
  }

  public getCurrentMode(): string {
    return this.currentMode;
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
      this.showReadingMode();
    }
  }

  getViewData(): string {
    if (this.currentMode === "source" && this.typstEditor) {
      return this.typstEditor.getContent();
    }
    return this.fileContent;
  }

  private showSourceMode(): void {
    const contentEl = this.containerEl.querySelector(
      ".view-content"
    ) as HTMLElement;
    if (contentEl) {
      contentEl.empty();

      if (this.typstEditor) {
        this.typstEditor.destroy();
        this.typstEditor = null;
      }

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
  }

  private showReadingMode(svg?: string): void {
    const contentEl = this.containerEl.querySelector(
      ".view-content"
    ) as HTMLElement;
    if (contentEl) {
      contentEl.empty();

      if (this.typstEditor) {
        this.typstEditor.destroy();
        this.typstEditor = null;
      }

      const readingDiv = contentEl.createDiv("typst-reading-mode");
      readingDiv.innerHTML = `
        <div class="typst-rendered-content">
          ${svg}
        </div>
      `;
    }
  }

  clear(): void {
    this.fileContent = "";
    if (this.typstEditor) {
      this.typstEditor.setContent("");
    }
  }
}
