import { TypstEditor } from "./TypstEditor";

export interface EditorState {
    cursorPos: number;
    scrollTop: number;
}

export class EditorStateManager {
    private savedEditorState: EditorState | null = null;
    private savedReadingScrollTop: number = 0;

    saveEditorState(editor: TypstEditor | null): void {
        if (editor) {
            const state = editor.getEditorState();
            if (state) {
                this.savedEditorState = state;
            }
        }
    }

    saveReadingScrollTop(contentEl: HTMLElement | null): void {
        if (contentEl) {
            this.savedReadingScrollTop = contentEl.scrollTop;
        }
    }

    restoreEditorState(editor: TypstEditor | null): void {
        if (this.savedEditorState && editor) {
            requestAnimationFrame(() => {
                if (editor && this.savedEditorState) {
                    editor.restoreEditorState(this.savedEditorState);
                }
            });
        } else if (editor) {
            setTimeout(() => {
                editor?.focus();
            }, 0);
        }
    }

    restoreReadingScrollTop(contentEl: HTMLElement | null): void {
        if (this.savedReadingScrollTop > 0 && contentEl) {
            setTimeout(() => {
                if (contentEl) {
                    contentEl.scrollTop = this.savedReadingScrollTop;
                }
            }, 0);
        }
    }

    getSavedReadingScrollTop(): number {
        return this.savedReadingScrollTop;
    }

    clear(): void {
        this.savedEditorState = null;
        this.savedReadingScrollTop = 0;
    }
}
