const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const legacyName = new RegExp(`^${uuid}$`);
const namedFile = new RegExp(`^${uuid}__(.+)$`);
const safeName = /^[A-Za-z0-9._ -]{1,80}$/;

export function objectKey(fileName: string) {
  const id = crypto.randomUUID();
  const base = fileName.split(/[/\\]/).pop() ?? "";
  const cleaned = base
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z0-9._ -]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, 80);
  if (!cleaned || !safeName.test(cleaned)) return id;
  return `${id}__${cleaned}`;
}

// Empty string means an older file stored under a bare id. Null means the name is not one of ours.
export function storedFileName(objectName: string): string | null {
  if (legacyName.test(objectName)) return "";
  const match = objectName.match(namedFile);
  if (!match || !safeName.test(match[1])) return null;
  return match[1];
}
