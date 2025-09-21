## Typst for Obsidian

A Typst editor & renderer for [Obsidian](https://obsidian.md). Implements native [Typst](https://typst.app) support, a CodeMirror editor, and a Typst compiler, with toggleable source and reading modes.

A plugin for that provides native support for files (.typ).

### Features

- Open and edit .typ files directly in Obsidian
- Code editor in source mode
- Toggle between source and rendered reading modes (with upper right icon or ho`tkey)
- Rendered content adapts to Obsidian theme

### Settings

- Default File Mode
  - Choose whether Typst files open in Source mode or Reading mode by default.

### Commands

- **Create new Typst file**: Creates a new .typ file in your vault (relative paths are supported)
- **Toggle source and reading mode**: Switch between editing and preview modes

### Development

```bash
npm install
npm run build
```

### To-do

- [ ] Fix styling
- [ ] Add formatting settings
- [ ] Add package support
- [ ] Add more features & keyboard shortcuts to code editor
- [ ] Define Typst language for syntax highlight (???)
- [ ] "Live Preview" mode - render incremental document fragments for each 'block' of Typst (ts is not happening 😭🙏🥀)

- settings/commands:

  - export to pdf
  - change font size, preamble params as options
    packages
    fonts

- %THEMECOLOR%

Typst compilation failed: [SourceDiagnostic { severity: Error, span: Span(1421687374872340), message: "failed to load package (JsValue(Error: Dummy Registry, please initialize compiler with withPackageRegistry()\nError: Dummy Registry, please initialize compiler with withPackageRegistry()\n at wt.eval (eval at n.wbg.**wbg_newnoargs_105ed471475aaf50 (plugin:typst-for-obsidian), <anonymous>:3:7)\n at eval (plugin:typst-for-obsidian:7:1605)\n at ft (plugin:typst-for-obsidian:6:7205)\n at n.wbg.**wbg_call_7cccdd69e0791ae2 (plugin:typst-for-obsidian:7:1575)\n at https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm:wasm-function[13541]:0xda8289\n at https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm:wasm-function[1290]:0x5c9d2e\n at https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm:wasm-function[3416]:0x95cfc7\n at https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm:wasm-function[11711]:0xd7e518\n at https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm:wasm-function[2380]:0x7fc965\n at https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm:wasm-function[14159]:0xdbec5a))", trace: [], hints: [] }]
compileToSvg @ plugin:typst-for-obsidian:12
