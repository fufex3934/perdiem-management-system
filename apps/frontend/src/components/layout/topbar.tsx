'use client';

import { Bell, LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import { CommandSearch } from '@/components/layout/command-search';
import { Button } from '@/components/ui/button';
import type { AuthUser } from '@/lib/auth-types';
import type { NavItem } from '@/lib/navigation';

interface TopbarProps {
  user: AuthUser;
  navItems: NavItem[];
  unreadCount?: number;
  onLogout: () => void;
  onMenuClick?: () => void;
}

export function Topbar({
  user,
  navItems,
  unreadCount = 0,
  onLogout,
  onMenuClick,
}: TopbarProps) {
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full shrink-0 items-center gap-3 border-b border-border/60 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:gap-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center">
        <CommandSearch items={navItems} />
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Link
          href="/notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <div className="hidden items-center gap-3 rounded-lg border border-border/60 px-3 py-1.5 md:flex">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </div>
          <div className="hidden text-left leading-tight lg:block">
            <p className="max-w-[8rem] truncate text-sm font-medium">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs capitalize text-muted-foreground">
              {user.role.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={onLogout} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
