import { useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toPng } from 'html-to-image';

import PersonNode from './components/PersonNode';
import SectionNode from './components/SectionNode';
import CustomEdge from './components/CustomEdge';
import useFlowStore from './store/useFlowStore';

// ─── Types de nodes et edges personnalisés ──────────────
const nodeTypes = { person: PersonNode, section: SectionNode };
const edgeTypes = { custom: CustomEdge };

/**
 * Composant principal de l'application OrganMaker.
 * Contient le canvas React Flow + la barre d'outils.
 */
function Flow() {
  const reactFlowWrapper = useRef(null);

  // ── Zustand selectors ──────────────────────────────
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const addPersonNode = useFlowStore((s) => s.addPersonNode);
  const addSectionNode = useFlowStore((s) => s.addSectionNode);
  const loadFlow = useFlowStore((s) => s.loadFlow);
  const resetFlow = useFlowStore((s) => s.resetFlow);
  const exportFlow = useFlowStore((s) => s.exportFlow);
  const importFlow = useFlowStore((s) => s.importFlow);

  // ── Chargement initial depuis localStorage ─────────
  useEffect(() => {
    loadFlow();
  }, [loadFlow]);

  // ── Export PNG ─────────────────────────────────────
  const handleExportPng = useCallback(() => {
    const el = document.querySelector('.react-flow__viewport');
    if (!el) return;
    // Ajouter la classe pour masquer les contrôles interactifs
    const wrapper = document.querySelector('.react-flow');
    wrapper?.classList.add('exporting');
    // Petit délai pour laisser le DOM se mettre à jour
    requestAnimationFrame(() => {
      toPng(el, {
        backgroundColor: '#f8fafc',
        pixelRatio: 2,
      }).then((dataUrl) => {
        wrapper?.classList.remove('exporting');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'organigramme.png';
        a.click();
      }).catch(() => {
        wrapper?.classList.remove('exporting');
      });
    });
  }, []);

  // ── Reset ──────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (window.confirm('Réinitialiser l\'organigramme ? Toutes les données seront perdues.')) {
      resetFlow();
    }
  }, [resetFlow]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50">
      {/* ── Toolbar ──────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shadow-sm z-10">
        {/* Logo / titre */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6Z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-800 tracking-tight">OrganMaker</h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Ajouter Personne */}
          <button
            onClick={() => addPersonNode({ x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 })}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
            </svg>
            Personne
          </button>

          {/* Ajouter Section */}
          <button
            onClick={() => addSectionNode({ x: Math.random() * 300 + 50, y: Math.random() * 200 + 50 })}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75Z" />
            </svg>
            Section
          </button>

          {/* Séparateur */}
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Export PNG */}
          <button
            onClick={handleExportPng}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            title="Exporter en PNG"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            PNG
          </button>

          {/* Export JSON */}
          <button
            onClick={exportFlow}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
            title="Exporter en JSON"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            JSON
          </button>

          {/* Import JSON */}
          <button
            onClick={importFlow}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
            title="Importer un fichier JSON"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m13.5-9L12 3m0 0L7.5 7.5M12 3v13.5" />
            </svg>
            Importer
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            title="Réinitialiser"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            Reset
          </button>
        </div>
      </header>

      {/* ── Canvas React Flow ────────────────────────── */}
      <div className="flex-1" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          defaultEdgeOptions={{
            type: 'custom',
            data: { color: '#6366f1', dashed: false },
            markerEnd: { type: 'arrowclosed', color: '#6366f1' },
            style: { stroke: '#6366f1', strokeWidth: 2 },
          }}
          connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
          connectionLineType="bezier"
          deleteKeyCode={['Backspace', 'Delete']}
          elevateNodesOnSelect={false}
          proOptions={{ hideAttribution: true }}
        >
          {/* Grille de fond */}
          <Background variant="dots" gap={16} size={1} color="#cbd5e1" />

          {/* Contrôles zoom */}
          <Controls
            className="!bg-white !border !border-gray-200 !rounded-xl !shadow-md"
            showInteractive={false}
          />

          {/* MiniMap */}
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'section') return node.data?.color || '#e0e7ff';
              return '#6366f1';
            }}
            maskColor="rgba(248, 250, 252, 0.7)"
            className="!bg-white !border !border-gray-200 !rounded-xl !shadow-md"
            pannable
            zoomable
          />
        </ReactFlow>
      </div>
    </div>
  );
}

/**
 * App wrapper avec ReactFlowProvider
 */
export default function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
