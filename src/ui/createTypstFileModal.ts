import { App, Modal, Setting, TFile, normalizePath } from "obsidian";

export class CreateTypstFileModal extends Modal {
  private fileName: string = "";
  private errorEl: HTMLElement | null = null;

  constructor(app: App) {
    super(app);
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    contentEl.empty();

    titleEl.createEl("span", {
      text: "Create new Typst file",
      cls: "typst-modal-title",
    });

    new Setting(contentEl)
      .setName("File name")
      .setDesc("Name of the Typst file (without .typ extension)")
      .addText((text) => {
        text.setValue(this.fileName).onChange((value) => {
          this.fileName = value;
        });

        text.inputEl.focus();
        text.inputEl.select();

        text.inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            this.createFile();
          }
        });

        text.inputEl.addEventListener("input", () => {
          this.clearError();
        });
      });

    const modalFooter = contentEl.createDiv("typst-modal-footer");
    this.errorEl = modalFooter.createDiv("typst-modal-error");

    const buttonContainer = modalFooter.createDiv("typst-modal-buttons");

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
      this.showError("Enter a file name");
      return;
    }

    try {
      const fileName = this.fileName.trim();
      const fullPath = normalizePath(`${fileName}.typ`);
      const existingFile = this.app.vault.getAbstractFileByPath(fullPath);
      if (existingFile && existingFile instanceof TFile) {
        this.showError("File already exists");
        const leaf = this.app.workspace.getLeaf(true);
        leaf.openFile(existingFile as any);
        this.close();
        return;
      }

      const newFile = await this.app.vault.create(fullPath, "", {});
      const leaf = this.app.workspace.getLeaf(true);
      leaf.openFile(newFile);

      this.close();
    } catch (error) {
      console.error("Error creating Typst file:", error);
      this.showError("Error creating file");
    }
  }

  private showError(message: string) {
    if (this.errorEl) {
      this.errorEl.textContent = message;
    }
  }

  private clearError() {
    if (this.errorEl) {
      this.errorEl.textContent = "";
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
