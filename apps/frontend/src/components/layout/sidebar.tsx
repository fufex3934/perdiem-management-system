'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { NavItem } from '@/lib/navigation';
import { cn } from '@/lib/utils';

interface SidebarNavProps {
  items: NavItem[];
  onNavigate?: () => void;
}

export function SidebarBrand() {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 px-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        P
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-none">Per Diem</p>
        <p className="truncate text-xs text-muted-foreground">Management</p>
      </div>
    </div>
  );
}

export function SidebarNav({ items, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

interface SidebarProps {
  items: NavItem[];
}

export function Sidebar({ items }: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-full flex-col border-r border-border/60 bg-card lg:flex">
      <SidebarBrand />
      <SidebarNav items={items} />
    </aside>
  );
}

interface MobileSidebarProps {
  items: NavItem[];
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ items, open, onClose }: MobileSidebarProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        onClick={onClose}
        aria-hidden
      />
      <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border/60 bg-card shadow-xl lg:hidden">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              P
            </div>
            <span className="truncate text-sm font-semibold">Per Diem</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close menu">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <SidebarNav items={items} onNavigate={onClose} />
      </aside>
    </>
  );
}
