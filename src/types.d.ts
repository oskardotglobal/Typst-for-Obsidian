declare module "@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs" {
  export const $typst: {
    svg(options: { mainContent: string }): Promise<string>;
    setCompilerInitOptions(options: { getModule: () => string }): void;
    setRendererInitOptions(options: { getModule: () => string }): void;
  };
}
