/**
 * Containers: the extra boxes stacked under each column.
 *
 * A container is just a category with a `parentId` pointing at a top-level
 * category. That way it already has everything a column needs (name, icon,
 * colour, its own bookmarks, drag-and-drop target, "Open all", edit/delete)
 * without a second data model. Only ONE level exists: a container cannot
 * itself have containers.
 *
 * Pure functions, `(state, ...) => nextState`, returning the SAME reference
 * when nothing changes (so React can skip a render and tests can assert it).
 */

/** Primary column + containers share a 20-row cap per slot. */
export const MAX_CONTAINERS_PER_COLUMN = 19;
export const DEFAULT_CONTAINER_NAME = 'New group';

// Neutral icon on purpose: containers never copy their parent's icon (the
// Personal column's icon is owner-protected, see PROTECTED.md).
const DEFAULT_CONTAINER_ICON = 'Bookmark';

const isTopLevel = (c) => !c.parentId;

export const topLevel = (categories) => categories.filter(isTopLevel);
export const childrenOf = (categories, parentId) => categories.filter((c) => c.parentId === parentId);

/** "Work / New group" for a container, plain name for a column. */
export function categoryLabel(categories, category) {
  const parent = category.parentId && categories.find((c) => c.id === category.parentId);
  return parent ? `${parent.name} / ${category.name}` : category.name;
}

function without(obj, key) {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

/** A parent must exist and be top-level itself; otherwise promote to top-level. */
function normalizeParents(categories) {
  const topIds = new Set(topLevel(categories).map((c) => c.id));
  let changed = false;
  const next = categories.map((c) => {
    if (c.parentId && !topIds.has(c.parentId)) {
      changed = true;
      return without(c, 'parentId');
    }
    return c;
  });
  return changed ? next : categories;
}

function makeContainer(parent, id) {
  return {
    id,
    name: DEFAULT_CONTAINER_NAME,
    icon: DEFAULT_CONTAINER_ICON,
    color: parent.color || 'lilac',
    parentId: parent.id,
  };
}

/**
 * Bring any state (fresh seed, old save, restored backup) to the shape the UI
 * expects: valid parent links, and one starting container under every column
 * that has none. A column whose last container the user deleted carries
 * `noContainers: true` so it is not recreated on the next load.
 * Ids are deterministic so running this twice never duplicates anything.
 */
export function ensureContainers(state) {
  const categories = normalizeParents(state.categories);
  const existing = new Set(categories.map((c) => c.id));
  const seeded = [];
  for (const parent of categories) {
    if (parent.parentId || parent.noContainers) continue;
    if (categories.some((c) => c.parentId === parent.id)) continue;
    const id = `grp-${parent.id}`;
    if (existing.has(id)) continue;
    seeded.push(makeContainer(parent, id));
  }
  if (categories === state.categories && seeded.length === 0) return state;
  return { ...state, categories: [...categories, ...seeded] };
}

/** Add an empty container under `parentId` (no-op past the per-column cap). */
export function addContainer(state, parentId, newId) {
  const parent = state.categories.find((c) => c.id === parentId && isTopLevel(c));
  if (!parent || !newId) return state;
  if (childrenOf(state.categories, parentId).length >= MAX_CONTAINERS_PER_COLUMN) return state;
  const categories = state.categories.map((c) => (c.id === parentId ? without(c, 'noContainers') : c));
  return { ...state, categories: [...categories, makeContainer(parent, newId)] };
}

/** Delete a container AND its bookmarks (the UI warns first). */
export function deleteContainer(state, id) {
  const target = state.categories.find((c) => c.id === id);
  if (!target || isTopLevel(target)) return state;
  let categories = state.categories.filter((c) => c.id !== id);
  if (childrenOf(categories, target.parentId).length === 0) {
    categories = categories.map((c) => (c.id === target.parentId ? { ...c, noContainers: true } : c));
  }
  return { ...state, categories, bookmarks: state.bookmarks.filter((b) => b.categoryId !== id) };
}

/**
 * Delete a column. Its own bookmarks move to the first remaining column (the
 * long-standing behaviour); its containers become columns of their own so
 * nothing in them is lost. Refuses to delete the last column.
 */
export function deleteColumn(state, id) {
  const target = state.categories.find((c) => c.id === id);
  if (!target || !isTopLevel(target)) return state;
  const fallback = topLevel(state.categories).find((c) => c.id !== id);
  if (!fallback) return state;
  const categories = state.categories
    .filter((c) => c.id !== id)
    .map((c) => (c.parentId === id ? without(c, 'parentId') : c));
  return {
    ...state,
    categories,
    bookmarks: state.bookmarks.map((b) => (b.categoryId === id ? { ...b, categoryId: fallback.id } : b)),
  };
}
