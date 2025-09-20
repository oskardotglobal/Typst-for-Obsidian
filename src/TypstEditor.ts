import {
  EditorView,
  keymap,
  lineNumbers,
  drawSelection,
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
} from "@codemirror/commands";
import { bracketMatching, foldGutter } from "@codemirror/language";
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
      foldGutter(),
      drawSelection(),
      dropCursor(),
      rectangularSelection(),
      highlightActiveLine(),
      history(),

      bracketMatching(),
      highlightSelectionMatches(),

      // Multiple selections
      EditorState.allowMultipleSelections.of(true),

      // Key bindings
      keymap.of([indentWithTab, ...defaultKeymap, ...searchKeymap]),

      // Theme
      ...(isDarkTheme ? [oneDark] : []),

      // Editor styling
      EditorView.theme(
        {
          "&": {
            fontSize: "var(--font-text-size)",
            fontFamily: "var(--font-monospace-theme)",
            height: "100%",
          },
          ".cm-content": {
            padding: "var(--file-margins)",
            lineHeight: "var(--line-height-normal)",
            caretColor: "var(--text-accent)",
            minHeight: "100%",
          },
          ".cm-editor": {
            height: "100%",
            backgroundColor: "transparent",
          },
          ".cm-editor.cm-focused": {
            outline: "none",
          },
          ".cm-line": {
            padding: "0",
          },
          ".cm-gutters": {
            backgroundColor: "transparent",
            color: "var(--text-faint)",
            border: "none",
            paddingLeft: "var(--file-margins)",
          },
          ".cm-lineNumbers .cm-gutterElement": {
            color: "var(--text-faint)",
            fontSize: "var(--font-ui-smaller)",
          },
          ".cm-activeLineGutter": {
            backgroundColor: "transparent",
          },
          ".cm-activeLine": {
            backgroundColor: "var(--background-primary-alt)",
          },
          ".cm-cursor": {
            borderLeftColor: "var(--text-accent)",
          },
          ".cm-selectionBackground": {
            backgroundColor: "var(--text-selection) !important",
          },
          "&.cm-focused .cm-selectionBackground": {
            backgroundColor: "var(--text-selection) !important",
          },
          ".cm-searchMatch": {
            backgroundColor: "var(--text-highlight-bg)",
            outline: "1px solid var(--text-accent)",
          },
          ".cm-searchMatch.cm-searchMatch-selected": {
            backgroundColor: "var(--text-accent)",
            color: "var(--text-on-accent)",
          },
        },
        { dark: isDarkTheme }
      ),

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

    const state = EditorState.create({
      doc: this.content,
      extensions: extensions,
    });

    this.editorView = new EditorView({
      state: state,
      parent: editorContainer,
    });
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

  public destroy(): void {
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
    }
  }
}
