// Conversao de numero serial do Excel (base 1900, com o bug do ano bissexto 1900)
// para Date (UTC, somente data).
export function excelSerialToDate(serial) {
  if (typeof serial !== 'number' || !Number.isFinite(serial)) return null;
  // 25569 = dias entre 1899-12-30 e 1970-01-01
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  // normaliza para meia-noite UTC
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function isPlausibleDateSerial(n) {
  // ~ 2015-01-01 (42005) ate 2100 (73050)
  return typeof n === 'number' && n >= 42000 && n <= 73415;
}

export function toISODate(d) {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}
