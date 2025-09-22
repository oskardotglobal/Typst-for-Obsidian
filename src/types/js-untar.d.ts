declare module "js-untar" {
  interface UntarFile {
    name: string;
    buffer: ArrayBuffer;
    blob: Blob;
    type: "file" | "directory";
    getBlobUrl(): string;
    readAsString(): string;
    readAsJSON(): any;
  }

  function untar(buffer: ArrayBuffer): Promise<UntarFile[]>;

  export default untar;
}
