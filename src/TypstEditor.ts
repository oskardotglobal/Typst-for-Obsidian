import {
    EditorView,
    keymap,
    lineNumbers,
    dropCursor,
    rectangularSelection,
    highlightActiveLine,
} from "@codemirror/view";
import { EditorState, Extension } from "@codemirror/state";
import { xcodeDark } from "@uiw/codemirror-theme-xcode";
import {
    defaultKeymap,
    indentWithTab,
    insertNewlineAndIndent,
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
    snippet,
} from "@codemirror/autocomplete";
import { typst } from "./grammar/typst";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { App } from "obsidian";
import { typstKeywords } from "./util";
import type TypstForObsidian from "./main";

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

function createTypstCompletions(plugin: TypstForObsidian) {
    return (context: CompletionContext) => {
        const word = context.matchBefore(/\w*/);
        if (!word || (word.from === word.to && !context.explicit)) {
            return null;
        }

        const options = [];

        // Add keyword completions
        for (const keyword of typstKeywords) {
            if (keyword.toLowerCase().startsWith(word.text.toLowerCase())) {
                options.push({
                    label: keyword,
                    type: "keyword",
                });
            }
        }

        // Add snippet completions
        const snippets = plugin.snippetManager.getSnippets();
        for (const [name, snippetDef] of snippets) {
            if (snippetDef.prefix.toLowerCase().startsWith(word.text.toLowerCase())) {
                const template = snippetDef.body.join("\n");

                options.push({
                    label: snippetDef.prefix,
                    type: "snippet",
                    apply: snippet(template),
                });
            }
        }

        return {
            from: word.from,
            options,
        };
    };
}

export class TypstEditor {
    private editorView: EditorView | null = null;
    private container: HTMLElement;
    private app: App;
    private plugin: TypstForObsidian;
    private content: string = "";
    private onContentChange?: (content: string) => void;

    constructor(
        container: HTMLElement,
        app: App,
        plugin: TypstForObsidian,
        onContentChange?: (content: string) => void,
    ) {
        this.container = container;
        this.app = app;
        this.plugin = plugin;
        this.app = app;
        this.onContentChange = onContentChange;
    }

    public initialize(initialContent: string = ""): void {
        this.content = initialContent;
        this.createEditor();
    }

    public destroy(): void {
        if (this.editorView) {
            this.editorView.destroy();
            this.editorView = null;
        }
    }

    private createEditor(): void {
        this.container.empty();

        const editorContainer = this.container.createDiv("typst-editor-container");
        const isDarkTheme = document.body.classList.contains("theme-dark");

        const extensions = this.buildExtensions(isDarkTheme);

        this.editorView = new EditorView({
            state: EditorState.create({
                doc: this.content,
                extensions,
            }),
            parent: editorContainer,
        });
    }

    private buildExtensions(isDarkTheme: boolean): Extension[] {
        return [
            // Basic editor features
            lineNumbers(),
            dropCursor(),
            rectangularSelection(),
            highlightActiveLine(),
            history(),
            EditorState.tabSize.of(2),
            EditorView.lineWrapping,

            // Language features
            typst(),
            bracketMatching(),
            closeBrackets(),
            highlightSelectionMatches(),

            // Autocomplete
            autocompletion({
                override: [createTypstCompletions(this.plugin)],
                activateOnTyping: true,
                maxRenderedOptions: 20,
            }),

            // Multiple selections
            EditorState.allowMultipleSelections.of(true),

            // Key bindings
            this.buildKeymap(),

            // Theme
            ...(isDarkTheme ? [xcodeDark] : []),

            // Content change listener
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    this.content = update.state.doc.toString();
                    if (this.onContentChange) {
                        this.onContentChange(this.content);
                    }
                }
            }),
        ];
    }

    private buildKeymap(): Extension {
        return keymap.of([
            // Tab: Accept completion if active, otherwise indent
            {
                key: "Tab",
                run: (view) => {
                    if (completionStatus(view.state) === "active") {
                        return acceptCompletion(view);
                    }
                    return false;
                },
            },
            // Bold: Ctrl/Cmd+B
            {
                key: "Mod-b",
                run: (view) => wrapOrInsert(view, "*"),
                preventDefault: true,
            },
            // Italic: Ctrl/Cmd+I
            {
                key: "Mod-i",
                run: (view) => wrapOrInsert(view, "_"),
                preventDefault: true,
            },
            // Indent on new line
            {
                key: "Enter",
                run: insertNewlineAndIndent,
            },
            // Keymaps
            indentWithTab,
            ...completionKeymap,
            ...historyKeymap,
            ...defaultKeymap,
            ...searchKeymap,
        ]);
    }

    public getContent(): string {
        return this.editorView ? this.editorView.state.doc.toString() : this.content;
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

    public getEditorState(): { cursorPos: number; scrollTop: number } | null {
        if (!this.editorView) return null;

        const state = {
            cursorPos: this.editorView.state.selection.main.head,
            scrollTop: this.editorView.scrollDOM.scrollTop,
        };
        return state;
    }

    public restoreEditorState(state: {
        cursorPos: number;
        scrollTop: number;
    }): void {
        if (!this.editorView) return;

        this.editorView.scrollDOM.scrollTop = state.scrollTop;

        this.editorView.dispatch({
            selection: { anchor: state.cursorPos },
            scrollIntoView: false,
        });

        this.editorView.focus();

        setTimeout(() => {
            if (this.editorView) {
                this.editorView.scrollDOM.scrollTop = state.scrollTop;
            }
        }, 50);
    }

    public focus(): void {
        this.editorView?.focus();
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
}
