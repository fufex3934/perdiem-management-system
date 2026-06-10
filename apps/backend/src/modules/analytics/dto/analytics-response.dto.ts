export class StatusCountDto {
  status: string;
  count: number;
  totalAmount: number;
}

export class CountrySpendDto {
  countryCode: string;
  count: number;
  totalAmount: number;
}

export class AnalyticsDashboardDto {
  scope: 'tenant' | 'own';
  travelRequests: {
    total: number;
    byStatus: StatusCountDto[];
    totalPerDiemAmount: number;
    topDestinations: CountrySpendDto[];
  };
  payments: {
    total: number;
    byStatus: StatusCountDto[];
    totalPaid: number;
    totalPending: number;
  };
  pendingApprovals: number;
}

export class SpendReportDto {
  scope: 'tenant' | 'own';
  fromDate: string | null;
  toDate: string | null;
  totalTravelRequests: number;
  totalPerDiemAmount: number;
  totalPaid: number;
  totalPending: number;
  byStatus: StatusCountDto[];
  byCountry: CountrySpendDto[];
}

export class SpendReportExportDto {
  filename: string;
  csv: string;
  rowCount: number;
}
