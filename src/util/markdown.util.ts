import { Editor, EditorPosition } from "obsidian";

interface LineEdit {
  line: number;
  trimmedFrom: number;
  trimmedTo: number;
  trimmedText: string;
  isFormatted: boolean;
  originalFrom: number;
  originalTo: number;
}

function getLineEdits(
  editor: Editor,
  from: EditorPosition,
  to: EditorPosition,
  prefix: string,
  suffix: string
): LineEdit[] {
  const edits: LineEdit[] = [];

  for (let line = from.line; line <= to.line; line++) {
    const lineText = editor.getLine(line);
    const originalStartCh = line === from.line ? from.ch : 0;
    const originalEndCh = line === to.line ? to.ch : lineText.length;

    let startCh = originalStartCh;
    let endCh = originalEndCh;

    if (line === from.line) {
      if (startCh >= prefix.length) {
        const beforeText = lineText.substring(startCh - prefix.length, startCh);
        if (beforeText === prefix) {
          startCh -= prefix.length;
        }
      }
    }

    if (line === to.line) {
      if (endCh + suffix.length <= lineText.length) {
        const afterText = lineText.substring(endCh, endCh + suffix.length);
        if (afterText === suffix) {
          endCh += suffix.length;
        }
      }
    }

    const selectedPart = lineText.substring(startCh, endCh);
    const trimmed = selectedPart.trim();

    if (!trimmed) continue;

    const originalSelectedPart = lineText.substring(
      originalStartCh,
      originalEndCh
    );
    const originalLeadingSpaces =
      originalSelectedPart.length - originalSelectedPart.trimStart().length;
    const originalTrailingSpaces =
      originalSelectedPart.length - originalSelectedPart.trimEnd().length;

    const originalTrimmedFrom = originalStartCh + originalLeadingSpaces;
    const originalTrimmedTo = originalEndCh - originalTrailingSpaces;

    const leadingSpaces = selectedPart.length - selectedPart.trimStart().length;
    const trailingSpaces = selectedPart.length - selectedPart.trimEnd().length;
    let trimmedFrom = startCh + leadingSpaces;
    let trimmedTo = endCh - trailingSpaces;
    let finalTrimmed = trimmed;

    const containsFormatting =
      trimmed.includes(prefix) || trimmed.includes(suffix);
    if (containsFormatting) {
      const formattedRegex = new RegExp(
        `${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(.+?)${suffix.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        )}`,
        "g"
      );
      let match;
      let minStart = trimmedFrom;
      let maxEnd = trimmedTo;

      while ((match = formattedRegex.exec(lineText)) !== null) {
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;

        if (matchStart < trimmedTo && matchEnd > trimmedFrom) {
          minStart = Math.min(minStart, matchStart);
          maxEnd = Math.max(maxEnd, matchEnd);
        }
      }

      trimmedFrom = minStart;
      trimmedTo = maxEnd;
      finalTrimmed = lineText.substring(trimmedFrom, trimmedTo);
    }

    const isFormatted =
      finalTrimmed.startsWith(prefix) &&
      finalTrimmed.endsWith(suffix) &&
      finalTrimmed.length > prefix.length + suffix.length;

    edits.push({
      line,
      trimmedFrom,
      trimmedTo,
      trimmedText: finalTrimmed,
      isFormatted,
      originalFrom: originalTrimmedFrom,
      originalTo: originalTrimmedTo,
    });
  }

  return edits;
}

export function toggleMarkdownFormatting(
  editor: Editor,
  prefix: string,
  suffix: string
): void {
  const from = editor.getCursor("from");
  const to = editor.getCursor("to");
  const hasSelection = editor.getSelection().length > 0;

  if (hasSelection) {
    const edits = getLineEdits(editor, from, to, prefix, suffix);

    if (edits.length === 0) return;

    const allFormatted = edits.every((e) => e.isFormatted);
    const shouldFormat = !allFormatted;

    for (let i = edits.length - 1; i >= 0; i--) {
      const edit = edits[i];
      const editFrom: EditorPosition = {
        line: edit.line,
        ch: edit.trimmedFrom,
      };
      const editTo: EditorPosition = { line: edit.line, ch: edit.trimmedTo };

      if (shouldFormat) {
        if (edit.isFormatted) {
          continue;
        } else {
          let cleanText = edit.trimmedText;
          const formattedPartRegex = new RegExp(
            `\\${prefix}(.+?)\\${suffix}`,
            "g"
          );
          cleanText = cleanText.replace(formattedPartRegex, "$1");

          const wrapped = `${prefix}${cleanText}${suffix}`;
          editor.replaceRange(wrapped, editFrom, editTo);
        }
      } else {
        if (edit.isFormatted) {
          const unwrapped = edit.trimmedText.substring(
            prefix.length,
            edit.trimmedText.length - suffix.length
          );
          editor.replaceRange(unwrapped, editFrom, editTo);
        } else {
          continue;
        }
      }
    }

    const firstEdit = edits[0];
    const lastEdit = edits[edits.length - 1];

    let newFromCh: number;
    let newToCh: number;

    if (shouldFormat) {
      if (firstEdit.isFormatted) {
        newFromCh = firstEdit.originalFrom;
      } else {
        const firstOffset = firstEdit.originalFrom - firstEdit.trimmedFrom;
        newFromCh =
          firstEdit.trimmedFrom + prefix.length + Math.max(0, firstOffset);
      }

      if (lastEdit.isFormatted) {
        const lastOffset = lastEdit.originalTo - lastEdit.trimmedFrom;
        newToCh =
          lastEdit.trimmedFrom +
          Math.min(lastOffset, lastEdit.trimmedText.length - suffix.length);
      } else {
        let cleanText = lastEdit.trimmedText;
        const formattedPartRegex = new RegExp(
          `\\${prefix}(.+?)\\${suffix}`,
          "g"
        );
        cleanText = cleanText.replace(formattedPartRegex, "$1");
        const lastOffset = lastEdit.originalTo - lastEdit.trimmedFrom;

        newToCh =
          lastEdit.trimmedFrom +
          prefix.length +
          Math.min(lastOffset, cleanText.length);
      }
    } else {
      const firstOffset = firstEdit.originalFrom - firstEdit.trimmedFrom;

      if (firstEdit.isFormatted) {
        newFromCh =
          firstEdit.trimmedFrom + Math.max(0, firstOffset - prefix.length);
      } else {
        newFromCh = firstEdit.originalFrom;
      }

      if (lastEdit.isFormatted) {
        const lastOffset = lastEdit.originalTo - lastEdit.trimmedFrom;

        const cappedOffset = Math.min(
          lastOffset,
          lastEdit.trimmedText.length - suffix.length
        );
        newToCh =
          lastEdit.trimmedFrom + Math.max(0, cappedOffset - prefix.length);
      } else {
        newToCh = lastEdit.originalTo;
      }
    }

    editor.setSelection(
      { line: firstEdit.line, ch: newFromCh },
      { line: lastEdit.line, ch: newToCh }
    );
  } else {
    const line = editor.getLine(from.line);
    const wordRegex = /\S+/g;
    let match;
    let wordRange: { start: number; end: number } | null = null;

    while ((match = wordRegex.exec(line)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (from.ch >= start && from.ch <= end) {
        wordRange = { start, end };
        break;
      }
    }

    if (wordRange) {
      const wordFrom: EditorPosition = { line: from.line, ch: wordRange.start };
      const wordTo: EditorPosition = { line: from.line, ch: wordRange.end };
      const word = editor.getRange(wordFrom, wordTo);

      if (word.startsWith(prefix) && word.endsWith(suffix)) {
        const unwrapped = word.substring(
          prefix.length,
          word.length - suffix.length
        );
        editor.replaceRange(unwrapped, wordFrom, wordTo);

        const cursorOffset = from.ch - wordRange.start;
        const newCh =
          wordRange.start + Math.max(0, cursorOffset - prefix.length);
        editor.setCursor({ line: from.line, ch: newCh });
      } else {
        const wrapped = `${prefix}${word}${suffix}`;
        editor.replaceRange(wrapped, wordFrom, wordTo);

        const cursorOffset = from.ch - wordRange.start;
        const newCh = wordRange.start + cursorOffset + prefix.length;
        editor.setCursor({ line: from.line, ch: newCh });
      }
    } else {
      editor.replaceRange(`${prefix}${suffix}`, from);
      editor.setCursor({ line: from.line, ch: from.ch + prefix.length });
    }
  }
}
