import { Notice, Plugin } from "obsidian";
import { CreateTypstFileModal } from "./modal";
import { TypstView } from "./TypstView";

export function registerCommands(plugin: Plugin) {
  plugin.addCommand({
    id: "typst-bold",
    name: "Toggle bold",
    checkCallback: (checking: boolean) => {
      const typstView = plugin.app.workspace.getActiveViewOfType(TypstView);
      if (typstView && typstView.getCurrentMode() === "source") {
        if (!checking) {
          typstView.executeEditorCommand("typst-bold");
        }
        return true;
      }
      return false;
    },
  });

  plugin.addCommand({
    id: "typst-italic",
    name: "Toggle italic",
    checkCallback: (checking: boolean) => {
      const typstView = plugin.app.workspace.getActiveViewOfType(TypstView);
      if (typstView && typstView.getCurrentMode() === "source") {
        if (!checking) {
          typstView.executeEditorCommand("typst-italic");
        }
        return true;
      }
      return false;
    },
  });

  plugin.addCommand({
    id: "typst-underline",
    name: "Toggle underline",
    checkCallback: (checking: boolean) => {
      const typstView = plugin.app.workspace.getActiveViewOfType(TypstView);
      if (typstView && typstView.getCurrentMode() === "source") {
        if (!checking) {
          typstView.executeEditorCommand("typst-underline");
        }
        return true;
      }
      return false;
    },
  });

  plugin.addCommand({
    id: "typst-heading-up",
    name: "Increase heading level",
    checkCallback: (checking: boolean) => {
      const typstView = plugin.app.workspace.getActiveViewOfType(TypstView);
      if (typstView && typstView.getCurrentMode() === "source") {
        if (!checking) {
          typstView.executeEditorCommand("typst-heading-up");
        }
        return true;
      }
      return false;
    },
  });

  plugin.addCommand({
    id: "typst-heading-down",
    name: "Decrease heading level",
    checkCallback: (checking: boolean) => {
      const typstView = plugin.app.workspace.getActiveViewOfType(TypstView);
      if (typstView && typstView.getCurrentMode() === "source") {
        if (!checking) {
          typstView.executeEditorCommand("typst-heading-down");
        }
        return true;
      }
      return false;
    },
  });

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
