import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';

import Header from './components/Header.jsx';
import BookmarkColumns from './components/BookmarkColumns.jsx';
import BookmarkCard from './components/BookmarkCard.jsx';
import CategoryDragPreview from './components/CategoryDragPreview.jsx';
import AddBookmarkModal from './components/AddBookmarkModal.jsx';
import AddCategoryModal from './components/AddCategoryModal.jsx';
import { useHeightsMap } from './components/useHeightsMap.js';

import { DEFAULT_CATEGORIES, SAMPLE_BOOKMARKS } from './defaultData.js';
import { loadState, saveState, loadZoom, saveZoom, loadLookups, saveLookups } from './storage.js';
import { useStableCallback } from './useStableCallback.js';
import { writeBackup } from './backup.js';
import { buildSnapshot, serializeSnapshot, splitSnapshot } from './snapshot.js';
import { dropBookmark, reorderCategories } from './reorder.js';
import { hasLinkPayload, trackInternalDrags } from './linkDrop.js';
import { readClipboardLink } from './clipboardLink.js';
import { swallowClickAfterTouchDrag } from './swallowClick.js';
import { applyZoom, clampZoom } from './zoom.js';
import { LookupsContext, parseLookups, serializeLookups } from './lookups.js';
import { bookmarkLabel, fetchTitle, getDomain, getFaviconUrl } from './metadata.js';
import {
  MAX_CONTAINERS_PER_COLUMN, addContainer, categoryLabel, deleteColumn, deleteContainer,
  ensureContainers, topLevel,
} from './containers.js';
import { SCREEN_READER_INSTRUCTIONS, createAnnouncements } from './dndAnnouncements.js';
import { collisionDetection, keyboardCoordinates } from './dndCollision.js';

import './App.css';

const uid = (prefix = 'id') =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const COL_HEIGHTS_KEY = 'pf.bookmarkHome.colHeights.v2';

function seedState() {
  return {
    categories: DEFAULT_CATEGORIES,
    bookmarks: SAMPLE_BOOKMARKS,
  };
}

export default function App() {
  // Array position IS the display order (drag-and-drop reorders the array and
  // saveState persists it), so loaded bookmarks must NOT be re-sorted here —
  // an earlier createdAt sort silently undid every reorder on reload.
  // ensureContainers gives every column its starting container (and fixes
  // links in old saves / restored backups); it is a no-op once they exist.
  const [state, setState] = useState(() => ensureContainers(loadState() || seedState()));
  const [isAddBookmarkOpen, setAddBookmarkOpen] = useState(false);
  const [pendingCategoryId, setPendingCategoryId] = useState(null); // pre-select cat for add-modal
  const [editingBookmark, setEditingBookmark] = useState(null);
  const [bookmarkPopoverAnchor, setBookmarkPopoverAnchor] = useState(null);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryPopoverAnchor, setCategoryPopoverAnchor] = useState(null);
  const [activeDragBookmark, setActiveDragBookmark] = useState(null);
  const [activeDragCategory, setActiveDragCategory] = useState(null);
  // Column View is the only view (owner decision); the header has no view switch.
  const layout = 'horizontal';

  // Page zoom (this site only). applyZoom sets the --pf-zoom variable on
  // <html> (main.jsx already did it once before the first render); index.css
  // turns it into CSS `zoom`. Saved so it survives reloads.
  const [zoom, setZoom] = useState(() => clampZoom(loadZoom()));
  // Online lookups (Microlink titles, Google icons). On unless the visitor turned it off; saved on its own key.
  const [lookups, setLookups] = useState(() => parseLookups(loadLookups()));
  useEffect(() => { saveLookups(serializeLookups(lookups)); }, [lookups]);
  useEffect(() => {
    applyZoom(zoom);
    saveZoom(zoom);
  }, [zoom]);
  // Per-category custom heights (column view only), keyed by category id —
  // columns and containers alike. Missing entry → the CSS default.
  const [categoryHeights, setCategoryHeight, replaceCategoryHeights] = useHeightsMap(COL_HEIGHTS_KEY);

  // Persist state — localStorage is the fast primary cache; the optional
  // backup file (below) is the durable copy that survives a site-data wipe.
  useEffect(() => { saveState(state); }, [state]);

  // Everything a backup needs: app state + the per-category sizing maps.
  const snapshot = useMemo(
    () => buildSnapshot(state, { colHeights: categoryHeights }),
    [state, categoryHeights],
  );

  // Debounced backup writer — coalesces rapid changes into one write.
  useEffect(() => {
    const timer = setTimeout(() => writeBackup(serializeSnapshot(snapshot)), 500);
    return () => clearTimeout(timer);
  }, [snapshot]);

  const getStateSnapshot = useCallback(() => snapshot, [snapshot]);
  const handleRestore = useCallback((raw) => {
    const parsed = splitSnapshot(raw);
    if (!parsed) return; // backup.js already rejects bad files; this is the safety net
    setState(ensureContainers(parsed.state));
    if (parsed.dropped) {
      alert(`Restored, but skipped ${parsed.dropped} bookmark(s) with unsafe links (only http/https are allowed).`);
    }
    // Layout maps are optional (older backups predate them) — replaceAll
    // ignores undefined, leaving current sizes untouched in that case.
    // (Old backups may also carry secondaryHeights / containerGrid from the
    // placeholder-container era; they are simply ignored.)
    replaceCategoryHeights(parsed.layout.colHeights);
  }, [replaceCategoryHeights]);

  const { categories, bookmarks } = state;

  const bookmarksByCategory = useMemo(() => {
    const map = {};
    for (const cat of categories) map[cat.id] = [];
    for (const bm of bookmarks) {
      if (map[bm.categoryId]) map[bm.categoryId].push(bm);
    }
    // Display order = natural order in state.bookmarks. This lets
    // drag-reorders within a column stick without needing a separate
    // per-category order field.
    return map;
  }, [bookmarks, categories]);

  // --- Bookmark mutations ---
  const addBookmark = (payload) => {
    const id = uid('bm'); // outside the updater: updaters must be pure
    // Append to the end so the newest bookmark shows up at the bottom of
    // its column (right above the + slot, which visually "goes down").
    setState((s) => ({
      ...s,
      bookmarks: [
        ...s.bookmarks,
        { id, createdAt: Date.now(), ...payload },
      ],
    }));
    return id;
  };

  // The toast: a short status message, optionally with an Undo for a bookmark
  // we just added on the user's behalf (link drop, or a copied link).
  const [toast, setToast] = useState(null); // { text, undoId? }
  // The last copied link a "+" click turned into a bookmark. Clicking "+" again
  // with the same link still on the clipboard opens the Add dialog instead, so
  // adding a second, typed bookmark (or undoing a wrong one) never re-adds it.
  const lastClipboardUrl = useRef(null);
  useEffect(() => trackInternalDrags(), []);
  useEffect(() => {
    // A link dropped anywhere that is NOT a column would make the browser
    // navigate this tab away to it. Refuse those drops instead.
    const refuse = (e) => {
      if (e.defaultPrevented || !hasLinkPayload(e.dataTransfer)) return;
      e.preventDefault();
      if (e.type === 'dragover') e.dataTransfer.dropEffect = 'none';
    };
    window.addEventListener('dragover', refuse);
    window.addEventListener('drop', refuse);
    return () => {
      window.removeEventListener('dragover', refuse);
      window.removeEventListener('drop', refuse);
    };
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    // Longer when there is an Undo to reach for.
    const t = setTimeout(() => setToast(null), toast.undoId ? 8000 : 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Add a link as a bookmark in a column/container and offer Undo. Used by
  // link drop and by the copied-link "+" click.
  const addLinkTo = (categoryId, link) => {
    const name = categoryLabel(categories, categories.find((c) => c.id === categoryId) || {});
    if (!link) {
      setToast({ text: 'That is not a web link, so nothing was added. Drag a link from the address bar or bookmarks bar.' });
      return;
    }
    const title = bookmarkLabel(link);
    const id = addBookmark({ url: link.url, title, favicon: getFaviconUrl(link.url), categoryId });
    setToast({ text: `Added ${title} (${getDomain(link.url)}) to ${name}.`, undoId: id });
    // Same as the Add form: swap in the page's real title when it arrives,
    // unless the user already renamed it in the meantime.
    if (!link.title) {
      fetchTitle(link.url, { enabled: lookups }).then((real) => {
        if (!real || real === title) return;
        setState((s) => ({
          ...s,
          bookmarks: s.bookmarks.map((b) => (b.id === id && b.title === title ? { ...b, title: real } : b)),
        }));
      });
    }
  };

  const updateBookmark = (id, payload) => {
    setState((s) => ({
      ...s,
      bookmarks: s.bookmarks.map((b) => (b.id === id ? { ...b, ...payload } : b)),
    }));
  };

  const deleteBookmark = (id) => {
    setState((s) => ({ ...s, bookmarks: s.bookmarks.filter((b) => b.id !== id) }));
  };

  // Drag-drop reordering lives in reorder.js (pure + unit-tested).
  const handleBookmarkDrop = (activeBookmarkId, overData) => {
    setState((s) => dropBookmark(s, activeBookmarkId, overData));
  };

  // --- Category mutations ---
  const addCategory = (payload) => {
    setState((s) => ensureContainers({
      ...s,
      categories: [...s.categories, { id: uid('cat'), ...payload }],
    }));
  };

  const addContainerTo = (parentId) => {
    setState((s) => addContainer(s, parentId, uid('grp')));
  };

  const updateCategory = (id, payload) => {
    setState((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...payload } : c)),
    }));
  };

  const deleteCategory = (id) => {
    const target = categories.find((c) => c.id === id);
    if (!target) return;
    // Guard + alert live OUTSIDE the updater: updaters must be pure, and
    // StrictMode runs them twice in dev (=> two alerts).
    if (target.parentId) {
      setState((s) => deleteContainer(s, id)); // container: its bookmarks go too
      return;
    }
    if (topLevel(categories).length <= 1) {
      alert('Keep at least one category — this is your last one.');
      return;
    }
    setState((s) => deleteColumn(s, id));
  };

  // What the delete confirmation says, since columns and containers differ.
  const deleteMessageFor = (cat) => {
    if (!cat) return undefined;
    if (!cat.parentId) return undefined; // modal's default (bookmarks move)
    const n = (bookmarksByCategory[cat.id] || []).length;
    return n === 0
      ? `Delete the empty container "${cat.name}"?`
      : `Delete "${cat.name}" and its ${n} bookmark${n === 1 ? '' : 's'}? This cannot be undone.`;
  };

  // The "+" button. If a web link was just copied, add it right away (Undo is
  // on the toast); otherwise, or if the browser will not share the clipboard,
  // open the Add dialog as before. Must start synchronously inside the click so
  // the browser counts it as a user gesture.
  const openAddBookmarkFor = async (categoryId) => {
    const link = await readClipboardLink();
    if (link && link.url !== lastClipboardUrl.current) {
      lastClipboardUrl.current = link.url;
      addLinkTo(categoryId || topLevel(categories)[0]?.id, link);
      return;
    }
    setEditingBookmark(null);
    setBookmarkPopoverAnchor(null);
    setPendingCategoryId(categoryId || null);
    setAddBookmarkOpen(true);
  };

  // Stable identity so the memoised card contents are not re-rendered by it.
  const openEditBookmark = useStableCallback((bookmark, rect) => {
    setEditingBookmark(bookmark);
    setBookmarkPopoverAnchor(rect || null);
    setAddBookmarkOpen(true);
  });

  // --- DnD wiring ---
  const sensors = useSensors(
    // Mouse: a drag starts after 4px of movement, so a plain click still
    // opens the link.
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // Touch: a drag needs a short press-and-hold. A quick swipe that starts on
    // a card is then a normal scroll instead of grabbing the card. Moving more
    // than 8px during the hold means "scroll", and cancels the drag.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    // Keyboard drag-and-drop (WCAG 2.1.1): Space/Enter on a drag handle, arrow
    // keys to move, Space/Enter to drop, Escape to cancel.
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }),
  );

  // Spoken feedback uses real titles/names instead of dnd-kit's raw ids.
  const accessibility = useMemo(() => ({
    announcements: createAnnouncements({
      bookmarkTitle: (id) => bookmarks.find((b) => b.id === id)?.title,
      categoryName: (id) => categories.find((c) => c.id === id)?.name,
    }),
    screenReaderInstructions: SCREEN_READER_INSTRUCTIONS,
  }), [bookmarks, categories]);

  const handleDragStart = (event) => {
    const data = event.active?.data?.current;
    if (data?.type === 'bookmark') {
      const bm = bookmarks.find((b) => b.id === data.bookmarkId);
      setActiveDragBookmark(bm || null);
    } else if (data?.type === 'category') {
      const cat = categories.find((c) => c.id === data.categoryId);
      setActiveDragCategory(cat || null);
    }
  };

  const handleCategoryReorder = (activeId, overId) => {
    setState((s) => reorderCategories(s, activeId, overId));
  };

  const handleDragEnd = (event) => {
    setActiveDragBookmark(null);
    setActiveDragCategory(null);
    // Letting go after a touch drag must not also open the link under the finger.
    swallowClickAfterTouchDrag(event.activatorEvent);
    const { active, over } = event;
    if (!over) return;

    const activeType = active?.data?.current?.type;
    const overType = over?.data?.current?.type;

    // Case 1: category reorder — both active and over are categories
    if (activeType === 'category' && overType === 'category') {
      handleCategoryReorder(active.data.current.categoryId, over.data.current.categoryId);
      return;
    }

    // Case 2: bookmark being moved — could land on another bookmark
    // (reorder / cross-column) or on a category area (append).
    if (activeType === 'bookmark') {
      handleBookmarkDrop(active.data.current.bookmarkId, over.data.current);
    }
  };

  return (
    <LookupsContext.Provider value={lookups}>
      <DndContext
        sensors={sensors}
        accessibility={accessibility}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={(event) => {
          setActiveDragBookmark(null);
          setActiveDragCategory(null);
          swallowClickAfterTouchDrag(event.activatorEvent);
        }}
      >
        <div className="pf-app">
          <Header
            bookmarkCount={bookmarks.length}
            getStateSnapshot={getStateSnapshot}
            onRestore={handleRestore}
            zoom={zoom}
            onZoomChange={setZoom}
            lookups={lookups}
            onLookupsChange={setLookups}
          />

          <main className="pf-main">
            <div className="pf-cols-scroll">
              <BookmarkColumns
                layout={layout}
                categoryHeights={categoryHeights}
                onResizeCategoryHeight={setCategoryHeight}
                onAddContainer={addContainerTo}
                onDropLink={addLinkTo}
                maxContainers={MAX_CONTAINERS_PER_COLUMN}
                categories={categories}
                bookmarksByCategory={bookmarksByCategory}
                onAddToCategory={openAddBookmarkFor}
                onEditBookmark={openEditBookmark}
                onEditCategory={(id, rect) => {
                  const cat = categories.find((c) => c.id === id);
                  if (cat) {
                    setEditingCategory(cat);
                    setCategoryPopoverAnchor(rect || null);
                    setAddCategoryOpen(true);
                  }
                }}
                onAddCategory={(rect) => {
                  setEditingCategory(null);
                  setCategoryPopoverAnchor(rect || null);
                  setAddCategoryOpen(true);
                }}
              />
            </div>
          </main>

          <AddBookmarkModal
            open={isAddBookmarkOpen}
            onClose={() => {
              setAddBookmarkOpen(false);
              setPendingCategoryId(null);
              setEditingBookmark(null);
              setBookmarkPopoverAnchor(null);
            }}
            onSubmit={(payload) => {
              if (editingBookmark) updateBookmark(editingBookmark.id, payload);
              else addBookmark(payload);
            }}
            onDelete={(id) => deleteBookmark(id)}
            // The category is never asked for: an add comes from a column's "+"
            // (pendingCategoryId), an edit keeps the bookmark's own.
            defaultCategoryId={pendingCategoryId || topLevel(categories)[0]?.id}
            initial={editingBookmark}
            anchorRect={bookmarkPopoverAnchor}
          />

          <AddCategoryModal
            open={addCategoryOpen}
            onClose={() => {
              setAddCategoryOpen(false);
              setEditingCategory(null);
              setCategoryPopoverAnchor(null);
            }}
            onSubmit={(payload) => {
              if (editingCategory) updateCategory(editingCategory.id, payload);
              else addCategory(payload);
            }}
            onDelete={(id) => deleteCategory(id)}
            deleteMessage={deleteMessageFor(editingCategory)}
            initial={editingCategory}
            anchorRect={categoryPopoverAnchor}
          />
        </div>

        {/* Spoken and shown after a link is dropped in from the browser. */}
        <div className="pf-toast" role="status">
          {toast?.text}
          {toast?.undoId && (
            <button
              type="button"
              className="pf-toast__undo"
              onClick={() => { deleteBookmark(toast.undoId); setToast({ text: 'Removed.' }); }}
            >
              Undo
            </button>
          )}
        </div>

        <DragOverlay
          className="pf-drag-overlay"
          dropAnimation={{ duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
        >
          {activeDragBookmark ? (
            <BookmarkCard bookmark={activeDragBookmark} dragOverlay />
          ) : activeDragCategory ? (
            <CategoryDragPreview category={activeDragCategory} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </LookupsContext.Provider>
  );
}
