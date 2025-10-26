import { Prec } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { commands, externalCommands, helix } from "codemirror-helix";
import { type App, type Command, SuggestModal, type WorkspaceLeaf } from "obsidian";
import type TypstForObsidian from "./main";

export class HelixEditor {
    private app: App;
    private plugin: TypstForObsidian;

    public constructor(app: App, plugin: TypstForObsidian) {
        this.app = app;
        this.plugin = plugin;
    }

    public onload() {
        if (this.plugin.settings.helixEnableGlobally) {
            this.plugin.registerEditorExtension(this.getExtensions());
            this.app.workspace.updateOptions();
        }
    }

    public getExtensions() {
        if (!this.plugin.settings.enableHelix) {
            return [];
        }

        return [
            Prec.high(
                EditorView.theme({
                    ".cm-hx-block-cursor .cm-hx-cursor": {
                        background: "var(--text-accent)",
                    },
                    ".cm-panel .cm-hx-command-help": {
                        backgroundColor: "var(--modal-background)",
                    },
                    ".cm-panel .cm-hx-command-popup": {
                        backgroundColor: "var(--modal-background)",
                        color: "var(--text-normal)",
                        padding: "0 0.5rem",
                        borderColor: "var(--modal-border-color)",
                        borderWidth: "var(--modal-border-width)",
                    },
                }),
            ),
            Prec.high(
                helix({
                    config: {
                        "editor.cursor-shape.insert": this.plugin.settings.helixCursorInInsertMode,
                    },
                }),
            ),
            externalCommands.of({
                file_picker: () => {
                    // @ts-ignore
                    (this.app?.commands?.commands?.["switcher:open"] as Command)?.callback?.();
                },
                // @ts-ignore guh...
                ":buffer-close": () => {
                    this.app.workspace.activeLeaf?.detach();
                },
                ":buffer-next": () => {
                    this.switchTab(1);
                },
                ":buffer-previous": () => {
                    this.switchTab(-1);
                },
                buffer_picker: () => {
                    const modal = new BufferModal(this.app);
                    modal.open();
                },
            }),
            commands.of([
                {
                    name: "vsplit",
                    aliases: ["vs"],
                    help: "Open the file in vertical split",
                    handler: (_view) => {
                        const activeLeaf = this.app.workspace.activeLeaf;
                        if (activeLeaf) {
                            this.app.workspace.duplicateLeaf(activeLeaf, "split", "vertical");
                        }
                    },
                },
                {
                    name: "vsplit-new",
                    aliases: ["vnew"],
                    help: "Open a new Note on vertical Split",
                    handler: (_view) => {
                        const activeLeaf = this.app.workspace.activeLeaf;
                        if (activeLeaf) {
                            this.app.workspace.duplicateLeaf(activeLeaf, "split", "vertical");
                        }
                    },
                },
                {
                    name: "hsplit",
                    aliases: ["hs"],
                    help: "Open the file in horizontal split",
                    handler: (_view) => {
                        const activeLeaf = this.app.workspace.activeLeaf;
                        if (activeLeaf) {
                            this.app.workspace.duplicateLeaf(activeLeaf, "split", "horizontal");
                        }
                    },
                },
                {
                    name: "hsplit-new",
                    aliases: ["hnew"],
                    help: "Open a new Note on Horizontal Split",
                    handler: (_view) => {
                        const activeLeaf = this.app.workspace.activeLeaf;
                        if (activeLeaf) {
                            this.app.workspace.duplicateLeaf(activeLeaf, "split", "horizontal");
                        }
                    },
                },
            ]),
        ];
    }

    private switchTab(direction: 1 | -1) {
        const leaves = this.app.workspace.getLeavesOfType("markdown");
        const activeLeaf = this.app.workspace.activeLeaf;
        if (!activeLeaf || leaves.length <= 1) return;

        const currentIndex = leaves.indexOf(activeLeaf);
        const newIndex = (currentIndex + direction + leaves.length) % leaves.length;

        this.app.workspace.setActiveLeaf(leaves[newIndex], { focus: true });
    }
}

type Buffer = {
    title: string;
    leaf: WorkspaceLeaf;
};

class BufferModal extends SuggestModal<Buffer> {
    constructor(app: App) {
        super(app);
        this.buffers = this.app.workspace
            .getLeavesOfType("markdown")
            .map((a) => ({ title: a.getDisplayText(), leaf: a }));
    }

    buffers: Buffer[] = [];

    getSuggestions(query: string): Buffer[] {
        return this.buffers.filter((buf) => buf.title.toLowerCase().includes(query.toLowerCase()));
    }

    renderSuggestion(buf: Buffer, el: HTMLElement) {
        el.createEl("div", { text: buf.title });
    }

    onChooseSuggestion(buf: Buffer) {
        this.app.workspace.setActiveLeaf(buf.leaf, { focus: true });
    }
}
