export type LineIconName =
  | "arrow-right"
  | "book"
  | "check"
  | "chevron-right"
  | "close"
  | "cycle"
  | "eye"
  | "eye-off"
  | "file-check"
  | "file-upload"
  | "folder"
  | "menu"
  | "operations"
  | "person"
  | "policy"
  | "shield"
  | "sparkle";

export function LineIcon({ name, className = "h-5 w-5" }: { name: LineIconName; className?: string }) {
  const paths: Record<LineIconName, React.ReactNode> = {
    "arrow-right": <path d="M5 12h14m-5-5 5 5-5 5" />,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" /><path d="m15.5 10 1.2 1.2L19 8.8" /></>,
    check: <path d="m6.5 12.5 3.2 3.2 7.8-8" />,
    "chevron-right": <path d="m9 18 6-6-6-6" />,
    close: <path d="M18 6 6 18M6 6l12 12" />,
    cycle: <><path d="M20 7h-5V2" /><path d="M20 7a8 8 0 0 0-13.7-2.2M4 17h5v5" /><path d="M4 17a8 8 0 0 0 13.7 2.2" /></>,
    eye: <><path d="M2.5 12s3.4-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.4 5.5-9.5 5.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
    "eye-off": <><path d="m3 3 18 18M10.6 6.7c.5-.1.9-.2 1.4-.2 6.1 0 9.5 5.5 9.5 5.5a16 16 0 0 1-2.1 2.7M6.2 6.2C3.8 8 2.5 12 2.5 12s3.4 5.5 9.5 5.5c1.2 0 2.3-.2 3.3-.6" /></>,
    "file-check": <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8M14 2v6h6v4" /><path d="m15 18 2 2 4-5" /></>,
    "file-upload": <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M12 18v-6m-3 3 3-3 3 3" /></>,
    folder: <path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Z" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    operations: <><path d="M4 21h16M6 18V9h3v9M11 18V4h3v14M16 18v-6h3v6" /></>,
    person: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    policy: <><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    shield: <><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    sparkle: <><path d="m12 3-1.7 5.3L5 10l5.3 1.7L12 17l1.7-5.3L19 10l-5.3-1.7L12 3Z" /><path d="M5 3v3M3.5 4.5h3M19 17v4M17 19h4" /></>,
  };

  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
