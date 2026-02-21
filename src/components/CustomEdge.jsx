import { memo, useState, useRef, useEffect } from 'react';
import { getBezierPath, EdgeLabelRenderer } from 'reactflow';
import useFlowStore from '../store/useFlowStore';
import CustomColorPicker from './CustomColorPicker';

const EDGE_COLORS = [
  '#6366f1', '#ef4444', '#10b981', '#0ea5e9',
  '#f59e0b', '#8b5cf6', '#6b7280', '#ec4899',
];

/**
 * Edge personnalisée :
 * - Courbe Bezier élégante
 * - Flèche colorée dynamique
 * - Bouton supprimer + menu options via EdgeLabelRenderer (au-dessus des nodes)
 */
const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data = {},
  style = {},
}) => {
  const removeEdge = useFlowStore((s) => s.removeEdge);
  const updateEdgeData = useFlowStore((s) => s.updateEdgeData);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const controlsRef = useRef(null);

  const edgeColor = data.color || style.stroke || '#6366f1';
  const isDashed = data.dashed ?? false;
  const showControls = isHovered || menuOpen;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.25,
  });

  // Fermer le menu au clic extérieur
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (controlsRef.current && !controlsRef.current.contains(e.target)) {
        setMenuOpen(false);
        setIsHovered(false);
      }
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [menuOpen]);

  const markerId = `arrowhead-${id}`;

  return (
    <>
      <g
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { if (!menuOpen) setIsHovered(false); }}
      >
        {/* Zone invisible élargie pour faciliter le survol */}
        <path
          d={edgePath}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
          className="cursor-pointer"
        />

        {/* Trait visible */}
        <path
          d={edgePath}
          fill="none"
          stroke={edgeColor}
          strokeWidth={2}
          strokeDasharray={isDashed ? '8 5' : 'none'}
          markerEnd={`url(#${markerId})`}
        />

        {/* Définition du marqueur flèche */}
        <defs>
          <marker
            id={markerId}
            markerWidth="12"
            markerHeight="12"
            refX="10"
            refY="6"
            orient="auto"
          >
            <path
              d="M 0 0 L 12 6 L 0 12 L 3 6 Z"
              fill={edgeColor}
            />
          </marker>
        </defs>
      </g>

      {/* Contrôles rendus AU-DESSUS des nodes via EdgeLabelRenderer */}
      <EdgeLabelRenderer>
        <div
          ref={controlsRef}
          className="edge-controls nodrag nopan"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            zIndex: 10000,
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => { if (!menuOpen) setIsHovered(false); }}
        >
          {/* Boutons supprimer + options */}
          <div className={`flex items-center gap-1 transition-opacity duration-150 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <button
              onClick={() => removeEdge(id)}
              className="w-5 h-5 rounded-full bg-red-400 text-white text-[10px] flex items-center justify-center hover:bg-red-500 cursor-pointer"
              title="Supprimer"
            >
              ✕
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-5 h-5 rounded-full bg-gray-500 text-white text-[10px] flex items-center justify-center hover:bg-gray-600 cursor-pointer"
              title="Options"
            >
              ⋯
            </button>
          </div>

          {/* Mini menu options */}
          {menuOpen && (
            <div
              className="absolute top-7 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-200 p-2.5 space-y-2"
              style={{ width: 180 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Type de ligne */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateEdgeData(id, { dashed: false })}
                  className={`flex-1 py-1 text-[10px] rounded-md border transition-colors ${!isDashed ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  Continue
                </button>
                <button
                  onClick={() => updateEdgeData(id, { dashed: true })}
                  className={`flex-1 py-1 text-[10px] rounded-md border transition-colors ${isDashed ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  Pointillé
                </button>
              </div>

              {/* Couleur */}
              <div className="flex gap-1 justify-center flex-wrap">
                {EDGE_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => updateEdgeData(id, { color })}
                    className={`w-4 h-4 rounded-full border-2 hover:scale-125 transition-transform ${edgeColor === color ? 'border-gray-700 scale-110' : 'border-gray-300'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <CustomColorPicker
                  value={edgeColor}
                  onChange={(color) => updateEdgeData(id, { color })}
                  isActive={!EDGE_COLORS.includes(edgeColor)}
                />
              </div>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default memo(CustomEdge);
