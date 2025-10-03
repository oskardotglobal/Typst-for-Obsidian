import {
  EditorView,
  keymap,
  lineNumbers,
  dropCursor,
  rectangularSelection,
  highlightActiveLine,
} from "@codemirror/view";
import { EditorState, Extension } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  defaultKeymap,
  indentWithTab,
  history,
  historyKeymap,
  undo,
  redo,
} from "@codemirror/commands";
import { bracketMatching } from "@codemirror/language";
import { closeBrackets } from "@codemirror/autocomplete";
import { typst } from "./grammar/typst";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { App } from "obsidian";

export class TypstEditor {
  private editorView: EditorView | null = null;
  private container: HTMLElement;
  private app: App;
  private content: string = "";
  private onContentChange?: (content: string) => void;

  constructor(
    container: HTMLElement,
    app: App,
    onContentChange?: (content: string) => void
  ) {
    this.container = container;
    this.app = app;
    this.onContentChange = onContentChange;
  }

  public initialize(initialContent: string = ""): void {
    this.content = initialContent;
    this.createEditor();
  }

  private createEditor(): void {
    this.container.empty();

    const editorContainer = this.container.createDiv("typst-editor-container");

    const isDarkTheme = document.body.classList.contains("theme-dark");

    const extensions: Extension[] = [
      lineNumbers(),
      dropCursor(),
      rectangularSelection(),
      highlightActiveLine(),
      history(),

      EditorView.lineWrapping,

      // Language features
      typst(),
      bracketMatching(),
      closeBrackets(),
      highlightSelectionMatches(),

      // Multiple selections
      EditorState.allowMultipleSelections.of(true),

      // Key bindings
      keymap.of([
        indentWithTab,
        ...historyKeymap,
        ...defaultKeymap,
        ...searchKeymap,
      ]),

      // Theme
      ...(isDarkTheme ? [oneDark] : []),

      // Update content on changes
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          this.content = update.state.doc.toString();
          if (this.onContentChange) {
            this.onContentChange(this.content);
          }
        }
      }),
    ];

    this.editorView = new EditorView({
      state: EditorState.create({
        doc: this.content,
        extensions,
      }),
      parent: editorContainer,
    });

    // Debug: Log computed styles for alignment
    setTimeout(() => {
      this.logComputedStyles();
    }, 100);
  }

  private logComputedStyles(): void {
    if (!this.editorView) return;

    const editorElement = this.editorView.dom;
    const gutterElement = editorElement.querySelector(
      ".cm-gutters"
    ) as HTMLElement;
    const lineNumberElement = editorElement.querySelector(
      ".cm-lineNumbers .cm-gutterElement"
    ) as HTMLElement;
    const contentElement = editorElement.querySelector(
      ".cm-content"
    ) as HTMLElement;
    const lineElement = editorElement.querySelector(".cm-line") as HTMLElement;

    console.group("🔍 CodeMirror Alignment Debug");

    if (gutterElement) {
      const gutterStyles = window.getComputedStyle(gutterElement);
      console.log("📏 .cm-gutters:", {
        fontSize: gutterStyles.fontSize,
        fontFamily: gutterStyles.fontFamily,
        lineHeight: gutterStyles.lineHeight,
        paddingTop: gutterStyles.paddingTop,
        paddingBottom: gutterStyles.paddingBottom,
        height: gutterStyles.height,
      });
    }

    if (lineNumberElement) {
      const lineNumStyles = window.getComputedStyle(lineNumberElement);
      const rect = lineNumberElement.getBoundingClientRect();
      console.log("🔢 .cm-gutterElement (line number):", {
        fontSize: lineNumStyles.fontSize,
        fontFamily: lineNumStyles.fontFamily,
        lineHeight: lineNumStyles.lineHeight,
        height: lineNumStyles.height,
        top: lineNumStyles.top,
        paddingTop: lineNumStyles.paddingTop,
        paddingBottom: lineNumStyles.paddingBottom,
        marginTop: lineNumStyles.marginTop,
        marginBottom: lineNumStyles.marginBottom,
        verticalAlign: lineNumStyles.verticalAlign,
        display: lineNumStyles.display,
        boundingTop: rect.top,
      });
    }

    if (contentElement) {
      const contentStyles = window.getComputedStyle(contentElement);
      console.log("📝 .cm-content:", {
        fontSize: contentStyles.fontSize,
        fontFamily: contentStyles.fontFamily,
        lineHeight: contentStyles.lineHeight,
        paddingTop: contentStyles.paddingTop,
        paddingBottom: contentStyles.paddingBottom,
      });
    }

    if (lineElement) {
      const lineStyles = window.getComputedStyle(lineElement);
      const rect = lineElement.getBoundingClientRect();
      console.log("📄 .cm-line:", {
        fontSize: lineStyles.fontSize,
        fontFamily: lineStyles.fontFamily,
        lineHeight: lineStyles.lineHeight,
        height: lineStyles.height,
        paddingTop: lineStyles.paddingTop,
        paddingBottom: lineStyles.paddingBottom,
        boundingTop: rect.top,
      });
    }

    // Get CSS variable values
    const rootStyles = window.getComputedStyle(document.documentElement);
    console.log("🎨 CSS Variables:", {
      "--font-monospace": rootStyles
        .getPropertyValue("--font-monospace")
        .trim(),
      "--font-text-size": rootStyles
        .getPropertyValue("--font-text-size")
        .trim(),
      "--line-height-normal": rootStyles
        .getPropertyValue("--line-height-normal")
        .trim(),
      "--file-margins": rootStyles.getPropertyValue("--file-margins").trim(),
    });

    console.groupEnd();
  }

  public getContent(): string {
    return this.editorView
      ? this.editorView.state.doc.toString()
      : this.content;
  }

  public setContent(content: string): void {
    if (this.editorView) {
      const transaction = this.editorView.state.update({
        changes: {
          from: 0,
          to: this.editorView.state.doc.length,
          insert: content,
        },
      });
      this.editorView.dispatch(transaction);
    }
    this.content = content;
  }

  public focus(): void {
    this.editorView?.focus();
  }

  public getEditorState(): { cursorPos: number; scrollTop: number } | null {
    if (!this.editorView) return null;

    return {
      cursorPos: this.editorView.state.selection.main.head,
      scrollTop: this.editorView.scrollDOM.scrollTop,
    };
  }

  public restoreEditorState(state: {
    cursorPos: number;
    scrollTop: number;
  }): void {
    if (!this.editorView) return;

    // Restore cursor position
    this.editorView.dispatch({
      selection: { anchor: state.cursorPos },
      scrollIntoView: false, // We'll handle scroll manually
    });

    // Restore scroll position
    this.editorView.scrollDOM.scrollTop = state.scrollTop;
  }

  public undo(): boolean {
    if (this.editorView) {
      return undo(this.editorView);
    }
    return false;
  }

  public redo(): boolean {
    if (this.editorView) {
      return redo(this.editorView);
    }
    return false;
  }

  public destroy(): void {
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
    }
  }
}
