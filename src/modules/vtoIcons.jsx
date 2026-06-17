// VTO icon set — 18x18 line icons, ported from the Claude Design prototype.
import React from 'react';

const ICONS = {
  values:   <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>,
  focus:    <g><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></g>,
  marketing:<g><path d="M3 11v3a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Z"/><path d="M14 8.5a4 4 0 0 1 0 7"/><path d="M17 5.5a8 8 0 0 1 0 13"/></g>,
  current:  <g><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></g>,
  oneYear:  <g><path d="M4 21V4l8 3 8-3v12l-8 3-8-3Z"/><path d="M4 4l8 3v14"/></g>,
  issues:   <g><path d="M3 5h18"/><path d="M3 12h18"/><path d="M3 19h12"/></g>,
  rocks:    <g><path d="M3 18l5-9 4 5 3-4 6 8H3Z"/><circle cx="8" cy="6.5" r="1.6"/></g>,
  twoYear:  <g><path d="M5 19c4 0 4-7 8-7s4 7 6 7"/><path d="M5 9c4 0 4-4 7-4"/><circle cx="19" cy="5" r="1.6"/></g>,
  threeYear:<g><circle cx="7" cy="14" r="3.2"/><circle cx="17" cy="14" r="3.2"/><path d="M7 10.8V8l4-2 2 1.2"/><path d="M10.2 14h3.6"/></g>,
  fiveYear: <g><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/></g>,
  tenYear:  <g><path d="m3 21 4-4"/><path d="M9 15 18.5 5.5a2.1 2.1 0 0 0-3-3L6 12l1.5 1.5L9 15Z"/><path d="M14 6l4 4"/><path d="m17 3 .8 1.6L19.5 5l-1.4 1L18 7.8 16.7 6.6 15 7l.9-1.6L15 4l1.6.2L17 3Z" fill="currentColor" stroke="none"/></g>,
};

export function VTOIcon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}