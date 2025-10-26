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
                CodeBlock: delimitedIndent({ closing: "}", align: false }),
                IfStatement: delimitedIndent({ closing: "}", align: false }),
                ForStatement: delimitedIndent({ closing: "}", align: false }),
                WhileStatement: delimitedIndent({ closing: "}", align: false }),
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
