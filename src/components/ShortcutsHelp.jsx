import { useState, useCallback, memo, useEffect } from 'react';
import { SHORTCUTS } from '../hooks/useKeyboardShortcuts';

// ─── Helpers ────────────────────────────────────────────

/** Build a human-readable key label like "Ctrl + Z" from a shortcut entry. */
function keyLabel(shortcut) {
  const parts = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  // Prettier display for some special keys
  const display =
    shortcut.key === ' '
      ? 'Espace'
      : shortcut.key.length === 1
        ? shortcut.key.toUpperCase()
        : shortcut.key;
  parts.push(display);
  return parts;
}

/**
 * Deduplicate shortcuts that share the same description
 * (e.g. Ctrl+Y and Ctrl+Shift+Z both do "Rétablir").
 * Keeps only the first occurrence.
 */
function uniqueShortcuts() {
  const seen = new Set();
  return SHORTCUTS.filter((s) => {
    if (seen.has(s.description)) return false;
    seen.add(s.description);
    return true;
  });
}

// ─── Component ──────────────────────────────────────────

const ShortcutsHelp = () => {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, close]);

  const shortcuts = uniqueShortcuts();

  return (
    <>
      {/* ── Floating trigger button (bottom-left) ──── */}
      <button
        onClick={toggle}
        className="shortcuts-help-btn absolute bottom-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-white/95 backdrop-blur-sm text-gray-500 hover:text-indigo-600 border border-gray-200 shadow-md hover:shadow-lg transition-all select-none"
        title="Raccourcis clavier"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z"
          />
        </svg>
        Raccourcis
      </button>

      {/* ── Modal overlay ──────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 overflow-hidden animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z"
                  />
                </svg>
                <h2 className="text-lg font-bold text-gray-800">Raccourcis clavier</h2>
              </div>
              <button
                onClick={close}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Shortcuts list */}
            <div className="px-6 py-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {shortcuts.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-700">{s.description}</span>
                  <div className="flex items-center gap-1">
                    {keyLabel(s).map((part, j) => (
                      <span key={j}>
                        {j > 0 && <span className="text-gray-300 text-xs mx-0.5">+</span>}
                        <kbd className="inline-flex items-center justify-center min-w-[1.75rem] px-1.5 py-0.5 text-xs font-mono font-semibold text-gray-600 bg-gray-100 border border-gray-300 rounded-md shadow-sm">
                          {part}
                        </kbd>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer hint */}
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-[11px] text-gray-400 text-center">
                Les raccourcis sont désactivés quand un champ texte est actif.
                Appuie sur <kbd className="px-1 py-0.5 text-[10px] bg-gray-100 border border-gray-300 rounded">Échap</kbd> pour fermer.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default memo(ShortcutsHelp);
