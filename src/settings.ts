export interface TypstSettings {
  defaultMode: "source" | "reading";
  useDefaultLayoutFunctions: boolean;
  customLayoutFunctions: string;
  usePdfLayoutFunctions: boolean;
  pdfLayoutFunctions: string;
  autoDownloadPackages: boolean;
  fontFamilies: string[];
  enableTextLayer: boolean;
  customSnippets: string;
}

export const DEFAULT_SETTINGS: TypstSettings = {
  defaultMode: "source",
  useDefaultLayoutFunctions: true,
  usePdfLayoutFunctions: false,
  autoDownloadPackages: true,
  fontFamilies: [],
  pdfLayoutFunctions: "",
  enableTextLayer: true,
  customSnippets: JSON.stringify(
    {
      table: {
        prefix: "tbl",
        body: [
          "#align(center,",
          "\ttable(",
          "\t\tcolumns: ${},",
          "\t\t[${}],",
          "\t)",
          ")",
        ],
      },
    },
    null,
    2
  ),
  // prettier-ignore
  customLayoutFunctions: 
`#set page(
  // Normal reading mode width
  width: %LINEWIDTH%, 
  // Makes everything on one page
  height: auto,
  // Essentially 0 margin.
  // Some padding is needed to 
  // make the PDF not cut off
  margin: (x: 0.25em, y: 0.25em),
  // Set the BG color of page to
  // the BG color of Obsidian
  fill: rgb("%BGCOLOR%")
)

#set text(
  // Current Obsidian font size
  size: %FONTSIZE%,
  // Theme text color
  fill: rgb("%THEMECOLOR%")
)

// Paragraph styling
#set par(
  justify: true,
  leading: 0.65em
)

// Set colors of elements to theme colors
// Off by default, turn these on to set 
// most Typst elements to the theme color
// #show heading: set text(fill: rgb("%HEADINGCOLOR%"))
// #show math.equation: set text(fill: rgb("%THEMECOLOR%"))
// #set block(fill: none)
// #set rect(fill: none, stroke: rgb("%THEMECOLOR%"))
// #set box(fill: none, stroke: rgb("%THEMECOLOR%"))
// #set circle(fill: none, stroke: rgb("%THEMECOLOR%"))
// #set ellipse(fill: none, stroke: rgb("%THEMECOLOR%"))
// #set polygon(fill: none, stroke: rgb("%THEMECOLOR%"))
// #set line(stroke: rgb("%THEMECOLOR%"))
// #show table: set table(stroke: rgb("%THEMECOLOR%"))
// #show math.equation: set box(stroke: none)`,
};
