# Typst for Obsidian

A plugin for [Obsidian](https://obsidian.md) that provides native support for [Typst](https://typst.app) files (.typ).

## Features

- **Native Typst file support**: Open and edit .typ files directly in Obsidian
- **CodeMirror editor**: Full-featured editing with syntax highlighting and line numbers
- **Live preview**: Toggle between source and rendered reading modes
- **Theme integration**: Rendered content adapts to your Obsidian theme (light/dark)
- **Syntax highlighting preservation**: Code blocks maintain their original colors
- **Full-width rendering**: Typst documents render with optimal width for readability

## Settings

### Default File Mode

Choose whether Typst files open in **Source mode** (editable) or **Reading mode** (rendered) by default.

- **Source mode**: Opens files in the editor for immediate editing
- **Reading mode**: Opens files in rendered preview mode

You can always toggle between modes using the icon in the top-right corner of the file view or with the command palette.

## Commands

- **Create new Typst file**: Creates a new .typ file in your vault
- **Toggle between source and reading mode**: Switch between editing and preview modes

## Usage

1. Create a new Typst file using the command palette or by creating a file with the `.typ` extension
2. Edit your Typst content in source mode with full syntax highlighting
3. Toggle to reading mode to see the beautifully rendered output
4. The rendered content will automatically adapt to your Obsidian theme

## Installation

1. Download the latest release
2. Extract the files to your Obsidian plugins folder: `VaultFolder/.obsidian/plugins/typst-for-obsidian/`
3. Enable the plugin in Obsidian's Community Plugins settings

## Development

```bash
npm install
npm run build
```

## License

MIT
