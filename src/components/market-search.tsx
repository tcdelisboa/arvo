"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { SearchHit } from "@/lib/market/types";
import { cx, fieldClass } from "./ui";
import { useI18n } from "./i18n";

/** Search any share or fund by name or ticker, with keyboard support. */
export function MarketSearch() {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/markets/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const json = (await response.json()) as { hits?: SearchHit[] };
        setHits(json.hits ?? []);
        setActive(0);
      } catch {
        // Aborted or offline: keep the previous results.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const go = (symbol: string) => {
    setOpen(false);
    router.push(`/markets/${encodeURIComponent(symbol)}`);
  };

  const showList = open && query.trim().length >= 2;

  return (
    <div ref={box} className="relative">
      <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
      <input
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={t("Search shares and funds")}
        placeholder={t("Search any company, fund or ticker")}
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          setOpen(true);
          const searchable = value.trim().length >= 2;
          setLoading(searchable);
          if (!searchable) setHits([]);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(hits.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter" && hits[active]) {
            e.preventDefault();
            go(hits[active].symbol);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={cx(fieldClass, "block h-[52px] w-full pl-11 pr-4 text-base")}
      />
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[58px] z-20 max-h-[340px] overflow-auto rounded-control border border-line bg-raised py-1.5 shadow-[0_12px_40px_rgb(14_33_29/0.14)]"
        >
          {hits.length ? (
            hits.map((hit, index) => (
              <li key={hit.symbol} role="option" aria-selected={index === active}>
                <button
                  type="button"
                  onPointerEnter={() => setActive(index)}
                  onClick={() => go(hit.symbol)}
                  className={cx("flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left", index === active && "bg-sunken")}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14.5px] text-ink">{hit.name}</span>
                    <span className="text-[12.5px] text-ink-3">
                      {hit.type === "etf" ? t("Fund") : t("Share")}
                      {hit.exchange ? `, ${hit.exchange}` : ""}
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-[13px] font-medium text-ink-2">{hit.symbol}</span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-[14px] text-ink-3">{loading ? t("Searching") : t("Nothing found for “{query}”.", { query: query.trim() })}</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
