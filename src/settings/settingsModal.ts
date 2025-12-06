import { App, Modal } from "obsidian";

export interface SettingsModalButton {
  label?: string;
  action: (
    value: string,
    showError: (msg: string) => void,
    close: () => void,
    updateValue: (newValue: string) => void
  ) => void | Promise<void>;
}

export interface SettingsModalConfig {
  title: string;
  description?: string;
  readOnly?: boolean;
  initialValue?: string;
  buttons?: {
    save?: SettingsModalButton;
    reset?: SettingsModalButton;
  };
}

export class SettingsModal extends Modal {
  private config: SettingsModalConfig;
  private errorEl: HTMLElement | null = null;

  constructor(app: App, config: SettingsModalConfig) {
    super(app);
    this.config = config;
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    contentEl.empty();
    contentEl.addClass("typst-modal");

    titleEl.createEl("span", {
      text: this.config.title,
      cls: "typst-modal-title",
    });

    if (this.config.description) {
      const descriptionEl = contentEl.createEl("span", {
        cls: "typst-modal-description",
      });
      this.config.description
        .split(/(`[^`]+`)/g)
        .forEach((part) =>
          part.startsWith("`") && part.endsWith("`")
            ? descriptionEl.createEl("code", { text: part.slice(1, -1) })
            : part && descriptionEl.appendText(part)
        );
    }

    const textArea = contentEl.createEl("textarea", {
      cls: "typst-modal-textarea",
    });

    if (this.config.initialValue !== undefined) {
      textArea.value = this.config.initialValue;
    }

    if (this.config.readOnly) {
      textArea.readOnly = true;
      textArea.addEventListener("click", () => {
        textArea.select();
      });
    } else {
      textArea.addEventListener("input", () => {
        this.clearError();
      });
    }

    if (this.config.buttons) {
      const modalFooter = contentEl.createDiv("typst-modal-footer");
      this.errorEl = modalFooter.createDiv("typst-modal-error");

      const buttonContainer = modalFooter.createDiv("typst-modal-buttons");

      const cancelButton = buttonContainer.createEl("button", {
        text: "Cancel",
      });
      cancelButton.addEventListener("click", () => {
        this.close();
      });

      if (this.config.buttons.reset) {
        const resetConfig = this.config.buttons.reset;
        const resetButton = buttonContainer.createEl("button", {
          text: resetConfig.label || "Reset",
        });
        resetButton.addEventListener("click", async () => {
          await resetConfig.action(
            textArea.value,
            this.showError.bind(this),
            this.close.bind(this),
            (newValue: string) => {
              textArea.value = newValue;
            }
          );
        });
      }

      if (this.config.buttons.save) {
        const saveConfig = this.config.buttons.save;
        const saveButton = buttonContainer.createEl("button", {
          text: saveConfig.label || "Save",
          cls: "mod-cta",
        });
        saveButton.addEventListener("click", async () => {
          await saveConfig.action(
            textArea.value,
            this.showError.bind(this),
            this.close.bind(this),
            (newValue: string) => {
              textArea.value = newValue;
            }
          );
        });
      }
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
