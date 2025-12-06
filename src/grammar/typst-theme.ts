import type { IRawTheme } from "vscode-textmate";
import type { SyntaxHighlightColors } from "../settings";

let currentColors: SyntaxHighlightColors | null = null;

export function setThemeColors(colors: SyntaxHighlightColors): void {
  currentColors = colors;
}

function getColors(
  isDark: boolean
): SyntaxHighlightColors["dark"] | SyntaxHighlightColors["light"] {
  if (!currentColors) {
    throw new Error("Theme colors not initialized.");
  }
  return isDark ? currentColors.dark : currentColors.light;
}

export function getTypstTheme(isDark: boolean): IRawTheme {
  const colors = getColors(isDark);

  return {
    name: isDark ? "typst-dark" : "typst-light",
    settings: [
      {
        settings: {
          foreground: colors.defaultText,
        },
      },
      {
        scope: "comment",
        settings: {
          foreground: colors.comments,
        },
      },
      {
        scope: [
          "comment.line.double-slash.typst",
          "punctuation.definition.comment.typst",
        ],
        settings: {
          foreground: colors.comments,
        },
      },
      {
        scope: ["keyword", "storage"],
        settings: {
          foreground: colors.keywords,
        },
      },
      {
        scope: [
          "keyword.control.hash.typst",
          "keyword.control.import.typst",
          "keyword.control.other.typst",
          "keyword.control.conditional.typst",
          "keyword.control.loop.typst",
        ],
        settings: {
          foreground: colors.keywords,
        },
      },
      {
        scope: ["string", "constant.character"],
        settings: {
          foreground: colors.strings,
        },
      },
      {
        scope: [
          "string.quoted.double.typst",
          "punctuation.definition.string.typst",
        ],
        settings: {
          foreground: colors.strings,
        },
      },
      {
        scope: [
          "string.other.label.typst",
          "string.other.reference.typst",
          "punctuation.definition.reference.typst",
        ],
        settings: {
          foreground: colors.labelsAndReferences,
        },
      },
      {
        scope: "constant.character.escape.content.typst",
        settings: {
          foreground: colors.escapeSequences,
        },
      },
      {
        scope: "constant.character.escape.string.typst",
        settings: {
          foreground: colors.escapeSequences,
        },
      },
      {
        scope: "constant.numeric",
        settings: {
          foreground: colors.numbers,
        },
      },
      {
        scope: [
          "constant.numeric.integer.typst",
          "constant.numeric.float.typst",
          "constant.numeric.length.typst",
          "constant.numeric.percentage.typst",
          "constant.numeric.fr.typst",
        ],
        settings: {
          foreground: colors.numbers,
        },
      },
      {
        scope: ["constant.language.boolean.typst", "keyword.other.none.typst"],
        settings: {
          foreground: colors.booleans,
        },
      },
      {
        scope: "constant.other.symbol.typst",
        settings: {
          foreground: colors.symbols,
        },
      },
      {
        scope: ["entity.name.function", "support.function"],
        settings: {
          foreground: colors.functions,
        },
      },
      {
        scope: [
          "entity.name.function.typst",
          "entity.name.function.hash.typst",
          "support.function.builtin.typst",
        ],
        settings: {
          foreground: colors.functions,
        },
      },
      {
        scope: ["entity.name.type", "support.type", "support.class"],
        settings: {
          foreground: colors.types,
        },
      },
      {
        scope: ["entity.name.type.primitive.typst", "storage.type.typst"],
        settings: {
          foreground: colors.types,
        },
      },
      {
        scope: ["variable", "support.variable"],
        settings: {
          foreground: colors.variables,
        },
      },
      {
        scope: [
          "variable.other.readwrite.typst",
          "variable.other.readwrite.hash.typst",
        ],
        settings: {
          foreground: colors.escapeSequences,
        },
      },
      {
        scope: "variable.other.constant",
        settings: {
          foreground: colors.escapeSequences,
        },
      },
      {
        scope: "variable.other.constant.builtin.typst",
        settings: {
          foreground: colors.labelsAndReferences,
        },
      },
      {
        scope: "keyword.operator",
        settings: {
          foreground: colors.operators,
        },
      },
      {
        scope: [
          "keyword.operator.wildcard.typst",
          "keyword.operator.accessor.typst",
          "keyword.operator.assignment.typst",
          "keyword.operator.arithmetic.typst",
          "keyword.operator.relational.typst",
          "keyword.operator.spread.typst",
          "keyword.other.logical.typst",
          "keyword.other.range.typst",
        ],
        settings: {
          foreground: colors.operators,
        },
      },
      {
        scope: "storage.type.function.arrow.typst",
        settings: {
          foreground: colors.keywords,
        },
      },
      {
        scope: ["markup.heading.typst", "punctuation.definition.heading.typst"],
        settings: {
          foreground: colors.headings,
          fontStyle: "bold",
        },
      },
      {
        scope: ["markup.bold.typst", "punctuation.definition.bold.typst"],
        settings: {
          foreground: colors.bold,
          fontStyle: "bold",
        },
      },
      {
        scope: ["markup.italic.typst", "punctuation.definition.italic.typst"],
        settings: {
          foreground: colors.italic,
          fontStyle: "italic",
        },
      },
      {
        scope: "markup.underline.link.typst",
        settings: {
          foreground: colors.links,
          fontStyle: "underline",
        },
      },
      {
        scope: "markup.math.typst",
        settings: {
          foreground: colors.mathText,
        },
      },
      {
        scope: [
          "punctuation.definition.string.begin.math.typst",
          "punctuation.definition.string.end.math.typst",
          "punctuation.math.operator.typst",
        ],
        settings: {
          foreground: colors.mathOperators,
        },
      },
      {
        scope: [
          "markup.raw.block.typst",
          "markup.raw.inline.typst",
          "string.other.raw.typst",
          "punctuation.definition.raw.begin.typst",
          "punctuation.definition.raw.end.typst",
          "punctuation.definition.raw.inline.typst",
        ],
        settings: {
          foreground: colors.rawCode,
        },
      },
      {
        scope: "fenced_code.block.language.typst",
        settings: {
          foreground: colors.codeLanguage,
        },
      },
      {
        scope: [
          "punctuation.definition.list.unnumbered.typst",
          "punctuation.definition.list.numbered.typst",
        ],
        settings: {
          foreground: colors.listMarkers,
        },
      },
      {
        scope: [
          "punctuation.definition.en-dash.typst",
          "punctuation.definition.em-dash.typst",
          "punctuation.definition.ellipsis.typst",
        ],
        settings: {
          foreground: colors.punctuation,
        },
      },
      {
        scope: [
          "punctuation.separator.colon.typst",
          "punctuation.separator.comma.typst",
          "punctuation.terminator.statement.typst",
        ],
        settings: {
          foreground: colors.separators,
        },
      },
      {
        scope: [
          "meta.brace.round.typst",
          "meta.brace.square.typst",
          "meta.brace.curly.typst",
          "markup.content.brace.typst",
        ],
        settings: {
          foreground: colors.braces,
        },
      },
      {
        scope: [
          "meta.expr.import.typst",
          "meta.expr.set.typst",
          "meta.expr.show.typst",
          "meta.expr.let.typst",
          "meta.expr.if.typst",
          "meta.expr.context.typst",
          "meta.expr.for.typst",
          "meta.expr.while.typst",
        ],
        settings: {
          foreground: colors.metaExpressions,
        },
      },
      {
        scope: "punctuation",
        settings: {
          foreground: colors.generalPunctuation,
        },
      },
    ],
  };
}
