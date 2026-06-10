import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@/common/enums/payment-status.enum';
import { Permission } from '@/common/enums/permission.enum';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { roleHasPermission } from '@/common/rbac/role-permissions';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsDateRangeQueryDto } from './dto/analytics-query.dto';
import {
  AnalyticsDashboardDto,
  CountrySpendDto,
  SpendReportDto,
  SpendReportExportDto,
  StatusCountDto,
} from './dto/analytics-response.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  async getDashboard(actor: AuthenticatedUser): Promise<AnalyticsDashboardDto> {
    const scope = this.resolveScope(actor);
    const filter = this.buildFilter(actor, scope);

    const [
      travelTotal,
      travelByStatus,
      topDestinations,
      totalPerDiem,
      paymentTotal,
      paymentsByStatus,
      totalPaid,
      totalPending,
      pendingApprovals,
    ] = await Promise.all([
      this.analyticsRepository.countTravelRequests(filter),
      this.analyticsRepository.aggregateTravelByStatus(filter),
      this.analyticsRepository.aggregateTravelByCountry(filter),
      this.analyticsRepository.sumTravelPerDiem(filter),
      this.analyticsRepository.countPayments(filter),
      this.analyticsRepository.aggregatePaymentsByStatus(filter),
      this.analyticsRepository.sumPaymentsByStatus(filter, PaymentStatus.PAID),
      this.analyticsRepository.sumPaymentsByStatus(filter, PaymentStatus.PENDING),
      this.analyticsRepository.countPendingApprovals(filter),
    ]);

    return {
      scope,
      travelRequests: {
        total: travelTotal,
        byStatus: this.mapStatusRows(travelByStatus),
        totalPerDiemAmount: this.round(totalPerDiem),
        topDestinations: this.mapCountryRows(topDestinations),
      },
      payments: {
        total: paymentTotal,
        byStatus: this.mapStatusRows(paymentsByStatus),
        totalPaid: this.round(totalPaid),
        totalPending: this.round(totalPending),
      },
      pendingApprovals,
    };
  }

  async getSpendReport(
    actor: AuthenticatedUser,
    query: AnalyticsDateRangeQueryDto,
  ): Promise<SpendReportDto> {
    const scope = this.resolveScope(actor);
    const filter = this.buildFilter(actor, scope, query);

    const [
      travelTotal,
      totalPerDiem,
      byStatus,
      byCountry,
      totalPaid,
      totalPending,
    ] = await Promise.all([
      this.analyticsRepository.countTravelRequests(filter),
      this.analyticsRepository.sumTravelPerDiem(filter),
      this.analyticsRepository.aggregateTravelByStatus(filter),
      this.analyticsRepository.aggregateTravelByCountry(filter, 10),
      this.analyticsRepository.sumPaymentsByStatus(filter, PaymentStatus.PAID),
      this.analyticsRepository.sumPaymentsByStatus(filter, PaymentStatus.PENDING),
    ]);

    return {
      scope,
      fromDate: query.fromDate ?? null,
      toDate: query.toDate ?? null,
      totalTravelRequests: travelTotal,
      totalPerDiemAmount: this.round(totalPerDiem),
      totalPaid: this.round(totalPaid),
      totalPending: this.round(totalPending),
      byStatus: this.mapStatusRows(byStatus),
      byCountry: this.mapCountryRows(byCountry),
    };
  }

  async exportSpendReport(
    actor: AuthenticatedUser,
    query: AnalyticsDateRangeQueryDto,
  ): Promise<SpendReportExportDto> {
    const report = await this.getSpendReport(actor, query);

    const headers = ['country_code', 'request_count', 'total_per_diem_amount'];
    const rows = report.byCountry.map((row) =>
      [row.countryCode, row.count, row.totalAmount]
        .map((value) => this.escapeCsv(String(value)))
        .join(','),
    );

    const summary = [
      'metric,value',
      `total_travel_requests,${report.totalTravelRequests}`,
      `total_per_diem_amount,${report.totalPerDiemAmount}`,
      `total_paid,${report.totalPaid}`,
      `total_pending,${report.totalPending}`,
      '',
      headers.join(','),
      ...rows,
    ];

    const dateStamp = new Date().toISOString().slice(0, 10);

    return {
      filename: `spend-report-${dateStamp}.csv`,
      csv: summary.join('\n'),
      rowCount: report.byCountry.length,
    };
  }

  private resolveScope(actor: AuthenticatedUser): 'tenant' | 'own' {
    return roleHasPermission(actor.role, Permission.ANALYTICS_READ) ? 'tenant' : 'own';
  }

  private buildFilter(
    actor: AuthenticatedUser,
    scope: 'tenant' | 'own',
    query?: AnalyticsDateRangeQueryDto,
  ) {
    return {
      tenantId: actor.tenantId,
      userId: scope === 'own' ? actor.userId : undefined,
      fromDate: query?.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query?.toDate ? this.endOfDay(new Date(query.toDate)) : undefined,
    };
  }

  private mapStatusRows(rows: { _id: string; count: number; totalAmount: number }[]): StatusCountDto[] {
    return rows.map((row) => ({
      status: row._id,
      count: row.count,
      totalAmount: this.round(row.totalAmount),
    }));
  }

  private mapCountryRows(rows: { _id: string; count: number; totalAmount: number }[]): CountrySpendDto[] {
    return rows.map((row) => ({
      countryCode: row._id,
      count: row.count,
      totalAmount: this.round(row.totalAmount),
    }));
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private endOfDay(date: Date): Date {
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);
    return end;
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
