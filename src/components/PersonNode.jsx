import { memo, useCallback, useRef, useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import useFlowStore from '../store/useFlowStore';

const PERSON_BG_COLORS = [
  '#ffffff', '#f1f5f9', '#e0e7ff', '#fce7f3',
  '#d1fae5', '#fef3c7', '#e0f2fe', '#f3e8ff',
];

const PERSON_BORDER_COLORS = [
  '#e5e7eb', '#6366f1', '#ec4899', '#10b981',
  '#f59e0b', '#0ea5e9', '#8b5cf6', '#ef4444',
];

/**
 * Bloc "Personne" :
 * - Photo ronde uploadable
 * - Nom, rôle, commentaire optionnel
 * - Couleurs de fond et bordure personnalisables
 */
const PersonNode = ({ id, data }) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const removeNode = useFlowStore((s) => s.removeNode);
  const fileInputRef = useRef(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const colorPickerRef = useRef(null);

  const bgColor = data.bgColor || '#ffffff';
  const borderColor = data.borderColor || '#e5e7eb';

  // ── Fermer le color picker au clic extérieur ──────
  useEffect(() => {
    if (!colorPickerOpen) return;
    const handler = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
        setColorPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [colorPickerOpen]);

  // ── Upload photo ──────────────────────────────────
  const handlePhotoUpload = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        updateNodeData(id, { photo: ev.target.result });
      };
      reader.readAsDataURL(file);
    },
    [id, updateNodeData]
  );

  // ── Handlers champs ───────────────────────────────
  const handleChange = useCallback(
    (field) => (e) => updateNodeData(id, { [field]: e.target.value }),
    [id, updateNodeData]
  );

  const toggleComment = useCallback(
    () => updateNodeData(id, { showComment: !data.showComment }),
    [id, data.showComment, updateNodeData]
  );

  return (
    <div
      className="person-node group relative rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 w-64 select-none border-2"
      style={{ backgroundColor: bgColor, borderColor }}
    >
      {/* Handle cible (haut) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white"
      />

      {/* Bouton supprimer */}
      <button
        onClick={() => removeNode(id)}
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-400 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10"
        title="Supprimer"
      >
        ✕
      </button>

      {/* Color picker wrapper (bouton + popup) */}
      <div ref={colorPickerRef} className="color-picker-wrapper absolute -top-2 -left-2 z-10">
        <button
          onClick={() => setColorPickerOpen(!colorPickerOpen)}
          className="w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-500"
          title="Couleurs"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M20.599 1.5c-.376 0-.743.111-1.055.32l-5.08 3.385a18.747 18.747 0 0 0-3.471 2.987 10.04 10.04 0 0 1 4.815 4.815 18.748 18.748 0 0 0 2.987-3.472l3.386-5.079A1.902 1.902 0 0 0 20.599 1.5Zm-8.3 14.025a18.76 18.76 0 0 0 1.896-1.207 8.026 8.026 0 0 0-4.513-4.513A18.75 18.75 0 0 0 8.475 11.7l-.278.5a5.26 5.26 0 0 1 3.601 3.602l.502-.278ZM6.75 13.5A3.75 3.75 0 0 0 3 17.25a1.5 1.5 0 0 1-1.601 1.497.75.75 0 0 0-.7 1.123 5.25 5.25 0 0 0 9.8-2.62 3.75 3.75 0 0 0-3.75-3.75Z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Sélecteur de couleurs */}
        {colorPickerOpen && (
          <div
            className="absolute left-0 top-8 bg-white rounded-xl shadow-lg border border-gray-200 p-2.5 space-y-2 nodrag"
            style={{ width: 170 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wide">Fond</span>
              <div className="flex gap-1 mt-1">
                {PERSON_BG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateNodeData(id, { bgColor: c })}
                    className={`w-4 h-4 rounded-full border-2 hover:scale-125 transition-transform ${bgColor === c ? 'border-gray-700 scale-110' : 'border-gray-300'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wide">Bordure</span>
              <div className="flex gap-1 mt-1">
                {PERSON_BORDER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateNodeData(id, { borderColor: c })}
                    className={`w-4 h-4 rounded-full border-2 hover:scale-125 transition-transform ${borderColor === c ? 'border-gray-700 scale-110' : 'border-gray-300'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Photo */}
      <div className="flex justify-center pt-5">
        <div
          className="w-24 h-24 rounded-full overflow-hidden cursor-pointer border-2 flex items-center justify-center transition-colors"
          style={{ borderColor, backgroundColor: bgColor === '#ffffff' ? '#eef2ff' : bgColor }}
          onClick={() => fileInputRef.current?.click()}
          title="Cliquer pour changer la photo"
        >
          {data.photo ? (
            <img
              src={data.photo}
              alt={data.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg
              className="w-12 h-12 text-indigo-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
              />
            </svg>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoUpload}
        />
      </div>

      {/* Infos */}
      <div className="px-4 py-3 space-y-1.5">
        {/* Nom */}
        <input
          value={data.name}
          onChange={handleChange('name')}
          className="w-full text-center font-semibold text-gray-800 text-sm bg-transparent outline-none border-b border-transparent focus:border-indigo-300 transition-colors"
          placeholder="Nom"
        />
        {/* Rôle */}
        <input
          value={data.role}
          onChange={handleChange('role')}
          className="w-full text-center text-xs text-gray-500 bg-transparent outline-none border-b border-transparent focus:border-indigo-300 transition-colors"
          placeholder="Rôle"
        />

        {/* Toggle commentaire */}
        <div className="flex justify-center pt-1">
          <button
            onClick={toggleComment}
            className="text-[10px] text-indigo-400 hover:text-indigo-600 transition-colors"
          >
            {data.showComment ? '▲ Masquer' : '▼ Commentaire'}
          </button>
        </div>

        {/* Commentaire */}
        {data.showComment && (
          <textarea
            value={data.comment}
            onChange={handleChange('comment')}
            rows={2}
            className="w-full text-xs text-gray-600 bg-gray-50 rounded-lg p-2 outline-none resize-none border border-gray-200 focus:border-indigo-300 transition-colors"
            placeholder="Commentaire…"
          />
        )}
      </div>

      {/* Handle source (bas) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white"
      />
    </div>
  );
};

export default memo(PersonNode);
