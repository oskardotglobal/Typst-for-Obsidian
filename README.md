# Typst for Obsidian

Typst for Obsidian is a [Typst](https://typst.app) editor integrated directly into [Obsidian](https://obsidian.md), enabling you to create and preview Typst documents seamlessly within your notes. Create `.typ` files, edit with syntax highlighting, and render PDFs that adapt to your Obsidian theme.

<p align="center">
  <img src="assets/math-notes.png" width="700">
</p>

## Features

- Open `.typ` files in Obsidian
- VSCode-Like editor with Typst syntax highlighting
- Customizable syntax highlighting colors for dark and light themes
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

You can add custom Typst snippets as JSON for autocomplete in settings. Each snippet has a prefix (trigger) and body (lines to insert). Use `$1`, `$2`, etc., for tab stops.

Example (inserting a table aligned to the center):

```json
{
  "table": {
    "prefix": "tbl",
    "body": [
      "#align(center,",
      "\ttable(",
      "\t\tcolumns: $1,",
      "\t\t[$2],",
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
- **Syntax Highlighting** - Customize colors for 28 different syntax categories, separately for dark and light themes. Import/export color configurations as JSON

## Commands

- **Create new Typst file** - Create `.typ` file at specified path
- **Toggle source/reading mode** - Switch between editing and preview
- **Export to PDF** - Export current document to PDF file
- **Toggle bold** - Wrap selection with `*text*`
- **Toggle italic** - Wrap selection with `_text_`
- **Toggle underline** - Wrap selection with `#underline[text]`
- **Increase heading level** - Add one `=` to heading (max 6 levels)
- **Decrease heading level** - Remove one `=` from heading (min 2 levels)

> [!NOTE]
>
> Since Obsidian doesn't let you use the same hotkeys for different views, to use `Ctrl+B` and `Ctrl+I` in both Typst files and Markdown files, unbind the default bold and italic hotkeys, and bind `Toggle bold` and `Toggle italic` to `Ctrl+B` and `Ctrl+I`. It will work for both Typst files and Markdown files. Alternatively, you can just use two different hotkeys.

## Official Template

You can use the [official template](https://github.com/k0src/Typsidian) designed for Typst in Obsidian. It includes support for light/dark modes, titles, headers, and useful functions for displaying notes.

<p align="center">
  <img src="assets/template.png" width="700">
</p>

To get started, import the template at the top of your Typst file:

```typst
#import "@preview/typsidian:0.0.1": *;

#show: typsidian.with(
  theme: "dark",
  title: "My Document",
  course: "CS4999",
  standalone: false
)
```

This template is an Obsidian-like theme for Typst, with support for light/dark modes, titles, headers, and some useful functions for displaying notes.

When using this template, I recommend setting the custom layout function in the settings to:

```typst
#set page(
  width: %LINEWIDTH%,
  height: auto,
  margin: (x: 0.25em, y: 0.25em),
  fill: rgb("%BGCOLOR%")
)
```

Make sure to set `standalone: false`. This will prevent the template from adding its own page layout. Additionally, make sure you have the required fonts installed and added to the font families in settings:

- [Inter 24pt](https://fonts.google.com/specimen/Inter)
- [GeistMono NFP](https://github.com/ryanoasis/nerd-fonts/releases/)
- [Fira Math](https://github.com/firamath/firamath/releases/)

## Installation

1. Download the latest release from the [Releases](https://github.com/k0src/Typst-for-Obsidian/releases) page
2. Extract `main.js`, `manifest.json`, `styles.css`, and `obsidian_typst_bg.wasm` to your Obsidian plugins folder (`.obsidian/plugins/typst-for-obsidian`)
3. Enable the plugin in Obsidian settings

## How it Works

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

## Future Plans

- [ ] **Implement incremental PDF rendering and proper editor-preview split view**
- [ ] **Improve performance of PDF rendering**
- [ ] **Polish PDF viewer, fix text layers, add annotation layers**
- [ ] Finish Monaco snippet integration for autocomplete
- [ ] Formatter for Typst code
- [ ] Add support for jumping from PDF to source by clicking on text
- [ ] Add backlink support in PDF preview
- [ ] Support for more template variables
- [ ] Improve error handling and reporting
- [ ] Support Typst packages that use WebAssembly modules

## Known Issues

- Packages that import WebAssembly modules (like CeTZ) don't work - WASM can't import WASM in browsers
- Scroll position restoration when toggling modes is jittery

## Credits

Compiler implementation inspired by [fenjalien/obsidian-typst](https://github.com/fenjalien/obsidian-typst).

[Tinymist TextMate grammar](https://github.com/Myriad-Dreamin/tinymist/tree/main/syntaxes/textmate)

## License

MIT
