import {
  App,
  Modal,
  Notice,
  Plugin,
  Setting,
  TFile,
  normalizePath,
} from "obsidian";

export class CreateTypstFileModal extends Modal {
  private fileName: string = "";
  private plugin: Plugin;

  constructor(app: App, plugin: Plugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: "Create New Typst File" });

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
