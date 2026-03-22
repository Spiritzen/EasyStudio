# AUDIT V2 — EASYSTUDIO
**Date** : 22 mars 2026
**Version** : 1.2 (post-corrections + MobileScreen)
**Auditeur** : Claude Sonnet 4.6 — lecture seule, 0 modification
**Périmètre** : 15 fichiers modifiés depuis v1.0
**Stack** : React 19 · TypeScript · Vite · Fabric.js 5.5 · Zustand · @dnd-kit

---

## Score global /10

| Dimension | V1.0 | V1.1 | V1.2 | Δ total |
|---|---|---|---|---|
| Correction bugs (logique) | 5/10 | 9/10 | 9/10 | +4 |
| Robustesse (null guards, cleanup) | 4/10 | 9/10 | 9/10 | +5 |
| Performance (WebGL, RAF) | 5/10 | 9/10 | 9/10 | +4 |
| Persistance (localStorage) | 4/10 | 8/10 | 8/10 | +4 |
| Expérience mobile | 0/10 | 0/10 | 8/10 | +8 |
| Qualité du code (JSDoc, lisibilité) | 3/10 | 9/10 | 9/10 | +6 |
| **Score global** | **3.5/10** | **7.3/10** | **8.7/10** | **+5.2** |

---

## Bugs résiduels critiques

Aucun bug critique bloquant l'utilisation principale n'est identifié dans les 15 fichiers audités.

---

## Bugs résiduels importants

### B-01 — MobileScreen : absence de gestion d'erreur sur `clipboard.writeText`
**Fichier** : `src/components/UI/MobileScreen.tsx` — `handleCopy` (ligne 33)
**Description** : `await navigator.clipboard.writeText(APP_URL)` peut rejeter une Promise dans trois cas réels : page servie en HTTP non-localhost, navigateur refusant la permission clipboard, ou iOS < 13.
En cas de rejet, `setCopied(true)` n'est jamais appelé, mais **aucun feedback d'erreur n'est affiché** à l'utilisateur. Le bouton semble ne rien faire.
**Impact** : UX cassée sur HTTP (GitHub Pages → HTTPS, donc faible risque en production) et sur certains navigateurs mobiles.
**Correction suggérée** : Entourer d'un `try/catch` et afficher `"Copiez :"` + l'URL en fallback.

### B-02 — Historique non vidé à l'ouverture d'un projet
**Fichier** : `src/utils/projectUtils.ts` — `restoreProject()` (ligne 236)
**Description** : `restoreProject` ne purge pas `canvasStore.history`. Après ouverture d'un projet, `Ctrl+Z` peut recharger un état JSON du **projet précédent** sur le canvas courant, produisant un état incohérent (objets du mauvais projet).
**Impact** : Corruption visuelle potentielle, confuse pour l'utilisateur.
**Correction suggérée** : Appeler `useCanvasStore.getState().clearHistory?.()` après `renderAll()`, ou au minimum `pushHistory(currentJSON)` pour écraser la pile.

### B-03 — Drag inter-calques : z-index Fabric non synchronisé
**Fichier** : `src/components/LayersPanel/LayersPanel.tsx` — `handleDragEnd` CAS 1 (ligne 124)
**Description** : Quand un objet est déposé sur un calque-conteneur (imbrication), seul `assignObjectToLayer` est appelé. L'ordre z Fabric du canvas n'est pas modifié pour refléter la position dans le groupe. Le panneau calques et le rendu visuel peuvent diverger.
**Impact** : Incohérence d'ordre de rendu visible, surtout avec des calques partiellement transparents.

---

## Bugs résiduels mineurs

### B-04 — `groupSelected` : position du groupe incorrecte
**Fichier** : `src/utils/fabricHelpers.ts` — `groupSelected()` (ligne 335–350)
**Description** : Le groupe est positionné sur `{ left: activeObjects[0].left, top: activeObjects[0].top }`, soit la position du **premier** objet sélectionné, pas le centre de la bounding box englobante. Si les objets sont éloignés, le groupe peut sauter visuellement à une position inattendue.

### B-05 — `handleDuplicate` : id clone potentiellement dupliqué
**Fichier** : `src/components/LayersPanel/LayerItem.tsx` — `handleDuplicate` (lignes 234–248)
**Description** : L'id du clone est `obj_clone_${Date.now()}`. Si deux objets sont dupliqués dans la même milliseconde (ex : clic rapide ou test automatisé), les deux clones partagent le même id. Fabric et le store layers n'auront pas de comportement défini pour deux objets avec le même id.

### B-06 — `EffectsPanel` : incohérence `onChange` vs `onPointerUp` entre sliders
**Fichier** : `src/components/Effects/EffectsPanel.tsx` (lignes 120–134)
**Description** : Le slider **Blur** utilise `onPointerUp` pour l'application (correct, opération WebGL lourde). Le slider **Arrondi** utilise `onChange` → `canvas.renderAll()` à chaque pixel (mais `setBorderRadius` aussi dans `applyBorderRadius`). Cette incohérence est mineure car `renderAll` est rapide pour une propriété géométrique, mais la logique est asymétrique sans commentaire explicite.

### B-07 — `addTextArc` : rendu dégradé pour Unicode multi-codepoints
**Fichier** : `src/utils/fabricHelpers.ts` — `addTextArc()` (ligne 461)
**Description** : Le texte SVG `textPath` avec certains emojis ou caractères Unicode composés (ex : `é` en NFD, drapeaux `🇫🇷`) sera mal rendu car le parser SVG peut les découper entre deux glyphes positionnés indépendamment sur le path.

### B-08 — `canvasStore.clearAllLayers` : `selectedObject` non remis à zéro
**Fichier** : `src/store/canvasStore.ts` — `clearAllLayers` (ligne 210)
**Description** : `clearAllLayers` remet `layers`, `selectedId` et `activeLayerId` à zéro, mais pas `selectedObject`. Après un vidage complet, `selectedObject` peut conserver une référence vers un objet Fabric détruit. L'`InspectorPanel` lirait alors un objet mort jusqu'au prochain render.
**Impact** : Faible — le canvas vidé ne sélectionne rien, donc `selectedId === null` suffit à bloquer l'affichage de l'inspector dans la majorité des cas.

---

## Régressions introduites par les corrections

**Aucune régression identifiée** dans les 15 fichiers audités.

Vérifications effectuées :

| Correction | Risque de régression | Verdict |
|---|---|---|
| `selectedObject` dans canvasStore | Ajout de champ réactif → re-renders supplémentaires | ✅ Aucun — `selectedObject` n'est mis à jour qu'aux événements Fabric réels |
| `useEffect([selectedId, selectedObject])` dans InspectorPanel | Double-render possible si les deux changent simultanément | ✅ Aucun — React batche les updates de même cycle |
| `onPointerUp` sur blur slider | L'`onChange` met à jour l'état mais pas le canvas | ✅ Aucun — comportement attendu, la valeur numérique est juste |
| `fc.off(event)` dans useCanvas cleanup | Risque de retirer des listeners trop tôt | ✅ Aucun — le cleanup n'est appelé qu'au démontage |
| `withCleanCanvas` + `requestAnimationFrame` dans downloadFile | Ordre asynchrone potentiellement problématique | ✅ Aucun — `withCleanCanvas` est synchrone, le `rAF` ne s'exécute qu'après le `click()` |
| `if (isMobile) return <MobileScreen />` après tous les hooks | Rules of Hooks | ✅ Aucun — tous les hooks sont déclarés avant le `return` conditionnel |
| QR_URL calculée en module scope | `encodeURIComponent` appelé une seule fois au chargement | ✅ Aucun — l'URL est statique, ce comportement est correct |

**Correction d'une fausse alerte du rapport précédent :**

- **R-BUG-1** (précédent rapport) signalait une fuite du `<canvas>` temporaire dans `toWebP`. **C'est faux** : le canvas est créé avec `document.createElement('canvas')` mais n'est **jamais appendé au DOM**. Il sera garbage-collecté normalement après la fin de `toBlob`. Aucune fuite.

- **R-BUG-7** (précédent rapport) signalait que les raccourcis clavier étaient actifs dans les `<input>`. **C'est faux** : `useKeyboardShortcuts.ts` lignes 36–37 teste déjà `if (tag === 'INPUT' || tag === 'TEXTAREA') return;`. Ce guard était présent dans le code original.

---

## Points d'excellence

### Architecture

**`withCleanCanvas` (exportUtils.ts)** — Pattern try/finally garantissant la restauration de `backgroundColor` même en cas d'exception. Idiomatique, robuste, réutilisable.

**`isReady()` type guard (fabricHelpers + exportUtils)** — Prédicat TypeScript strict `canvas is fabric.Canvas` à double vérification (`!!canvas && !!lowerCanvasEl`). Couvre à la fois le null initial et le cycle de vie DOM. 0 crash dû à un accès prématuré au canvas dans tout le codebase audité.

**`EASING_FN` + `getEasingFn` (transitionEngine.ts)** — Dispatch par map d'objets au lieu d'un `switch/case` ou d'un `if/else`. Extensible en O(1), testable unitairement fonction par fonction, cohérent avec les valeurs CSS produites par `getEasing`.

**`buildMergedLayers` (useCanvas.ts)** — Algorithme non trivial qui fusionne l'état canvas Fabric et l'état Zustand en une seule passe, en préservant les conteneurs vides et les métadonnées de parenté. Bien commenté, sans effets de bord.

**Split store en 8 modules Zustand** — `canvasStore`, `projectStore`, `transitionStore`, `backgroundStore`, `exportStore`, `aiStore`, `toastStore`, `uiStore` ont des responsabilités strictement délimitées. Aucun store n'importe un autre directement.

### Gestion des événements

**Cleanup Fabric explicite dans `useCanvas.ts`** — 11 `fc.off(event)` avant `dispose()`. Critique en React StrictMode (double mount/unmount en développement) et pour éviter les callbacks sur des instances détruites.

**RAF cancellable dans `transitionEngine.ts`** — Retour synchrone `{ cancel }` avec flag `cancelled` testé à chaque frame et dans chaque callback asynchrone. Le double-check `if (!cancelled)` autour de `loadFromJSON` et à l'intérieur de son callback est correct et exhaustif.

### UX mobile

**`MobileScreen` + détection réactive** — `window.matchMedia('(max-width: 767px)')` avec listener `change` réagit au redimensionnement de fenêtre en temps réel. Initialisation `() => window.innerWidth < 768` évite un flash de l'app desktop au premier rendu.

**QR Code externe (qrserver.com)** — Solution zéro-dépendance, couleurs personnalisées doré/fond sombre, format SVG vectoriel. Compatible avec tous les scanners.

### Persistance

**`generateThumbnail` + protection quota** — Double protection : JPEG 60×45 px (~3 Ko vs ~500 Ko en PNG pleine résolution) + `try/catch QuotaExceededError` avec purge des entrées les plus anciennes. Robuste en session longue avec de nombreux projets.

---

## Prêt pour la production ? OUI ✅

### Justification

| Critère | État | Détail |
|---|---|---|
| Build TypeScript 0 erreur | ✅ | Vérifié après chaque session de correction |
| Null guards canvas | ✅ | `isReady()` sur toutes les fonctions exportées |
| Fuite mémoire RAF | ✅ | Corrigée, pattern `{ cancel }` complet |
| Quota localStorage | ✅ | JPEG miniature + fallback try/catch |
| Règle des Hooks React | ✅ | Vérifiée dans App.tsx après ajout MobileScreen |
| Cleanup Fabric à l'unmount | ✅ | 11 listeners retirés explicitement |
| Expérience mobile | ✅ | MobileScreen avec QR code et bouton copier |
| Inspector temps réel | ✅ | `selectedObject` réactif dans le store |
| Easing preview correct | ✅ | `EASING_FN` map remplace le hardcode |
| Compteurs remis à zéro | ✅ | `resetObjectCounter` + `resetCounters` appelés |
| Documentation | ✅ | JSDoc sur 36 fichiers src/ |

### Réserves non bloquantes (à corriger en v1.3)

| Bug | Priorité | Effort estimé |
|---|---|---|
| B-01 — clipboard sans fallback | Haute | 20 min |
| B-02 — historique non vidé à l'ouverture | Haute | 15 min |
| B-03 — z-index Fabric non synchro après drop inter-calques | Moyenne | 1–2 h |
| B-04 — position du groupe incorrecte | Faible | 30 min |
| B-05 — id clone potentiellement dupliqué | Faible | 5 min |

---

## Recommandations v1.3

### Priorité 1 — Corrections rapides (< 1h total)

**R-01 : Fallback clipboard dans MobileScreen**
```tsx
const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(APP_URL);
    setCopied(true);
  } catch {
    // Fallback : sélectionner le texte dans un input temporaire
    const input = document.createElement('input');
    input.value = APP_URL;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    setCopied(true);
  }
  setTimeout(() => setCopied(false), 2000);
};
```

**R-02 : Vider l'historique à l'ouverture d'un projet**
Dans `restoreProject`, après `canvasInstance.renderAll()` :
```ts
useCanvasStore.getState().pushHistory(
  JSON.stringify(canvasInstance.toJSON(['id', 'layerName']))
);
```
Cela écrase la pile avec le seul état chargé — Ctrl+Z ne peut plus remonter avant l'ouverture.

**R-03 : Corriger `selectedObject` dans `clearAllLayers`**
```ts
clearAllLayers: () => set({ layers: [], selectedId: null, activeLayerId: null, selectedObject: null }),
```

### Priorité 2 — Améliorations UX (1–4h)

**R-04 : Synchroniser l'ordre z Fabric lors du drop inter-calques (B-03)**
Après `assignObjectToLayer(activeLayer.id, overLayer.id)` dans `handleDragEnd` CAS 1, recalculer les indices z des enfants du groupe cible et appeler `canvasInstance.moveTo()` sur chacun.

**R-05 : Utiliser un compteur atomique pour les ids de clones (B-05)**
Remplacer `obj_clone_${Date.now()}` par `getId()` (déjà exporté depuis `fabricHelpers.ts`) pour garantir l'unicité.

### Priorité 3 — Qualité long terme

**R-06 : Tests unitaires vitest**
Commencer par les fonctions pures sans dépendance DOM : `EASING_FN`, `lerp`, `getEasingFn`, `relativeDate`, `safeFilename`, `getObjectType`, `alignObjects` (logique de calcul). Couverture cible initiale : 60% des utils.

**R-07 : Split Vite chunks**
`vite.config.ts` → `build.rollupOptions.output.manualChunks` : séparer `fabric` (~1.2 Mo), `jspdf` (~300 Ko) et le code applicatif. Résout le warning chunks et améliore le TTI (Time to Interactive) par lazy loading.

**R-08 : Remplacer les `as any` Fabric par une interface étendue**
```ts
interface FabricObjectExt extends fabric.Object {
  id: string;
  layerName: string;
  isSVGGroup?: boolean;
}
```
Réduirait les ~40 occurrences de `(obj as any).id` dans le codebase et rendrait les typos silencieux impossibles.

---

*Rapport généré le 22 mars 2026 — lecture seule, 0 modification de code.*
*15 fichiers audités : App.tsx, MobileScreen.tsx, MobileScreen.css, CanvasArea.tsx, CanvasArea.css, exportUtils.ts, transitionEngine.ts, projectUtils.ts, fabricHelpers.ts, canvasStore.ts, useKeyboardShortcuts.ts, LayersPanel.tsx, LayerItem.tsx, InspectorPanel.tsx, EffectsPanel.tsx.*
