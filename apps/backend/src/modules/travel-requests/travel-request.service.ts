import { HttpStatus, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ErrorCodes } from '@/common/constants/error-codes';
import { Permission } from '@/common/enums/permission.enum';
import { TravelRequestStatus } from '@/common/enums/travel-request-status.enum';
import { BusinessException } from '@/common/exceptions/business.exception';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { roleHasPermission } from '@/common/rbac/role-permissions';
import { PolicyCalculationService } from '../policies/policy-calculation.service';
import { CreateTravelRequestDto } from './dto/create-travel-request.dto';
import { ListTravelRequestsQueryDto } from './dto/list-travel-requests-query.dto';
import {
  PaginatedTravelRequestsResponseDto,
  TravelRequestResponseDto,
} from './dto/travel-request-response.dto';
import { UpdateTravelRequestDto } from './dto/update-travel-request.dto';
import { TravelRequestDocument } from './schemas/travel-request.schema';
import { TravelRequestRepository } from './travel-request.repository';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_TRIP_DAYS = 365;

@Injectable()
export class TravelRequestService {
  constructor(
    private readonly travelRequestRepository: TravelRequestRepository,
    private readonly policyCalculationService: PolicyCalculationService,
  ) {}

  async create(
    actor: AuthenticatedUser,
    dto: CreateTravelRequestDto,
  ): Promise<TravelRequestResponseDto> {
    const { startDate, endDate, days } = this.parseAndValidateDates(
      dto.startDate,
      dto.endDate,
    );

    const calculation = await this.policyCalculationService.calculate(actor.tenantId, {
      countryCode: dto.destinationCountryCode,
      role: actor.role,
      days,
      startDate: dto.startDate,
    });

    const request = await this.travelRequestRepository.create({
      tenantId: new Types.ObjectId(actor.tenantId),
      userId: new Types.ObjectId(actor.userId),
      requesterRole: actor.role,
      title: dto.title.trim(),
      purpose: dto.purpose?.trim() ?? '',
      destinationCountryCode: dto.destinationCountryCode.toUpperCase(),
      destinationCity: dto.destinationCity?.trim() ?? '',
      startDate,
      endDate,
      days,
      policyId: new Types.ObjectId(calculation.policyId),
      policyName: calculation.policyName,
      dailyRate: calculation.dailyRate,
      currency: calculation.currency,
      totalAmount: calculation.totalAmount,
      appliedPolicyRole: calculation.appliedRole,
      status: TravelRequestStatus.DRAFT,
    });

    return TravelRequestResponseDto.fromDocument(request);
  }

  async list(
    actor: AuthenticatedUser,
    query: ListTravelRequestsQueryDto,
  ): Promise<PaginatedTravelRequestsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const canReadAll = roleHasPermission(actor.role, Permission.TRAVEL_REQUESTS_READ_ALL);

    const { items, total } = await this.travelRequestRepository.findAllInTenant(
      actor.tenantId,
      {
        userId: canReadAll ? undefined : actor.userId,
        status: query.status,
      },
      page,
      limit,
    );

    return {
      items: items.map((request) => TravelRequestResponseDto.fromDocument(request)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getById(
    actor: AuthenticatedUser,
    requestId: string,
  ): Promise<TravelRequestResponseDto> {
    const request = await this.getRequestOrThrow(actor.tenantId, requestId);
    this.ensureCanAccess(actor, request);
    return TravelRequestResponseDto.fromDocument(request);
  }

  async update(
    actor: AuthenticatedUser,
    requestId: string,
    dto: UpdateTravelRequestDto,
  ): Promise<TravelRequestResponseDto> {
    const existing = await this.getRequestOrThrow(actor.tenantId, requestId);
    this.ensureCanModify(actor, existing);

    if (existing.status !== TravelRequestStatus.DRAFT) {
      throw new BusinessException(
        {
          code: ErrorCodes.TRAVEL_REQUEST_INVALID_STATUS,
          message: 'Only draft travel requests can be updated',
          details: { status: existing.status },
        },
        HttpStatus.CONFLICT,
      );
    }

    const startDateStr = dto.startDate ?? existing.startDate.toISOString();
    const endDateStr = dto.endDate ?? existing.endDate.toISOString();
    const { startDate, endDate, days } = this.parseAndValidateDates(startDateStr, endDateStr);

    const countryCode = (dto.destinationCountryCode ?? existing.destinationCountryCode).toUpperCase();

    const calculation = await this.policyCalculationService.calculate(actor.tenantId, {
      countryCode,
      role: existing.requesterRole,
      days,
      startDate: startDateStr,
    });

    const updated = await this.travelRequestRepository.updateInTenant(
      actor.tenantId,
      requestId,
      {
        title: dto.title?.trim() ?? existing.title,
        purpose: dto.purpose !== undefined ? dto.purpose.trim() : existing.purpose,
        destinationCountryCode: countryCode,
        destinationCity:
          dto.destinationCity !== undefined ? dto.destinationCity.trim() : existing.destinationCity,
        startDate,
        endDate,
        days,
        policyId: new Types.ObjectId(calculation.policyId),
        policyName: calculation.policyName,
        dailyRate: calculation.dailyRate,
        currency: calculation.currency,
        totalAmount: calculation.totalAmount,
        appliedPolicyRole: calculation.appliedRole,
      },
    );

    return TravelRequestResponseDto.fromDocument(updated!);
  }

  async submit(
    actor: AuthenticatedUser,
    requestId: string,
  ): Promise<TravelRequestResponseDto> {
    const existing = await this.getRequestOrThrow(actor.tenantId, requestId);
    this.ensureCanModify(actor, existing);

    if (existing.status !== TravelRequestStatus.DRAFT) {
      throw new BusinessException(
        {
          code: ErrorCodes.TRAVEL_REQUEST_INVALID_STATUS,
          message: 'Only draft travel requests can be submitted',
          details: { status: existing.status },
        },
        HttpStatus.CONFLICT,
      );
    }

    const updated = await this.travelRequestRepository.updateInTenant(
      actor.tenantId,
      requestId,
      {
        status: TravelRequestStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    );

    return TravelRequestResponseDto.fromDocument(updated!);
  }

  async cancel(
    actor: AuthenticatedUser,
    requestId: string,
  ): Promise<TravelRequestResponseDto> {
    const existing = await this.getRequestOrThrow(actor.tenantId, requestId);
    this.ensureCanModify(actor, existing);

    if (
      existing.status !== TravelRequestStatus.DRAFT &&
      existing.status !== TravelRequestStatus.SUBMITTED
    ) {
      throw new BusinessException(
        {
          code: ErrorCodes.TRAVEL_REQUEST_INVALID_STATUS,
          message: 'Only draft or submitted travel requests can be cancelled',
          details: { status: existing.status },
        },
        HttpStatus.CONFLICT,
      );
    }

    const updated = await this.travelRequestRepository.updateInTenant(
      actor.tenantId,
      requestId,
      {
        status: TravelRequestStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    );

    return TravelRequestResponseDto.fromDocument(updated!);
  }

  calculateDays(startDate: Date, endDate: Date): number {
    const start = this.startOfDay(startDate);
    const end = this.startOfDay(endDate);
    const diffMs = end.getTime() - start.getTime();
    return Math.floor(diffMs / MS_PER_DAY) + 1;
  }

  private async getRequestOrThrow(
    tenantId: string,
    requestId: string,
  ): Promise<TravelRequestDocument> {
    const request = await this.travelRequestRepository.findByIdInTenant(tenantId, requestId);

    if (!request) {
      throw new BusinessException(
        {
          code: ErrorCodes.TRAVEL_REQUEST_NOT_FOUND,
          message: 'Travel request not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return request;
  }

  private ensureCanAccess(actor: AuthenticatedUser, request: TravelRequestDocument): void {
    if (this.canAccessAll(actor)) {
      return;
    }

    if (request.userId.toString() !== actor.userId) {
      throw new BusinessException(
        {
          code: ErrorCodes.TRAVEL_REQUEST_FORBIDDEN,
          message: 'You do not have access to this travel request',
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private ensureCanModify(actor: AuthenticatedUser, request: TravelRequestDocument): void {
    if (this.canAccessAll(actor)) {
      return;
    }

    if (request.userId.toString() !== actor.userId) {
      throw new BusinessException(
        {
          code: ErrorCodes.TRAVEL_REQUEST_FORBIDDEN,
          message: 'You can only modify your own travel requests',
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private canAccessAll(actor: AuthenticatedUser): boolean {
    return roleHasPermission(actor.role, Permission.TRAVEL_REQUESTS_READ_ALL);
  }

  private parseAndValidateDates(
    startDateStr: string,
    endDateStr: string,
  ): { startDate: Date; endDate: Date; days: number } {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BusinessException(
        {
          code: ErrorCodes.TRAVEL_REQUEST_INVALID_DATES,
          message: 'Invalid travel dates',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const normalizedStart = this.startOfDay(startDate);
    const normalizedEnd = this.startOfDay(endDate);

    if (normalizedEnd < normalizedStart) {
      throw new BusinessException(
        {
          code: ErrorCodes.TRAVEL_REQUEST_INVALID_DATES,
          message: 'endDate must be on or after startDate',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const days = this.calculateDays(normalizedStart, normalizedEnd);

    if (days > MAX_TRIP_DAYS) {
      throw new BusinessException(
        {
          code: ErrorCodes.TRAVEL_REQUEST_INVALID_DATES,
          message: `Travel duration cannot exceed ${MAX_TRIP_DAYS} days`,
          details: { days },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return { startDate: normalizedStart, endDate: normalizedEnd, days };
  }

  private startOfDay(date: Date): Date {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  }
}
