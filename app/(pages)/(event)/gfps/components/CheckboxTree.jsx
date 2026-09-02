"use client";

import React, { useMemo, useState } from "react";
import { OFFICIAL_GROUPS_ORDER } from "../gfps-config";
import { normalizeGroupItems, officialItemKey } from "../officials";

const getItemLabel = (section, item, id) => {
  const firstName = item?.name?.personal_info_id?.first_name;
  const email = item?.name?.email;

  switch (section) {
    case "campusDirectors":
      return item?.branch || item?.position || firstName || email || id;
    case "collegeDeans":
      return item?.college || item?.position || firstName || email || id;
    case "associateDeans":
      return (
        item?.college || item?.branch || item?.position || firstName || email || id
      );
    default:
      return (
        item?.position || firstName || email || item?.branch || item?.college || id
      );
  }
};

const sectionTitle = (section) =>
  section
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());

export default function CheckboxTree({ officials, selected, onChange }) {
  const [expanded, setExpanded] = useState({});

  const selectedSet = useMemo(() => new Set(selected || []), [selected]);

  const toggleSection = (section) =>
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));

  const handleSectionCheck = (section, checked) => {
    const allKeys = normalizeGroupItems(officials[section]).map((item) =>
      officialItemKey(section, item),
    );
    if (checked) {
      onChange((prev) => [...new Set([...prev, ...allKeys])]);
      setExpanded((prev) => ({ ...prev, [section]: true }));
    } else {
      onChange((prev) => prev.filter((id) => !allKeys.includes(id)));
    }
  };

  const handleItemCheck = (section, id, checked) => {
    const key = `${section}:${id}`;
    onChange((prev) =>
      checked
        ? [...new Set([...prev, key])]
        : prev.filter((sid) => sid !== key),
    );
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white divide-y divide-gray-100 max-h-64 overflow-y-auto">
      {OFFICIAL_GROUPS_ORDER.map((section) => {
        const items = normalizeGroupItems(officials[section]);
        if (items.length === 0) return null;

        const sectionChecked = items.every((item) =>
          selectedSet.has(officialItemKey(section, item)),
        );
        const sectionSomeChecked = items.some((item) =>
          selectedSet.has(officialItemKey(section, item)),
        );

        return (
          <div key={section} className="hover:bg-gray-50 transition-colors">
            <div className="flex items-center px-3 py-2.5">
              <button
                type="button"
                className="mr-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                onClick={() => toggleSection(section)}
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded[section] ? "rotate-90" : ""}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={sectionChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = sectionSomeChecked && !sectionChecked;
                  }}
                  onChange={(e) => handleSectionCheck(section, e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>
              <span
                className="ml-2.5 text-sm font-medium text-gray-700 cursor-pointer select-none"
                onClick={() => toggleSection(section)}
              >
                {sectionTitle(section)}
              </span>
              <span className="ml-auto text-xs text-gray-400">
                {items.length}
              </span>
            </div>
            {expanded[section] && (
              <div className="ml-7 pb-1.5 space-y-0.5 border-l-2 border-gray-100 ml-4 pl-4">
                {items.map((item) => {
                  const id = item._id || item.name?._id || item.name;
                  const key = `${section}:${id}`;
                  return (
                    <label
                      key={key}
                      className="flex items-center py-1.5 px-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSet.has(key)}
                        onChange={(e) =>
                          handleItemCheck(section, id, e.target.checked)
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="ml-2.5 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                        {getItemLabel(section, item, id)}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
