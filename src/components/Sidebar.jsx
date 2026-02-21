import { useState, useEffect, useRef, useCallback, memo } from 'react';
import useFlowStore from '../store/useFlowStore';

// ─── Icons (Heroicons outline, inline SVGs) ─────────────
const Icons = {
  person: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
    </svg>
  ),
  section: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75Z" />
    </svg>
  ),
  plus: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  play: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
    </svg>
  ),
  trash: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  ),
  collapseUp: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m4.5 15.75 7.5-7.5 7.5 7.5" />
    </svg>
  ),
  expandDown: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  ),
};

// ─── Preset item ────────────────────────────────────────
const PresetItem = memo(({ preset, collapsed, onApply, onRename, onRemove }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(preset.name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitRename = useCallback(() => {
    setEditing(false);
    const trimmed = name.trim();
    if (trimmed && trimmed !== preset.name) {
      onRename(preset.id, trimmed);
    } else {
      setName(preset.name);
    }
  }, [name, preset.id, preset.name, onRename]);

  const nodeCount = preset.nodes?.length || 0;

  // Collapsed: compact button only
  if (collapsed) {
    return (
      <button
        onClick={() => onApply(preset.id)}
        title={`${preset.name} (${nodeCount})`}
        className="flex items-center justify-center w-full px-2 py-1.5 text-[10px] font-bold rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors"
      >
        {preset.name.charAt(0).toUpperCase()}
      </button>
    );
  }

  return (
    <div className="group flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-white/60 transition-colors">
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setName(preset.name); setEditing(false); }
            }}
            className="w-full text-xs bg-white border border-indigo-300 rounded px-1.5 py-0.5 outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="w-full text-left text-xs text-gray-700 hover:text-indigo-600 truncate cursor-text"
            title="Cliquer pour renommer"
          >
            {preset.name}
            <span className="ml-1 text-[10px] text-gray-400">({nodeCount})</span>
          </button>
        )}
      </div>
      <button
        onClick={() => onApply(preset.id)}
        className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition-all"
        title="Insérer"
      >
        {Icons.play}
      </button>
      <button
        onClick={() => onRemove(preset.id)}
        className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
        title="Supprimer"
      >
        {Icons.trash}
      </button>
    </div>
  );
});

// ─── Floating sidebar (overlay on canvas) ───────────────
const Sidebar = () => {
  const [presetsOpen, setPresetsOpen] = useState(true);

  const addPersonNode = useFlowStore((s) => s.addPersonNode);
  const addSectionNode = useFlowStore((s) => s.addSectionNode);
  const presets = useFlowStore((s) => s.presets);
  const addPreset = useFlowStore((s) => s.addPreset);
  const removePreset = useFlowStore((s) => s.removePreset);
  const renamePreset = useFlowStore((s) => s.renamePreset);
  const applyPreset = useFlowStore((s) => s.applyPreset);
  const nodes = useFlowStore((s) => s.nodes);

  const handleAddPreset = useCallback(() => {
    const hasSelected = nodes.some((n) => n.selected);
    if (!hasSelected) {
      alert("Sélectionnez d'abord des éléments sur le canvas pour créer un preset.");
      return;
    }
    addPreset();
  }, [nodes, addPreset]);

  return (
    <div className="add-toolbar absolute top-4 left-4 z-20 flex flex-col bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-2 select-none"
      style={{ width: 170 }}
    >
      {/* ── Ajouter ──────────── */}
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">Ajouter</span>
      <button
        onClick={() => addPersonNode({ x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 })}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
      >
        {Icons.person}
        Personne
      </button>
      <button
        onClick={() => addSectionNode({ x: Math.random() * 300 + 50, y: Math.random() * 200 + 50 })}
        className="flex items-center gap-2 px-3 py-2 mt-1 text-sm font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
      >
        {Icons.section}
        Section
      </button>

      {/* ── Divider ──────────── */}
      <div className="border-t border-gray-200 my-2" />

      {/* ── Presets header ──── */}
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Presets</span>
        {presets.length > 0 && (
          <button
            onClick={() => setPresetsOpen(!presetsOpen)}
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            title={presetsOpen ? 'Réduire' : 'Déplier'}
          >
            {presetsOpen ? Icons.collapseUp : Icons.expandDown}
          </button>
        )}
      </div>

      {/* + Ajouter preset */}
      <button
        onClick={handleAddPreset}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors"
      >
        {Icons.plus}
        Ajouter
      </button>

      {/* Preset list */}
      {presetsOpen && presets.length > 0 && (
        <div className="mt-1.5 space-y-0.5 max-h-48 overflow-y-auto">
          {presets.map((p) => (
            <PresetItem
              key={p.id}
              preset={p}
              collapsed={false}
              onApply={applyPreset}
              onRename={renamePreset}
              onRemove={removePreset}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default memo(Sidebar);
