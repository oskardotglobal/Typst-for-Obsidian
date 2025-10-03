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
} from "@codemirror/autocomplete";
import { typst } from "./grammar/typst";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { App } from "obsidian";

// Typst keywords from keywords.txt
const typstKeywords = [
  "abs",
  "acos",
  "align",
  "and",
  "angle",
  "array",
  "as",
  "asin",
  "assert",
  "atan",
  "atan2",
  "attach",
  "auto",
  "bibliography",
  "binom",
  "block",
  "bool",
  "box",
  "break",
  "bytes",
  "cbrt",
  "ceil",
  "cite",
  "circle",
  "colbreak",
  "columns",
  "content",
  "context",
  "continue",
  "cos",
  "cosh",
  "datetime",
  "dictionary",
  "dif",
  "Dif",
  "document",
  "duration",
  "ellipse",
  "else",
  "emph",
  "emoji",
  "enum",
  "equation",
  "eval",
  "exp",
  "false",
  "figure",
  "float",
  "floor",
  "for",
  "footnote",
  "frac",
  "fraction",
  "function",
  "gcd",
  "grid",
  "h",
  "hcf",
  "heading",
  "highlight",
  "hypot",
  "if",
  "image",
  "import",
  "in",
  "include",
  "int",
  "label",
  "lcm",
  "length",
  "let",
  "line",
  "link",
  "list",
  "log",
  "lorem",
  "lower",
  "mat",
  "math",
  "max",
  "measure",
  "min",
  "mod",
  "module",
  "move",
  "none",
  "not",
  "numbering",
  "or",
  "outline",
  "overline",
  "pad",
  "page",
  "pagebreak",
  "panic",
  "par",
  "parbreak",
  "path",
  "place",
  "plugin",
  "polygon",
  "pow",
  "quote",
  "ratio",
  "raw",
  "rect",
  "ref",
  "regex",
  "repeat",
  "repr",
  "return",
  "root",
  "rotate",
  "round",
  "scale",
  "selector",
  "set",
  "show",
  "sin",
  "sinh",
  "smallcaps",
  "smartquote",
  "sqrt",
  "square",
  "stack",
  "str",
  "strike",
  "strong",
  "sub",
  "super",
  "sym",
  "symbol",
  "sys",
  "table",
  "tan",
  "tanh",
  "terms",
  "text",
  "true",
  "trunc",
  "type",
  "underline",
  "upper",
  "v",
  "vec",
  "while",
  "with",
  "where",
];

// Typst autocomplete function
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
        ...completionKeymap,
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
