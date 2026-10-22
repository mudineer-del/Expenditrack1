/** Comparable form of a well name, so the same well written two ways matches: "Uch WDW-01",
 *  "UCH WDW-1" and "uch wdw 1" all become "UCHWDW1". Letters and digits only, upper case, and
 *  leading zeros in digit runs dropped. Used to tie a DMR report's Well Name to a wells row. */
export function normalizeWellName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/0+(\d)/g, "$1")
}
