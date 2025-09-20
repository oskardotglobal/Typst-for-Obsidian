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
- [ ] Add more features to code editor
- [ ] Define Typst language for syntax highlight (???)
- [ ] "Live Preview" mode - render incremental document fragments for each 'block' of Typst (ts is not happening 😭🙏🥀)

- settings/commands:
  - default preamble
  - export to pdf
  - change font size, preamble params as options
  - editor readble line length
