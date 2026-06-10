export enum SecurityAuditAction {
  AUTH_LOGIN_SUCCESS = 'auth.login_success',
  AUTH_LOGIN_FAILED = 'auth.login_failed',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_REGISTER_TENANT = 'auth.register_tenant',
  AUTH_REFRESH_TOKEN = 'auth.refresh_token',
  AUTH_ACCEPT_INVITE = 'auth.accept_invite',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_INVITE_CREATED = 'user.invite_created',
  USER_INVITE_REVOKED = 'user.invite_revoked',
  FINANCE_PAYMENT_PAID = 'finance.payment_paid',
  FINANCE_PAYMENT_FAILED = 'finance.payment_failed',
}
