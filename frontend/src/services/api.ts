import {
  AccuracyResponse,
  MetadataResponse,
  OverviewResponse,
  PaginatedIntervalsResponse,
  TimeseriesResponse,
  VintagesResponse,
} from "../types";

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "/api";

export async function fetchHealth(): Promise<{
  status: string;
  dataSource: string;
  dataStatus: string;
  fuelhhRecords: number;
  windforRecords: number;
  lastUpdated: string;
}> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchMetadata(): Promise<MetadataResponse> {
  const res = await fetch(`${API_BASE}/metadata`);
  if (!res.ok) throw new Error(`Failed to fetch metadata: ${res.statusText}`);
  return res.json();
}

export async function fetchOverview(
  cutoffStrategy: string = "D1_1100",
  mappingMode: string = "step_block",
  dateFrom?: string,
  dateTo?: string
): Promise<OverviewResponse> {
  const params = new URLSearchParams({
    cutoff_strategy: cutoffStrategy,
    mapping_mode: mappingMode,
  });
  if (dateFrom) params.append("date_from", dateFrom);
  if (dateTo) params.append("date_to", dateTo);

  const res = await fetch(`${API_BASE}/overview?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch overview: ${res.statusText}`);
  return res.json();
}

export async function fetchTimeseries(
  cutoffStrategy: string = "D1_1100",
  mappingMode: string = "step_block",
  dateFrom?: string,
  dateTo?: string
): Promise<TimeseriesResponse> {
  const params = new URLSearchParams({
    cutoff_strategy: cutoffStrategy,
    mapping_mode: mappingMode,
  });
  if (dateFrom) params.append("date_from", dateFrom);
  if (dateTo) params.append("date_to", dateTo);

  const res = await fetch(`${API_BASE}/timeseries?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch timeseries: ${res.statusText}`);
  return res.json();
}

export async function fetchAccuracy(
  cutoffStrategy: string = "D1_1100",
  mappingMode: string = "step_block",
  dateFrom?: string,
  dateTo?: string
): Promise<AccuracyResponse> {
  const params = new URLSearchParams({
    cutoff_strategy: cutoffStrategy,
    mapping_mode: mappingMode,
  });
  if (dateFrom) params.append("date_from", dateFrom);
  if (dateTo) params.append("date_to", dateTo);

  const res = await fetch(`${API_BASE}/accuracy?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch accuracy: ${res.statusText}`);
  return res.json();
}

export async function fetchVintages(
  startTime: string,
  cutoffStrategy: string = "D1_1100"
): Promise<VintagesResponse> {
  const params = new URLSearchParams({
    start_time: startTime,
    cutoff_strategy: cutoffStrategy,
  });

  const res = await fetch(`${API_BASE}/forecasts/vintages?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch vintages: ${res.statusText}`);
  return res.json();
}

export async function fetchIntervals(
  cutoffStrategy: string = "D1_1100",
  mappingMode: string = "step_block",
  page: number = 1,
  pageSize: number = 50,
  status?: string,
  dateFrom?: string,
  dateTo?: string,
  sortBy: string = "startTime",
  sortDesc: boolean = false
): Promise<PaginatedIntervalsResponse> {
  const params = new URLSearchParams({
    cutoff_strategy: cutoffStrategy,
    mapping_mode: mappingMode,
    page: page.toString(),
    page_size: pageSize.toString(),
    sort_by: sortBy,
    sort_desc: sortDesc ? "true" : "false",
  });
  if (status && status !== "ALL") params.append("status", status);
  if (dateFrom) params.append("date_from", dateFrom);
  if (dateTo) params.append("date_to", dateTo);

  const res = await fetch(`${API_BASE}/intervals?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch intervals: ${res.statusText}`);
  return res.json();
}

export async function triggerCacheRefresh(): Promise<void> {
  const res = await fetch(`${API_BASE}/cache/refresh`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to trigger refresh: ${res.statusText}`);
}
