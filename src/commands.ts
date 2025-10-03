import { App, Notice, Plugin } from "obsidian";
import { CreateTypstFileModal } from "./modal";
import { TypstView } from "./TypstView";

export function registerCommands(plugin: Plugin) {
  plugin.addCommand({
    id: "create-typst-file",
    name: "Create new Typst file",
    callback: () => {
      new CreateTypstFileModal(plugin.app, plugin).open();
    },
  });

  plugin.addCommand({
    id: "toggle-typst-mode",
    name: "Toggle between source and reading mode",
    checkCallback: (inTypstView: boolean) => {
      const view = plugin.app.workspace.getActiveViewOfType(TypstView);

      if (view instanceof TypstView) {
        if (!inTypstView) {
          view.toggleMode();
          const mode = view.getCurrentMode();
        }
        return true;
      }

      if (!inTypstView) {
        new Notice("Must be in a Typst (.typ) file");
      }
      return false;
    },
  });

  plugin.addCommand({
    id: "export-to-pdf",
    name: "Export to PDF",
    checkCallback: (inTypstView: boolean) => {
      const view = plugin.app.workspace.getActiveViewOfType(TypstView);

      if (view instanceof TypstView) {
        if (!inTypstView) {
          view.exportToPdf();
        }
        return true;
      }

      if (!inTypstView) {
        new Notice("Must be in a Typst (.typ) file");
      }
      return false;
    },
  });
}
