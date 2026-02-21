import { create } from 'zustand';
import { temporal } from 'zundo';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge as rfAddEdge,
} from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import dagre from 'dagre';
import {
  STORAGE_KEY,
  UNDO_LIMIT,
  EDIT_COMMIT_DELAY,
  SAVE_DEBOUNCE,
  PERSON_NODE_WIDTH,
  PERSON_NODE_HEIGHT,
  SECTION_DEFAULT_WIDTH,
  SECTION_DEFAULT_HEIGHT,
  PERSON_Z_INDEX,
  SECTION_Z_INDEX,
  SECTION_SELECTED_Z_INDEX,
  LAYOUT_RANK_SEP,
  LAYOUT_NODE_SEP,
  LAYOUT_MARGIN_X,
  LAYOUT_MARGIN_Y,
  SIDE_OFFSET_X,
  SIDE_STACK_GAP_Y,
  SIDE_START_Y,
  PASTE_OFFSET,
  DEFAULT_EDGE_COLOR,
  DEFAULT_EDGE_STROKE_WIDTH,
  DEFAULT_PERSON_BG,
  DEFAULT_PERSON_BORDER,
  DEFAULT_SECTION_COLOR,
  DEFAULT_FILE_NAME,
  DEFAULT_PERSON_NAME,
  DEFAULT_PERSON_ROLE,
  DEFAULT_SECTION_TITLE,
} from '../config';

// ─── Clipboard (module-level, not tracked by temporal) ──
let _clipboard = { nodes: [], edges: [] };

/** Migrate edges from old format (null handles) to explicit handle IDs */
function _migrateEdges(edges) {
  if (!Array.isArray(edges)) return edges;
  return edges.map((e) => ({
    ...e,
    sourceHandle: e.sourceHandle || 'source-bottom',
    targetHandle: e.targetHandle || 'target-top',
  }));
}

/** Ensure all nodes have correct zIndex (sections behind, persons in front) */
function _migrateNodeZIndex(nodes) {
  if (!Array.isArray(nodes)) return nodes;
  return nodes.map((n) => {
    if (n.type === 'person' && n.zIndex !== PERSON_Z_INDEX) {
      return { ...n, zIndex: PERSON_Z_INDEX };
    }
    if (n.type === 'section' && (n.zIndex == null || n.zIndex > SECTION_Z_INDEX)) {
      return { ...n, zIndex: n.selected ? SECTION_SELECTED_Z_INDEX : SECTION_Z_INDEX };
    }
    return n;
  });
}

// ─── Drag / edit snapshot (module-level) ────────────────
let _preDragSnapshot = null;
let _editSnapshot = null;
let _editTimer = null;

/** Strip volatile / React Flow internal properties so undo ignores them */
function _partialize({ nodes, edges }) {
  return {
    nodes: nodes.map(({ selected, dragging, width, height, positionAbsolute, measured, resizing, handleBounds, ...rest }) => rest),
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
}, SAVE_DEBOUNCE);

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
      fileName: DEFAULT_FILE_NAME,
      fileVersion: 1,
      presets: [],

      // ─── File name & version ─────────────────────────────
      setFileName: (fileName) => {
        set({ fileName });
        get()._save();
      },

      setFileVersion: (fileVersion) => {
        const v = Math.max(1, Math.floor(fileVersion));
        set({ fileVersion: v });
        get()._save();
      },

      incrementVersion: () => {
        set({ fileVersion: get().fileVersion + 1 });
        get()._save();
      },

      decrementVersion: () => {
        const v = get().fileVersion;
        if (v > 1) {
          set({ fileVersion: v - 1 });
          get()._save();
        }
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
          if (n.type === 'section') return { ...n, zIndex: n.selected ? SECTION_SELECTED_Z_INDEX : SECTION_Z_INDEX };
          if (n.type === 'person') return { ...n, zIndex: PERSON_Z_INDEX };
          return n;
        });
        set({ nodes: updatedNodes });

        if (dragEnded && _preDragSnapshot) {
          // Commit one undo entry for the whole drag
          useFlowStore.temporal.getState().resume();
          const { pastStates } = useFlowStore.temporal.getState();
          useFlowStore.temporal.setState({
            pastStates: [...pastStates.slice(-(UNDO_LIMIT - 1)), _preDragSnapshot],
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
          sourceHandle: connection.sourceHandle || 'source-bottom',
          targetHandle: connection.targetHandle || 'target-top',
          id: uuidv4(),
          type: 'custom',
          data: { color: DEFAULT_EDGE_COLOR, dashed: false },
          markerEnd: { type: 'arrowclosed', color: DEFAULT_EDGE_COLOR },
          style: { stroke: DEFAULT_EDGE_COLOR, strokeWidth: DEFAULT_EDGE_STROKE_WIDTH },
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
          zIndex: PERSON_Z_INDEX,
          data: {
            name: DEFAULT_PERSON_NAME,
            role: DEFAULT_PERSON_ROLE,
            comment: '',
            showComment: false,
            photo: null,
            bgColor: DEFAULT_PERSON_BG,
            borderColor: DEFAULT_PERSON_BORDER,
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
            title: DEFAULT_SECTION_TITLE,
            color: DEFAULT_SECTION_COLOR,
          },
          style: { width: SECTION_DEFAULT_WIDTH, height: SECTION_DEFAULT_HEIGHT },
          zIndex: SECTION_Z_INDEX,
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
        // Commit after EDIT_COMMIT_DELAY ms of inactivity
        clearTimeout(_editTimer);
        _editTimer = setTimeout(() => {
          if (_editSnapshot) {
            useFlowStore.temporal.getState().resume();
            const { pastStates } = useFlowStore.temporal.getState();
            useFlowStore.temporal.setState({
              pastStates: [...pastStates.slice(-(UNDO_LIMIT - 1)), _editSnapshot],
              futureStates: [],
            });
            _editSnapshot = null;
          }
          useFlowStore.getState()._save();
        }, EDIT_COMMIT_DELAY);
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

      // ─── Auto-layout (dagre + side stacks) ─────────────
      autoLayout: () => {
        const { nodes, edges } = get();
        if (nodes.length === 0) return;

        const personNodes = nodes.filter((n) => n.type === 'person');
        const sectionNodes = nodes.filter((n) => n.type === 'section');
        const personIds = new Set(personNodes.map((n) => n.id));

        // ── Séparer les edges hiérarchiques (haut) des edges latéraux ──
        const treeEdges = [];
        const sideEdges = [];
        edges.forEach((e) => {
          if (!personIds.has(e.source) || !personIds.has(e.target)) return;
          const th = e.targetHandle || 'target-top';
          if (th === 'target-left' || th === 'target-right') {
            sideEdges.push(e);
          } else {
            treeEdges.push(e);
          }
        });

        const sideChildIds = new Set(sideEdges.map((e) => e.target));

        // ── Dagre : uniquement les edges hiérarchiques ──
        const g = new dagre.graphlib.Graph();
        g.setDefaultEdgeLabel(() => ({}));
        g.setGraph({
          rankdir: 'TB',
          ranksep: LAYOUT_RANK_SEP,
          nodesep: LAYOUT_NODE_SEP,
          marginx: LAYOUT_MARGIN_X,
          marginy: LAYOUT_MARGIN_Y,
        });

        personNodes.forEach((n) => {
          const hasTreeParent = treeEdges.some((e) => e.target === n.id);
          if (sideChildIds.has(n.id) && !hasTreeParent) {
            g.setNode(n.id, { width: 1, height: 1 });
          } else {
            g.setNode(n.id, { width: PERSON_NODE_WIDTH, height: PERSON_NODE_HEIGHT });
          }
        });

        treeEdges.forEach((e) => {
          g.setEdge(e.source, e.target);
        });

        dagre.layout(g);

        // ── Positions initiales depuis dagre ──
        const posMap = {};
        personNodes.forEach((n) => {
          const pos = g.node(n.id);
          posMap[n.id] = { x: pos.x - PERSON_NODE_WIDTH / 2, y: pos.y - PERSON_NODE_HEIGHT / 2 };
        });

        // ── Regrouper les enfants latéraux par parent ──
        const sideChildrenByParent = {};
        sideEdges.forEach((e) => {
          if (!sideChildrenByParent[e.source]) {
            sideChildrenByParent[e.source] = { left: [], right: [] };
          }
          const side = e.targetHandle === 'target-left' ? 'left' : 'right';
          sideChildrenByParent[e.source][side].push(e.target);
        });

        // ── Construire la map de descendants tree pour décaler les sous-arbres ──
        const treeChildrenMap = {};
        treeEdges.forEach((e) => {
          if (!treeChildrenMap[e.source]) treeChildrenMap[e.source] = [];
          treeChildrenMap[e.source].push(e.target);
        });

        function getTreeDescendants(nodeId, visited = new Set()) {
          if (visited.has(nodeId)) return [];
          visited.add(nodeId);
          const children = treeChildrenMap[nodeId] || [];
          const result = [...children];
          for (const child of children) {
            result.push(...getTreeDescendants(child, visited));
          }
          return result;
        }

        // ── Repositionner un enfant latéral + décaler son sous-arbre ──
        function repositionChild(childId, newPos) {
          const oldPos = posMap[childId];
          const dx = newPos.x - oldPos.x;
          const dy = newPos.y - oldPos.y;
          posMap[childId] = newPos;
          const descendants = getTreeDescendants(childId);
          descendants.forEach((descId) => {
            posMap[descId] = {
              x: posMap[descId].x + dx,
              y: posMap[descId].y + dy,
            };
          });
        }

        // ── Traitement en ordre BFS (parents avant enfants) ──
        const visited = new Set();
        const roots = personNodes
          .filter((n) => !edges.some((e) => e.target === n.id && personIds.has(e.source)))
          .map((n) => n.id);
        const queue = [...roots];
        const processOrder = [];
        while (queue.length) {
          const nid = queue.shift();
          if (visited.has(nid)) continue;
          visited.add(nid);
          processOrder.push(nid);
          edges.forEach((e) => {
            if (e.source === nid && personIds.has(e.target) && !visited.has(e.target)) {
              queue.push(e.target);
            }
          });
        }
        // Ajouter les nœuds non visités (cycles, isolés)
        personNodes.forEach((n) => {
          if (!visited.has(n.id)) processOrder.push(n.id);
        });

        // ── Placer les enfants latéraux ──
        processOrder.forEach((nid) => {
          const sides = sideChildrenByParent[nid];
          if (!sides) return;
          const parentPos = posMap[nid];

          // target-right → enfant à GAUCHE (flèche descend puis va à gauche vers le côté droit)
          sides.right.forEach((childId, i) => {
            repositionChild(childId, {
              x: parentPos.x - SIDE_OFFSET_X,
              y: parentPos.y + PERSON_NODE_HEIGHT + SIDE_START_Y + i * (PERSON_NODE_HEIGHT + SIDE_STACK_GAP_Y),
            });
          });

          // target-left → enfant à DROITE (flèche descend puis va à droite vers le côté gauche)
          sides.left.forEach((childId, i) => {
            repositionChild(childId, {
              x: parentPos.x + SIDE_OFFSET_X,
              y: parentPos.y + PERSON_NODE_HEIGHT + SIDE_START_Y + i * (PERSON_NODE_HEIGHT + SIDE_STACK_GAP_Y),
            });
          });
        });

        const laidOutPersons = personNodes.map((n) => ({
          ...n,
          position: posMap[n.id],
        }));

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
        const offset = PASTE_OFFSET;

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
              nodes: _migrateNodeZIndex(nodes || []),
              edges: _migrateEdges(edges || []),
              fileName: fileName || DEFAULT_FILE_NAME,
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
                nodes: _migrateNodeZIndex(nodes),
                edges: _migrateEdges(edges),
                fileName: meta.fileName || DEFAULT_FILE_NAME,
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
          fileName: DEFAULT_FILE_NAME,
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
      limit: UNDO_LIMIT,
    }
  )
);

export default useFlowStore;
