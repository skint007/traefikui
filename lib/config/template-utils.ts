/**
 * Extract {{variable}} placeholders from a template string.
 * Returns unique variable names in order of first appearance.
 */
export function extractVariables(content: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const seen = new Set<string>();
  const variables: string[] = [];

  let match;
  while ((match = regex.exec(content)) !== null) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      variables.push(name);
    }
  }

  return variables;
}

/**
 * Apply variable values to a template string, replacing {{variable}} placeholders.
 */
export function applyVariables(
  content: string,
  values: Record<string, string>
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (original, name: string) => {
    return name in values ? values[name] : original;
  });
}
