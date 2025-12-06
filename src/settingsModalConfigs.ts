import { DEFAULT_SETTINGS, SyntaxHighlightColors } from "./settings";
import { SettingsModalConfig } from "./settingsModal";
import TypstForObsidian from "./main";

export function getCustomLayoutFunctionsConfig(
  plugin: TypstForObsidian
): SettingsModalConfig {
  return {
    title: "Custom Layout Functions",
    description:
      "Customize the default layout functions. Use variables (e.g., %THEMECOLOR%, %FONTSIZE%, %BGCOLOR%) to style according to the current theme.",
    initialValue: plugin.settings.customLayoutFunctions,
    buttons: {
      save: {
        action: async (value, _showError, close) => {
          plugin.settings.customLayoutFunctions = value;
          await plugin.saveSettings();
          close();
        },
      },
      reset: {
        action: async (_value, _showError, _close, updateValue) => {
          plugin.settings.customLayoutFunctions =
            DEFAULT_SETTINGS.customLayoutFunctions;
          await plugin.saveSettings();
          updateValue(DEFAULT_SETTINGS.customLayoutFunctions);
        },
      },
    },
  };
}

export function getPdfLayoutFunctionsConfig(
  plugin: TypstForObsidian
): SettingsModalConfig {
  return {
    title: "PDF Export Layout Functions",
    description:
      "Customize layout functions for PDF exports only (not editor preview). Use variables (e.g., %THEMECOLOR%, %FONTSIZE%, %BGCOLOR%) to style according to the current theme.",
    initialValue: plugin.settings.pdfLayoutFunctions,
    buttons: {
      save: {
        action: async (value, _showError, close) => {
          plugin.settings.pdfLayoutFunctions = value;
          await plugin.saveSettings();
          close();
        },
      },
      reset: {
        label: "Clear",
        action: async (_value, _showError, _close, updateValue) => {
          plugin.settings.pdfLayoutFunctions = "";
          await plugin.saveSettings();
          updateValue("");
        },
      },
    },
  };
}

export function getFontFamiliesConfig(
  plugin: TypstForObsidian
): SettingsModalConfig {
  return {
    title: "Font Families",
    description:
      "List of system font families to load for Typst compilation (one per line). Leave empty to use default fonts. Changes require reloading fonts. Some fonts may have different names than expected. If a font isn't working, install Typst and run `typst fonts` in your terminal to see the available fonts.",
    initialValue: plugin.settings.fontFamilies.join("\n"),
    buttons: {
      save: {
        action: async (value, _showError, close) => {
          plugin.settings.fontFamilies = value
            .split("\n")
            .map((font) => font.trim().toLowerCase())
            .filter((font) => font.length > 0);
          await plugin.saveSettings();
          await plugin.loadFonts();
          close();
        },
      },
      reset: {
        label: "Clear",
        action: async (_value, _showError, _close, updateValue) => {
          plugin.settings.fontFamilies = [];
          await plugin.saveSettings();
          updateValue("");
        },
      },
    },
  };
}

export function getCustomSnippetsConfig(
  plugin: TypstForObsidian
): SettingsModalConfig {
  return {
    title: "Custom Snippets",
    description:
      'Define custom snippets in JSON format. Each snippet has a "prefix" (trigger text) and "body" (text to insert).',
    initialValue: plugin.settings.customSnippets,
    buttons: {
      save: {
        action: async (value, showError, close) => {
          if (value.trim()) {
            try {
              JSON.parse(value);
            } catch (error) {
              showError("Invalid JSON format. Please check your input.");
              return;
            }
          }
          plugin.settings.customSnippets = value;
          await plugin.saveSettings();
          close();
        },
      },
      reset: {
        label: "Clear",
        action: async (_value, _showError, _close, updateValue) => {
          plugin.settings.customSnippets = "";
          await plugin.saveSettings();
          updateValue("");
        },
      },
    },
  };
}

export function getImportColorsConfig(
  plugin: TypstForObsidian,
  setSyntaxHighlightingColors: (
    theme: "dark" | "light",
    colors: SyntaxHighlightColors["dark"] | SyntaxHighlightColors["light"]
  ) => void,
  refreshDisplay: () => void
): SettingsModalConfig {
  return {
    title: "Import Syntax Highlighting Colors",
    description:
      "Paste your color configuration JSON below. Accepts a full config with both light and dark themes or a single theme.",
    buttons: {
      save: {
        label: "Import",
        action: async (value, showError, close, _updateValue) => {
          if (!value.trim()) {
            showError("Paste a color configuration.");
            return;
          }

          try {
            const parsed = JSON.parse(value);

            const hasLight = parsed.light && typeof parsed.light === "object";
            const hasDark = parsed.dark && typeof parsed.dark === "object";

            if (!hasLight && !hasDark) {
              showError(
                `Invalid format. Must contain "light" and/or "dark" theme colors.`
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
              return requiredKeys.every(
                (key) => typeof theme[key] === "string"
              );
            };

            if (hasLight && !validateTheme(parsed.light)) {
              showError("Light theme is missing required color properties.");
              return;
            }

            if (hasDark && !validateTheme(parsed.dark)) {
              showError("Dark theme is missing required color properties.");
              return;
            }

            if (hasLight) {
              setSyntaxHighlightingColors("light", parsed.light);
            }
            if (hasDark) {
              setSyntaxHighlightingColors("dark", parsed.dark);
            }

            await plugin.saveSettings();
            refreshDisplay();
            close();
          } catch (error) {
            showError("Invalid JSON format.");
          }
        },
      },
    },
  };
}

export function getExportColorsConfig(
  plugin: TypstForObsidian
): SettingsModalConfig {
  return {
    title: "Export Syntax Highlighting Colors",
    readOnly: true,
    initialValue: JSON.stringify(
      plugin.settings.syntaxHighlightColors,
      null,
      2
    ),
  };
}
