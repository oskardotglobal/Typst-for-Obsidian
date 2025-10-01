import { PackageImport } from "./types/packages";

const IMPORT_REGEX =
  /#import\s+"@([a-zA-Z0-9_-]+)\/([a-zA-Z0-9._-]+):([a-zA-Z0-9._+-]+)"(.*?)$/gm;

export default function parsePackageImports(content: string): PackageImport[] {
  const imports: PackageImport[] = [];
  let match: RegExpExecArray | null;

  // DEBUG
  console.log(
    `[parsePackageImports] Parsing package imports from content: ${content}`
  );

  IMPORT_REGEX.lastIndex = 0;

  while ((match = IMPORT_REGEX.exec(content)) !== null) {
    const [_, namespace, name, version, scopedImports] = match;

    const packageImport = {
      namespace: namespace.trim(),
      name: name.trim(),
      version: version.trim(),
      scopedImports: scopedImports?.trim() || "",
    };

    // DEBUG
    console.log(`[parsePackageImports] Found package import: ${packageImport}`);
    imports.push(packageImport);
  }

  return imports;
}
