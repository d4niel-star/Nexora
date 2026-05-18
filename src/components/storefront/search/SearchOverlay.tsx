"use client";

// ─── Storefront Search Overlay ───────────────────────────────────────────
// Cmd/Ctrl+K or click search icon. Debounced, keyboard-navigable, mobile-optimized.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { storePath } from "@/lib/store-engine/urls";

interface SearchResult {
  id: string;
  handle: string;
  title: string;
  category: string | null;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  inStock: boolean;
}

interface SearchOverlayProps {
  storeSlug: string;
  currency: string;
  locale: string;
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ storeSlug, currency, locale, open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const formatPrice = useCallback(
    (price: number) =>
      new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(price),
    [locale, currency],
  );

  // Focus on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Global keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (!open) {
          // Parent manages open state via onClose toggle
        }
      }
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`/api/storefront/${storeSlug}/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResults(data.results ?? []);
        setActiveIndex(0);
      } catch {
        // Aborted or error — ignore
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query, storeSlug]);

  // Keyboard nav
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-search-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[999] bg-ink-0/40 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
      <div className="fixed inset-x-0 top-0 z-[1000] sm:inset-x-auto sm:left-1/2 sm:top-[10%] sm:w-[520px] sm:max-w-[92vw] sm:-translate-x-1/2">
        <div className="flex h-full max-h-[85vh] flex-col bg-[var(--surface-0)] shadow-[var(--shadow-overlay)] sm:rounded-[var(--r-lg)] sm:border sm:border-[color:var(--hairline)] sm:max-h-[480px]">
          {/* Input */}
          <div className="flex items-center gap-3 border-b border-[color:var(--hairline)] px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-ink-5" strokeWidth={1.75} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar productos..."
              className="flex-1 bg-transparent text-[14px] text-ink-0 placeholder:text-ink-6 outline-none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-ink-5" />}
            <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] text-ink-5 hover:bg-ink-11 hover:text-ink-0 sm:hidden" aria-label="Cerrar">
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <kbd className="hidden sm:inline-flex items-center rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-1.5 py-0.5 text-[10px] font-medium text-ink-5">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="flex-1 overflow-y-auto">
            {query.trim().length >= 2 && !loading && results.length === 0 && (
              <div className="px-4 py-10 text-center">
                <p className="text-[13px] font-medium text-ink-3">Sin resultados para &ldquo;{query}&rdquo;</p>
                <p className="mt-1 text-[12px] text-ink-5">Probá con otro término de búsqueda.</p>
              </div>
            )}
            {results.length > 0 && (
              <ul className="py-1.5">
                {results.map((r, i) => (
                  <li key={r.id}>
                    <Link
                      href={storePath(storeSlug, `products/${r.handle}`)}
                      data-search-idx={i}
                      onClick={onClose}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 transition-colors",
                        i === activeIndex ? "bg-[var(--surface-1)]" : "hover:bg-[var(--surface-1)]",
                      )}
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
                        {r.image ? (
                          <img src={r.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-ink-6 text-[10px]">—</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-ink-0 truncate">{highlightMatch(r.title, query)}</p>
                        {r.category && <p className="text-[11px] text-ink-5">{r.category}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-semibold tabular-nums text-ink-0">{formatPrice(r.price)}</p>
                        {r.compareAtPrice && r.compareAtPrice > r.price && (
                          <p className="text-[11px] text-ink-5 line-through tabular-nums">{formatPrice(r.compareAtPrice)}</p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {query.trim().length >= 2 && results.length > 0 && (
            <div className="border-t border-[color:var(--hairline)] px-4 py-2 text-center">
              <Link
                href={storePath(storeSlug, `products?q=${encodeURIComponent(query.trim())}`)}
                onClick={onClose}
                className="text-[11px] font-medium text-ink-3 hover:text-ink-0 transition-colors"
              >
                Ver todos los resultados →
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[color:var(--signal-warning)]/20 text-ink-0 rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}
