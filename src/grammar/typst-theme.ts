import type { IRawTheme } from "vscode-textmate";

export const TypstDarkTheme: IRawTheme = {
  name: "typst-dark",
  settings: [
    {
      settings: {
        foreground: "text-normal",
      },
    },
    {
      scope: "comment",
      settings: {
        foreground: "#858585",
      },
    },
    {
      scope: [
        "comment.line.double-slash.typst",
        "punctuation.definition.comment.typst",
      ],
      settings: {
        foreground: "#858585",
      },
    },
    {
      scope: ["keyword", "storage"],
      settings: {
        foreground: "#ff5c8d",
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
        foreground: "#ff5c8d",
      },
    },
    {
      scope: ["string", "constant.character"],
      settings: {
        foreground: "#23d18b",
      },
    },
    {
      scope: [
        "string.quoted.double.typst",
        "punctuation.definition.string.typst",
      ],
      settings: {
        foreground: "#23d18b",
      },
    },
    {
      scope: [
        "string.other.label.typst",
        "string.other.reference.typst",
        "punctuation.definition.reference.typst",
      ],
      settings: {
        foreground: "#ea7599",
      },
    },
    {
      scope: "constant.character.escape.content.typst",
      settings: {
        foreground: "#ffa7c4",
      },
    },
    {
      scope: "constant.character.escape.string.typst",
      settings: {
        foreground: "#ffa7c4",
      },
    },
    {
      scope: "constant.numeric",
      settings: {
        foreground: "#f48771",
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
        foreground: "#f48771",
      },
    },
    {
      scope: ["constant.language.boolean.typst", "keyword.other.none.typst"],
      settings: {
        foreground: "#ff5c8d",
      },
    },
    {
      scope: "constant.other.symbol.typst",
      settings: {
        foreground: "#ffa7c4",
      },
    },
    {
      scope: ["entity.name.function", "support.function"],
      settings: {
        foreground: "#75beff",
      },
    },
    {
      scope: [
        "entity.name.function.typst",
        "entity.name.function.hash.typst",
        "support.function.builtin.typst",
      ],
      settings: {
        foreground: "#75beff",
      },
    },
    {
      scope: ["entity.name.type", "support.type", "support.class"],
      settings: {
        foreground: "#b794f4",
      },
    },
    {
      scope: ["entity.name.type.primitive.typst", "storage.type.typst"],
      settings: {
        foreground: "#b794f4",
      },
    },
    {
      scope: ["variable", "support.variable"],
      settings: {
        foreground: "#ea7599",
      },
    },
    {
      scope: [
        "variable.other.readwrite.typst",
        "variable.other.readwrite.hash.typst",
      ],
      settings: {
        foreground: "#ffa7c4",
      },
    },
    {
      scope: "variable.other.constant",
      settings: {
        foreground: "#ffa7c4",
      },
    },
    {
      scope: "variable.other.constant.builtin.typst",
      settings: {
        foreground: "#ea7599",
      },
    },
    {
      scope: "keyword.operator",
      settings: {
        foreground: "#aeafad",
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
        foreground: "#aeafad",
      },
    },
    {
      scope: "storage.type.function.arrow.typst",
      settings: {
        foreground: "#ff5c8d",
      },
    },
    {
      scope: ["markup.heading.typst", "punctuation.definition.heading.typst"],
      settings: {
        foreground: "#ff5c8d",
        fontStyle: "bold",
      },
    },
    {
      scope: ["markup.bold.typst", "punctuation.definition.bold.typst"],
      settings: {
        foreground: "#f48771",
        fontStyle: "bold",
      },
    },
    {
      scope: ["markup.italic.typst", "punctuation.definition.italic.typst"],
      settings: {
        foreground: "#b794f4",
        fontStyle: "italic",
      },
    },
    {
      scope: "markup.underline.link.typst",
      settings: {
        foreground: "#75beff",
        fontStyle: "underline",
      },
    },
    {
      scope: "markup.math.typst",
      settings: {
        foreground: "#D4D4D4",
      },
    },
    {
      scope: [
        "punctuation.definition.string.begin.math.typst",
        "punctuation.definition.string.end.math.typst",
        "punctuation.math.operator.typst",
      ],
      settings: {
        foreground: "#cca700",
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
        foreground: "#23d18b",
      },
    },
    {
      scope: "fenced_code.block.language.typst",
      settings: {
        foreground: "#b794f4",
      },
    },
    {
      scope: [
        "punctuation.definition.list.unnumbered.typst",
        "punctuation.definition.list.numbered.typst",
      ],
      settings: {
        foreground: "#9b9ea4",
      },
    },
    {
      scope: [
        "punctuation.definition.en-dash.typst",
        "punctuation.definition.em-dash.typst",
        "punctuation.definition.ellipsis.typst",
      ],
      settings: {
        foreground: "#9b9ea4",
      },
    },
    {
      scope: [
        "punctuation.separator.colon.typst",
        "punctuation.separator.comma.typst",
        "punctuation.terminator.statement.typst",
      ],
      settings: {
        foreground: "#9b9ea4",
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
        foreground: "#9b9ea4",
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
        foreground: "#abb2bf",
      },
    },
    {
      scope: "punctuation",
      settings: {
        foreground: "#585858",
      },
    },
  ],
};

export const TypstLightTheme: IRawTheme = {
  name: "typst-light",
  settings: [
    {
      settings: {
        foreground: "text-normal",
      },
    },
    {
      scope: "comment",
      settings: {
        foreground: "#858585",
      },
    },
    {
      scope: [
        "comment.line.double-slash.typst",
        "punctuation.definition.comment.typst",
      ],
      settings: {
        foreground: "#858585",
      },
    },
    {
      scope: ["keyword", "storage"],
      settings: {
        foreground: "#d6266e",
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
        foreground: "#d6266e",
      },
    },
    {
      scope: ["string", "constant.character"],
      settings: {
        foreground: "#1ba665",
      },
    },
    {
      scope: [
        "string.quoted.double.typst",
        "punctuation.definition.string.typst",
      ],
      settings: {
        foreground: "#1ba665",
      },
    },
    {
      scope: [
        "string.other.label.typst",
        "string.other.reference.typst",
        "punctuation.definition.reference.typst",
      ],
      settings: {
        foreground: "#c94f72",
      },
    },
    {
      scope: "constant.character.escape.content.typst",
      settings: {
        foreground: "#d6266e",
      },
    },
    {
      scope: "constant.character.escape.string.typst",
      settings: {
        foreground: "#d6266e",
      },
    },
    {
      scope: "constant.numeric",
      settings: {
        foreground: "#c74f4f",
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
        foreground: "#c74f4f",
      },
    },
    {
      scope: ["constant.language.boolean.typst", "keyword.other.none.typst"],
      settings: {
        foreground: "#d6266e",
      },
    },
    {
      scope: "constant.other.symbol.typst",
      settings: {
        foreground: "#d6266e",
      },
    },
    {
      scope: ["entity.name.function", "support.function"],
      settings: {
        foreground: "#4d9ed9",
      },
    },
    {
      scope: [
        "entity.name.function.typst",
        "entity.name.function.hash.typst",
        "support.function.builtin.typst",
      ],
      settings: {
        foreground: "#4d9ed9",
      },
    },
    {
      scope: ["entity.name.type", "support.type", "support.class"],
      settings: {
        foreground: "#8b5fc7",
      },
    },
    {
      scope: ["entity.name.type.primitive.typst", "storage.type.typst"],
      settings: {
        foreground: "#8b5fc7",
      },
    },
    {
      scope: ["variable", "support.variable"],
      settings: {
        foreground: "#c94f72",
      },
    },
    {
      scope: [
        "variable.other.readwrite.typst",
        "variable.other.readwrite.hash.typst",
      ],
      settings: {
        foreground: "#d6266e",
      },
    },
    {
      scope: "variable.other.constant",
      settings: {
        foreground: "#d6266e",
      },
    },
    {
      scope: "variable.other.constant.builtin.typst",
      settings: {
        foreground: "#c94f72",
      },
    },
    {
      scope: "keyword.operator",
      settings: {
        foreground: "#585858",
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
        foreground: "#585858",
      },
    },
    {
      scope: "storage.type.function.arrow.typst",
      settings: {
        foreground: "#d6266e",
      },
    },
    {
      scope: ["markup.heading.typst", "punctuation.definition.heading.typst"],
      settings: {
        foreground: "#d6266e",
        fontStyle: "bold",
      },
    },
    {
      scope: ["markup.bold.typst", "punctuation.definition.bold.typst"],
      settings: {
        foreground: "#c74f4f",
        fontStyle: "bold",
      },
    },
    {
      scope: ["markup.italic.typst", "punctuation.definition.italic.typst"],
      settings: {
        foreground: "#8b5fc7",
        fontStyle: "italic",
      },
    },
    {
      scope: "markup.underline.link.typst",
      settings: {
        foreground: "#4d9ed9",
        fontStyle: "underline",
      },
    },
    {
      scope: "markup.math.typst",
      settings: {
        foreground: "#2c2638",
      },
    },
    {
      scope: [
        "punctuation.definition.string.begin.math.typst",
        "punctuation.definition.string.end.math.typst",
        "punctuation.math.operator.typst",
      ],
      settings: {
        foreground: "#997a00",
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
        foreground: "#1ba665",
      },
    },
    {
      scope: "fenced_code.block.language.typst",
      settings: {
        foreground: "#8b5fc7",
      },
    },
    {
      scope: [
        "punctuation.definition.list.unnumbered.typst",
        "punctuation.definition.list.numbered.typst",
      ],
      settings: {
        foreground: "#585858",
      },
    },
    {
      scope: [
        "punctuation.definition.en-dash.typst",
        "punctuation.definition.em-dash.typst",
        "punctuation.definition.ellipsis.typst",
      ],
      settings: {
        foreground: "#585858",
      },
    },
    {
      scope: [
        "punctuation.separator.colon.typst",
        "punctuation.separator.comma.typst",
        "punctuation.terminator.statement.typst",
      ],
      settings: {
        foreground: "#585858",
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
        foreground: "#585858",
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
        foreground: "#444444",
      },
    },
    {
      scope: "punctuation",
      settings: {
        foreground: "#858585",
      },
    },
  ],
};
