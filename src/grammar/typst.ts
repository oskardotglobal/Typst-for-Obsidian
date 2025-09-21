import {
  LRLanguage,
  LanguageSupport,
  indentNodeProp,
  foldNodeProp,
  foldInside,
  delimitedIndent,
} from "@codemirror/language";

import { parser } from "./typst-parser";
import { typstHighlight } from "./typst-highlight";

export const typstLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Block: delimitedIndent({ closing: "}", align: false }),
        ContentBlock: delimitedIndent({ closing: "]", align: false }),
        ArgList: delimitedIndent({ closing: ")", align: false }),
        "IfStatement ForStatement WhileStatement": (context) =>
          context.column(context.node.from) + context.unit,
      }),
      foldNodeProp.add({
        Block: foldInside,
        ContentBlock: foldInside,
        ArgList: foldInside,
        "IfStatement ForStatement WhileStatement": foldInside,
      }),
      typstHighlight,
    ],
  }),
  languageData: {
    name: "typst",
    extensions: [".typ"],
    commentTokens: { line: "//", block: { open: "/*", close: "*/" } },
    indentOnInput: /^\s*[}\]\)]$/,
    closeBrackets: { brackets: ["(", "[", "{", '"', "'"] },
  },
});

export function typst() {
  return new LanguageSupport(typstLanguage);
}
