/** Make a string safe to use as a single path segment. */
export function sanitize(name: unknown): string {
  return (
    String(name || '')
      .replace(/[\\/:*?"<>|\r\n\t]/g, '_')
      .replace(/\s+/g, ' ')
      .replace(/[. ]+$/, '')
      .trim()
      .slice(0, 80) || 'untitled'
  );
}
