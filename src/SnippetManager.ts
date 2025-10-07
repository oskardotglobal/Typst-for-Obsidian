export interface Snippet {
  prefix: string;
  body: string[];
}

export class SnippetManager {
  private snippets: Map<string, Snippet> = new Map();
  private lastError: string | null = null;

  parseSnippets(json: string): boolean {
    this.lastError = null;
    this.snippets.clear();

    if (!json || json.trim() === "") {
      return true;
    }

    try {
      const parsed = JSON.parse(json);

      if (typeof parsed !== "object" || parsed === null) {
        this.lastError = "Snippets must be a JSON object";
        return false;
      }

      for (const [name, snippet] of Object.entries(parsed)) {
        if (typeof snippet !== "object" || snippet === null) {
          this.lastError = `Snippet "${name}" must be an object`;
          return false;
        }

        const s = snippet as any;

        if (typeof s.prefix !== "string") {
          this.lastError = `Snippet "${name}" must have a "prefix" string`;
          return false;
        }

        if (!Array.isArray(s.body)) {
          this.lastError = `Snippet "${name}" must have a "body" array of strings`;
          return false;
        }

        if (!s.body.every((line: any) => typeof line === "string")) {
          this.lastError = `Snippet "${name}" body must contain only strings`;
          return false;
        }

        this.snippets.set(name, {
          prefix: s.prefix,
          body: s.body,
        });
      }

      return true;
    } catch (e) {
      this.lastError = `Invalid JSON: ${e.message}`;
      return false;
    }
  }

  getLastError(): string | null {
    return this.lastError;
  }

  getSnippets(): Map<string, Snippet> {
    return this.snippets;
  }
}
