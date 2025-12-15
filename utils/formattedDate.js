import React from "react";

export default function FormattedDate({ date, format = "long" }) {
    if (!date) return <span>-</span>;

    const d = new Date(date);

    const options =
        format === "short"
            ? { year: "numeric", month: "2-digit", day: "2-digit" }
            : { year: "numeric", month: "long", day: "numeric" };

    return <span>{d.toLocaleDateString(undefined, options)}</span>;
}
