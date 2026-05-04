import React from 'react'

const IconsClassic = {
  stats: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3v18h18" />
      <path d="M7 16v-4" />
      <path d="M11 16v-8" />
      <path d="M15 16v-6" />
      <path d="M19 16v-10" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  ),
  library: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 19h16M4 15h16M4 11h16M4 7h16M6 3v4M10 3v4M14 3v4M18 3v4" />
    </svg>
  ),
  ritual: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  view: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  tune: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 6h16M6 12h12M8 18h8" />
      <circle cx="8" cy="6" r="2" />
      <circle cx="14" cy="12" r="2" />
      <circle cx="16" cy="18" r="2" />
    </svg>
  ),
}

const IconsSciFi = {
  stats: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M4 18V6M4 18H20" />
      <path d="M8 14V9M12 16V7M16 12V5" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M12 4v16M4 12h16" />
      <rect x="3" y="3" width="18" height="18" rx="3" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M5 5h12a2 2 0 012 2v12H7a2 2 0 01-2-2z" />
      <path d="M7 5v14" />
      <path d="M10 9h7M10 13h7" />
    </svg>
  ),
  library: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M4 19h16" />
      <path d="M6 5h12v12H6z" />
      <path d="M8 5v12M12 5v12M16 5v12" />
    </svg>
  ),
  view: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M3.5 12c2.5-4 6-6 8.5-6s6 2 8.5 6c-2.5 4-6 6-8.5 6s-6-2-8.5-6Z" />
      <path d="M12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5Z" />
    </svg>
  ),
  tune: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M4 7h16M4 12h16M4 17h16" />
      <rect x="6" y="5" width="4" height="4" rx="1" />
      <rect x="13" y="10" width="4" height="4" rx="1" />
      <rect x="9" y="15" width="4" height="4" rx="1" />
    </svg>
  ),
  ritual: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
}

export function getIconSet(theme) {
  return theme === 'scifi' ? IconsSciFi : IconsClassic
}

export { IconsClassic, IconsSciFi }
