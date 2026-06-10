/**
 * Database seed script — populates a demo tenant with users, policies,
 * travel requests (all statuses), payments, notifications, and audit logs.
 *
 * Usage (from repo root):
 *   pnpm seed
 *   pnpm seed:reset   # drop collections first
 */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import * as bcrypt from 'bcrypt';
import mongoose, { Types } from 'mongoose';
import { ApprovalAuditAction } from '../src/common/enums/approval-audit-action.enum';
import { ApprovalStepStatus } from '../src/common/enums/approval-step-status.enum';
import { NotificationType } from '../src/common/enums/notification-type.enum';
import { PaymentStatus } from '../src/common/enums/payment-status.enum';
import { PolicyStatus } from '../src/common/enums/policy-status.enum';
import { SecurityAuditAction } from '../src/common/enums/security-audit-action.enum';
import { TenantStatus } from '../src/common/enums/tenant-status.enum';
import { TravelRequestStatus } from '../src/common/enums/travel-request-status.enum';
import { UserRole } from '../src/common/enums/user-role.enum';
import { UserStatus } from '../src/common/enums/user-status.enum';
import { PerDiemPaymentSchema } from '../src/modules/finance/schemas/per-diem-payment.schema';
import { PerDiemPolicySchema } from '../src/modules/policies/schemas/per-diem-policy.schema';
import { NotificationSchema } from '../src/modules/notifications/schemas/notification.schema';
import { SecurityAuditLogSchema } from '../src/modules/security/schemas/security-audit-log.schema';
import { TenantSchema } from '../src/modules/tenant/schemas/tenant.schema';
import { ApprovalAuditLogSchema } from '../src/modules/travel-requests/schemas/approval-audit-log.schema';
import {
  ApprovalStep,
  TravelRequestDocument,
  TravelRequestSchema,
} from '../src/modules/travel-requests/schemas/travel-request.schema';
import { UserSchema } from '../src/modules/users/schemas/user.schema';

const BCRYPT_ROUNDS = 12;
const DEMO_PASSWORD = 'DemoPass1!';
const TENANT_SLUG = 'acme';

const COLLECTIONS = [
  'tenants',
  'users',
  'per_diem_policies',
  'travel_requests',
  'per_diem_payments',
  'notifications',
  'approval_audit_logs',
  'security_audit_logs',
  'refresh_tokens',
  'invites',
];

function loadEnv(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
    resolve(__dirname, '../../../.env'),
  ];

  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;

    for (const line of readFileSync(filePath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
    return;
  }
}

function calculateDays(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function buildEmployeeSteps(
  state: 'pending_manager' | 'pending_admin' | 'approved' | 'rejected',
  managerId: Types.ObjectId,
  adminId: Types.ObjectId,
): { steps: ApprovalStep[]; currentStepIndex: number } {
  const steps: ApprovalStep[] = [
    {
      step: 1,
      requiredRole: UserRole.MANAGER,
      status: ApprovalStepStatus.PENDING,
      actedBy: null,
      actedAt: null,
      comment: '',
    },
    {
      step: 2,
      requiredRole: UserRole.TENANT_ADMIN,
      status: ApprovalStepStatus.PENDING,
      actedBy: null,
      actedAt: null,
      comment: '',
    },
  ];

  if (state === 'pending_manager') {
    return { steps, currentStepIndex: 0 };
  }

  steps[0] = {
    ...steps[0],
    status:
      state === 'rejected' ? ApprovalStepStatus.REJECTED : ApprovalStepStatus.APPROVED,
    actedBy: managerId,
    actedAt: daysAgo(2),
    comment: state === 'rejected' ? 'Budget not approved for this quarter' : 'Looks good',
  };

  if (state === 'pending_admin') {
    return { steps, currentStepIndex: 1 };
  }

  if (state === 'rejected') {
    return { steps, currentStepIndex: -1 };
  }

  steps[1] = {
    ...steps[1],
    status: ApprovalStepStatus.APPROVED,
    actedBy: adminId,
    actedAt: daysAgo(1),
    comment: 'Approved',
  };

  return { steps, currentStepIndex: -1 };
}

function buildManagerSteps(
  state: 'pending_admin' | 'approved',
  adminId: Types.ObjectId,
): { steps: ApprovalStep[]; currentStepIndex: number } {
  const steps: ApprovalStep[] = [
    {
      step: 1,
      requiredRole: UserRole.TENANT_ADMIN,
      status: ApprovalStepStatus.PENDING,
      actedBy: null,
      actedAt: null,
      comment: '',
    },
  ];

  if (state === 'pending_admin') {
    return { steps, currentStepIndex: 0 };
  }

  steps[0] = {
    ...steps[0],
    status: ApprovalStepStatus.APPROVED,
    actedBy: adminId,
    actedAt: daysAgo(3),
    comment: 'Approved',
  };

  return { steps, currentStepIndex: -1 };
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function clearCollections(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;

  for (const name of COLLECTIONS) {
    const exists = await db.listCollections({ name }).hasNext();
    if (exists) {
      await db.collection(name).deleteMany({});
    }
  }
}

async function seed(): Promise<void> {
  loadEnv();

  const mongoUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/perdiem';
  const shouldReset = process.argv.includes('--reset');

  await mongoose.connect(mongoUri);
  console.log(`Connected to MongoDB: ${mongoUri}`);

  if (shouldReset) {
    console.log('Clearing existing seed collections...');
    await clearCollections();
  }

  const Tenant = mongoose.model('Tenant', TenantSchema);
  const User = mongoose.model('User', UserSchema);
  const Policy = mongoose.model('PerDiemPolicy', PerDiemPolicySchema);
  const TravelRequest = mongoose.model('TravelRequest', TravelRequestSchema);
  const Payment = mongoose.model('PerDiemPayment', PerDiemPaymentSchema);
  const Notification = mongoose.model('Notification', NotificationSchema);
  const ApprovalAudit = mongoose.model('ApprovalAuditLog', ApprovalAuditLogSchema);
  const SecurityAudit = mongoose.model('SecurityAuditLog', SecurityAuditLogSchema);

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  // ── Tenant ──────────────────────────────────────────────────────────────
  const tenant = await Tenant.create({
    name: 'Acme Corporation',
    slug: TENANT_SLUG,
    status: TenantStatus.ACTIVE,
    isDeleted: false,
    deletedAt: null,
  });
  const tenantId = tenant._id as Types.ObjectId;
  console.log(`Created tenant: ${tenant.name} (${TENANT_SLUG})`);

  // ── Users ───────────────────────────────────────────────────────────────
  const admin = await User.create({
    tenantId,
    email: 'admin@acme.com',
    password: passwordHash,
    firstName: 'Alice',
    lastName: 'Admin',
    role: UserRole.TENANT_ADMIN,
    status: UserStatus.ACTIVE,
    invitedBy: null,
    isDeleted: false,
  });

  const manager = await User.create({
    tenantId,
    email: 'manager@acme.com',
    password: passwordHash,
    firstName: 'Mark',
    lastName: 'Manager',
    role: UserRole.MANAGER,
    status: UserStatus.ACTIVE,
    invitedBy: admin._id,
    isDeleted: false,
  });

  const employee1 = await User.create({
    tenantId,
    email: 'employee@acme.com',
    password: passwordHash,
    firstName: 'Emma',
    lastName: 'Employee',
    role: UserRole.EMPLOYEE,
    status: UserStatus.ACTIVE,
    invitedBy: manager._id,
    isDeleted: false,
  });

  const employee2 = await User.create({
    tenantId,
    email: 'john.doe@acme.com',
    password: passwordHash,
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.EMPLOYEE,
    status: UserStatus.ACTIVE,
    invitedBy: manager._id,
    isDeleted: false,
  });

  // ── Policies ────────────────────────────────────────────────────────────
  const policies = await Policy.create([
    {
      tenantId,
      name: 'US Employee Standard',
      description: 'Domestic travel per diem for employees',
      countryCode: 'US',
      role: UserRole.EMPLOYEE,
      dailyRate: 85,
      currency: 'USD',
      status: PolicyStatus.ACTIVE,
      priority: 10,
    },
    {
      tenantId,
      name: 'US Manager Standard',
      description: 'Domestic travel per diem for managers',
      countryCode: 'US',
      role: UserRole.MANAGER,
      dailyRate: 110,
      currency: 'USD',
      status: PolicyStatus.ACTIVE,
      priority: 20,
    },
    {
      tenantId,
      name: 'US Default',
      description: 'Fallback US rate',
      countryCode: 'US',
      role: null,
      dailyRate: 75,
      currency: 'USD',
      status: PolicyStatus.ACTIVE,
      priority: 0,
    },
    {
      tenantId,
      name: 'Germany Employee',
      description: 'Berlin and Frankfurt travel',
      countryCode: 'DE',
      role: UserRole.EMPLOYEE,
      dailyRate: 70,
      currency: 'EUR',
      status: PolicyStatus.ACTIVE,
      priority: 10,
    },
    {
      tenantId,
      name: 'UK Employee',
      description: 'London travel per diem',
      countryCode: 'GB',
      role: UserRole.EMPLOYEE,
      dailyRate: 65,
      currency: 'GBP',
      status: PolicyStatus.ACTIVE,
      priority: 10,
    },
    {
      tenantId,
      name: 'France Default',
      description: 'Paris and regional France',
      countryCode: 'FR',
      role: null,
      dailyRate: 80,
      currency: 'EUR',
      status: PolicyStatus.ACTIVE,
      priority: 5,
    },
  ]);

  const usEmployeePolicy = policies[0];
  const dePolicy = policies[3];
  const gbPolicy = policies[4];
  const frPolicy = policies[5];

  // ── Travel requests ─────────────────────────────────────────────────────
  type TripSeed = {
    user: typeof employee1;
    role: UserRole;
    title: string;
    purpose: string;
    country: string;
    city: string;
    start: string;
    end: string;
    policy: (typeof policies)[0];
    status: TravelRequestStatus;
    workflow?: ReturnType<typeof buildEmployeeSteps>;
    managerWorkflow?: ReturnType<typeof buildManagerSteps>;
    rejectionComment?: string;
  };

  const trips: TripSeed[] = [
    {
      user: employee1,
      role: UserRole.EMPLOYEE,
      title: 'NYC client visit (draft)',
      purpose: 'Quarterly account review with key client',
      country: 'US',
      city: 'New York',
      start: '2026-09-15',
      end: '2026-09-17',
      policy: usEmployeePolicy,
      status: TravelRequestStatus.DRAFT,
    },
    {
      user: employee1,
      role: UserRole.EMPLOYEE,
      title: 'Chicago sales conference',
      purpose: 'Annual regional sales kickoff',
      country: 'US',
      city: 'Chicago',
      start: '2026-07-10',
      end: '2026-07-12',
      policy: usEmployeePolicy,
      status: TravelRequestStatus.PENDING_APPROVAL,
      workflow: buildEmployeeSteps('pending_manager', manager._id, admin._id),
    },
    {
      user: employee1,
      role: UserRole.EMPLOYEE,
      title: 'Austin product training',
      purpose: 'Hands-on training for new product line',
      country: 'US',
      city: 'Austin',
      start: '2026-08-01',
      end: '2026-08-04',
      policy: usEmployeePolicy,
      status: TravelRequestStatus.PENDING_APPROVAL,
      workflow: buildEmployeeSteps('pending_admin', manager._id, admin._id),
    },
    {
      user: employee2,
      role: UserRole.EMPLOYEE,
      title: 'Berlin engineering workshop',
      purpose: 'Cross-team architecture sync',
      country: 'DE',
      city: 'Berlin',
      start: '2026-06-10',
      end: '2026-06-13',
      policy: dePolicy,
      status: TravelRequestStatus.APPROVED,
      workflow: buildEmployeeSteps('approved', manager._id, admin._id),
    },
    {
      user: employee1,
      role: UserRole.EMPLOYEE,
      title: 'London industry summit',
      purpose: 'Industry networking and keynote sessions',
      country: 'GB',
      city: 'London',
      start: '2026-05-20',
      end: '2026-05-22',
      policy: gbPolicy,
      status: TravelRequestStatus.APPROVED,
      workflow: buildEmployeeSteps('approved', manager._id, admin._id),
    },
    {
      user: employee2,
      role: UserRole.EMPLOYEE,
      title: 'Paris partner meetings',
      purpose: 'Partnership negotiations',
      country: 'FR',
      city: 'Paris',
      start: '2026-04-08',
      end: '2026-04-10',
      policy: frPolicy,
      status: TravelRequestStatus.REJECTED,
      workflow: buildEmployeeSteps('rejected', manager._id, admin._id),
      rejectionComment: 'Budget not approved for this quarter',
    },
    {
      user: manager,
      role: UserRole.MANAGER,
      title: 'San Francisco leadership offsite',
      purpose: 'Annual leadership planning session',
      country: 'US',
      city: 'San Francisco',
      start: '2026-10-05',
      end: '2026-10-08',
      policy: policies[1],
      status: TravelRequestStatus.PENDING_APPROVAL,
      managerWorkflow: buildManagerSteps('pending_admin', admin._id),
    },
    {
      user: employee1,
      role: UserRole.EMPLOYEE,
      title: 'Cancelled Denver trip',
      purpose: 'Site visit — cancelled by requester',
      country: 'US',
      city: 'Denver',
      start: '2026-03-01',
      end: '2026-03-03',
      policy: usEmployeePolicy,
      status: TravelRequestStatus.CANCELLED,
    },
  ];

  type TravelDocEntry = {
    trip: TripSeed;
    doc: TravelRequestDocument;
  };

  const travelDocs: TravelDocEntry[] = [];
  for (const trip of trips) {
    const startDate = dateOnly(trip.start);
    const endDate = dateOnly(trip.end);
    const days = calculateDays(startDate, endDate);
    const totalAmount = days * trip.policy.dailyRate;

    const workflow = trip.workflow ?? trip.managerWorkflow;
    const approvalSteps = workflow?.steps ?? [];
    const currentStepIndex = workflow?.currentStepIndex ?? -1;

    const doc = await TravelRequest.create({
      tenantId,
      userId: trip.user._id,
      requesterRole: trip.role,
      title: trip.title,
      purpose: trip.purpose,
      destinationCountryCode: trip.country,
      destinationCity: trip.city,
      startDate,
      endDate,
      days,
      policyId: trip.policy._id,
      policyName: trip.policy.name,
      dailyRate: trip.policy.dailyRate,
      currency: trip.policy.currency,
      totalAmount,
      appliedPolicyRole: trip.policy.role,
      status: trip.status,
      submittedAt:
        trip.status !== TravelRequestStatus.DRAFT ? daysAgo(5) : null,
      cancelledAt: trip.status === TravelRequestStatus.CANCELLED ? daysAgo(10) : null,
      approvalSteps,
      currentStepIndex,
      approvedAt: trip.status === TravelRequestStatus.APPROVED ? daysAgo(1) : null,
      rejectedAt: trip.status === TravelRequestStatus.REJECTED ? daysAgo(2) : null,
      rejectionComment: trip.rejectionComment ?? '',
      isDeleted: false,
    });

    travelDocs.push({ trip, doc: doc as TravelRequestDocument });
  }

  // ── Payments (approved trips) ───────────────────────────────────────────
  const berlinTrip = travelDocs.find((t) => t.trip.title.includes('Berlin'))!.doc;
  const londonTrip = travelDocs.find((t) => t.trip.title.includes('London'))!.doc;

  const [pendingPayment, paidPayment] = await Payment.create([
    {
      tenantId,
      travelRequestId: berlinTrip._id,
      userId: employee2._id,
      travelTitle: berlinTrip.title,
      destinationCountryCode: berlinTrip.destinationCountryCode,
      days: berlinTrip.days,
      policyName: berlinTrip.policyName,
      amount: berlinTrip.totalAmount,
      currency: berlinTrip.currency,
      status: PaymentStatus.PENDING,
      paymentReference: '',
      notes: 'Awaiting finance processing',
      processedBy: null,
      paidAt: null,
      isDeleted: false,
    },
    {
      tenantId,
      travelRequestId: londonTrip._id,
      userId: employee1._id,
      travelTitle: londonTrip.title,
      destinationCountryCode: londonTrip.destinationCountryCode,
      days: londonTrip.days,
      policyName: londonTrip.policyName,
      amount: londonTrip.totalAmount,
      currency: londonTrip.currency,
      status: PaymentStatus.PAID,
      paymentReference: 'SEED-PAY-2026-001',
      notes: 'Processed via corporate payroll',
      processedBy: admin._id,
      paidAt: daysAgo(1),
      isDeleted: false,
    },
  ]);

  // ── Approval audit trails ───────────────────────────────────────────────
  const auditEntries: Record<string, unknown>[] = [];

  for (const { trip, doc } of travelDocs) {
    if (trip.status === TravelRequestStatus.DRAFT) continue;

    auditEntries.push({
      tenantId,
      travelRequestId: doc._id,
      actorId: trip.user._id,
      actorRole: trip.role,
      action: ApprovalAuditAction.SUBMIT,
      step: null,
      comment: '',
      previousStatus: TravelRequestStatus.DRAFT,
      newStatus: TravelRequestStatus.PENDING_APPROVAL,
      createdAt: daysAgo(5),
    });

    if (trip.workflow?.steps[0]?.status === ApprovalStepStatus.APPROVED) {
      auditEntries.push({
        tenantId,
        travelRequestId: doc._id,
        actorId: manager._id,
        actorRole: UserRole.MANAGER,
        action: ApprovalAuditAction.APPROVE,
        step: 1,
        comment: 'Looks good',
        previousStatus: TravelRequestStatus.PENDING_APPROVAL,
        newStatus: TravelRequestStatus.PENDING_APPROVAL,
        createdAt: daysAgo(3),
      });
    }

    if (trip.workflow?.steps[0]?.status === ApprovalStepStatus.REJECTED) {
      auditEntries.push({
        tenantId,
        travelRequestId: doc._id,
        actorId: manager._id,
        actorRole: UserRole.MANAGER,
        action: ApprovalAuditAction.REJECT,
        step: 1,
        comment: trip.rejectionComment ?? '',
        previousStatus: TravelRequestStatus.PENDING_APPROVAL,
        newStatus: TravelRequestStatus.REJECTED,
        createdAt: daysAgo(2),
      });
    }

    if (trip.status === TravelRequestStatus.APPROVED) {
      auditEntries.push({
        tenantId,
        travelRequestId: doc._id,
        actorId: admin._id,
        actorRole: UserRole.TENANT_ADMIN,
        action: ApprovalAuditAction.APPROVE,
        step: trip.workflow ? 2 : 1,
        comment: 'Approved',
        previousStatus: TravelRequestStatus.PENDING_APPROVAL,
        newStatus: TravelRequestStatus.APPROVED,
        createdAt: daysAgo(1),
      });
    }

    if (trip.status === TravelRequestStatus.CANCELLED) {
      auditEntries.push({
        tenantId,
        travelRequestId: doc._id,
        actorId: trip.user._id,
        actorRole: trip.role,
        action: ApprovalAuditAction.CANCEL,
        step: null,
        comment: 'No longer needed',
        previousStatus: TravelRequestStatus.DRAFT,
        newStatus: TravelRequestStatus.CANCELLED,
        createdAt: daysAgo(10),
      });
    }
  }

  await ApprovalAudit.insertMany(auditEntries);

  // ── Notifications ───────────────────────────────────────────────────────
  const chicagoTrip = travelDocs.find((t) => t.trip.title.includes('Chicago'))!.doc;
  const austinTrip = travelDocs.find((t) => t.trip.title.includes('Austin'))!.doc;
  const sfTrip = travelDocs.find((t) => t.trip.title.includes('San Francisco'))!.doc;

  await Notification.insertMany([
    {
      tenantId,
      userId: manager._id,
      type: NotificationType.APPROVAL_REQUIRED,
      title: 'Approval required',
      message: `Travel request "${chicagoTrip.title}" is awaiting your approval.`,
      entityType: 'travel_request',
      entityId: chicagoTrip._id,
      readAt: null,
    },
    {
      tenantId,
      userId: manager._id,
      type: NotificationType.APPROVAL_REQUIRED,
      title: 'Approval required',
      message: `Travel request "${austinTrip.title}" — you already approved; now with admin.`,
      entityType: 'travel_request',
      entityId: austinTrip._id,
      readAt: daysAgo(1),
    },
    {
      tenantId,
      userId: admin._id,
      type: NotificationType.APPROVAL_REQUIRED,
      title: 'Approval required',
      message: `Travel request "${austinTrip.title}" needs tenant admin approval.`,
      entityType: 'travel_request',
      entityId: austinTrip._id,
      readAt: null,
    },
    {
      tenantId,
      userId: admin._id,
      type: NotificationType.APPROVAL_REQUIRED,
      title: 'Approval required',
      message: `Travel request "${sfTrip.title}" from Mark Manager awaits approval.`,
      entityType: 'travel_request',
      entityId: sfTrip._id,
      readAt: null,
    },
    {
      tenantId,
      userId: employee1._id,
      type: NotificationType.TRAVEL_APPROVED,
      title: 'Travel request approved',
      message: `Your trip "${londonTrip.title}" has been fully approved.`,
      entityType: 'travel_request',
      entityId: londonTrip._id,
      readAt: daysAgo(2),
    },
    {
      tenantId,
      userId: employee2._id,
      type: NotificationType.TRAVEL_APPROVED,
      title: 'Travel request approved',
      message: `Your trip "${berlinTrip.title}" has been fully approved.`,
      entityType: 'travel_request',
      entityId: berlinTrip._id,
      readAt: null,
    },
    {
      tenantId,
      userId: employee2._id,
      type: NotificationType.TRAVEL_REJECTED,
      title: 'Travel request rejected',
      message: 'Your Paris partner meetings request was rejected.',
      entityType: 'travel_request',
      entityId: travelDocs.find((t) => t.trip.title.includes('Paris'))!.doc._id,
      readAt: daysAgo(1),
    },
    {
      tenantId,
      userId: employee2._id,
      type: NotificationType.PAYMENT_CREATED,
      title: 'Payment created',
      message: `A per diem payment of ${berlinTrip.totalAmount} ${berlinTrip.currency} was created for "${berlinTrip.title}".`,
      entityType: 'payment',
      entityId: pendingPayment._id,
      readAt: null,
    },
    {
      tenantId,
      userId: employee1._id,
      type: NotificationType.PAYMENT_CREATED,
      title: 'Payment created',
      message: `A per diem payment of ${londonTrip.totalAmount} ${londonTrip.currency} was created.`,
      entityType: 'payment',
      entityId: paidPayment._id,
      readAt: daysAgo(3),
    },
    {
      tenantId,
      userId: employee1._id,
      type: NotificationType.PAYMENT_PAID,
      title: 'Payment processed',
      message: `Your payment for "${londonTrip.title}" has been marked as paid.`,
      entityType: 'payment',
      entityId: paidPayment._id,
      readAt: null,
    },
    {
      tenantId,
      userId: admin._id,
      type: NotificationType.PAYMENT_PAID,
      title: 'Payment processed',
      message: `Payment SEED-PAY-2026-001 marked paid for ${employee1.firstName} ${employee1.lastName}.`,
      entityType: 'payment',
      entityId: paidPayment._id,
      readAt: daysAgo(1),
    },
  ]);

  // ── Security audit logs ─────────────────────────────────────────────────
  await SecurityAudit.insertMany([
    {
      tenantId,
      userId: admin._id,
      actorEmail: admin.email,
      action: SecurityAuditAction.AUTH_REGISTER_TENANT,
      resourceType: 'tenant',
      resourceId: tenantId.toString(),
      success: true,
      ip: '127.0.0.1',
      userAgent: 'seed-script',
      requestId: 'seed-001',
      metadata: { source: 'seed' },
    },
    {
      tenantId,
      userId: admin._id,
      actorEmail: admin.email,
      action: SecurityAuditAction.AUTH_LOGIN_SUCCESS,
      resourceType: 'user',
      resourceId: admin._id.toString(),
      success: true,
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (seed)',
      requestId: 'seed-002',
    },
    {
      tenantId,
      userId: manager._id,
      actorEmail: manager.email,
      action: SecurityAuditAction.AUTH_LOGIN_SUCCESS,
      resourceType: 'user',
      resourceId: manager._id.toString(),
      success: true,
      ip: '192.168.1.42',
      userAgent: 'Mozilla/5.0 (seed)',
      requestId: 'seed-003',
    },
    {
      tenantId,
      actorEmail: 'intruder@evil.com',
      action: SecurityAuditAction.AUTH_LOGIN_FAILED,
      resourceType: 'auth',
      success: false,
      ip: '10.0.0.99',
      userAgent: 'curl/8.0',
      requestId: 'seed-004',
      metadata: { tenantSlug: TENANT_SLUG },
    },
    {
      tenantId,
      userId: admin._id,
      actorEmail: admin.email,
      action: SecurityAuditAction.USER_INVITE_CREATED,
      resourceType: 'invite',
      success: true,
      ip: '127.0.0.1',
      userAgent: 'seed-script',
      requestId: 'seed-005',
      metadata: { email: employee1.email },
    },
    {
      tenantId,
      userId: admin._id,
      actorEmail: admin.email,
      action: SecurityAuditAction.FINANCE_PAYMENT_PAID,
      resourceType: 'payment',
      resourceId: paidPayment._id.toString(),
      success: true,
      ip: '127.0.0.1',
      userAgent: 'seed-script',
      requestId: 'seed-006',
      metadata: { amount: londonTrip.totalAmount, currency: londonTrip.currency },
    },
  ]);

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('\n✅ Seed completed successfully!\n');
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│  LOGIN — use tenant slug: acme                                  │');
  console.log('├──────────────────────────┬──────────────┬───────────────────────┤');
  console.log('│  Email                   │  Password    │  Role                 │');
  console.log('├──────────────────────────┼──────────────┼───────────────────────┤');
  console.log('│  admin@acme.com          │  DemoPass1!  │  tenant_admin         │');
  console.log('│  manager@acme.com        │  DemoPass1!  │  manager              │');
  console.log('│  employee@acme.com       │  DemoPass1!  │  employee             │');
  console.log('│  john.doe@acme.com       │  DemoPass1!  │  employee             │');
  console.log('└──────────────────────────┴──────────────┴───────────────────────┘');
  console.log('\nSeeded data:');
  console.log(`  • 1 tenant (${TENANT_SLUG})`);
  console.log('  • 4 users (admin, manager, 2 employees)');
  console.log('  • 6 per diem policies (US, DE, GB, FR)');
  console.log('  • 8 travel requests (draft, pending×3, approved×2, rejected, cancelled)');
  console.log('  • 2 payments (1 pending, 1 paid)');
  console.log('  • 11 notifications (mix of read/unread)');
  console.log('  • Approval + security audit logs');
  console.log('\nUI testing guide:');
  console.log('  • Login as manager@acme.com  → Approvals (Chicago trip pending)');
  console.log('  • Login as admin@acme.com    → Approvals (Austin + SF trips), Finance, Security audit');
  console.log('  • Login as employee@acme.com → Travel requests, Notifications, Analytics (own scope)');
  console.log('  • Login as john.doe@acme.com → Berlin payment pending, Paris rejected');
  console.log('\nStart the app: pnpm dev');
  console.log('Frontend: http://localhost:3002  |  API: http://localhost:3001/api/v1\n');

  await mongoose.disconnect();
}

seed().catch((error: Error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
