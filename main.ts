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
import { TypstEditor } from "./src/TypstEditor";

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
  private typstEditor: TypstEditor | null = null;
  private fileContent: string = "";

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
    if (this.typstEditor) {
      this.typstEditor.destroy();
      this.typstEditor = null;
    }
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
    // Save content if in source mode
    if (this.currentMode === "source" && this.typstEditor) {
      this.fileContent = this.typstEditor.getContent();
    }

    this.currentMode = this.currentMode === "source" ? "reading" : "source";
    this.updateModeIcon();

    if (this.currentMode === "source") {
      this.showSourceMode();
    } else {
      this.showReadingMode();
    }

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
          // Auto-save
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
      // add later
      const preElement = contentEl.createEl("pre", {
        text: this.fileContent,
        cls: "typst-reading-mode",
      });
    }
  }

  clear(): void {
    this.fileContent = "";
    if (this.typstEditor) {
      this.typstEditor.destroy();
      this.typstEditor = null;
    }
  }
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
