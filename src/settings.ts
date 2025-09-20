import { App, PluginSettingTab, Setting } from "obsidian";
import TypstForObsidian from "../main";
import { TypstView } from "./TypstView";

export interface TypstSettings {
  defaultMode: "source" | "reading";
  editorReadableWidth: boolean;
}

export const DEFAULT_SETTINGS: TypstSettings = {
  defaultMode: "source",
  editorReadableWidth: false,
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

    containerEl.createEl("h2", { text: "Typst Plugin Settings" });

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
      .setName("Editor readable width")
      .setDesc(
        "When enabled, limits the editor width for better readability and centers it"
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.editorReadableWidth)
          .onChange(async (value: boolean) => {
            this.plugin.settings.editorReadableWidth = value;
            await this.plugin.saveSettings();
            this.app.workspace.iterateAllLeaves((leaf) => {
              if (leaf.view instanceof TypstView) {
                leaf.view.onResize();
              }
            });
          })
      );
  }
}
