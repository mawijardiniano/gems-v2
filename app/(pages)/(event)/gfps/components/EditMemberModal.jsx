"use client";

import CheckboxTree from "./CheckboxTree";
import { SECTIONS } from "../gfps-config";
import { findOfficialItem, normalizeGroupItems } from "../officials";

function ModalHeader({ editingSection, onClose }) {
  return (
    <div className="px-6 py-5 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={editingSection ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M12 4v16m8-8H4"} />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {editingSection ? "Edit Section" : "Add Member"}
            </h2>
            <p className="text-sm text-gray-500">
              {editingSection
                ? `Update members in ${SECTIONS.find((s) => s.key === editingSection)?.label}`
                : "Assign officials to a GFPS section"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function SectionSelect({ section, editingSection, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Section
      </label>
      <select
        name="section"
        value={section}
        onChange={(e) => {
          if (!editingSection) onChange(e.target.value);
        }}
        disabled={!!editingSection}
        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        {SECTIONS.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function AssignRoles({ officials, selectedOfficials, execRoles, onExecRolesChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Assign Roles
      </label>
      <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-48 overflow-y-auto">
        {selectedOfficials.map((key) => {
          const [group, id] = key.split(":");
          const item = findOfficialItem(
            normalizeGroupItems(officials[group]),
            id,
          );
          const label = item?.position || item?.college || item?.branch;
          const subLabel = item?.college || item?.branch;
          const firstName =
            item?.name?.personal_info_id?.personal?.first_name ||
            item?.first_name;
          const lastName =
            item?.name?.personal_info_id?.personal?.last_name ||
            item?.last_name;

          return (
            <div
              key={key}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {label}
                  {subLabel && (
                    <span className="text-gray-500 font-normal">
                      {" "}
                      — {subLabel}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {firstName} {lastName}
                </p>
              </div>
              <select
                value={execRoles[key] || "member"}
                onChange={(e) =>
                  onExecRolesChange((r) => ({
                    ...r,
                    [key]: e.target.value,
                  }))
                }
                className="ml-3 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="member">Member</option>
                <option value="chair">Chair</option>
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EditMemberModal({
  section,
  editingSection,
  officials,
  selectedOfficials,
  execRoles,
  submitting,
  onClose,
  onSectionChange,
  onSelectedChange,
  onExecRolesChange,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 p-4">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <ModalHeader editingSection={editingSection} onClose={onClose} />

        {/* Modal Body */}
        <div className="px-6 py-5 space-y-5">
          <SectionSelect
            section={section}
            editingSection={editingSection}
            onChange={onSectionChange}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Select Officials
            </label>
            <CheckboxTree
              officials={officials}
              selected={selectedOfficials}
              onChange={onSelectedChange}
            />
          </div>

          {section === "executiveCommittee" && selectedOfficials.length > 0 && (
            <AssignRoles
              officials={officials}
              selectedOfficials={selectedOfficials}
              execRoles={execRoles}
              onExecRolesChange={onExecRolesChange}
            />
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={selectedOfficials.length === 0 || submitting}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {submitting && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {submitting ? "Saving..." : editingSection ? "Save Changes" : "Add Members"}
          </button>
        </div>
      </form>
    </div>
  );
}
