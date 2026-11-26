"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { CloseIcon, SearchIcon, Spinner } from "@/components/icons";
import { cn } from "@/lib/cn";
import { buildHref } from "@/lib/url";

const DEBOUNCE_MS = 350;

interface LeadSearchProps {
  query: string;
  /** Other active filters to keep when the query changes. */
  base: Record<string, string | undefined>;
  /** List page to update (default: the lead list). */
  path?: string;
  /** Screen-reader label for the box. */
  label?: string;
}

/** Search-as-you-type. Results update in place; Enter searches immediately and closes the phone keyboard. */
export function LeadSearch({ query, base, path = "/leads", label = "Search leads by customer name or phone" }: LeadSearchProps) {
  const router = useRouter();
  const [value, setValue] = useState(query);
  const [syncedQuery, setSyncedQuery] = useState(query);
  const [lastPushed, setLastPushed] = useState(query);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // The URL changed from outside this box (e.g. "Clear"): adopt it, unless it is the echo of our own navigation.
  if (query !== syncedQuery) {
    setSyncedQuery(query);
    if (query !== lastPushed) {
      setValue(query);
      setLastPushed(query);
    }
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  function navigate(raw: string) {
    clearTimeout(timer.current);
    const q = raw.trim();
    if (q === lastPushed) return;
    setLastPushed(q);
    startTransition(() => {
      router.replace(buildHref(path, { ...base, q: q || undefined }), { scroll: false });
    });
  }

  return (
    <form
      role="search"
      className="relative min-w-0 flex-1"
      onSubmit={(e) => {
        e.preventDefault();
        navigate(value);
        inputRef.current?.blur();
      }}
    >
      <label htmlFor="lead-search" className="sr-only">
        {label}
      </label>
      <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
        {pending ? <Spinner width={20} height={20} /> : <SearchIcon width={20} height={20} />}
      </span>
      <input
        ref={inputRef}
        id="lead-search"
        type="search"
        name="q"
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => navigate(next), DEBOUNCE_MS);
        }}
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={50}
        placeholder="Name or phone"
        aria-busy={pending}
        className={cn(
          "min-h-12 w-full rounded-full border border-line bg-surface pl-12 text-base shadow-card placeholder:text-muted",
          // Room for the clear button only while there is text, so the placeholder fits next to the branch chip.
          value ? "pr-12" : "pr-4",
        )}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            navigate("");
            inputRef.current?.focus();
          }}
          className="press absolute right-0 top-0 inline-flex size-12 items-center justify-center rounded-full text-muted"
        >
          <CloseIcon width={20} height={20} />
        </button>
      ) : null}
    </form>
  );
}
