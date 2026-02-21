# OrganMaker

Éditeur d'organigrammes en ligne, gratuit et sans inscription. Tout se passe dans le navigateur.

**→ [Utiliser OrganMaker](https://mglcdv.github.io/organmaker/)**

---

## En bref

Créez des organigrammes visuels en drag & drop : ajoutez des personnes, regroupez-les dans des sections, reliez-les avec des flèches, personnalisez les couleurs, exportez le résultat. Vos données restent dans votre navigateur (localStorage) — rien n'est envoyé sur un serveur.

## Fonctionnalités

### Noeuds

- **Personne** — Carte avec nom, rôle, commentaire optionnel et photo uploadable. Couleurs de fond et de bordure personnalisables (8 palettes chacune).
- **Section** — Zone de regroupement redimensionnable avec titre éditable et couleur pastel au choix (8 options). Sert de conteneur visuel pour organiser les équipes.

### Connexions

- Flèches courbes (Bézier) entre les noeuds, créées par drag d'un handle à l'autre.
- **Couleur** (8 choix) et **style** (plein / pointillé) personnalisables par flèche via un menu au survol.
- Suppression au clic.

### Presets

Sélectionnez un groupe de noeuds + leurs connexions, sauvegardez-le comme preset réutilisable. Renommez, supprimez ou insérez un preset en un clic depuis la sidebar. Pratique pour dupliquer une structure d'équipe.

### Auto-layout

Bouton **Organiser** : positionne automatiquement les noeuds en arbre hiérarchique (algorithme dagre, top-down).

### Undo / Redo

Historique complet (50 niveaux). Les drags et les éditions de texte sont regroupés intelligemment pour un undo propre.

### Import / Export

| Format | Description |
|--------|-------------|
| **PNG** | Capture haute résolution du canvas (2x pixel ratio) |
| **PDF** | Document paysage ou portrait selon le ratio du contenu |
| **JSON** | Sauvegarde complète (noeuds, connexions, presets). Réimportable. Version auto-incrémentée. |

### Copier / Coller

`Ctrl+C` / `Ctrl+V` sur les noeuds sélectionnés. Les connexions internes sont dupliquées aussi.

### Persistance

Sauvegarde automatique dans le localStorage. Vos organigrammes sont là quand vous revenez.

## Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `P` | Ajouter une personne |
| `S` | Ajouter une section |
| `Ctrl + Z` | Annuler |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Rétablir |
| `Ctrl + C` | Copier la sélection |
| `Ctrl + V` | Coller |
| `&` | Appliquer le 1er preset |
| `é` | Appliquer le 2ème preset |
| `Suppr` / `Backspace` | Supprimer la sélection |

> Les raccourcis sont désactivés quand un champ texte est actif.

## Stack technique

- **React 19** + **Vite 7**
- **React Flow** — canvas interactif
- **Zustand** + **Zundo** — state management + undo/redo
- **dagre** — auto-layout en arbre
- **html-to-image** + **jsPDF** — exports PNG/PDF
- **Tailwind CSS** — styles

## Lancer en local

```bash
git clone https://github.com/mglcdv/organmaker.git
cd organmaker
npm install
npm run dev
```

Ouvrir http://localhost:5173

## Build

```bash
npm run build
```

Les fichiers de production sont générés dans `dist/`.
