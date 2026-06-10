'use client';

import { useEffect, useState } from 'react';
import { MobileSidebar, Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { PageLoading } from '@/components/shared/page-loading';
import { useAuth } from '@/lib/auth-context';
import { buildNavItems } from '@/lib/navigation';
import * as notificationsApi from '@/lib/notifications-api';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const auth = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!auth.accessToken || !auth.tenantId) return;
    notificationsApi
      .getUnreadCount(auth.accessToken, auth.tenantId)
      .then((r) => setUnreadCount(r.count))
      .catch(() => setUnreadCount(0));
  }, [auth.accessToken, auth.tenantId]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileNavOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileNavOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  if (auth.isLoading || !auth.user) {
    return <PageLoading />;
  }

  const navItems = buildNavItems({
    canManageUsers: auth.canManageUsers,
    canManagePolicies: auth.canManagePolicies,
    canCalculatePerDiem: auth.canCalculatePerDiem,
    canManageTravelRequests: auth.canManageTravelRequests,
    canManageApprovals: auth.canManageApprovals,
    canViewFinance: auth.canViewFinance,
    canViewAnalytics: auth.canViewAnalytics,
    canViewSecurityAudit: auth.canViewSecurityAudit,
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[15rem_1fr]">
        <Sidebar items={navItems} />
        <div className="flex min-h-screen min-w-0 flex-col">
          <Topbar
            user={auth.user}
            navItems={navItems}
            unreadCount={unreadCount}
            onLogout={() => auth.logout()}
            onMenuClick={() => setMobileNavOpen(true)}
          />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
      <MobileSidebar
        items={navItems}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
    </div>
  );
}
