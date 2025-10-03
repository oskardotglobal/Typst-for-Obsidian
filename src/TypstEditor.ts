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
import {
  closeBrackets,
  autocompletion,
  completionKeymap,
  CompletionContext,
  acceptCompletion,
  completionStatus,
} from "@codemirror/autocomplete";
import { typst } from "./grammar/typst";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { App } from "obsidian";
import { typstKeywords } from "./util";

function wrapOrInsert(view: EditorView, markers: string): boolean {
  const { state } = view;
  const { selection } = state;
  const changes = selection.ranges.map((range) => {
    if (range.empty) {
      return {
        from: range.from,
        to: range.to,
        insert: markers + markers,
      };
    } else {
      const selectedText = state.doc.sliceString(range.from, range.to);
      return {
        from: range.from,
        to: range.to,
        insert: markers + selectedText + markers,
      };
    }
  });

  view.dispatch({
    changes,
    selection: {
      anchor: selection.main.from + markers.length,
    },
  });

  return true;
}

function typstCompletions(context: CompletionContext) {
  const word = context.matchBefore(/\w*/);
  if (!word || (word.from === word.to && !context.explicit)) {
    return null;
  }

  return {
    from: word.from,
    options: typstKeywords.map((keyword) => ({
      label: keyword,
      type: "keyword",
    })),
  };
}

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

      // Autocomplete
      autocompletion({
        override: [typstCompletions],
        activateOnTyping: true,
        maxRenderedOptions: 20,
      }),

      // Multiple selections
      EditorState.allowMultipleSelections.of(true),

      // Key bindings
      keymap.of([
        {
          key: "Tab",
          run: (view) => {
            if (completionStatus(view.state) === "active") {
              return acceptCompletion(view);
            }
            return false;
          },
        },
        {
          key: "Mod-b",
          run: (view) => wrapOrInsert(view, "*"),
          preventDefault: true,
        },
        {
          key: "Mod-i",
          run: (view) => wrapOrInsert(view, "_"),
          preventDefault: true,
        },
        indentWithTab,
        ...completionKeymap,
        ...historyKeymap,
        ...defaultKeymap,
        ...searchKeymap,
      ]),

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

    this.editorView.dispatch({
      selection: { anchor: state.cursorPos },
      scrollIntoView: false,
    });

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
