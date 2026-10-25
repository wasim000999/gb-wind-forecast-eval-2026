export function formatMW(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(val) + " MW";
}

export function formatMWh(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 0,
  }).format(val) + " MWh";
}

export function formatPct(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return val.toFixed(1) + "%";
}

export function formatDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toISOString().replace("T", " ").substring(0, 16) + " UTC";
  } catch {
    return isoStr;
  }
}

export function formatTimeOnly(isoStr: string | null | undefined): string {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toISOString().substring(11, 16);
  } catch {
    return isoStr;
  }
}
