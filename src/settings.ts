import { App, PluginSettingTab, Setting } from "obsidian";
import TypstForObsidian from "./main";
import { TypstView } from "./TypstView";

export interface TypstSettings {
  defaultMode: "source" | "reading";
  editorReadableWidth: boolean;
  useDefaultLayoutFunctions: boolean;
  customLayoutFunctions: string;
  autoDownloadPackages: boolean;
  fontFamilies: string[];
}

export const DEFAULT_SETTINGS: TypstSettings = {
  defaultMode: "source",
  editorReadableWidth: false,
  useDefaultLayoutFunctions: true,
  autoDownloadPackages: true,
  fontFamilies: [],
  // prettier-ignore
  customLayoutFunctions: 
`#set page(
  width: %LINEWIDTH%pt,
  height: auto,
  margin: (x: 0.25em, y: 0.25em),
  fill: rgb("%BGCOLOR%")
)

#set text(
  size: %FONTSIZE%,
  fill: rgb("%THEMECOLOR%")
)

#show math.equation: set text(fill: rgb("%THEMECOLOR%"))

#set par(
  justify: true,
  leading: 0.65em
)

#set block(fill: none)
#set rect(fill: none, stroke: rgb("%THEMECOLOR%"))
#set box(fill: none)
#set circle(fill: none, stroke: rgb("%THEMECOLOR%"))
#set ellipse(fill: none, stroke: rgb("%THEMECOLOR%"))
#set polygon(fill: none, stroke: rgb("%THEMECOLOR%"))
#set line(stroke: rgb("%THEMECOLOR%"))`,
};

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

    // new Setting(containerEl)
    //   .setName("Editor readable width")
    //   .setDesc(
    //     "When enabled, limits the editor width for better readability and centers it"
    //   )
    //   .addToggle((toggle) =>
    //     toggle
    //       .setValue(this.plugin.settings.editorReadableWidth)
    //       .onChange(async (value: boolean) => {
    //         this.plugin.settings.editorReadableWidth = value;
    //         await this.plugin.saveSettings();
    //         this.app.workspace.iterateAllLeaves((leaf) => {
    //           if (leaf.view instanceof TypstView) {
    //             leaf.view.onResize();
    //           }
    //         });
    //       })
    //   );

    new Setting(containerEl)
      .setName("Use default layout functions")
      .setDesc(
        "When enabled, wraps editor content with default page, text, and styling functions."
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
        .setDesc(
          "Customize the default layout functions. Use %THEMECOLOR% as a placeholder for the current theme's text color."
        );

      let textArea: HTMLTextAreaElement;

      layoutSetting.addTextArea((text) => {
        textArea = text.inputEl;
        text
          .setPlaceholder("Enter Typst layout functions...")
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
      .setName("Font families")
      .setDesc(
        "List of system font families to load for Typst compilation (one per line). Leave empty to use default fonts."
      )
      .addTextArea((text) =>
        text
          .setPlaceholder("Arial\nHelvetica\nTimes New Roman")
          .setValue(this.plugin.settings.fontFamilies.join("\n"))
          .onChange(async (value: string) => {
            this.plugin.settings.fontFamilies = value
              .split("\n")
              .map((font) => font.trim().toLowerCase())
              .filter((font) => font.length > 0);
            await this.plugin.saveSettings();
          })
      );
  }
}
