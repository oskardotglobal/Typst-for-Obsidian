import { Plugin, WorkspaceLeaf, TextFileView, setIcon } from "obsidian";

export default class TypstForObsidian extends Plugin {
  async onload() {
    console.log("Loading TypstForObsidian plugin");

    this.registerExtensions(["typ"], "typst-view");

    this.registerView("typst-view", (leaf) => new TypstView(leaf));
  }

  onunload() {
    console.log("Unloading TypstForObsidian plugin");
  }
}

class TypstView extends TextFileView {
  private currentMode: "source" | "reading" = "source";
  private modeIconContainer: HTMLElement | null = null;

  getViewType(): string {
    return "typst-view";
  }

  getDisplayText(): string {
    return this.file?.basename || "Typst File";
  }

  async onOpen(): Promise<void> {
    await super.onOpen();
    this.addModeIcon();
  }

  onClose(): Promise<void> {
    return super.onClose();
  }

  private addModeIcon(): void {
    const viewActions = this.containerEl.querySelector(".view-actions");

    if (viewActions) {
      this.modeIconContainer = viewActions.createDiv(
        "clickable-icon view-action"
      );
      this.modeIconContainer.setAttribute(
        "aria-label",
        "Toggle between source and reading mode"
      );

      viewActions.insertBefore(this.modeIconContainer, viewActions.firstChild);

      this.updateModeIcon();

      this.modeIconContainer.addEventListener("click", () => {
        this.toggleMode();
      });
    }
  }

  private toggleMode(): void {
    // Toggle between source and reading modes
    this.currentMode = this.currentMode === "source" ? "reading" : "source";
    this.updateModeIcon();

    console.log(`Switched to ${this.currentMode} mode`);
  }

  private updateModeIcon(): void {
    if (!this.modeIconContainer) return;

    this.modeIconContainer.empty();

    // Set icon based on current mode
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

  async setViewData(data: string, clear: boolean): Promise<void> {}

  getViewData(): string {
    return "test";
  }

  clear(): void {}
}
