"use client";

import { useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";

/**
 * A name field that also searches employees.
 *
 * Typing sets the name directly (a manual entry); after a short pause the text
 * is also sent to the server-side person search, and picking a result fills in
 * that employee's real name and hands the result (name, office, sex,
 * gemsPublicId) to `onPick`. What the caller keeps from the pick is its call:
 * University Officials stores a profile link, GFPS copies only name and sex.
 *
 * The search runs on the server (/api/university-officials/person-search):
 * editors only, employees only, at most 10 rows, name/office/sex only. Names
 * are matched through an encrypted index of whole words, so the hint asks for
 * a full first or last name — "maria" finds Maria, "mar" does not.
 *
 * `inline` renders the results in the flow instead of as a floating list, for
 * callers inside a scrolling container that would clip an absolute dropdown.
 */
const PERSON_SEARCH_DELAY_MS = 300;

export default function PersonSearchField({
  value,
  onChange,
  onPick,
  autoFocus,
  placeholder = "Search an employee, or type a name...",
  inputClassName = "w-full pl-9 pr-3 py-2.5 text-sm border border-line rounded-lg focus:ring-2 focus:ring-secondary-100 focus:border-secondary-500 outline-none transition",
  inline = false,
}) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  /* The dropdown opens only once the editor has typed in this field. Edit
     opens with the field focused and pre-filled, and opening on that focus
     covered the rest of the form before anything was asked for. */
  const [typed, setTyped] = useState(false);

  const term = query.trim();
  const searchable =
    term.length > 0 && term.split(/\s+/).every((word) => word.length >= 2);

  useEffect(() => {
    if (!showDropdown || !searchable) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    /* Show "Searching..." from the first keystroke, not after the debounce:
       otherwise the list flashed "No employee found" for the 300 ms before
       the request was even sent. */
    setSearching(true);
    setSearchError("");
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/university-officials/person-search?q=${encodeURIComponent(term)}`,
          { signal: controller.signal },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          setResults([]);
          setSearchError(data.error || "Search failed");
          return;
        }
        setResults(Array.isArray(data.data) ? data.data : []);
      } catch (err) {
        if (err?.name !== "AbortError") setSearchError("Network error");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, PERSON_SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, searchable, showDropdown]);

  const pick = (name) => {
    setQuery(name);
    onChange(name);
    setShowDropdown(false);
  };

  const listClass = inline
    ? "w-full bg-white border border-line rounded-lg mt-1 max-h-48 overflow-y-auto"
    : "absolute z-20 w-full bg-white border border-line rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto";

  return (
    <div className="relative">
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
        <input
          type="text"
          className={inputClassName}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setTyped(true);
            setShowDropdown(true);
          }}
          onFocus={() => typed && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          autoComplete="off"
          autoFocus={autoFocus}
        />
      </div>
      {showDropdown && term && (
        <div className={listClass}>
          {searching && (
            <div className="px-3 py-2 text-sm text-fg-muted">Searching...</div>
          )}
          {!searching && searchError && (
            <div className="px-3 py-2 text-sm text-danger">{searchError}</div>
          )}
          {!searching &&
            results.map((r) => (
              <button
                key={r.gemsPublicId || r.name}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-50 transition flex items-center gap-2 text-fg-3"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  pick(r.name);
                  onPick?.(r);
                }}
              >
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-fg-4 shrink-0">
                  {(r.name[0] || "?").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.name}</p>
                  {r.office && (
                    <p className="text-xs text-fg-muted truncate">{r.office}</p>
                  )}
                </div>
              </button>
            ))}
          {!searching && !searchError && !results.length && (
            <div className="px-3 py-2 text-xs text-fg-muted">
              {searchable
                ? "No employee found. Type a full first or last name, e.g. maria or santos."
                : "Type a full first or last name to search employees."}
            </div>
          )}
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-secondary-50 transition border-t border-line-subtle"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(term)}
          >
            Use &quot;{term}&quot; as typed
          </button>
        </div>
      )}
    </div>
  );
}
