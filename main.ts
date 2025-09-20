import { Plugin, addIcon } from "obsidian";
import { TypstView } from "./src/TypstView";
import { registerCommands } from "./src/commands";
import { TypstIcon } from "src/util";
import {
  TypstSettings,
  DEFAULT_SETTINGS,
  TypstSettingTab,
} from "./src/settings";

export default class TypstForObsidian extends Plugin {
  settings: TypstSettings;

  async onload() {
    await this.loadSettings();

    addIcon("typst-file", TypstIcon);

    this.registerExtensions(["typ"], "typst-view");
    this.registerView("typst-view", (leaf) => new TypstView(leaf, this));
    registerCommands(this);
    this.addSettingTab(new TypstSettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on("css-change", () => {
        this.onThemeChange();
      })
    );
  }

  private onThemeChange() {
    // Find all open Typst views and recompile if they are in reading mode
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof TypstView) {
        const typstView = leaf.view as TypstView;
        typstView.recompileIfInReadingMode();
      }
    });
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
