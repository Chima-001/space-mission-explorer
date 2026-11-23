// Cleans third-party text (NASA descriptions can contain HTML tags/entities).
export function plainText(value, max = 0) {
  const stripped = String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const box = document.createElement("textarea");
  box.innerHTML = stripped; // decodes entities; never executes markup
  const text = box.value;
  return max && text.length > max
    ? `${text.slice(0, max - 1).trimEnd()}…`
    : text;
}
