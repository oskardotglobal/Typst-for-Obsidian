import { Plugin } from "obsidian";
import { TypstView } from "./src/typstView";
import { registerCommands } from "./src/commands";

export default class TypstForObsidian extends Plugin {
  async onload() {
    this.registerExtensions(["typ"], "typst-view");
    this.registerView("typst-view", (leaf) => new TypstView(leaf));

    registerCommands(this);
  }

  onunload() {}
}
