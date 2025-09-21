import { styleTags, tags as t } from "@lezer/highlight";

export const typstHighlight = styleTags({
  // Keywords
  if: t.keyword,
  else: t.keyword,
  for: t.keyword,
  in: t.keyword,
  while: t.keyword,
  break: t.keyword,
  continue: t.keyword,
  return: t.keyword,
  let: t.keyword,
  set: t.keyword,
  show: t.keyword,
  import: t.keyword,
  include: t.keyword,
  context: t.keyword,
  not: t.keyword,
  and: t.keyword,
  or: t.keyword,

  // Literals
  BooleanLiteral: t.bool,
  NoneLiteral: t.null,
  AutoLiteral: t.atom,
  Number: t.number,
  String: t.string,

  // Identifiers
  VariableName: t.variableName,
  PropertyName: t.propertyName,

  // Operators
  "=": t.operator,
  "==": t.operator,
  "<": t.operator,
  "<=": t.operator,
  ">": t.operator,
  ">=": t.operator,
  "+": t.operator,
  "-": t.operator,
  "%": t.operator,
  "^": t.operator,

  // Punctuation
  "(": t.paren,
  ")": t.paren,
  "[": t.paren,
  "]": t.paren,
  "{": t.paren,
  "}": t.paren,
  ".": t.punctuation,
  ",": t.punctuation,
  ";": t.punctuation,
  ":": t.punctuation,

  // Special characters
  "#": t.special(t.punctuation),
  $: t.special(t.punctuation),
  "=>": t.operator,
  "..": t.operator,

  // Comments
  LineComment: t.lineComment,
  BlockComment: t.blockComment,

  // Blocks
  Block: t.brace,
  ContentBlock: t.squareBracket,
  CodeBlock: t.special(t.brace),
  MathBlock: t.special(t.squareBracket),

  // Statements
  IfStatement: t.controlKeyword,
  ForStatement: t.controlKeyword,
  WhileStatement: t.controlKeyword,
  BreakStatement: t.controlKeyword,
  ContinueStatement: t.controlKeyword,
  ReturnStatement: t.controlKeyword,

  // Declarations
  LetStatement: t.definitionKeyword,
  SetStatement: t.keyword,
  ShowStatement: t.keyword,
  ImportStatement: t.moduleKeyword,
  IncludeStatement: t.moduleKeyword,
  ContextStatement: t.keyword,

  // Expressions
  FunctionCall: t.function(t.variableName),
  MemberExpression: t.propertyName,
  UnaryExpression: t.operator,
  BinaryExpression: t.operator,
  AssignmentExpression: t.operator,
});
