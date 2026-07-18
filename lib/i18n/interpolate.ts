/**
 * Replace `{placeholder}` tokens in a translation string with values.
 *
 * @example
 *   interpolate("Found {count} videos", { count: 3 }) // "Found 3 videos"
 *   interpolate("Delete \"{name}\"?", { name: "X" })  // 'Delete "X"?'
 */
export function interpolate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
