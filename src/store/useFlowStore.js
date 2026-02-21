import { create } from 'zustand';
import { temporal } from 'zundo';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge as rfAddEdge,
} from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import dagre from 'dagre';

// ─── Constants ──────────────────────────────────────────
const STORAGE_KEY = 'organmaker-flow';

// ─── Clipboard (module-level, not tracked by temporal) ──
let _clipboard = { nodes: [], edges: [] };

// ─── Drag / edit snapshot (module-level) ────────────────
let _preDragSnapshot = null;
let _editSnapshot = null;
let _editTimer = null;

/** Strip volatile (visual-only) properties so undo ignores them */
function _partialize({ nodes, edges }) {
  return {
    nodes: nodes.map(({ selected, dragging, ...rest }) => rest),
    edges: edges.map(({ selected, ...rest }) => rest),
  };
}

// ─── Debounce helper ────────────────────────────────────
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

const _saveLazy = debounce(() => {
  useFlowStore.getState()._save();
}, 300);

/**
 * Store Zustand + zundo temporal pour gérer l'état complet
 * de l'organigramme avec undo/redo, presets, clipboard, auto-layout.
 */
const useFlowStore = create(
  temporal(
    (set, get) => ({
      // ─── State ──────────────────────────────────────────
      nodes: [],
      edges: [],
      fileName: 'Mon Organigramme',
      fileVersion: 1,
      presets: [],

      // ─── File name ─────────────────────────────────────
      setFileName: (fileName) => {
        set({ fileName });
        get()._save();
      },

      // ─── React Flow callbacks ───────────────────────────
      onNodesChange: (changes) => {
        const isDragging = changes.some((c) => c.type === 'position' && c.dragging);
        const dragEnded = changes.some((c) => c.type === 'position' && c.dragging === false);

        // First drag frame → snapshot pre-drag state & pause temporal
        if (isDragging && !_preDragSnapshot) {
          _preDragSnapshot = JSON.parse(
            JSON.stringify(_partialize({ nodes: get().nodes, edges: get().edges }))
          );
          useFlowStore.temporal.getState().pause();
        }

        let updatedNodes = applyNodeChanges(changes, get().nodes);
        updatedNodes = updatedNodes.map((n) => {
          if (n.type === 'section') return { ...n, zIndex: n.selected ? -5 : -10 };
          if (n.type === 'person') return { ...n, zIndex: 10 };
          return n;
        });
        set({ nodes: updatedNodes });

        if (dragEnded && _preDragSnapshot) {
          // Commit one undo entry for the whole drag
          useFlowStore.temporal.getState().resume();
          const { pastStates } = useFlowStore.temporal.getState();
          useFlowStore.temporal.setState({
            pastStates: [...pastStates.slice(-49), _preDragSnapshot],
            futureStates: [],
          });
          _preDragSnapshot = null;
          get()._save();
        } else if (!isDragging) {
          _saveLazy();
        }
      },

      onEdgesChange: (changes) => {
        set({ edges: applyEdgeChanges(changes, get().edges) });
        _saveLazy();
      },

      onConnect: (connection) => {
        const edge = {
          ...connection,
          id: uuidv4(),
          type: 'custom',
          data: { color: '#6366f1', dashed: false },
          markerEnd: { type: 'arrowclosed', color: '#6366f1' },
          style: { stroke: '#6366f1', strokeWidth: 2 },
        };
        set({ edges: rfAddEdge(edge, get().edges) });
        get()._save();
      },

      // ─── Nodes ──────────────────────────────────────────

      addPersonNode: (position = { x: 100, y: 100 }) => {
        const node = {
          id: uuidv4(),
          type: 'person',
          position,
          zIndex: 1000,
          data: {
            name: 'Nouveau',
            role: 'Rôle',
            comment: '',
            showComment: false,
            photo: null,
            bgColor: '#ffffff',
            borderColor: '#e5e7eb',
          },
        };
        set({ nodes: [...get().nodes, node] });
        get()._save();
      },

      addSectionNode: (position = { x: 50, y: 50 }) => {
        const node = {
          id: uuidv4(),
          type: 'section',
          position,
          data: {
            title: 'Nouvelle Section',
            color: '#e0e7ff',
          },
          style: { width: 500, height: 350 },
          zIndex: 0,
        };
        set({ nodes: [...get().nodes, node] });
        get()._save();
      },

      removeNode: (nodeId) => {
        set({
          nodes: get().nodes.filter((n) => n.id !== nodeId),
          edges: get().edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          ),
        });
        get()._save();
      },

      updateNodeData: (nodeId, newData) => {
        // Capture pre-edit snapshot once per burst
        if (!_editSnapshot) {
          _editSnapshot = JSON.parse(
            JSON.stringify(_partialize({ nodes: get().nodes, edges: get().edges }))
          );
          useFlowStore.temporal.getState().pause();
        }
        set({
          nodes: get().nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n
          ),
        });
        // Commit after 600 ms of inactivity
        clearTimeout(_editTimer);
        _editTimer = setTimeout(() => {
          if (_editSnapshot) {
            useFlowStore.temporal.getState().resume();
            const { pastStates } = useFlowStore.temporal.getState();
            useFlowStore.temporal.setState({
              pastStates: [...pastStates.slice(-49), _editSnapshot],
              futureStates: [],
            });
            _editSnapshot = null;
          }
          useFlowStore.getState()._save();
        }, 600);
      },

      // ─── Edges ──────────────────────────────────────────

      addEdge: (edge) => {
        set({ edges: [...get().edges, { ...edge, id: edge.id || uuidv4() }] });
        get()._save();
      },

      removeEdge: (edgeId) => {
        set({ edges: get().edges.filter((e) => e.id !== edgeId) });
        get()._save();
      },

      updateEdgeData: (edgeId, newData) => {
        set({
          edges: get().edges.map((e) => {
            if (e.id !== edgeId) return e;
            const updatedData = { ...(e.data || {}), ...newData };
            const updatedEdge = { ...e, data: updatedData };
            if (newData.color) {
              updatedEdge.style = { ...e.style, stroke: newData.color };
              updatedEdge.markerEnd = { ...e.markerEnd, color: newData.color };
            }
            return updatedEdge;
          }),
        });
        get()._save();
      },

      // ─── Auto-layout (dagre, top-down tree) ────────────
      autoLayout: () => {
        const { nodes, edges } = get();
        if (nodes.length === 0) return;

        const g = new dagre.graphlib.Graph();
        g.setDefaultEdgeLabel(() => ({}));
        g.setGraph({
          rankdir: 'TB',
          ranksep: 100,
          nodesep: 60,
          marginx: 40,
          marginy: 40,
        });

        // Only auto-layout person nodes (sections are background containers)
        const personNodes = nodes.filter((n) => n.type === 'person');
        const sectionNodes = nodes.filter((n) => n.type === 'section');
        const personIds = new Set(personNodes.map((n) => n.id));

        personNodes.forEach((n) => {
          g.setNode(n.id, { width: 256, height: 200 });
        });

        edges.forEach((e) => {
          if (personIds.has(e.source) && personIds.has(e.target)) {
            g.setEdge(e.source, e.target);
          }
        });

        dagre.layout(g);

        const laidOutPersons = personNodes.map((n) => {
          const pos = g.node(n.id);
          return {
            ...n,
            position: { x: pos.x - 128, y: pos.y - 100 },
          };
        });

        set({ nodes: [...sectionNodes, ...laidOutPersons] });
        get()._save();
      },

      // ─── Copy / Paste ──────────────────────────────────
      copySelected: () => {
        const { nodes, edges } = get();
        const selected = nodes.filter((n) => n.selected);
        if (selected.length === 0) return;

        const selectedIds = new Set(selected.map((n) => n.id));
        const connectedEdges = edges.filter(
          (e) => selectedIds.has(e.source) && selectedIds.has(e.target)
        );

        _clipboard = {
          nodes: JSON.parse(JSON.stringify(selected)),
          edges: JSON.parse(JSON.stringify(connectedEdges)),
        };
      },

      pasteClipboard: () => {
        if (_clipboard.nodes.length === 0) return;

        const idMap = {};
        const offset = 60;

        const multi = _clipboard.nodes.length > 1;

        const newNodes = _clipboard.nodes.map((n) => {
          const newId = uuidv4();
          idMap[n.id] = newId;
          return {
            ...n,
            id: newId,
            position: { x: n.position.x + offset, y: n.position.y + offset },
            selected: multi,
          };
        });

        const newEdges = _clipboard.edges.map((e) => ({
          ...e,
          id: uuidv4(),
          source: idMap[e.source] || e.source,
          target: idMap[e.target] || e.target,
        }));

        // If multi‐paste, deselect existing so only pasted nodes are selected
        const existing = multi
          ? get().nodes.map((n) => ({ ...n, selected: false }))
          : get().nodes;
        set({
          nodes: [...existing, ...newNodes],
          edges: [...get().edges, ...newEdges],
        });
        get()._save();

        // Shift clipboard for next paste
        _clipboard.nodes = _clipboard.nodes.map((n) => ({
          ...n,
          position: { x: n.position.x + offset, y: n.position.y + offset },
        }));
      },

      // ─── Presets ────────────────────────────────────────
      /**
       * Create a preset from currently selected nodes + their inter-edges.
       * Positions are normalized relative to the bounding-box origin.
       * The structure is extensible: any future field in node.data / edge.data
       * or preset.meta is preserved automatically.
       */
      addPreset: () => {
        const { nodes, edges, presets } = get();
        const selected = nodes.filter((n) => n.selected);
        if (selected.length === 0) return null;

        const selectedIds = new Set(selected.map((n) => n.id));
        const connectedEdges = edges.filter(
          (e) => selectedIds.has(e.source) && selectedIds.has(e.target)
        );

        // Normalize positions to top-left of bounding box
        const minX = Math.min(...selected.map((n) => n.position.x));
        const minY = Math.min(...selected.map((n) => n.position.y));

        const presetNodes = selected.map((n) => ({
          ...n,
          position: { x: n.position.x - minX, y: n.position.y - minY },
          selected: false,
        }));

        const presetEdges = connectedEdges.map((e) => ({ ...e }));

        const preset = {
          id: uuidv4(),
          name: `Preset ${presets.length + 1}`,
          createdAt: new Date().toISOString(),
          meta: {}, // extensible – add fontSize, tags, etc. here later
          nodes: presetNodes,
          edges: presetEdges,
        };

        set({ presets: [...presets, preset] });
        get()._save();
        return preset.id;
      },

      applyPreset: (presetId) => {
        const preset = get().presets.find((p) => p.id === presetId);
        if (!preset || preset.nodes.length === 0) return;

        const idMap = {};
        const baseX = 100 + Math.random() * 100;
        const baseY = 100 + Math.random() * 80;

        const multi = preset.nodes.length > 1;

        const newNodes = preset.nodes.map((n) => {
          const newId = uuidv4();
          idMap[n.id] = newId;
          return {
            ...n,
            id: newId,
            position: { x: n.position.x + baseX, y: n.position.y + baseY },
            selected: multi,
          };
        });

        const newEdges = preset.edges.map((e) => ({
          ...e,
          id: uuidv4(),
          source: idMap[e.source] || e.source,
          target: idMap[e.target] || e.target,
        }));

        // If multi, deselect existing so only preset nodes are selected
        const existing = multi
          ? get().nodes.map((n) => ({ ...n, selected: false }))
          : get().nodes;
        set({
          nodes: [...existing, ...newNodes],
          edges: [...get().edges, ...newEdges],
        });
        get()._save();
      },

      renamePreset: (presetId, name) => {
        set({
          presets: get().presets.map((p) =>
            p.id === presetId ? { ...p, name } : p
          ),
        });
        get()._save();
      },

      removePreset: (presetId) => {
        set({ presets: get().presets.filter((p) => p.id !== presetId) });
        get()._save();
      },

      // ─── Persistence ───────────────────────────────────

      _save: () => {
        const { nodes, edges, fileName, fileVersion, presets } = get();
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ nodes, edges, fileName, fileVersion, presets })
          );
        } catch {
          // Quota exceeded – silent
        }
      },

      saveFlow: () => get()._save(),

      loadFlow: () => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const { nodes, edges, fileName, fileVersion, presets } =
              JSON.parse(raw);
            set({
              nodes: nodes || [],
              edges: edges || [],
              fileName: fileName || 'Mon Organigramme',
              fileVersion: fileVersion || 1,
              presets: presets || [],
            });
          }
        } catch {
          // Invalid JSON – start fresh
        }
        // Clear temporal history (no undo before page load)
        try {
          useFlowStore.temporal.getState().clear();
        } catch {
          /* temporal might not be ready yet */
        }
      },

      // ─── Import / Export JSON ───────────────────────────

      exportFlow: () => {
        const { nodes, edges, fileName, fileVersion, presets } = get();
        const payload = {
          meta: {
            app: 'OrganMaker',
            version: String(fileVersion),
            fileName,
            exportedAt: new Date().toISOString(),
          },
          nodes,
          edges,
          presets: presets || [],
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const date = new Date().toISOString().slice(0, 10);
        const safeName = fileName
          .replace(/[^a-zA-Z0-9\u00C0-\u017F\-_]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName || 'organigramme'}_v${fileVersion}_${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
        set({ fileVersion: fileVersion + 1 });
        get()._save();
      },

      importFlow: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            try {
              const data = JSON.parse(ev.target.result);
              const nodes = data.nodes;
              const edges = data.edges;
              if (!Array.isArray(nodes) || !Array.isArray(edges)) {
                alert('Fichier invalide : nodes et edges attendus.');
                return;
              }
              if (
                !window.confirm(
                  "Remplacer l'organigramme actuel par les données importées ?"
                )
              )
                return;
              const meta = data.meta || {};
              set({
                nodes,
                edges,
                fileName: meta.fileName || 'Mon Organigramme',
                fileVersion: parseInt(meta.version, 10) || 1,
                presets: data.presets || [],
              });
              get()._save();
            } catch {
              alert('Impossible de lire le fichier JSON.');
            }
          };
          reader.readAsText(file);
        };
        input.click();
      },

      resetFlow: () => {
        set({
          nodes: [],
          edges: [],
          fileName: 'Mon Organigramme',
          fileVersion: 1,
          presets: [],
        });
        localStorage.removeItem(STORAGE_KEY);
        try {
          useFlowStore.temporal.getState().clear();
        } catch {}
      },
    }),
    // ─── Zundo temporal options ───────────────────────────
    {
      partialize: (state) => _partialize(state),
      equality: (pastState, currentState) =>
        JSON.stringify(pastState) === JSON.stringify(currentState),
      limit: 50,
    }
  )
);

export default useFlowStore;
