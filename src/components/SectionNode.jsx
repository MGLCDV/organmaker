import { memo, useCallback } from 'react';
import { NodeResizer } from 'reactflow';
import useFlowStore from '../store/useFlowStore';
import CustomColorPicker from './CustomColorPicker';

/**
 * Liste de couleurs pastel proposées pour les sections.
 */
const PASTEL_COLORS = [
  '#e0e7ff', // indigo
  '#fce7f3', // pink
  '#d1fae5', // emerald
  '#fef3c7', // amber
  '#e0f2fe', // sky
  '#f3e8ff', // violet
  '#ffedd5', // orange
  '#f1f5f9', // slate
];

/**
 * Bloc "Section" :
 * - Parent node / group
 * - Couleur de fond pastel personnalisable
 * - Titre éditable en haut
 * - Redimensionnable
 */
const SectionNode = ({ id, data }) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const removeNode = useFlowStore((s) => s.removeNode);

  const handleTitleChange = useCallback(
    (e) => updateNodeData(id, { title: e.target.value }),
    [id, updateNodeData]
  );

  const handleColorChange = useCallback(
    (color) => updateNodeData(id, { color }),
    [id, updateNodeData]
  );

  return (
    <div
      className="section-node group rounded-2xl border-2 border-dashed border-gray-300 relative"
      style={{
        backgroundColor: data.color || '#e0e7ff',
        width: '100%',
        height: '100%',
        minWidth: 200,
        minHeight: 150,
      }}
    >
      {/* Resizer */}
      <NodeResizer
        minWidth={200}
        minHeight={150}
        lineClassName="!border-indigo-300"
        handleClassName="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white !rounded-full"
      />

      {/* Bouton supprimer */}
      <button
        onClick={() => removeNode(id)}
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-400 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10"
        title="Supprimer cette section"
      >
        ✕
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        {/* Titre */}
        <input
          value={data.title}
          onChange={handleTitleChange}
          className="font-semibold text-sm text-gray-700 bg-white/60 rounded-lg px-2 py-1 outline-none border border-transparent focus:border-indigo-300 transition-colors"
          style={{ width: `${Math.max(12, (data.title?.length || 0) + 2)}ch` }}
          placeholder="Titre de la section"
        />

        {/* Sélecteur de couleur */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
          {PASTEL_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => handleColorChange(color)}
              className="w-4 h-4 rounded-full border border-gray-300 hover:scale-125 transition-transform"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          <CustomColorPicker
            value={data.color || '#e0e7ff'}
            onChange={handleColorChange}
            isActive={!PASTEL_COLORS.includes(data.color)}
          />
        </div>
      </div>
    </div>
  );
};

export default memo(SectionNode);
