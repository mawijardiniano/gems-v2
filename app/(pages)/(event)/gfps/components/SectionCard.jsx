"use client";

import { SECTION_STYLES, getSectionData } from "../gfps-config";
import { OfficialRow, SECTION_ICONS } from "./ui";

function ExecutiveGroupedBody({ members }) {
  const chairs = members.filter((m) => m.role === "chair");
  const regulars = members.filter((m) => m.role !== "chair");

  return (
    <div className="space-y-4">
      {chairs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
            Chair
          </p>
          <div className="space-y-2.5">
            {chairs.map((m, i) => (
              <OfficialRow
                key={m.official_ref || m.official?._id || i}
                official={m.official}
                avatarBg="bg-blue-100"
                avatarText="text-blue-600"
              />
            ))}
          </div>
        </div>
      )}
      {regulars.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
            Members
          </p>
          <div className="space-y-2.5">
            {regulars.map((m, i) => (
              <OfficialRow
                key={m.official_ref || m.official?._id || i}
                official={m.official}
                avatarBg="bg-white"
                avatarText="text-gray-600"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FlatMembersBody({ members }) {
  return (
    <div className="space-y-2.5">
      {members.map((m, i) => (
        <OfficialRow
          key={m.official_ref || m.official?._id || i}
          official={m.official}
          avatarBg="bg-white"
          avatarText="text-gray-600"
        />
      ))}
    </div>
  );
}

export default function SectionCard({ sectionKey, label, gfps, canEdit, onEdit }) {
  const { members, chairData } = getSectionData(gfps, sectionKey);
  if (!chairData && members.length === 0) return null;

  const style = SECTION_STYLES[sectionKey] || SECTION_STYLES.executiveCommittee;
  const chairCount = members.filter((m) => m.role === "chair").length;

  return (
    <div
      className={`rounded-2xl border ${style.border} ${style.bg} overflow-hidden transition-all duration-200 hover:shadow-lg`}
    >
   
      <div className={`px-5 py-4 border-b border-white/50 ${style.headerBg} flex items-center justify-between`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg ${style.iconBg} ${style.iconColor} flex-shrink-0`}>
            {SECTION_ICONS[sectionKey]}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{label}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${style.badge} inline-block mt-0.5`}>
              {chairData
                ? "1 Member"
                : `${members.length} Member${members.length !== 1 ? "s" : ""}`}
              {sectionKey === "executiveCommittee" && (
                <> · {chairCount} Chair{chairCount !== 1 ? "s" : ""}</>
              )}
            </span>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => onEdit(sectionKey)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        )}
      </div>


      <div className="px-5 py-4 min-h-[100px]">
        {chairData ? (
          <OfficialRow
            official={chairData.official || chairData}
            avatarBg={style.avatarBg}
            avatarText={style.avatarText}
          />
        ) : sectionKey === "executiveCommittee" ? (
          <ExecutiveGroupedBody members={members} />
        ) : (
          <FlatMembersBody members={members} />
        )}
      </div>
    </div>
  );
}
