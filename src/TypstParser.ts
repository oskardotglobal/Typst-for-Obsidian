import { PackageImport } from "./types/packages";

export class PackageParser {
  static parse(content: string): PackageImport[] {
    const IMPORT_REGEX =
      /#import\s+"@([a-zA-Z0-9_-]+)\/([a-zA-Z0-9._-]+):([a-zA-Z0-9._+-]+)"(.*?)$/gm;

    const imports: PackageImport[] = [];
    let match: RegExpExecArray | null;

    IMPORT_REGEX.lastIndex = 0;

    while ((match = IMPORT_REGEX.exec(content)) !== null) {
      const [_, namespace, name, version, specificImports] = match;

      const packageImport = {
        namespace: namespace.trim(),
        name: name.trim(),
        version: version.trim(),
        specificImports: specificImports?.trim() || "",
      };

      imports.push(packageImport);
    }

    return imports;
  }
}
