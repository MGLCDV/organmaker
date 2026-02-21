import { useEffect, useCallback, useRef, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

import PersonNode from './components/PersonNode';
import SectionNode from './components/SectionNode';
import CustomEdge from './components/CustomEdge';
import Sidebar from './components/Sidebar';
import ShortcutsHelp from './components/ShortcutsHelp';
import useFlowStore from './store/useFlowStore';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import {
  GRID_SIZE,
  GRID_VARIANT,
  GRID_DOT_SIZE,
  GRID_DOT_COLOR,
  EXPORT_BG_COLOR,
  EXPORT_PIXEL_RATIO,
  DEFAULT_EDGE_COLOR,
  DEFAULT_EDGE_STROKE_WIDTH,
  DEFAULT_SECTION_COLOR,
  DEFAULT_PERSON_BG,
  DEFAULT_PERSON_BORDER,
  MINIMAP_PERSON_COLOR,
  MINIMAP_MASK_COLOR,
} from './config';

// ─── Types de nodes et edges personnalisés ──────────────
const nodeTypes = { person: PersonNode, section: SectionNode };
const edgeTypes = { custom: CustomEdge };

/**
 * Helper: capture le viewport React Flow en PNG data URL.
 * Ajoute puis retire la classe "exporting" pour masquer les boutons.
 */
function captureViewport() {
  return new Promise((resolve, reject) => {
    const el = document.querySelector('.react-flow__viewport');
    if (!el) return reject(new Error('Viewport not found'));

    const wrapper = document.querySelector('.react-flow');
    wrapper?.classList.add('exporting');

    requestAnimationFrame(() => {
      toPng(el, { backgroundColor: EXPORT_BG_COLOR, pixelRatio: EXPORT_PIXEL_RATIO })
        .then((dataUrl) => {
          wrapper?.classList.remove('exporting');
          resolve(dataUrl);
        })
        .catch((err) => {
          wrapper?.classList.remove('exporting');
          reject(err);
        });
    });
  });
}

/**
 * Generate a safe file-name stem from the current store state.
 */
function fileStem() {
  const s = useFlowStore.getState();
  const date = new Date().toISOString().slice(0, 10);
  const safe = s.fileName
    .replace(/[^a-zA-Z0-9\u00C0-\u017F\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${safe || 'organigramme'}_v${s.fileVersion}_${date}`;
}

/**
 * Composant principal de l'application OrganMaker.
 * Contient le canvas React Flow, la toolbar et la sidebar.
 */
function Flow() {
  const reactFlowWrapper = useRef(null);

  // ── Zustand selectors ──────────────────────────────
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const loadFlow = useFlowStore((s) => s.loadFlow);
  const resetFlow = useFlowStore((s) => s.resetFlow);
  const exportFlow = useFlowStore((s) => s.exportFlow);
  const importFlow = useFlowStore((s) => s.importFlow);
  const fileName = useFlowStore((s) => s.fileName);
  const fileVersion = useFlowStore((s) => s.fileVersion);
  const setFileName = useFlowStore((s) => s.setFileName);
  const incrementVersion = useFlowStore((s) => s.incrementVersion);
  const decrementVersion = useFlowStore((s) => s.decrementVersion);
  const autoLayout = useFlowStore((s) => s.autoLayout);

  // ── Undo / Redo state ──────────────────────────────
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const unsub = useFlowStore.temporal.subscribe((state) => {
      setCanUndo(state.pastStates.length > 0);
      setCanRedo(state.futureStates.length > 0);
    });
    return unsub;
  }, []);

  const handleUndo = useCallback(() => {
    useFlowStore.temporal.getState().undo();
    setTimeout(() => useFlowStore.getState()._save(), 0);
  }, []);

  const handleRedo = useCallback(() => {
    useFlowStore.temporal.getState().redo();
    setTimeout(() => useFlowStore.getState()._save(), 0);
  }, []);

  // ── Chargement initial depuis localStorage ─────────
  useEffect(() => {
    loadFlow();
  }, [loadFlow]);

  // ── Keyboard shortcuts (voir src/hooks/useKeyboardShortcuts.js) ──
  useKeyboardShortcuts();

  // ── Export PNG ─────────────────────────────────────
  const handleExportPng = useCallback(() => {
    captureViewport().then((dataUrl) => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${fileStem()}.png`;
      a.click();
    });
  }, []);

  // ── Export PDF ─────────────────────────────────────
  const handleExportPdf = useCallback(() => {
    captureViewport().then((dataUrl) => {
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        const landscape = ratio > 1;
        const pdf = new jsPDF({
          orientation: landscape ? 'landscape' : 'portrait',
          unit: 'mm',
        });
        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();
        let w = pw - 20;
        let h = w / ratio;
        if (h > ph - 20) {
          h = ph - 20;
          w = h * ratio;
        }
        pdf.addImage(dataUrl, 'PNG', (pw - w) / 2, (ph - h) / 2, w, h);
        pdf.save(`${fileStem()}.pdf`);
      };
      img.src = dataUrl;
    });
  }, []);

  // ── Reset ──────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (window.confirm("Réinitialiser l'organigramme ? Toutes les données seront perdues.")) {
      resetFlow();
    }
  }, [resetFlow]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50">
      {/* ── Toolbar ──────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-gray-200 shadow-sm z-10">
        {/* Left: logo + file name */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6Z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-800 tracking-tight shrink-0">OrganMaker</h1>
          <div className="w-px h-6 bg-gray-200" />
          <input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5 outline-none border border-gray-200 focus:border-indigo-300 focus:bg-white transition-colors w-56"
            placeholder="Nom du fichier"
          />
          <span className="text-xs text-gray-400 font-mono shrink-0">v{fileVersion}</span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={decrementVersion}
              disabled={fileVersion <= 1}
              className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Version précédente"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 12h-15" />
              </svg>
            </button>
            <button
              onClick={incrementVersion}
              className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title="Version suivante"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5">
          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="flex items-center gap-1.5 px-2.5 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Annuler (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
          </button>

          {/* Redo */}
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="flex items-center gap-1.5 px-2.5 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Rétablir (Ctrl+Y)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" />
            </svg>
          </button>

          {/* Séparateur */}
          <div className="w-px h-6 bg-gray-200 mx-0.5" />

          {/* Organiser */}
          <button
            onClick={autoLayout}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
            title="Organiser les nœuds en arbre"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6Z" />
            </svg>
            Organiser
          </button>

          {/* Séparateur */}
          <div className="w-px h-6 bg-gray-200 mx-0.5" />

          {/* Export PNG */}
          <button
            onClick={handleExportPng}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
            title="Exporter en PNG"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            PNG
          </button>

          {/* Export PDF */}
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
            title="Exporter en PDF"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            PDF
          </button>

          {/* Export JSON */}
          <button
            onClick={exportFlow}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition-colors"
            title="Exporter en JSON"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            JSON
          </button>

          {/* Séparateur */}
          <div className="w-px h-6 bg-gray-200 mx-0.5" />

          {/* Import JSON */}
          <button
            onClick={importFlow}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition-colors"
            title="Importer un fichier JSON"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Importer
          </button>

          {/* Séparateur */}
          <div className="w-px h-6 bg-gray-200 mx-0.5" />

          {/* Reset */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-transparent text-red-600 hover:bg-red-50 border border-red-600 transition-colors"
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
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        {/* Floating sidebar */}
        <Sidebar />
        <ShortcutsHelp />

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
          snapGrid={GRID_SIZE}
          defaultEdgeOptions={{
            type: 'custom',
            data: { color: DEFAULT_EDGE_COLOR, dashed: false },
            markerEnd: { type: 'arrowclosed', color: DEFAULT_EDGE_COLOR },
            style: { stroke: DEFAULT_EDGE_COLOR, strokeWidth: DEFAULT_EDGE_STROKE_WIDTH },
          }}
          connectionLineStyle={{ stroke: DEFAULT_EDGE_COLOR, strokeWidth: DEFAULT_EDGE_STROKE_WIDTH }}
          connectionLineType="bezier"
          deleteKeyCode={['Backspace', 'Delete']}
          elevateNodesOnSelect={false}
          proOptions={{ hideAttribution: true }}
          selectionMode="partial"
          multiSelectionKeyCode="Shift"
        >
          <Background variant={GRID_VARIANT} gap={GRID_SIZE[0]} size={GRID_DOT_SIZE} color={GRID_DOT_COLOR} />
          <Controls
            className="!bg-white !border !border-gray-200 !rounded-xl !shadow-md"
            showInteractive={false}
            position="bottom-right"
          />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'section') return node.data?.color || DEFAULT_SECTION_COLOR;
              // Person: use border color for visibility (white bg is invisible on minimap)
              const bg = node.data?.bgColor || DEFAULT_PERSON_BG;
              if (bg === '#ffffff' || bg === '#fff' || bg.toLowerCase() === DEFAULT_PERSON_BG.toLowerCase()) {
                return node.data?.borderColor || MINIMAP_PERSON_COLOR;
              }
              return bg;
            }}
            nodeStrokeColor={(node) => {
              if (node.type === 'person') return node.data?.borderColor || DEFAULT_PERSON_BORDER;
              return 'transparent';
            }}
            nodeStrokeWidth={2}
            maskColor={MINIMAP_MASK_COLOR}
            className="!bg-white !border !border-gray-200 !rounded-xl !shadow-md"
            pannable
            zoomable
            style={{ zIndex: 5 }}
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
