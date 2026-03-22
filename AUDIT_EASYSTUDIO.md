# AUDIT EASYSTUDIO v1.0
> Généré le 2026-03-22 — Analyse statique complète du code source

---

## 🔴 BUGS CRITIQUES
*(cassent une feature ou produisent un résultat incorrect)*

---

### 1. `exportUtils.ts:33-39` — `toJPEG` n'efface pas `backgroundColor`
**Description :** `toPNG` et `toSVG` sauvegardent et vident `canvas.backgroundColor` avant l'export puis le restaurent. `toJPEG` ne le fait pas.
```ts
export function toJPEG(canvas, quality = 0.92) {
  // ← pas de savedBg / canvas.backgroundColor = ''
  const dataUrl = canvas.toDataURL({ format: 'jpeg', ... });
```
**Impact utilisateur :** Le fond Fabric (s'il est défini) est inclus dans l'export JPEG. L'utilisateur qui veut exporter sans fond obtient un JPEG avec le fond violet/sombre par défaut.
**Cause :** Oubli d'alignement avec le pattern de `toPNG`.

---

### 2. `exportUtils.ts:42-61` — `toWebP` n'efface pas `backgroundColor`
**Description :** Même bug que JPEG. `toWebP` appelle `canvas.toDataURL({ format: 'png' })` sans vider le `backgroundColor`.
**Impact utilisateur :** Export WebP inclut le fond Fabric — la transparence attendue disparaît.
**Cause :** Copie incomplète du pattern de `toPNG`.

---

### 3. `exportUtils.ts:64-71` — `toPDF` utilise les dimensions DOM (post-zoom)
**Description :**
```ts
const w = canvas.getWidth();   // retourne la largeur DOM × zoom
const h = canvas.getHeight();  // ex: zoom 50% → 400px au lieu de 800px
const pdf = new jsPDF({ format: [w, h] });
pdf.addImage(dataUrl, 'PNG', 0, 0, w, h);
```
`canvas.getWidth()` renvoie la taille DOM (pixels CSS après zoom), pas la taille logique du canvas.
**Impact utilisateur :** Si le canvas est zoomé à 75%, le PDF aura un format `[600, 450]` au lieu de `[800, 600]`. Le contenu est mal dimensionné dans le PDF.
**Cause probable :** Même bug que la StatusBar avant correction — confusion taille logique vs taille DOM.

---

### 4. `projectUtils.ts:80-82` — `saveProject` sauvegarde les dimensions DOM (post-zoom)
**Description :**
```ts
canvas: {
  width: canvasInstance.getWidth(),   // DOM, pas logique
  height: canvasInstance.getHeight(),
},
```
Si le canvas est zoomé à 50% pendant la sauvegarde, le projet sauvegardé aura `width: 400` au lieu de `800`. À la restauration (`setWidth(400)`), le canvas est redimensionné à 400px de manière permanente.
**Impact utilisateur :** Bug silencieux de corruption des dimensions — un projet sauvegardé en mode zoomé change de taille à la réouverture.
**Cause :** `getWidth()` / `getHeight()` retournent les dimensions DOM. Correction : diviser par `getZoom()`.

---

### 5. `transitionStore.ts:93-108` — `loadState` manipule le DOM directement, sans nettoyage
**Description :**
```ts
const el = canvas.wrapperEl as HTMLElement | null;
if (el) { el.style.transition = 'opacity 0.2s'; el.style.opacity = '0'; }
setTimeout(() => {
  canvas.loadFromJSON(state.fabricJSON, () => {
    if (el) { el.style.opacity = '1'; }
  });
}, 200);
```
- Manipulation directe du style DOM dans un store Zustand (anti-pattern)
- Si le canvas est démonté entre le `setTimeout(200)` et la callback, `el.style.opacity = '1'` est appelé sur un élément détaché
- Si `loadFromJSON` échoue ou prend plus de 200ms, `el.style.opacity` reste à `'0'` → canvas invisible
**Impact utilisateur :** Canvas potentiellement rendu invisible de façon permanente si le chargement d'état est interrompu.
**Cause :** Logique d'animation non-React dans un store Zustand sans guard de démontage.

---

### 6. `transitionStore.ts:83-88` — `deleteState` ne réinitialise pas `fromStateId`/`toStateId`
**Description :**
```ts
deleteState: (id) =>
  set((s) => ({
    states: s.states.filter((st) => st.id !== id),
    transitions: s.transitions.filter(...),
    // ← fromStateId et toStateId ne sont pas mis à jour
  })),
```
Si l'état supprimé est référencé par `fromStateId` ou `toStateId`, ces IDs pointent vers un état inexistant. `canPlay` vérifie `!!fromStateId && !!toStateId` — reste `true` avec des IDs invalides.
**Impact utilisateur :** Le bouton "Jouer" reste actif. En cliquant, `fromState` ou `toState` sera `undefined`, causant une erreur silencieuse dans `playTransition`.
**Cause :** Oubli de mise à jour des IDs sélectionnés lors de la suppression.

---

### 7. `FileMenu.tsx:123` — URL blob non révoquée lors de l'import image
**Description :**
```ts
const url = URL.createObjectURL(file);
addImage(canvasInstance, url);   // addImage ne révoque jamais l'URL
```
`addImage` dans `fabricHelpers.ts:91-99` ne révoque jamais l'URL `blob:`. Chaque image importée via FileMenu crée un leak mémoire permanent.
**Impact utilisateur :** Accumulation de URLs blob en mémoire sur une session longue avec beaucoup d'imports. Peut éventuellement saturer la mémoire du navigateur.
**Cause :** `addImageFromBlob` révoque l'URL (ligne 114) mais `addImage` (URL string) ne le fait pas.

---

## 🟠 BUGS IMPORTANTS
*(feature dégradée mais app globalement fonctionnelle)*

---

### 1. `InspectorPanel.tsx:27-39` — Inspector ne se met pas à jour après modification sur le canvas
**Description :** Le `useEffect` ne dépend que de `[selectedId, canvasInstance]`. Si l'utilisateur déplace/redimensionne un objet via Fabric.js, `selectedId` ne change pas → l'Inspector affiche les valeurs d'origine.
**Impact utilisateur :** Les champs X/Y/L/H/Rotation de l'Inspector restent figés pendant et après un drag sur le canvas. Désorientant pour l'utilisateur.
**Cause :** Absence d'écoute sur les événements `object:modified` / `object:moving` de Fabric.

---

### 2. `transitionEngine.ts:19-22` — L'easing sélectionné par l'utilisateur n'est pas appliqué en preview
**Description :** La preview canvas via `playTransition` utilise `easeInOut` hardcodé :
```ts
const easeInOut = (t: number) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
// ...
const eased = easeInOut(progress);  // toujours cette fonction
```
`config.easing` n'est utilisé que pour générer le CSS. Le sélecteur d'easing (Élastique, Rebond, etc.) n'a aucun effet sur la preview canvas.
**Impact utilisateur :** Ce que l'utilisateur voit dans la preview ne correspond pas à l'animation CSS exportée.
**Cause :** `getEasing()` retourne du CSS, pas une fonction JS. Il manque un mappage easing-name → fonction JS d'interpolation.

---

### 3. `canvasStore.ts:94-100` — `reorderLayers` ignore la hiérarchie groupes/enfants
**Description :**
```ts
reorderLayers: (from, to) => set((state) => {
  const arr = [...state.layers];
  const [removed] = arr.splice(from, 1);
  arr.splice(to, 0, removed);
  return { layers: arr };
}),
```
Déplace un item par index global sans tenir compte des parentLayerId. Un objet-enfant peut se retrouver avant son groupe parent dans le tableau, ou entre un groupe et ses enfants — cassant `childrenOf()`.
**Impact utilisateur :** Utilisé par les boutons "Monter/Descendre" du context menu (`LayerItem.tsx:232-249`). Peut désynchroniser l'arborescence calques.
**Cause :** Implémentation générique non hiérarchique — fonctionnait avant l'introduction des groupes.

---

### 4. `LayerItem.tsx:232-249` — "Monter/Descendre" utilise `reorderLayers` avec l'index global
**Description :**
```ts
const allLayers = useCanvasStore.getState().layers;
const idx = allLayers.findIndex((l) => l.id === layer.id);
if (idx > 0) reorderLayers(idx, idx - 1);
```
L'index dans `allLayers` (tableau global incluant groupes + enfants) ne correspond pas à la position voulue. Monter un enfant d'index 2 vers index 1 (le groupe parent) place l'enfant AVANT son groupe.
**Impact utilisateur :** Les boutons Monter/Descendre du menu contextuel peuvent casser l'arborescence des calques.
**Cause :** Utilisation de l'index global au lieu de l'index dans la liste des siblings.

---

### 5. `fabricHelpers.ts:228-241` — `groupSelected` utilise `left/top` du premier objet
**Description :**
```ts
const group = new fabric.Group(activeObjects, {
  left: activeObjects[0].left,
  top: activeObjects[0].top,
});
```
Fabric.js calcule le centre du groupe automatiquement — forcer `left/top` du premier objet peut décaler la position du groupe si ce n'est pas le coin supérieur gauche de la sélection.
**Impact utilisateur :** Les groupes créés manuellement peuvent apparaître décalés par rapport à la sélection originale.
**Cause :** `left/top` doit être la position calculée du bounding box, pas celle du premier objet.

---

### 6. `CanvasArea.tsx:36` — `canvasSize` utilise la taille DOM pour les règles
**Description :**
```ts
const update = () => setCanvasSize({
  w: canvasInstance.getWidth(),   // DOM post-zoom
  h: canvasInstance.getHeight(),
});
```
`canvasSize` est passé à `<Ruler>` qui l'utilise pour afficher les graduations. Les règles affichent la taille DOM zoomée, pas la taille logique du document.
**Impact utilisateur :** À zoom 50%, les règles indiquent 400px au lieu de 800px — la graduation est fausse.
**Cause :** Confusion récurrente `getWidth()` DOM vs logique.

---

## 🟡 AVERTISSEMENTS
*(code fragile ou risques potentiels)*

---

### 1. `fabricHelpers.ts:3-4` — Compteur `objectCounter` module-level non remis à zéro
`let objectCounter = 0` est partagé globalement. `newProject()` ne le réinitialise pas. Les noms d'objets continuent leur numérotation entre projets (`Rectangle 12` dans le projet 2 alors que c'est le premier rectangle).
**Risque :** Confusion de nommage côté utilisateur. Si les IDs dépendaient du compteur pour l'unicité (ils incluent `Date.now()` donc OK), pas de collision.

---

### 2. `transitionEngine.ts` — Animations RAF non annulables lors du démontage du composant
`playTransition` retourne une `Promise` mais les `requestAnimationFrame` internes n'ont pas de mécanisme d'annulation. Si `TransitionsPanel` est démonté en changeant d'onglet pendant une animation, le RAF continue à appeler `canvas.requestRenderAll()` sur un canvas potentiellement dans un état incohérent.
**Risque :** Animations "fantômes" après navigation — faible probabilité d'erreur visible, mais consommation CPU inutile.

---

### 3. `projectUtils.ts:53` — Déduplication des projets récents par titre uniquement
```ts
getRecentProjects().filter((r) => r.title !== entry.title)
```
Deux projets distincts avec le même titre s'écrasent mutuellement dans les recents.
**Risque :** Perte d'accès à un projet récent si l'utilisateur travaille sur deux projets de même nom.

---

### 4. `projectUtils.ts` — Projets récents stockés avec `fileData` complet en localStorage
Chaque entrée de `RecentProject` inclut `fileData: EasyStudioFile` complet (objets Fabric sérialisés + thumbnails base64). Avec 5 projets max, un projet riche peut représenter plusieurs Mo. La limite localStorage (~5-10 Mo selon navigateur) peut être atteinte silencieusement.
**Risque :** `localStorage.setItem` lève une `QuotaExceededError` — capturée par le `try/catch` de `save()` dans backgroundStore mais PAS dans `addToRecent()` qui n'a pas de try/catch. Crash silencieux.

---

### 5. `useCanvas.ts` — Dépendances manquantes dans les `useCallback`
`saveHistory` dépend de `pushHistory` et `syncLayers`. `syncLayers` dépend de `setLayers`. Ces sont déclarées avec `useCallback([setLayers])` et `useCallback([pushHistory, syncLayers])` — correct. Mais `saveHistory` est utilisée dans les listeners Fabric enregistrés dans `useEffect([], [])` (deps vides). Les listeners capturent la version initiale de `saveHistory`. En pratique ça fonctionne car `fabricRef` est une ref stable, mais un changement de `pushHistory` (si le store change) ne serait pas reflété.
**Risque :** Faible en pratique (store Zustand ne change pas ses fonctions), mais source potentielle de bugs futurs.

---

### 6. `backgroundStore.ts:43-46` — `setBgColor` force silencieusement `bgTransparent: false`
```ts
setBgColor: (color) => set((s) => {
  const next = { ...s, bgColor: color, bgTransparent: false };
```
Ce comportement est intentionnel (choisir une couleur = quitter le mode transparent) mais n'est pas documenté. Si `setBgColor` est appelé lors d'une restauration de projet avec `bgTransparent: true`, le transparent sera perdu selon l'ordre d'appel.
**Risque :** Dans `restoreProject`, l'ordre est `setBgColor` puis `setBgTransparent(true)` — correct. Mais si l'ordre change, le transparent disparaît.

---

## 🔵 QUALITÉ DE CODE
*(pas des bugs, améliorations recommandées)*

---

### 1. `fabricHelpers.ts` — Aucun guard null sur le paramètre `canvas`
Toutes les fonctions (`addRect`, `addCircle`, etc.) n'ont pas de guard `if (!canvas) return`. Actuellement protégées par `withCanvas` dans ToolsMenu mais un appel direct sans guard lèverait une exception non catchée.
**Recommandation :** Ajouter `if (!canvas) return;` en tête de chaque fonction exportée.

---

### 2. `LayersPanel.tsx` — `childrenOf(layer.id)` appelé deux fois dans le render
```tsx
childrenOf(layer.id).length > 0 ? (
  <SortableContext items={childrenOf(layer.id).map(...)} ...>
    {childrenOf(layer.id).map(...)}
```
Trois appels de filtre par groupe rendu.
**Recommandation :** Stocker en variable locale : `const children = childrenOf(layer.id);`

---

### 3. `InspectorPanel.tsx:22-25` — `getSelectedObject` recréée à chaque render
Fonction définie inline dans le composant, non mémoïsée. Appelée dans `useEffect` et `applyChange`. Pas de problème de performance actuel mais inconsistant avec le reste du code.
**Recommandation :** `useCallback` ou extraire en utilitaire.

---

### 4. `exportUtils.ts:4-9` — `downloadFile` crée un élément `<a>` sans l'attacher au DOM
`a.click()` sans `document.body.appendChild(a)` fonctionne dans Chrome/Firefox mais peut échouer dans Safari ou certains contextes embarqués.
**Recommandation :** `document.body.appendChild(a); a.click(); document.body.removeChild(a);`

---

### 5. `transitionEngine.ts:6-17` — `getEasing()` non utilisé pour la preview canvas
La fonction est correctement implémentée pour le CSS mais n'a aucun équivalent JS pour l'animation RAF.
**Recommandation :** Ajouter un mappage `easing → fonction JS` et l'utiliser dans `animate()` à la place de `easeInOut` hardcodé.

---

### 6. `canvasStore.ts` — `clearAllLayers` ne réinitialise pas `activeLayerId`/`emptyLayerCount`
```ts
clearAllLayers: () => set({ layers: [], selectedId: null, activeLayerId: null }),
```
`emptyLayerCount` n'est pas remis à 0. Après "Tout supprimer", le prochain calque créé sera "Calque 4" si 3 avaient été créés. Pas un bug critique mais confusant.
**Recommandation :** Ajouter `emptyLayerCount: 0` dans le reset.

---

## ✅ CE QUI FONCTIONNE BIEN

- **Architecture Zustand** : Stores bien séparés (canvas, ui, background, transition, project), selectors corrects, pas de mutations directes (sauf `loadState` signalé)
- **Guards canvas** : `isReady(canvas)` dans `zoomUtils.ts`, `requestAnimationFrame` init dans `useCanvas.ts` — robuste
- **Export SVG/PNG** : `backgroundColor` correctement vidé et restauré
- **Sauvegarde/chargement `.easylogo`** : Format complet, restauration layers + background + transitions, gestion erreur fichier corrompu, projets récents fonctionnels
- **DnD calques** : `SortableContext` imbriqué, 3 cas bien distincts dans `handleDragEnd`, `setLayers()` via store Zustand — propre
- **Grille/Règles** : Store UIStore propre, overlay CSS pur (opacity transition), pas de manipulation DOM
- **Welcome overlay** : `localStorage` + dismiss permanent au premier objet ajouté — correct
- **Background store** : Persistance localStorage, reset, mode transparent — robuste
- **Keyboard shortcuts** : Nettoyage des listeners dans le hook de retour
- **Menus (FileMenu, ToolsMenu)** : Fermeture au clic extérieur + Escape, nettoyage des listeners dans `useEffect` cleanup
- **Transitions store** : Auto-sélection from/to sur 2ème capture, suppression transitions orphelines lors de `deleteState` (transitions)
- **Import SVG** : CORS test préalable, `addSVGFromFile` via FileReader, révocation URL correcte dans `addImageFromBlob`
- **Toast system** : Store indépendant, propre
- **Undo/redo** : JSON sérialisé à chaque modification, limite 50 entrées, index cohérent

---

## 📊 RÉSUMÉ

| Catégorie | Nombre |
|-----------|--------|
| 🔴 Bugs critiques | **7** |
| 🟠 Bugs importants | **6** |
| 🟡 Avertissements | **6** |
| 🔵 Qualité de code | **6** |

**Score de stabilité global : 5.5/10**
*(L'app est utilisable mais plusieurs exports produisent des résultats incorrects, et les bugs de dimensions DOM/logique sont systémiques)*

### Priorité de correction recommandée

1. **🔴 IMMÉDIAT** — `toJPEG` + `toWebP` : ajouter le save/clear/restore `backgroundColor` (2 lignes chacun)
2. **🔴 IMMÉDIAT** — `exportUtils.toPDF` + `projectUtils.saveProject` : remplacer `getWidth()`/`getHeight()` par `/getZoom()`
3. **🔴 IMPORTANT** — `deleteState` : ajouter reset `fromStateId`/`toStateId` si l'ID supprimé est actif
4. **🔴 IMPORTANT** — `FileMenu` blob URL leak : stocker l'URL et la révoquer dans le callback de `addImage`
5. **🟠 IMPORTANT** — `InspectorPanel` : écouter `object:modified` / `object:moving` pour sync des valeurs
6. **🟠 IMPORTANT** — `transitionEngine` : mapper les easings en fonctions JS pour la preview
7. **🟠 MOYEN** — `loadState` dans transitionStore : migrer l'animation vers un useEffect React avec ref d'annulation
8. **🟡 FAIBLE** — `addToRecent` : ajouter try/catch pour les erreurs de quota localStorage
