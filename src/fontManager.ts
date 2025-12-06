import { Notice, Platform } from "obsidian";

export class FontManager {
  constructor(private compilerWorker: Worker, private fontFamilies: string[]) {}

  async loadFonts(isWorkerReady: boolean): Promise<void> {
    if (!Platform.isDesktopApp || !isWorkerReady) return;

    this.compilerWorker.postMessage({ type: "reset_fonts" });

    if (this.fontFamilies.length === 0) return;

    const loadedFonts: ArrayBuffer[] = [];
    const loadedFontNames = new Set<string>();

    try {
      //@ts-expect-error
      const availableFonts = await window.queryLocalFonts();
      const matchedFonts = availableFonts.filter(
        (font: {
          family: string;
          fullName: string;
          postscriptName: string;
        }) => {
          const familyLower = font.family.toLowerCase();
          const fullNameLower = font.fullName?.toLowerCase() || "";
          const postscriptLower = font.postscriptName?.toLowerCase() || "";
          return this.fontFamilies.some((cf) => {
            const configured = cf.toLowerCase();
            return (
              familyLower.includes(configured) ||
              configured.includes(familyLower) ||
              fullNameLower.includes(configured) ||
              postscriptLower.includes(configured)
            );
          });
        }
      );

      if (matchedFonts.length > 0) {
        loadedFonts.push(
          ...(await Promise.all(
            matchedFonts.map(async (font: { blob: () => Promise<Blob> }) =>
              (await font.blob()).arrayBuffer()
            )
          ))
        );

        matchedFonts.forEach(
          (font: {
            family: string;
            fullName: string;
            postscriptName: string;
          }) => {
            const familyLower = font.family.toLowerCase();
            const fullNameLower = font.fullName?.toLowerCase() || "";
            const postscriptLower = font.postscriptName?.toLowerCase() || "";
            this.fontFamilies.forEach((cf) => {
              const configured = cf.toLowerCase();
              if (
                familyLower.includes(configured) ||
                configured.includes(familyLower) ||
                fullNameLower.includes(configured) ||
                postscriptLower.includes(configured)
              ) {
                loadedFontNames.add(cf.toLowerCase());
              }
            });
          }
        );
      }
    } catch (error) {
      console.warn("queryLocalFonts API failed or not available:", error);
    }

    const missingFonts = this.fontFamilies.filter(
      (cf) => !loadedFontNames.has(cf.toLowerCase())
    );

    if (missingFonts.length > 0) {
      try {
        const { readdir, readFile } = require("fs").promises;
        const path = require("path");

        for (const dir of this.getFontDirs()) {
          try {
            const files = await readdir(dir);
            for (const file of files) {
              const fileLower = file.toLowerCase();
              const fileBase = fileLower.replace(/\.[^/.]+$/, "");
              if (
                missingFonts.some((cf) => {
                  const configured = cf.toLowerCase();
                  return (
                    fileLower.includes(configured) ||
                    configured.includes(fileBase)
                  );
                })
              ) {
                try {
                  const buffer = await readFile(path.join(dir, file));
                  loadedFonts.push(buffer.buffer);
                  missingFonts.forEach((cf) => {
                    const configured = cf.toLowerCase();
                    if (
                      fileLower.includes(configured) ||
                      configured.includes(fileBase)
                    ) {
                      loadedFontNames.add(cf.toLowerCase());
                    }
                  });
                } catch (e) {
                  console.warn(`Failed to read font file ${file}:`, e);
                }
              }
            }
          } catch (e) {
            console.warn(`Could not read ${dir}:`, e);
          }
        }
      } catch (error) {
        console.error("Could not access font directories:", error);
      }
    }

    if (loadedFonts.length > 0) {
      this.compilerWorker.postMessage(
        { type: "fonts", data: loadedFonts },
        loadedFonts
      );
    }

    const failedFonts = this.fontFamilies.filter(
      (cf) => !loadedFontNames.has(cf.toLowerCase())
    );

    if (failedFonts.length > 0) {
      const failedList = failedFonts.join(", ");
      new Notice(`Failed to load fonts: ${failedList}`);
      console.warn(
        `Failed to load the following fonts: ${failedList}. ` +
          `Make sure the font names in settings match system font names. ` +
          `Run \`typst fonts\` in terminal to see available fonts.`
      );
    } else if (loadedFonts.length === 0) {
      console.warn("No fonts were loaded");
    }
  }

  private getFontDirs(): string[] {
    const path = require("path");

    if (Platform.isLinux) {
      const dirs = ["/usr/share/fonts", "/usr/local/share/fonts"];
      if ("XDG_DATA_HOME" in process.env) {
        dirs.push(path.join(process.env["XDG_DATA_HOME"]!, "fonts"));
      } else {
        dirs.push(path.join(process.env["HOME"]!, ".local/share/fonts"));
      }
      return dirs;
    } else if (Platform.isWin) {
      return [
        "C:\\Windows\\Fonts",
        path.join(process.env.LOCALAPPDATA!, "Microsoft\\Windows\\Fonts"),
      ];
    } else if (Platform.isMacOS) {
      return [
        "/Library/Fonts",
        "/System/Library/Fonts",
        path.join(process.env["HOME"]!, "Library/Fonts"),
      ];
    }

    throw new Error("Cannot determine font directories on unknown platform");
  }
}
