"use client";

export const SECTION_ICONS = {
  chairOrHeadOfAgency: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  executiveCommittee: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  technicalWorkingGroup: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  secretariat: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
};

export function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-1 gap-5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-100 rounded w-20" />
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-50 rounded w-1/2" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-50 rounded w-1/3" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ onAdd }) {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">No GFPS Members Yet</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        Get started by adding members to the Gender and Development Focal Point System.
      </p>
      {onAdd && (
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary-600 text-white rounded-xl hover:bg-secondary-700 transition-colors font-medium text-sm shadow-lg shadow-secondary-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Member
        </button>
      )}
    </div>
  );
}

/* Derives the initials to show in the avatar from the row's typed name.
   Deliberately never reads `position_title`: a seat like "Director, Research"
   would derive "DR", which reads as a person's initials rather than as an
   unfilled position. A vacant seat shows "?" instead.

   The name is read from `official_text` alone. Rows used to also carry split
   `first_name` / `last_name` parts, but every write path derived those from the
   same typed text, so preferring them changed nothing while making the avatar
   depend on fields no display path used. */
function initialsFor(member) {
  const words = String(member?.official_text || "")
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "";
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : ""))
    .toUpperCase();
}

/**
 * One member line on a GFPS card.
 *
 * A row carries two independent facts: the seat (`position_title`, fixed by the
 * memorandum) and the person (`official_text`, typed by hand). Either may be
 * absent, and both states are normal — a seat is seeded before its appointment
 * exists, and a hand-added member may have no formal seat at all.
 *
 * So the line shows the person when there is one and the seat beneath it; when
 * nobody is appointed yet the seat becomes the headline, marked Vacant, which
 * is how the chart stays faithful to the memo rather than looking empty.
 */
export function OfficialRow({ member, avatarBg, avatarText }) {
  const m = member || {};
  const name = String(m.official_text || "").trim();
  const position = String(m.position_title || "").trim();
  const initials = initialsFor(m);

  /* Displaying "Vacant" rather than "Unnamed member" is the point of the seat
     model: the position provably exists, the appointment has not been made. */
  const vacant = Boolean(m.vacant) || (!name && Boolean(position));
  const headline = name || position || "Unnamed member";

  return (
    <div className="flex items-center gap-3">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center`}>
        <span className={`text-xs font-semibold ${avatarText}`}>
          {initials || "?"}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-700 truncate">{headline}</p>
          {/* A manual row is a typed name, not a live roster seat. Said plainly
              rather than hidden, so an unlinked member is not mistaken for a
              broken link. `manual` is derived on read (lib/gfpsServer.js) — every
              GFPS row is typed by hand now, so it is never stored. */}
          {m.manual && (
            <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
              Manual
            </span>
          )}
          {vacant && (
            <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary-100 text-secondary-700">
              Vacant
            </span>
          )}
        </div>
        {/* The seat is shown beneath the name whenever both are known, so the
            memo's structure stays visible next to the appointee. */}
        {name && position && (
          <p className="text-xs text-gray-500 truncate">{position}</p>
        )}
        {m.role === "chair" && (
          <p className="text-xs text-gray-400 truncate">Chair</p>
        )}
      </div>
    </div>
  );
}
