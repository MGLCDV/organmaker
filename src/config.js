// ═══════════════════════════════════════════════════════════════
//  OrganMaker — Configuration centralisée
// ═══════════════════════════════════════════════════════════════
//  Ce fichier regroupe TOUTES les constantes globales de
//  l'application. Modifie les valeurs ici pour ajuster le
//  comportement, les couleurs, les dimensions, etc.
// ═══════════════════════════════════════════════════════════════


// ─── Grille & Canvas ────────────────────────────────────────

/** Taille de la grille snap-to-grid en pixels [x, y] */
export const GRID_SIZE = [16, 16];

/** Variante du fond de grille ('dots' | 'lines' | 'cross') */
export const GRID_VARIANT = 'dots';

/** Taille des points / traits de la grille */
export const GRID_DOT_SIZE = 1;

/** Couleur des points / traits de la grille */
export const GRID_DOT_COLOR = '#cbd5e1';


// ─── Export (PNG / PDF) ─────────────────────────────────────

/** Couleur d'arrière-plan lors de l'export PNG / PDF */
export const EXPORT_BG_COLOR = '#f8fafc';

/** Ratio de pixels souhaité pour l'export PNG (sera réduit si le canvas est trop grand) */
export const EXPORT_PIXEL_RATIO = 2;

/** Ratio de pixels souhaité pour l'export PDF (2 = net sur écran, fichier léger) */
export const EXPORT_PDF_PIXEL_RATIO = 2;

/** Marge autour du contenu lors de l'export pleine résolution (px) */
export const EXPORT_PADDING = 40;

/** Taille max d'un côté du canvas d'export (px). Au-delà, le navigateur crash. */
export const EXPORT_MAX_CANVAS_SIDE = 8192;

/** Nombre max de pixels total pour le canvas d'export (largeur × hauteur × ratio²) */
export const EXPORT_MAX_CANVAS_PIXELS = 40_000_000;


// ─── Stockage local ─────────────────────────────────────────

/** Clé utilisée dans localStorage pour sauvegarder l'organigramme */
export const STORAGE_KEY = 'organmaker-flow';


// ─── Undo / Redo ────────────────────────────────────────────

/** Nombre maximum d'états dans l'historique d'annulation */
export const UNDO_LIMIT = 50;

/** Délai (ms) après la dernière frappe avant de valider un état d'édition */
export const EDIT_COMMIT_DELAY = 600;

/** Délai (ms) de debounce pour la sauvegarde automatique */
export const SAVE_DEBOUNCE = 300;


// ─── Dimensions des nœuds ───────────────────────────────────

/** Largeur d'un nœud Personne (px) — utilisé pour le layout et le rendu */
export const PERSON_NODE_WIDTH = 256;

/** Hauteur estimée d'un nœud Personne (px) — utilisé pour le layout dagre */
export const PERSON_NODE_HEIGHT = 200;

/** Largeur par défaut d'un nœud Section (px) */
export const SECTION_DEFAULT_WIDTH = 500;

/** Hauteur par défaut d'un nœud Section (px) */
export const SECTION_DEFAULT_HEIGHT = 350;

/** Largeur minimum d'un nœud Section (px) */
export const SECTION_MIN_WIDTH = 200;

/** Hauteur minimum d'un nœud Section (px) */
export const SECTION_MIN_HEIGHT = 150;


// ─── z-Index des nœuds ──────────────────────────────────────

/** z-index des nœuds Personne (au-dessus des flèches) */
export const PERSON_Z_INDEX = 10;

/** z-index des nœuds Section (en arrière-plan) */
export const SECTION_Z_INDEX = -10;

/** z-index des nœuds Section quand sélectionnés */
export const SECTION_SELECTED_Z_INDEX = -5;


// ─── Auto-Layout (dagre) ────────────────────────────────────

/** Espacement vertical entre les rangs de l'arbre (px) */
export const LAYOUT_RANK_SEP = 100;

/** Espacement horizontal entre nœuds voisins dans l'arbre (px) */
export const LAYOUT_NODE_SEP = 60;

/** Marge horizontale autour du graphe (px) */
export const LAYOUT_MARGIN_X = 40;

/** Marge verticale autour du graphe (px) */
export const LAYOUT_MARGIN_Y = 40;

/** Décalage horizontal des enfants connectés par le côté (px, valeur positive) */
export const SIDE_OFFSET_X = 180;

/** Espace vertical entre enfants empilés par le côté (px) */
export const SIDE_STACK_GAP_Y = 25;

/** Espace vertical entre le parent et le premier enfant latéral (px) */
export const SIDE_START_Y = 40;


// ─── Copier / Coller ────────────────────────────────────────

/** Décalage appliqué à chaque collage successif (px) */
export const PASTE_OFFSET = 60;


// ─── Couleur par défaut des connexions ──────────────────────

/** Couleur par défaut des nouvelles connexions */
export const DEFAULT_EDGE_COLOR = '#6366f1';

/** Épaisseur par défaut des traits de connexion (px) */
export const DEFAULT_EDGE_STROKE_WIDTH = 2;

/** Courbure de la courbe Bézier des connexions */
export const EDGE_CURVATURE = 0.25;


// ─── Couleurs par défaut des nœuds ──────────────────────────

/** Couleur de fond par défaut d'un nœud Personne */
export const DEFAULT_PERSON_BG = '#ffffff';

/** Couleur de bordure par défaut d'un nœud Personne */
export const DEFAULT_PERSON_BORDER = '#e5e7eb';

/** Couleur de fond par défaut d'un nœud Section */
export const DEFAULT_SECTION_COLOR = '#e0e7ff';

/** Couleur de fond du cercle photo quand le fond est blanc */
export const PERSON_PHOTO_FALLBACK_BG = '#eef2ff';


// ─── Palettes de couleurs ───────────────────────────────────

/** Palette de couleurs de fond pour les nœuds Personne */
export const PERSON_BG_COLORS = [
  '#ffffff', '#f1f5f9', '#e0e7ff', '#fce7f3',
  '#d1fae5', '#fef3c7', '#e0f2fe', '#f3e8ff',
];

/** Palette de couleurs de bordure pour les nœuds Personne */
export const PERSON_BORDER_COLORS = [
  '#e5e7eb', '#6366f1', '#ec4899', '#10b981',
  '#f59e0b', '#0ea5e9', '#8b5cf6', '#ef4444',
];

/** Palette de couleurs de fond pour les nœuds Section */
export const SECTION_COLORS = [
  '#e0e7ff', '#fce7f3', '#d1fae5', '#fef3c7',
  '#e0f2fe', '#f3e8ff', '#ffedd5', '#f1f5f9',
];

/** Palette de couleurs pour les connexions (edges) */
export const EDGE_COLORS = [
  '#6366f1', '#ef4444', '#10b981', '#0ea5e9',
  '#f59e0b', '#8b5cf6', '#6b7280', '#ec4899',
];


// ─── Noms & textes par défaut ───────────────────────────────

/** Nom de fichier par défaut */
export const DEFAULT_FILE_NAME = 'Mon Organigramme';

/** Nom par défaut d'une nouvelle personne */
export const DEFAULT_PERSON_NAME = 'Nouveau';

/** Rôle par défaut d'une nouvelle personne */
export const DEFAULT_PERSON_ROLE = 'Rôle';

/** Titre par défaut d'une nouvelle section */
export const DEFAULT_SECTION_TITLE = 'Nouvelle Section';


// ─── Compression des photos ─────────────────────────────────

/** Dimension maximum (largeur ou hauteur) de la photo compressée (px) */
export const PHOTO_MAX_SIZE = 200;

/** Qualité de compression JPEG (0 à 1) */
export const PHOTO_QUALITY = 0.7;

/** Format MIME de la photo compressée */
export const PHOTO_FORMAT = 'image/jpeg';


// ─── MiniMap ────────────────────────────────────────────────

/** Couleur par défaut des nœuds Personne dans la minimap */
export const MINIMAP_PERSON_COLOR = '#6366f1';

/** Couleur du masque de la minimap */
export const MINIMAP_MASK_COLOR = 'rgba(248, 250, 252, 0.7)';
