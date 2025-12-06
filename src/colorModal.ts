import { App, Modal } from "obsidian";
import type { SyntaxHighlightColors } from "./settings";

export class ImportColorsModal extends Modal {
  private onSubmit: (colors: Partial<SyntaxHighlightColors>) => void;
  private errorEl: HTMLElement | null = null;

  constructor(
    app: App,
    onSubmit: (colors: Partial<SyntaxHighlightColors>) => void
  ) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    contentEl.empty();
    contentEl.addClass("typst-settings-modal");

    titleEl.createEl("span", {
      text: "Import Syntax Highlighting Colors",
      cls: "typst-settings-modal-title",
    });

    contentEl.createEl("span", {
      text: "Paste your color configuration JSON below. Accepts a full config with both light and dark themes or a single theme.",
      cls: "typst-settings-modal-description",
    });

    const textArea = contentEl.createEl("textarea", {
      cls: "typst-settings-modal-textarea",
    });
    textArea.addEventListener("input", () => {
      this.clearError();
    });

    const modalFooter = contentEl.createDiv("typst-settings-modal-footer");

    this.errorEl = modalFooter.createDiv("typst-settings-modal-error");

    const buttonContainer = modalFooter.createDiv(
      "typst-settings-modal-buttons"
    );

    const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
    cancelButton.addEventListener("click", () => {
      this.close();
    });

    const resetButton = buttonContainer.createEl("button", { text: "Reset" });
    resetButton.addEventListener("click", () => {
      // this.reset();
    });

    const saveButton = buttonContainer.createEl("button", {
      text: "Import",
      cls: "mod-cta",
    });
    saveButton.addEventListener("click", () => {
      this.importColors(textArea.value);
    });
  }

  private importColors(jsonText: string) {
    if (!jsonText.trim()) {
      this.showError("Paste a color configuration.");
      return;
    }

    try {
      const parsed = JSON.parse(jsonText);

      const hasLight = parsed.light && typeof parsed.light === "object";
      const hasDark = parsed.dark && typeof parsed.dark === "object";

      if (!hasLight && !hasDark) {
        this.showError(
          "Invalid format. Must contain 'light' and/or 'dark' theme colors."
        );
        return;
      }

      const requiredKeys = [
        "defaultText",
        "comments",
        "keywords",
        "strings",
        "labelsAndReferences",
        "escapeSequences",
        "numbers",
        "booleans",
        "symbols",
        "functions",
        "types",
        "variables",
        "constants",
        "operators",
        "headings",
        "bold",
        "italic",
        "links",
        "mathText",
        "mathOperators",
        "rawCode",
        "codeLanguage",
        "listMarkers",
        "punctuation",
        "separators",
        "braces",
        "metaExpressions",
        "generalPunctuation",
      ];

      const validateTheme = (theme: any) => {
        return requiredKeys.every((key) => typeof theme[key] === "string");
      };

      if (hasLight && !validateTheme(parsed.light)) {
        this.showError("Light theme is missing required color properties.");
        return;
      }

      if (hasDark && !validateTheme(parsed.dark)) {
        this.showError("Dark theme is missing required color properties.");
        return;
      }

      const colors: Partial<SyntaxHighlightColors> = {};
      if (hasLight) colors.light = parsed.light;
      if (hasDark) colors.dark = parsed.dark;

      this.onSubmit(colors);
      this.close();
    } catch (error) {
      this.showError("Invalid JSON format. Please check your input.");
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

export class ExportColorsModal extends Modal {
  private colors: SyntaxHighlightColors;

  constructor(app: App, colors: SyntaxHighlightColors) {
    super(app);
    this.colors = colors;
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    contentEl.empty();
    contentEl.addClass("typst-settings-modal");

    titleEl.createEl("span", {
      text: "Export Syntax Highlighting Colors",
      cls: "typst-settings-modal-title",
    });

    const textArea = contentEl.createEl("textarea", {
      cls: "typst-settings-modal-textarea",
    });
    textArea.value = JSON.stringify(this.colors, null, 2);
    textArea.readOnly = true;

    textArea.addEventListener("click", () => {
      textArea.select();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
