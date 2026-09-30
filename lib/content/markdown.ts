function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInline(value: string) {
  return value
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '<a href="$2">$1</a>');
}

export function renderMarkdown(source: string) {
  const escaped = escapeHtml(source.trim());
  if (!escaped) return "";

  return escaped
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      if (lines.length > 0 && lines.every((line) => line.startsWith("- "))) {
        const items = lines.map((line) => `<li>${renderInline(line.slice(2))}</li>`).join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${renderInline(lines.join(" "))}</p>`;
    })
    .join("");
}
