import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge as rfAddEdge,
} from 'reactflow';
import { v4 as uuidv4 } from 'uuid';

// Clé localStorage
const STORAGE_KEY = 'organmaker-flow';

/**
 * Store Zustand pour gérer l'état complet de l'organigramme :
 * - nodes & edges
 * - ajout / suppression / mise à jour
 * - sauvegarde et chargement localStorage
 */
const useFlowStore = create((set, get) => ({
  // ─── State ────────────────────────────────────────────
  nodes: [],
  edges: [],
  fileName: 'Mon Organigramme',
  fileVersion: 1,

  // ─── Actions ──────────────────────────────────────────
  setFileName: (fileName) => {
    set({ fileName });
    get().saveFlow();
  },

  // ─── React Flow callbacks ─────────────────────────────
  onNodesChange: (changes) => {
    let updatedNodes = applyNodeChanges(changes, get().nodes);
    // Forcer le z-index : sections toujours en fond, personnes toujours devant
    updatedNodes = updatedNodes.map((n) => {
      if (n.type === 'section') return { ...n, zIndex: n.selected ? -5 : -10 };
      if (n.type === 'person') return { ...n, zIndex: 10 };
      return n;
    });
    set({ nodes: updatedNodes });
    get().saveFlow();
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
    get().saveFlow();
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
    get().saveFlow();
  },

  // ─── Nodes ────────────────────────────────────────────

  /** Ajouter un bloc Personne */
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
        photo: null, // base64 data-url
        bgColor: '#ffffff',
        borderColor: '#e5e7eb',
      },
    };
    set({ nodes: [...get().nodes, node] });
    get().saveFlow();
  },

  /** Ajouter un bloc Section (group node) */
  addSectionNode: (position = { x: 50, y: 50 }) => {
    const node = {
      id: uuidv4(),
      type: 'section',
      position,
      data: {
        title: 'Nouvelle Section',
        color: '#e0e7ff', // pastel indigo par défaut
      },
      style: { width: 500, height: 350 },
      zIndex: 0,
    };
    set({ nodes: [...get().nodes, node] });
    get().saveFlow();
  },

  /** Supprimer un node (et ses edges associées) */
  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
    });
    get().saveFlow();
  },

  /** Mettre à jour les data d'un node */
  updateNodeData: (nodeId, newData) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n
      ),
    });
    get().saveFlow();
  },

  // ─── Edges ────────────────────────────────────────────

  /** Ajouter une edge manuellement */
  addEdge: (edge) => {
    set({ edges: [...get().edges, { ...edge, id: edge.id || uuidv4() }] });
    get().saveFlow();
  },

  /** Supprimer une edge */
  removeEdge: (edgeId) => {
    set({ edges: get().edges.filter((e) => e.id !== edgeId) });
    get().saveFlow();
  },

  /** Mettre à jour les data d'une edge */
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
    get().saveFlow();
  },

  // ─── Persistence ─────────────────────────────────────

  /** Sauvegarder l'état dans localStorage */
  saveFlow: () => {
    const { nodes, edges, fileName, fileVersion } = get();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges, fileName, fileVersion }));
    } catch {
      // Quota dépassé – silencieux
    }
  },

  /** Charger l'état depuis localStorage */
  loadFlow: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { nodes, edges, fileName, fileVersion } = JSON.parse(raw);
        set({
          nodes: nodes || [],
          edges: edges || [],
          fileName: fileName || 'Mon Organigramme',
          fileVersion: fileVersion || 1,
        });
      }
    } catch {
      // JSON invalide – on repart à vide
    }
  },

  // ─── Import / Export JSON ───────────────────────────

  /** Exporter l'état en fichier JSON */
  exportFlow: () => {
    const { nodes, edges, fileName, fileVersion } = get();
    const payload = {
      meta: {
        app: 'OrganMaker',
        version: String(fileVersion),
        fileName,
        exportedAt: new Date().toISOString(),
      },
      nodes,
      edges,
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
    // Incrémenter la version pour le prochain export
    set({ fileVersion: fileVersion + 1 });
    get().saveFlow();
  },

  /** Importer un fichier JSON et remplacer l'état */
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
              'Remplacer l\'organigramme actuel par les données importées ?'
            )
          )
            return;
          const meta = data.meta || {};
          set({
            nodes,
            edges,
            fileName: meta.fileName || 'Mon Organigramme',
            fileVersion: parseInt(meta.version, 10) || 1,
          });
          get().saveFlow();
        } catch {
          alert('Impossible de lire le fichier JSON.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },

  /** Tout réinitialiser */
  resetFlow: () => {
    set({ nodes: [], edges: [], fileName: 'Mon Organigramme', fileVersion: 1 });
    localStorage.removeItem(STORAGE_KEY);
  },
}));

export default useFlowStore;
