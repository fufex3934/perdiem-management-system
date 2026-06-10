'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { NavItem } from '@/lib/navigation';
import { cn } from '@/lib/utils';

interface CommandSearchProps {
  items: NavItem[];
}

export function CommandSearch({ items }: CommandSearchProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery('');
      router.push(href);
    },
    [router],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      navigate(results[activeIndex].href);
    }
  }

  return (
    <>
      <div className="flex w-full max-w-md items-center">
        <div className="relative hidden w-full md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            readOnly
            placeholder="Search pages…"
            className="h-9 w-full cursor-pointer border-transparent bg-muted/50 pl-9 pr-14 focus-visible:bg-background"
            onClick={() => setOpen(true)}
            onFocus={() => setOpen(true)}
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
            ⌘K
          </kbd>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen(true)}
          aria-label="Search pages"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <DialogContent className="max-w-lg gap-0 overflow-hidden p-0" hideClose>
            <DialogHeader className="border-b border-border/60 px-4 py-4 pr-4">
              <DialogTitle className="sr-only">Search</DialogTitle>
              <DialogDescription className="sr-only">
                Jump to a page in your workspace
              </DialogDescription>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages…"
                  className="h-10 border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
                />
              </div>
            </DialogHeader>

            <div className="max-h-72 overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No pages match &ldquo;{query}&rdquo;
                </p>
              ) : (
                <ul role="listbox">
                  {results.map((item, index) => {
                    const Icon = item.icon;
                    const active = index === activeIndex;
                    return (
                      <li key={item.href} role="option" aria-selected={active}>
                        <button
                          type="button"
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                            active ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                          )}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => navigate(item.href)}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
