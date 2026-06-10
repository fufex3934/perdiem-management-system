import { apiClient } from './api-client';

export interface StatusCount {
  status: string;
  count: number;
  totalAmount: number;
}

export interface CountrySpend {
  countryCode: string;
  count: number;
  totalAmount: number;
}

export interface AnalyticsDashboard {
  scope: 'tenant' | 'own';
  travelRequests: {
    total: number;
    byStatus: StatusCount[];
    totalPerDiemAmount: number;
    topDestinations: CountrySpend[];
  };
  payments: {
    total: number;
    byStatus: StatusCount[];
    totalPaid: number;
    totalPending: number;
  };
  pendingApprovals: number;
}

export interface SpendReport {
  scope: 'tenant' | 'own';
  fromDate: string | null;
  toDate: string | null;
  totalTravelRequests: number;
  totalPerDiemAmount: number;
  totalPaid: number;
  totalPending: number;
  byStatus: StatusCount[];
  byCountry: CountrySpend[];
}

export interface SpendReportExport {
  filename: string;
  csv: string;
  rowCount: number;
}

function authOptions(token: string, tenantId: string) {
  return { token, tenantId };
}

export async function getDashboard(
  token: string,
  tenantId: string,
): Promise<AnalyticsDashboard> {
  const response = await apiClient.get<AnalyticsDashboard>(
    '/analytics/dashboard',
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function getSpendReport(
  token: string,
  tenantId: string,
  params?: { fromDate?: string; toDate?: string },
): Promise<SpendReport> {
  const search = new URLSearchParams();
  if (params?.fromDate) search.set('fromDate', params.fromDate);
  if (params?.toDate) search.set('toDate', params.toDate);
  const query = search.toString() ? `?${search.toString()}` : '';

  const response = await apiClient.get<SpendReport>(
    `/analytics/reports/spend${query}`,
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function exportSpendReport(
  token: string,
  tenantId: string,
  params?: { fromDate?: string; toDate?: string },
): Promise<SpendReportExport> {
  const search = new URLSearchParams();
  if (params?.fromDate) search.set('fromDate', params.fromDate);
  if (params?.toDate) search.set('toDate', params.toDate);
  const query = search.toString() ? `?${search.toString()}` : '';

  const response = await apiClient.get<SpendReportExport>(
    `/analytics/reports/spend/export${query}`,
    authOptions(token, tenantId),
  );
  return response.data;
}

export function downloadCsv(exportData: SpendReportExport): void {
  const blob = new Blob([exportData.csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exportData.filename;
  link.click();
  URL.revokeObjectURL(url);
}
