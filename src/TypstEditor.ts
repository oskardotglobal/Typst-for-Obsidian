import { App } from "obsidian";
import * as monaco from "monaco-editor";
import type TypstForObsidian from "./main";

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

  public initialize(initialContent: string = ""): void {
    this.content = initialContent;
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

    const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
      value: this.content,
      language: "plaintext",
      theme: isDarkTheme ? "vs-dark" : "vs",
      automaticLayout: false,
      scrollBeyondLastLine: false,
      wordWrap: "on",
      minimap: { enabled: false },
      lineNumbers: "on",
      fontSize: 14,
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
}
