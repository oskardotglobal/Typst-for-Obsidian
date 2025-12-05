import { App } from "obsidian";
import * as monaco from "monaco-editor";
import type TypstForObsidian from "./main";
import { ensureLanguageRegistered } from "./grammar/typst-language";

export class TypstEditor {
  private monacoEditor: monaco.editor.IStandaloneCodeEditor | null = null;
  private container: HTMLElement;
  private app: App;
  private plugin: TypstForObsidian;
  private content: string = "";
  private onContentChange?: (content: string) => void;

  constructor(
    container: HTMLElement,
    app: App,
    plugin: TypstForObsidian,
    onContentChange?: (content: string) => void
  ) {
    this.container = container;
    this.app = app;
    this.plugin = plugin;
    this.onContentChange = onContentChange;
  }

  public async initialize(initialContent: string = ""): Promise<void> {
    this.content = initialContent;
    const isDarkTheme = document.body.classList.contains("theme-dark");
    await ensureLanguageRegistered(isDarkTheme);
    this.createEditor();
  }

  public destroy(): void {
    if (this.monacoEditor) {
      this.monacoEditor.dispose();
      this.monacoEditor = null;
    }
  }

  private createEditor(): void {
    this.container.empty();
    this.container.addClass("typst-monaco-editor-container");

    const isDarkTheme = document.body.classList.contains("theme-dark");
    const fontFamily =
      getComputedStyle(document.body)
        .getPropertyValue("--font-monospace")
        .trim() || "monospace";

    const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
      value: this.content,
      language: "typst",
      theme: isDarkTheme ? "vs-dark" : "vs",
      automaticLayout: false,
      scrollBeyondLastLine: false,
      wordWrap: "on",
      minimap: { enabled: false },
      lineNumbers: "on",
      fontSize: 14,
      fontFamily: fontFamily,
      tabSize: 2,
      insertSpaces: true,
      quickSuggestions: false,
      suggestOnTriggerCharacters: false,
      acceptSuggestionOnCommitCharacter: false,
      acceptSuggestionOnEnter: "off",
      wordBasedSuggestions: "off",
      parameterHints: { enabled: false },
      padding: { top: 16, bottom: 64 },
    };

    this.monacoEditor = monaco.editor.create(this.container, editorOptions);

    requestAnimationFrame(() => {
      if (this.monacoEditor) {
        this.monacoEditor.layout();
      }
    });

    this.monacoEditor.onDidChangeModelContent(() => {
      if (this.monacoEditor) {
        this.content = this.monacoEditor.getValue();
        if (this.onContentChange) {
          this.onContentChange(this.content);
        }
      }
    });

    this.monacoEditor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV,
      async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text && this.monacoEditor) {
            const selection = this.monacoEditor.getSelection();
            if (selection) {
              this.monacoEditor.executeEdits("paste", [
                {
                  range: selection,
                  text: text,
                },
              ]);
            }
          }
        } catch (err) {
          console.error("Failed to read clipboard:", err);
        }
      }
    );
  }

  public getContent(): string {
    return this.monacoEditor ? this.monacoEditor.getValue() : this.content;
  }

  public setContent(content: string): void {
    if (this.monacoEditor) {
      this.monacoEditor.setValue(content);
    }
    this.content = content;
  }

  public getEditorState(): {
    lineNumber: number;
    column: number;
    scrollTop: number;
  } | null {
    if (!this.monacoEditor) return null;

    const position = this.monacoEditor.getPosition();
    const scrollTop = this.monacoEditor.getScrollTop();

    return {
      lineNumber: position?.lineNumber || 1,
      column: position?.column || 1,
      scrollTop: scrollTop,
    };
  }

  public restoreEditorState(state: {
    lineNumber: number;
    column: number;
    scrollTop: number;
  }): void {
    if (!this.monacoEditor) return;

    this.monacoEditor.setPosition({
      lineNumber: state.lineNumber,
      column: state.column,
    });

    this.monacoEditor.setScrollTop(state.scrollTop);
    this.monacoEditor.focus();

    setTimeout(() => {
      if (this.monacoEditor) {
        this.monacoEditor.setScrollTop(state.scrollTop);
      }
    }, 20);
  }

  public focus(): void {
    this.monacoEditor?.focus();
  }

  public onResize(): void {
    this.monacoEditor?.layout();
  }

  public undo(): boolean {
    if (this.monacoEditor) {
      this.monacoEditor.trigger("source", "undo", null);
      return true;
    }
    return false;
  }

  public redo(): boolean {
    if (this.monacoEditor) {
      this.monacoEditor.trigger("source", "redo", null);
      return true;
    }
    return false;
  }

  public wrapSelection(prefix: string, suffix: string): void {
    if (!this.monacoEditor) return;

    const selection = this.monacoEditor.getSelection();
    if (!selection) return;

    const model = this.monacoEditor.getModel();
    if (!model) return;

    const selectedText = model.getValueInRange(selection);

    if (selectedText.startsWith(prefix) && selectedText.endsWith(suffix)) {
      const unwrappedText = selectedText.substring(
        prefix.length,
        selectedText.length - suffix.length
      );

      this.monacoEditor.executeEdits("typst-format", [
        {
          range: selection,
          text: unwrappedText,
        },
      ]);

      const newSelection = new monaco.Selection(
        selection.startLineNumber,
        selection.startColumn,
        selection.endLineNumber,
        selection.endColumn - prefix.length - suffix.length
      );
      this.monacoEditor.setSelection(newSelection);
    } else {
      const wrappedText = `${prefix}${selectedText}${suffix}`;

      this.monacoEditor.executeEdits("typst-format", [
        {
          range: selection,
          text: wrappedText,
        },
      ]);

      const newSelection = new monaco.Selection(
        selection.startLineNumber,
        selection.startColumn,
        selection.endLineNumber,
        selection.endColumn + prefix.length + suffix.length
      );
      this.monacoEditor.setSelection(newSelection);
    }

    this.monacoEditor.focus();
  }

  public increaseHeadingLevel(): void {
    if (!this.monacoEditor) return;

    const position = this.monacoEditor.getPosition();
    if (!position) return;

    const model = this.monacoEditor.getModel();
    if (!model) return;

    const lineNumber = position.lineNumber;
    const lineContent = model.getLineContent(lineNumber);
    const match = lineContent.match(/^(=+)\s/);

    if (match && match[1].length > 1) {
      const newHeading = lineContent.substring(1);
      const range = new monaco.Range(
        lineNumber,
        1,
        lineNumber,
        lineContent.length + 1
      );
      this.monacoEditor.executeEdits("typst-heading", [
        {
          range: range,
          text: newHeading,
        },
      ]);
      const newColumn = Math.max(1, position.column - 1);
      this.monacoEditor.setPosition({ lineNumber, column: newColumn });
    }
    this.monacoEditor.focus();
  }

  public decreaseHeadingLevel(): void {
    if (!this.monacoEditor) return;

    const position = this.monacoEditor.getPosition();
    if (!position) return;

    const model = this.monacoEditor.getModel();
    if (!model) return;

    const lineNumber = position.lineNumber;
    const lineContent = model.getLineContent(lineNumber);
    const match = lineContent.match(/^(=+)\s/);

    if (match) {
      const currentLevel = match[1].length;
      if (currentLevel < 6) {
        const newHeading = "=" + lineContent;
        const range = new monaco.Range(
          lineNumber,
          1,
          lineNumber,
          lineContent.length + 1
        );
        this.monacoEditor.executeEdits("typst-heading", [
          {
            range: range,
            text: newHeading,
          },
        ]);
        this.monacoEditor.setPosition({
          lineNumber,
          column: position.column + 1,
        });
      }
    }
    this.monacoEditor.focus();
  }

  public async updateTheme(): Promise<void> {
    if (!this.monacoEditor) return;

    const state = this.getEditorState();
    const content = this.getContent();

    this.destroy();
    await this.initialize(content);

    if (state) {
      this.restoreEditorState(state);
    }
  }
}
