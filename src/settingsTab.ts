import { App, PluginSettingTab, Setting } from "obsidian";
import { DEFAULT_SETTINGS } from "./settings";
import TypstForObsidian from "./main";

export class TypstSettingTab extends PluginSettingTab {
  plugin: TypstForObsidian;

  constructor(app: App, plugin: TypstForObsidian) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Default file mode")
      .setDesc(
        "Choose whether Typst files open in source or reading mode by default"
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOption("source", "Source mode")
          .addOption("reading", "Reading mode")
          .setValue(this.plugin.settings.defaultMode)
          .onChange(async (value: "source" | "reading") => {
            this.plugin.settings.defaultMode = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Use default layout functions")
      .setDesc(
        "Wraps editor content with default page, text, and styling functions."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useDefaultLayoutFunctions)
          .onChange(async (value: boolean) => {
            this.plugin.settings.useDefaultLayoutFunctions = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (this.plugin.settings.useDefaultLayoutFunctions) {
      const layoutSetting = new Setting(containerEl)
        .setName("Custom layout functions")
        .setDesc("Customize the default layout functions.");

      let textArea: HTMLTextAreaElement;

      layoutSetting.addTextArea((text) => {
        textArea = text.inputEl;
        text
          .setValue(this.plugin.settings.customLayoutFunctions)
          .onChange(async (value: string) => {
            this.plugin.settings.customLayoutFunctions = value;
            await this.plugin.saveSettings();
          });

        text.inputEl.addClass("typst-layout-textarea");
        text.inputEl.rows = 10;
      });

      layoutSetting.addButton((button) =>
        button
          .setButtonText("Reset to default")
          .setIcon("rotate-ccw")
          .setTooltip("Reset to default layout functions")
          .onClick(async () => {
            this.plugin.settings.customLayoutFunctions =
              DEFAULT_SETTINGS.customLayoutFunctions;
            await this.plugin.saveSettings();
            textArea.value = this.plugin.settings.customLayoutFunctions;
          })
      );
    }

    new Setting(containerEl)
      .setName("Use PDF export layout functions")
      .setDesc(
        "Prepends custom layout functions to PDF exports only (not editor preview)."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.usePdfLayoutFunctions)
          .onChange(async (value: boolean) => {
            this.plugin.settings.usePdfLayoutFunctions = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (this.plugin.settings.usePdfLayoutFunctions) {
      const pdfLayoutSetting = new Setting(containerEl)
        .setName("PDF export layout functions")
        .setDesc("Custom layout functions for PDF exports.");

      let pdfTextArea: HTMLTextAreaElement;

      pdfLayoutSetting.addTextArea((text) => {
        pdfTextArea = text.inputEl;
        text
          .setValue(this.plugin.settings.pdfLayoutFunctions)
          .onChange(async (value: string) => {
            this.plugin.settings.pdfLayoutFunctions = value;
            await this.plugin.saveSettings();
          });

        text.inputEl.addClass("typst-layout-textarea");
        text.inputEl.rows = 10;
      });

      pdfLayoutSetting.addButton((button) =>
        button
          .setButtonText("Clear")
          .setIcon("trash")
          .setTooltip("Clear PDF layout functions")
          .onClick(async () => {
            this.plugin.settings.pdfLayoutFunctions = "";
            await this.plugin.saveSettings();
            pdfTextArea.value = "";
          })
      );
    }

    new Setting(containerEl)
      .setName("Font families")
      .setDesc(
        "List of system font families to load for Typst compilation (one per line). Leave empty to use default fonts. Changes require reloading fonts."
      )
      .addTextArea((text) => {
        let debounceTimer: NodeJS.Timeout;

        text
          .setPlaceholder("Arial\nHelvetica\nTimes New Roman")
          .setValue(this.plugin.settings.fontFamilies.join("\n"))
          .onChange(async (value: string) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
              this.plugin.settings.fontFamilies = value
                .split("\n")
                .map((font) => font.trim().toLowerCase())
                .filter((font) => font.length > 0);
              await this.plugin.saveSettings();
              await this.plugin.loadFonts();
            }, 1000);
          });

        text.inputEl.addClass("typst-layout-textarea");
        text.inputEl.rows = 10;
      });

    new Setting(containerEl)
      .setName("Enable text layer")
      .setDesc(
        "Enable text selection and link clicking in PDF preview. Disable for better performance if not needed."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableTextLayer)
          .onChange(async (value: boolean) => {
            this.plugin.settings.enableTextLayer = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Custom snippets")
      .setDesc(
        "Define custom snippets in JSON format. Each snippet has a prefix (trigger) and body (lines to insert). Use ${} for tab stops (press Tab to jump between them)."
      )
      .addTextArea((text) => {
        text
          .setPlaceholder("Enter JSON snippet definitions")
          .setValue(this.plugin.settings.customSnippets)
          .onChange(async (value: string) => {
            this.plugin.settings.customSnippets = value;
            await this.plugin.saveSettings();
          });

        text.inputEl.addClass("typst-layout-textarea");
        text.inputEl.rows = 10;
      });
  }
}
