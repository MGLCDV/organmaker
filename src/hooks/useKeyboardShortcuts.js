import { useEffect } from 'react';
import useFlowStore from '../store/useFlowStore';

// ─────────────────────────────────────────────────────────
// RACCOURCIS CLAVIER
// ─────────────────────────────────────────────────────────
//
// Pour ajouter un raccourci, ajoute simplement une entrée
// dans le tableau SHORTCUTS ci-dessous :
//
//   {
//     key:         La touche (valeur de e.key)
//     ctrl:        true si Ctrl/Cmd requis (défaut: false)
//     shift:       true si Shift requis   (défaut: false)
//     description: Description lisible
//     action:      Fonction à appeler
//   }
//
// Les raccourcis sont ignorés quand un input/textarea est focus.
// ─────────────────────────────────────────────────────────

/**
 * Tableau des raccourcis clavier.
 * Exporté pour être réutilisé (ex: modal d'aide).
 */
export const SHORTCUTS = [
  // ── Créer des éléments ────────────────────────────────
  {
    key: 'p',
    description: 'Ajouter une personne',
    action: () =>
      useFlowStore.getState().addPersonNode({
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      }),
  },
  {
    key: 's',
    description: 'Ajouter une section',
    action: () =>
      useFlowStore.getState().addSectionNode({
        x: Math.random() * 300 + 50,
        y: Math.random() * 200 + 50,
      }),
  },

  // ── Appliquer un preset (& = 1er, é = 2ème) ──────────
  {
    key: '&',
    description: 'Appliquer le 1er preset',
    action: () => {
      const { presets, applyPreset } = useFlowStore.getState();
      if (presets.length >= 1) applyPreset(presets[0].id);
    },
  },
  {
    key: 'é',
    description: 'Appliquer le 2ème preset',
    action: () => {
      const { presets, applyPreset } = useFlowStore.getState();
      if (presets.length >= 2) applyPreset(presets[1].id);
    },
  },

  // ── Undo / Redo ───────────────────────────────────────
  {
    key: 'z',
    ctrl: true,
    description: 'Annuler (Ctrl+Z)',
    action: () => {
      useFlowStore.temporal.getState().undo();
      setTimeout(() => useFlowStore.getState()._save(), 0);
    },
  },
  {
    key: 'y',
    ctrl: true,
    description: 'Rétablir (Ctrl+Y)',
    action: () => {
      useFlowStore.temporal.getState().redo();
      setTimeout(() => useFlowStore.getState()._save(), 0);
    },
  },
  {
    key: 'z',
    ctrl: true,
    shift: true,
    description: 'Rétablir (Ctrl+Shift+Z)',
    action: () => {
      useFlowStore.temporal.getState().redo();
      setTimeout(() => useFlowStore.getState()._save(), 0);
    },
  },

  // ── Copier / Coller ───────────────────────────────────
  {
    key: 'c',
    ctrl: true,
    description: 'Copier la sélection',
    action: () => useFlowStore.getState().copySelected(),
  },
  {
    key: 'v',
    ctrl: true,
    description: 'Coller',
    action: () => useFlowStore.getState().pasteClipboard(),
  },
];

// ─────────────────────────────────────────────────────────

/**
 * Hook qui enregistre tous les raccourcis clavier.
 * Utilise le tableau SHORTCUTS comme unique source de vérité.
 */
export default function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e) => {
      // Ignore quand on tape dans un champ texte
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;

      for (const shortcut of SHORTCUTS) {
        const needCtrl = !!shortcut.ctrl;
        const needShift = !!shortcut.shift;

        if (
          e.key === shortcut.key &&
          ctrl === needCtrl &&
          e.shiftKey === needShift
        ) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}
