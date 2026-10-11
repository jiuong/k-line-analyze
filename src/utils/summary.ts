/**
 * Fill a summary template with `{key}` placeholders.
 * Missing keys throw — analyzers must supply every referenced var.
 */
export function fillSummary(
  template: string,
  vars: Record<string, string | number | boolean | null | undefined>,
): string {
  return template.replace(/\{([^{}]+)\}/g, (_match, key: string) => {
    if (!(key in vars)) {
      throw new Error(`fillSummary: missing placeholder "${key}"`);
    }
    const value = vars[key];
    if (value === null || value === undefined) {
      throw new Error(`fillSummary: placeholder "${key}" is ${String(value)}`);
    }
    return String(value);
  });
}
