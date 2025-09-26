export function applyReplacements(result, replacements) {
  if (replacements) {
    for (const [k, v] of Object.entries(replacements)) {
      result = result.replaceAll(`{{${k}}}`, v);
    }
  }
  return result;
}
