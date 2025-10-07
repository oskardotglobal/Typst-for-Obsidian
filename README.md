# Typst for Obsidian

Typst for Obsidian is a [Typst](https://typst.app) editor integrated directly into [Obsidian](https://obsidian.md), enabling you to create and preview Typst documents seamlessly within your notes. Create `.typ` files, edit with syntax highlighting, and render PDFs that adapt to your Obsidian theme.

![Screenshot](assets/math-notes.png)

## Features

- Open `.typ` files in Obsidian
- Typst editor with syntax highlighting
- Toggle between source and PDF preview modes
- PDF export to vault
- Theme integration - rendered PDFs adapt to Obsidian themes
- Template variables for dynamic theming (`%THEMECOLOR%`, `%FONTSIZE%`, etc.)
- Package support - use local packages from data directory or auto-download from preview namespace
- System font support (desktop only)

![Screenshot](assets/full-screen.png)

## Usage

1. Create a new `.typ` file or open an existing one
2. Edit in source mode with syntax highlighting
3. Click the preview icon to render PDF
4. Click the export icon to save PDF to vault

### Template Variables

Use these variables in your Typst documents to match Obsidian themes:

```typst
#set text(fill: rgb("#%THEMECOLOR%"), size: %FONTSIZE%)
#set page(fill: rgb("#%BGCOLOR%"), width: %LINEWIDTH%)
```

Available variables:

- `%THEMECOLOR%` - Primary text color
- `%FONTSIZE%` - Text size in pt
- `%BGCOLOR%` - Background color
- `%LINEWIDTH%` - Page width
- `%ACCENTCOLOR%`, `%FAINTCOLOR%`, `%MUTEDCOLOR%`
- `%BGPRIMARY%`, `%BGPRIMARYALT%`, `%BGSECONDARY%`, `%BGSECONDARYALT%`
- `%SUCCESSCOLOR%`, `%WARNINGCOLOR%`, `%ERRORCOLOR%`
- `%FONTTEXT%`, `%FONTMONO%`, `%HEADINGCOLOR%`

### Custom Layout Functions

Configure default page layouts in settings:

- **Default Layout Functions** - Applied to all internal previews
- **PDF Export Layout Functions** - Applied only when exporting PDFs

### Custom Snippets

You can add custom Typst snippets as JSON for autocomplete in settings. Each snippet has a prefix (trigger) and body (lines to insert). Use `${}` for tab stops, and press `Tab` to jump between them.

Example (inserting a table aligned to the center):

```json
{
  "table": {
    "prefix": "tbl",
    "body": [
      "#align(center,",
      "\ttable(",
      "\t\tcolumns: ${},",
      "\t\t[${}],",
      "\t)",
      ")"
    ]
  }
}
```

## Settings

- **Default Mode** - Open files in source or reading mode
- **Auto-download Packages** - Automatically fetch packages from Typst registry
- **Font Families** - System fonts to load (desktop only)
- **Layout Functions** - Custom Typst preambles for formatting
- **Enable Text Layer** - Enable text selection in PDF preview. Disabling this setting may improve performance
- **Custom Snippets** - Add custom Typst snippets for autocomplete

## Commands

- **Create new Typst file** - Create `.typ` file at specified path
- **Toggle source/reading mode** - Switch between editing and preview

## Keyboard Shortcuts

- `Ctrl+B` - Bold (`*text*`)
- `Ctrl+I` - Italic (`_text_`)
- `Tab` - Accept autocomplete suggestion

_Currently, keyboard shortcuts only work when Obsidian hotkeys for the same hotkey are disabled._

## Installation

1. Download the latest release from the [Releases](https://github.com/k0src/Typst-for-Obsidian/releases) page
2. Extract `main.js`, `manifest.json`, `styles.css`, and `obsidian_typst_bg.wasm` to your Obsidian plugins folder (`.obsidian/plugins/typst-for-obsidian`)
3. Enable the plugin in Obsidian settings

## How it Works

- The plugin integrates the Typst compiler directly into Obsidian using WebAssembly, allowing it to run in the browser.
- It manages two modes: source mode (for editing) and reading mode (for PDF preview).
- The editor view uses CodeMirror 6 Typst editor with syntax highlighting, autocomplete, and keybindings.
- The viewer renders PDFs using PDFium, with support for text selection and links.

### Compilation Process

When compiling a document, the plugin first processes the source code through several stages:

1. If enabled, custom layout functions are prepended to the source. These can be different for internal previews vs PDF exports, allowing different formatting for each use case.
2. Before compilation, all template variables (like `%THEMECOLOR%`, `%FONTSIZE%`) are replaced with values extracted from the current Obsidian theme.
3. The processed source is then sent to a Web Worker running the Typst compiler.

### WebAssembly Compiler

- The core compiler is written in Rust and compiled to WebAssembly.
- The compiler uses the official Typst library to parse and compile documents to a PDF.
- On desktop, system fonts are loaded into the WASM module via the Local Font Access API and are registered with Typst's font system.
- The plugin fetches Typst packages from the official repository and caches them locally, and gets packages from the Typst data directory on desktop.

### PDF Rendering

- Each page is rendered to a canvas with scaling for high-DPI displays, using PDFium.
- Text layers are overlaid for selection and annotation layers are rendered for interactive elements like links.

## Development

### Build

```bash
npm install
cd compiler
cargo build --release
wasm-pack build --target web --out-dir ../pkg
cd ..
npm run build
```

## What's Next

- [ ] **Improve performance of PDF rendering**
- [ ] **Incremental rendering while typing** (requires reworking the compiler with to be stateful)
- [ ] **Polish PDF viewer, fix text layers**
- [ ] **Polish editor UI**
- [ ] Add more keyboard shortcuts, more robust editor features
- [ ] Better syntax highlighting (full grammar)
- [ ] Formatter for Typst code
- [ ] Add support for jumping from PDF to source by clicking on text
- [ ] Add backlink support in PDF preview
- [ ] Support for more template variables
- [ ] Improve error handling and reporting
- [ ] Switch to [Monaco Editor](https://microsoft.github.io/monaco-editor/) (maybe)
- [ ] Support Typst packages that use WebAssembly modules
- [ ] Add more settings for customization

## Known Issues

- Packages that import WebAssembly modules (like CeTZ) do not work, because WASM modules cannot be imported into other WASM modules in the browser
- ~~Some fonts will not load~~ (fixed in 0.0.3)
- Returning to scroll position when switching between source and preview modes is jittery

## Credits

Compiler implementation inspired by [fenjalien/obsidian-typst](https://github.com/fenjalien/obsidian-typst).

## License

MIT
