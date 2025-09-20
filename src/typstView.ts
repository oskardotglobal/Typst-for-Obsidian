import { TextFileView, setIcon } from "obsidian";
import { TypstEditor } from "./TypstEditor";

export class TypstView extends TextFileView {
  private currentMode: "source" | "reading" = "source";
  private modeIconContainer: HTMLElement | null = null;
  private typstEditor: TypstEditor | null = null;
  private fileContent: string = "";

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

  public toggleMode(): void {
    this.currentMode = this.currentMode === "source" ? "reading" : "source";
    this.updateModeIcon();

    if (this.currentMode === "source") {
      this.showSourceMode();
    } else {
      this.showReadingMode();
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

  private showReadingMode(): void {
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
      readingDiv.textContent = this.fileContent;
    }
  }

  clear(): void {
    this.fileContent = "";
    if (this.typstEditor) {
      this.typstEditor.setContent("");
    }
  }
}
