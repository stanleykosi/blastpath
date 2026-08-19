type IconName =
  | "shield"
  | "database"
  | "alert"
  | "check"
  | "clock"
  | "arrow"
  | "chevron"
  | "refresh"
  | "copy"
  | "play"
  | "x"
  | "menu";

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "shield")
    return (
      <svg {...common}>
        <path d="M12 3 20 6v5c0 5.1-3.4 8.8-8 10-4.6-1.2-8-4.9-8-10V6l8-3Z" />
        <path d="m8.8 12 2.1 2.1 4.4-4.5" />
      </svg>
    );
  if (name === "database")
    return (
      <svg {...common}>
        <ellipse cx="12" cy="5" rx="7" ry="3" />
        <path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
        <path d="M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" />
      </svg>
    );
  if (name === "alert")
    return (
      <svg {...common}>
        <path d="m12 3 9 17H3L12 3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    );
  if (name === "check")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m8.5 12.2 2.3 2.3 4.8-5" />
      </svg>
    );
  if (name === "clock")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  if (name === "arrow")
    return (
      <svg {...common}>
        <path d="M5 12h13" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    );
  if (name === "chevron")
    return (
      <svg {...common}>
        <path d="m8 10 4 4 4-4" />
      </svg>
    );
  if (name === "refresh")
    return (
      <svg {...common}>
        <path d="M20 11a8 8 0 0 0-14.8-3L3 10" />
        <path d="M3 5v5h5" />
        <path d="M4 13a8 8 0 0 0 14.8 3L21 14" />
        <path d="M21 19v-5h-5" />
      </svg>
    );
  if (name === "copy")
    return (
      <svg {...common}>
        <rect x="8" y="8" width="10" height="11" rx="1" />
        <path d="M16 8V5H6a1 1 0 0 0-1 1v10h3" />
      </svg>
    );
  if (name === "play")
    return (
      <svg {...common}>
        <path d="m9 6 9 6-9 6V6Z" />
      </svg>
    );
  if (name === "x")
    return (
      <svg {...common}>
        <path d="m7 7 10 10M17 7 7 17" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
