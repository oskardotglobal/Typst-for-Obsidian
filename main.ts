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
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
