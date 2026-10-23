/** Pure parsers for CMS Medicare NCCI Practitioner files (no Node imports). */

export type PtpRow = [column1: string, column2: string, modifier: 0 | 1 | 9];
export type MueRow = [code: string, units: number];
export type AddonRow = [addon: string, primary: string, type: 1 | 2];

/** CPT/HCPCS ranges this practice bills for spine care. Used to keep PTP deployable. */
export function isSpineRelevantCode(code: string) {
  if (/^J\d{4}$/.test(code)) return true;
  if (/^99\d{3}$/.test(code)) return true;
  const n = Number(code);
  if (!Number.isFinite(n)) return false;
  return (
    (n >= 20550 && n <= 20615) ||
    (n >= 20930 && n <= 20939) ||
    (n >= 22010 && n <= 22899) ||
    (n >= 27096 && n <= 27280) ||
    (n >= 62263 && n <= 62327) ||
    (n >= 63001 && n <= 63746) ||
    (n >= 64400 && n <= 64640) ||
    n === 64999 ||
    n === 69990 ||
    (n >= 72020 && n <= 72270) ||
    (n >= 77001 && n <= 77003) ||
    (n >= 61781 && n <= 61783)
  );
}

export function parsePtpText(text: string, allowCode: (code: string) => boolean): PtpRow[] {
  const rows: PtpRow[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("CPT") || line.startsWith("Column")) continue;
    const cols = line.split("\t");
    const column1 = (cols[0] ?? "").trim().toUpperCase();
    const column2 = (cols[1] ?? "").trim().toUpperCase();
    const deletion = (cols[4] ?? "").trim();
    const modifier = (cols[5] ?? "").trim();
    if (!/^[A-Z0-9]{5}$/.test(column1) || !/^[A-Z0-9]{5}$/.test(column2)) continue;
    if (!allowCode(column1) || !allowCode(column2)) continue;
    if (!isSpineRelevantCode(column1) || !isSpineRelevantCode(column2)) continue;
    if (deletion && deletion !== "*" && /^\d{8}$/.test(deletion)) continue;
    if (modifier !== "0" && modifier !== "1" && modifier !== "9") continue;
    const key = `${column1}|${column2}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push([column1, column2, Number(modifier) as 0 | 1 | 9]);
  }
  rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  return rows;
}

export function parseMueCsv(text: string, allowCode: (code: string) => boolean): MueRow[] {
  const rows: MueRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^"?([A-Z0-9]{5})"?\s*,\s*(\d+)\s*,/);
    if (!match) continue;
    const code = match[1].toUpperCase();
    if (!allowCode(code)) continue;
    const units = Number(match[2]);
    if (!Number.isInteger(units) || units < 1) continue;
    rows.push([code, units]);
  }
  rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return rows;
}

/** AOC file: leading type digit 1|2|3, then 5-char add-on, then primary (or CCCCC). */
export function parseAddonText(text: string, allowCode: (code: string) => boolean): AddonRow[] {
  const rows: AddonRow[] = [];
  const seen = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line) continue;
    let type = 0;
    let addon = "";
    let primary = "";
    const spaced = line.match(/^([12])([A-Z0-9]{5})\s+(\S+)\s+(\d{7})/i);
    if (spaced) {
      type = Number(spaced[1]);
      addon = spaced[2].toUpperCase();
      primary = spaced[3].toUpperCase();
    } else {
      const compact = line.match(/^([12])([A-Z0-9]{5})(\d{7})([A-Z0-9]{5})/i);
      if (!compact) continue;
      type = Number(compact[1]);
      addon = compact[2].toUpperCase();
      primary = compact[4].toUpperCase();
    }
    if (primary === "CCCCC") continue;
    if (!/^[A-Z0-9]{5}$/.test(addon) || !/^[A-Z0-9]{5}$/.test(primary)) continue;
    if (!allowCode(addon) || !allowCode(primary)) continue;
    const key = `${addon}|${primary}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push([addon, primary, type as 1 | 2]);
  }
  rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  return rows;
}
