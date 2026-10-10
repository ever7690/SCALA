import type { IconId, Mood } from './content.ts';

const paths: Record<IconId, string> = {
  home: '<path fill="#ffb74a" d="M16 30 32 15l16 15v21H16Z"/><path fill="#ee774f" d="m10 31 22-20 22 20-5 5-17-15-17 15Z"/><rect x="27" y="36" width="11" height="15" rx="3" fill="#fff3c8"/>',
  heart: '<path fill="#f28e89" d="M32 51S11 38 11 25c0-14 16-19 21-6 5-13 21-8 21 6 0 13-21 26-21 26Z"/><path d="M19 27c0-4 2-6 5-6" fill="none" stroke="#fff6e7" stroke-width="4" stroke-linecap="round"/>',
  story: '<path fill="#f4bf54" d="M10 16q11-4 22 3 11-7 22-3v33q-11-4-22 3-11-7-22-3Z"/><path d="M32 19v33" stroke="#a76830" stroke-width="3"/><path d="M17 26h9m-9 7h9m12-7h9m-9 7h9" stroke="#fff9dd" stroke-width="3" stroke-linecap="round"/>',
  help: '<path fill="#b5d483" d="M32 9 51 17v17c0 13-19 21-19 21S13 47 13 34V17Z"/><path d="M22 31h20m-10-10v20" stroke="#fff9e6" stroke-width="7" stroke-linecap="round"/>',
  path: '<path d="M14 52c0-14 34-10 34-24 0-10-21-5-21-14" fill="none" stroke="#b998da" stroke-width="11" stroke-linecap="round"/><path d="M14 52c0-14 34-10 34-24 0-10-21-5-21-14" fill="none" stroke="#fff9e9" stroke-width="2.5" stroke-dasharray="4 6"/><circle cx="27" cy="13" r="6" fill="#edb94f"/>',
  family: '<circle cx="23" cy="22" r="9" fill="#f3ba76"/><circle cx="43" cy="27" r="8" fill="#f7cc91"/><path d="M10 49v-5c0-15 26-15 26 0v5Z" fill="#b794d1"/><path d="M31 51v-5c0-13 24-13 24 0v5Z" fill="#84bda1"/>',
  gear: '<path fill="#b19bcf" d="m27 10 10 0 2 7 7-1 6 8-4 6 4 6-6 8-7-1-2 7H27l-2-7-7 1-6-8 4-6-4-6 6-8 7 1Z"/><circle cx="32" cy="30" r="10" fill="#fff1d5"/><circle cx="32" cy="30" r="5" fill="#dbb854"/>',
  voice: '<path fill="#e6b552" d="M13 25h9l14-12v38L22 39h-9Z"/><path d="M44 22q9 10 0 20m7-27q14 17 0 34" stroke="#9cb878" stroke-width="4" fill="none" stroke-linecap="round"/>',
  leaf: '<path fill="#93bc75" d="M49 12C13 11 9 34 20 46c12 11 34 1 29-34Z"/><path d="M15 52 39 25m-10 10V23m-1 15h13" stroke="#fff7d8" stroke-width="3" fill="none" stroke-linecap="round"/>',
  back: '<path d="m36 14-17 18 17 18M20 32h29" stroke="#aa744d" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  play: '<path fill="#8fb769" d="M23 13v38l28-19Z"/>',
  check: '<path d="m14 33 12 13 25-29" stroke="#6c9b58" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  lock: '<rect x="16" y="28" width="32" height="26" rx="7" fill="#efbc5d"/><path d="M23 28v-8a9 9 0 0 1 18 0v8" stroke="#b98c54" stroke-width="6" fill="none"/><circle cx="32" cy="39" r="4" fill="#886037"/><path d="M32 40v6" stroke="#886037" stroke-width="3"/>',
  sun: '<g stroke="#edb544" stroke-width="5" stroke-linecap="round"><path d="M32 6v6m0 40v6M6 32h6m40 0h6M14 14l4 4m28 28 4 4m0-36-4 4M18 46l-4 4"/></g><circle cx="32" cy="32" r="15" fill="#ffce60"/><path d="M24 35q8 9 16 0" stroke="#9b713e" stroke-width="2.5" fill="none"/><circle cx="26" cy="28" r="2" fill="#7a5639"/><circle cx="38" cy="28" r="2" fill="#7a5639"/>',
};

export function icon(id: IconId, cls = ''): string {
  return `<span class="toy-icon ${cls}" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false">${paths[id]}</svg></span>`;
}
export function face(mood: Mood): string {
  const mouth = mood === 'alegre' ? '<path d="M19 35q13 17 26 0Z" fill="#986243"/><path d="M23 37h18" stroke="#fff9e6" stroke-width="4"/>' : mood === 'triste' ? '<path d="M22 43q10-12 20 0"/>' : mood === 'preocupado' ? '<ellipse cx="32" cy="40" rx="5" ry="6"/>' : mood === 'enojado' ? '<path d="M23 42h18M19 20l9 4m17-4-9 4"/>' : '<path d="M23 38q9 7 18 0M19 26l7 1m12 0 7-1"/>';
  return `<svg class="mood-face" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="28" fill="#fff1c1" stroke="#e8b85d" stroke-width="2"/><circle cx="22" cy="29" r="2.8" fill="#664632"/><circle cx="42" cy="29" r="2.8" fill="#664632"/><g fill="none" stroke="#8a593c" stroke-width="2.5" stroke-linecap="round">${mouth}</g><ellipse cx="16" cy="35" rx="4" ry="2" fill="#eaa580" opacity=".6"/><ellipse cx="48" cy="35" rx="4" ry="2" fill="#eaa580" opacity=".6"/></svg>`;
}
