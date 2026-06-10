import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  ClipboardCheck,
  CreditCard,
  FileText,
  LayoutDashboard,
  MapPin,
  Shield,
  Users,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  show: boolean;
}

export function buildNavItems(flags: {
  canManageUsers: boolean;
  canManagePolicies: boolean;
  canCalculatePerDiem: boolean;
  canManageTravelRequests: boolean;
  canManageApprovals: boolean;
  canViewFinance: boolean;
  canViewAnalytics: boolean;
  canViewSecurityAudit: boolean;
}): NavItem[] {
  return [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, show: true },
    {
      label: 'Travel requests',
      href: '/travel-requests',
      icon: MapPin,
      show: flags.canManageTravelRequests,
    },
    {
      label: 'Approvals',
      href: '/approvals',
      icon: ClipboardCheck,
      show: flags.canManageApprovals,
    },
    {
      label: 'Policies',
      href: '/policies',
      icon: FileText,
      show: flags.canManagePolicies || flags.canCalculatePerDiem,
    },
    { label: 'Finance', href: '/finance', icon: CreditCard, show: flags.canViewFinance },
    { label: 'Analytics', href: '/analytics', icon: BarChart3, show: flags.canViewAnalytics },
    { label: 'Users', href: '/users', icon: Users, show: flags.canManageUsers },
    { label: 'Notifications', href: '/notifications', icon: Bell, show: true },
    {
      label: 'Security',
      href: '/security/audit-logs',
      icon: Shield,
      show: flags.canViewSecurityAudit,
    },
  ].filter((item) => item.show);
}
