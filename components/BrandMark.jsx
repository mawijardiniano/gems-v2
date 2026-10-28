"use client";

import { useState } from "react";

/**
 * GEMS brand mark.
 *
 * The artwork on /brand/gems-mark.svg is white line-art, so it is always drawn
 * on a purple tile (`variant="tile"`) or straight onto a dark surface
 * (`variant="plain"`). On white backgrounds use "tile" — a bare white mark
 * would be invisible there.
 *
 * If the SVG fails to load, an inline copy of the geometry is drawn instead, so
 * a missing asset never leaves a broken image in the navbar.
 */

const RATIO = 100 / 132; // width / height of the artwork's viewBox

const FACET_STROKE = "rgba(255,255,255,0.9)";

function FallbackMark() {
  return (
    <svg
      viewBox="0 0 100 132"
      fill="none"
      aria-hidden="true"
      className="h-full w-auto"
    >
      <path
        d="M50 3 L61 18 L72 32 L81 56 L84 80 L78 103 L61 119 L50 126 L39 119 L22 103 L16 80 L19 56 L28 32 L39 18 Z"
        stroke={FACET_STROKE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M50 3 L43 33 L57 33 Z M43 33 L39 18 L28 32 L25 33 Z M57 33 L61 18 L72 32 L75 33 Z"
        stroke={FACET_STROKE}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeOpacity="0.85"
      />
      <path
        d="M25 33 L19 56 L14 44 Z M19 56 L16 80 L10 66 Z M16 80 L22 103 L9 92 Z M75 33 L81 56 L86 44 Z M81 56 L84 80 L90 66 Z M84 80 L78 103 L91 92 Z"
        stroke={FACET_STROKE}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeOpacity="0.8"
      />
      <path
        d="M43 33 L57 33 L58 96 L42 96 Z M43 33 L19 56 L42 96 Z M57 33 L81 56 L58 96 Z"
        stroke={FACET_STROKE}
        strokeWidth="2.3"
        strokeOpacity="0.8"
      />
      <path
        d="M22 103 L39 119 L50 126 L42 96 Z M78 103 L61 119 L50 126 L58 96 Z M42 96 L58 96 L50 126 Z"
        stroke={FACET_STROKE}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeOpacity="0.85"
      />
    </svg>
  );
}

export default function BrandMark({
  size = 32,
  variant = "tile",
  className = "",
  title = "GEMS",
}) {
  const [failed, setFailed] = useState(false);

  const glyph = (
    <span
      className="flex h-full w-full items-center justify-center"
      style={{ padding: variant === "tile" ? size * 0.18 : 0 }}
    >
      {failed ? (
        <FallbackMark />
      ) : (
        <img
          src="/brand/gems-mark.svg"
          alt=""
          aria-hidden="true"
          className="h-full w-auto object-contain"
          draggable={false}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );

  if (variant === "plain") {
    return (
      <span
        role="img"
        aria-label={title}
        className={`inline-flex shrink-0 items-center justify-center ${className}`}
        style={{ width: Math.round(size * RATIO), height: size }}
      >
        {glyph}
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={title}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-secondary-600 shadow-sm ring-1 ring-white/15 ${className}`}
      style={{ width: size, height: size }}
    >
      {glyph}
    </span>
  );
}

