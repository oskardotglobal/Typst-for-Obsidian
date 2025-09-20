import {
  Plugin,
  WorkspaceLeaf,
  TextFileView,
  setIcon,
  Modal,
  Setting,
  TFile,
  TFolder,
  Notice,
  normalizePath,
} from "obsidian";

export default class TypstForObsidian extends Plugin {
  async onload() {
    this.registerExtensions(["typ"], "typst-view");
    this.registerView("typst-view", (leaf) => new TypstView(leaf));

    this.addCommand({
      id: "create-typst-file",
      name: "Create new Typst file",
      callback: () => {
        new CreateTypstFileModal(this.app, this).open();
      },
    });
  }

  onunload() {}
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
    this.currentMode = this.currentMode === "source" ? "reading" : "source";
    this.updateModeIcon();
    console.log(`Switched to ${this.currentMode} mode`);
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

  async setViewData(data: string, clear: boolean): Promise<void> {}

  getViewData(): string {
    return "test";
  }

  clear(): void {}
}

class CreateTypstFileModal extends Modal {
  private fileName: string = "";
  private plugin: TypstForObsidian;

  constructor(app: any, plugin: TypstForObsidian) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: "New Typst file" });

    new Setting(contentEl)
      .setName("File name")
      .setDesc("Enter the name of the Typst file (without .typ extension)")
      .addText((text) => {
        text
          .setPlaceholder("note")
          .setValue(this.fileName)
          .onChange((value) => {
            this.fileName = value;
          });

        text.inputEl.focus();
        text.inputEl.select();

        text.inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            this.createFile();
          }
        });
      });

    const buttonContainer = contentEl.createDiv("modal-button-container");
    const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
    cancelButton.addEventListener("click", () => {
      this.close();
    });

    const createButton = buttonContainer.createEl("button", {
      text: "Create",
      cls: "mod-cta",
    });

    createButton.addEventListener("click", () => {
      this.createFile();
    });
  }

  async createFile() {
    if (!this.fileName.trim()) {
      new Notice("Please enter a file name");
      return;
    }

    try {
      // Normalize the path and add .typ extension
      const fileName = this.fileName.trim();
      const fullPath = normalizePath(`${fileName}.typ`);

      // Check if file already exists
      const existingFile = this.app.vault.getAbstractFileByPath(fullPath);
      if (existingFile && existingFile instanceof TFile) {
        new Notice("File already exists");
        const leaf = this.app.workspace.getLeaf(true);
        leaf.openFile(existingFile as any);
        this.close();
        return;
      }

      // Create the new file
      const newFile = await this.app.vault.create(fullPath, "", {});

      // Open the file in a new leaf
      const leaf = this.app.workspace.getLeaf(true);
      leaf.openFile(newFile);

      this.close();
    } catch (error) {
      console.error("Error creating Typst file:", error);
      new Notice("Error creating file");
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
