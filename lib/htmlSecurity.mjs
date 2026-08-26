export const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export const safeHtmlTemplate = (strings, ...values) => strings.reduce(
  (result, part, index) => result + part + (index < values.length ? escapeHtml(values[index]) : ''),
  ''
);
