import { apiClient } from './api-client';

export interface Payment {
  id: string;
  tenantId: string;
  travelRequestId: string;
  userId: string;
  travelTitle: string;
  destinationCountryCode: string;
  days: number;
  policyName: string;
  amount: number;
  currency: string;
  status: string;
  paymentReference: string;
  notes: string;
  processedBy: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPayments {
  items: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaymentExport {
  filename: string;
  csv: string;
  rowCount: number;
}

function authOptions(token: string, tenantId: string) {
  return { token, tenantId };
}

export async function listPayments(
  token: string,
  tenantId: string,
  params?: { status?: string },
): Promise<PaginatedPayments> {
  const query = params?.status ? `?status=${params.status}` : '';
  const response = await apiClient.get<PaginatedPayments>(
    `/finance/payments${query}`,
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function markPaymentPaid(
  token: string,
  tenantId: string,
  paymentId: string,
  input: { paymentReference?: string; notes?: string },
): Promise<Payment> {
  const response = await apiClient.post<Payment>(
    `/finance/payments/${paymentId}/mark-paid`,
    input,
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function markPaymentFailed(
  token: string,
  tenantId: string,
  paymentId: string,
  input: { notes?: string },
): Promise<Payment> {
  const response = await apiClient.post<Payment>(
    `/finance/payments/${paymentId}/mark-failed`,
    input,
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function exportPayments(
  token: string,
  tenantId: string,
): Promise<PaymentExport> {
  const response = await apiClient.get<PaymentExport>(
    '/finance/payments/export',
    authOptions(token, tenantId),
  );
  return response.data;
}

export function downloadCsv(exportData: PaymentExport): void {
  const blob = new Blob([exportData.csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exportData.filename;
  link.click();
  URL.revokeObjectURL(url);
}
