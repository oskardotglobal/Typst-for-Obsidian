import { Plugin, addIcon } from "obsidian";
import { TypstView } from "./src/typstView";
import { registerCommands } from "./src/commands";
import { TypstIcon } from "src/util";

export default class TypstForObsidian extends Plugin {
  async onload() {
    addIcon("typst-file", TypstIcon);

    this.registerExtensions(["typ"], "typst-view");
    this.registerView("typst-view", (leaf) => new TypstView(leaf));

    registerCommands(this);
  }

  onunload() {}
}
