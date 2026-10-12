import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor,
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
import { loadState, saveState } from './storage.js';
import { writeBackup } from './backup.js';
import { buildSnapshot, serializeSnapshot, splitSnapshot } from './snapshot.js';
import { dropBookmark, reorderCategories } from './reorder.js';
import { SCREEN_READER_INSTRUCTIONS, createAnnouncements } from './dndAnnouncements.js';
import { collisionDetection, keyboardCoordinates } from './dndCollision.js';

import './App.css';

const uid = (prefix = 'id') =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const COL_HEIGHTS_KEY = 'pf.bookmarkHome.colHeights.v2';
const SECONDARY_HEIGHTS_KEY = 'pf.bookmarkHome.secondaryHeights.v1';
const CONTAINER_GRID_KEY = 'pf.bookmarkHome.containerGrid.v1';

/* Cap on the per-slot container stack. Primary + secondary are the two
   base rows; users can add extras below via the "+ Add below" button up
   to this total. Horizontal growth (side-by-side sub-columns) is
   intentionally disabled — the app grows only downward. */
const MAX_ROWS_PER_SUBCOL = 20;

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
  const [state, setState] = useState(() => loadState() || seedState());
  const [isAddBookmarkOpen, setAddBookmarkOpen] = useState(false);
  const [pendingCategoryId, setPendingCategoryId] = useState(null); // pre-select cat for add-modal
  const [editingBookmark, setEditingBookmark] = useState(null);
  const [bookmarkPopoverAnchor, setBookmarkPopoverAnchor] = useState(null);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryPopoverAnchor, setCategoryPopoverAnchor] = useState(null);
  const [activeDragBookmark, setActiveDragBookmark] = useState(null);
  const [activeDragCategory, setActiveDragCategory] = useState(null);
  // Layout always starts in Column View on load — no persistence. Users
  // can toggle to Shelves during a session, but a reload resets them.
  const [layout, setLayout] = useState('horizontal');
  // Per-category custom heights (horizontal/column view only). Missing
  // entries → container uses the CSS default. Two parallel maps: one for
  // the primary column, one for the secondary container beneath it.
  const [categoryHeights, setCategoryHeight, replaceCategoryHeights] = useHeightsMap(COL_HEIGHTS_KEY);
  const [secondaryHeights, setSecondaryHeight, replaceSecondaryHeights] = useHeightsMap(SECONDARY_HEIGHTS_KEY);

  /* Per-category mini-grid of extra containers beyond primary+secondary.
     Missing entry ⇒ {rows: 0} ⇒ the default 1×2 layout. */
  const [containerGrid, setContainerGridEntry, replaceContainerGrid] = useHeightsMap(CONTAINER_GRID_KEY);

  const growContainerGrid = useCallback((categoryId) => {
    if (!categoryId) return;
    const rows = containerGrid[categoryId]?.rows || 0;
    if (rows >= MAX_ROWS_PER_SUBCOL - 2) return;
    setContainerGridEntry(categoryId, { rows: rows + 1 });
  }, [containerGrid, setContainerGridEntry]);

  // Persist state — localStorage is the fast primary cache; the optional
  // backup file (below) is the durable copy that survives a site-data wipe.
  useEffect(() => { saveState(state); }, [state]);

  // Everything a backup needs: app state + the per-category sizing maps.
  const snapshot = useMemo(
    () => buildSnapshot(state, {
      colHeights: categoryHeights,
      secondaryHeights,
      containerGrid,
    }),
    [state, categoryHeights, secondaryHeights, containerGrid],
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
    setState(parsed.state);
    if (parsed.dropped) {
      alert(`Restored, but skipped ${parsed.dropped} bookmark(s) with unsafe links (only http/https are allowed).`);
    }
    // Layout maps are optional (older backups predate them) — replaceAll
    // ignores undefined, leaving current sizes untouched in that case.
    replaceCategoryHeights(parsed.layout.colHeights);
    replaceSecondaryHeights(parsed.layout.secondaryHeights);
    replaceContainerGrid(parsed.layout.containerGrid);
  }, [replaceCategoryHeights, replaceSecondaryHeights, replaceContainerGrid]);

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
    // Append to the end so the newest bookmark shows up at the bottom of
    // its column (right above the + slot, which visually "goes down").
    setState((s) => ({
      ...s,
      bookmarks: [
        ...s.bookmarks,
        { id: uid('bm'), createdAt: Date.now(), ...payload },
      ],
    }));
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
    setState((s) => ({
      ...s,
      categories: [...s.categories, { id: uid('cat'), ...payload }],
    }));
  };

  const updateCategory = (id, payload) => {
    setState((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...payload } : c)),
    }));
  };

  const deleteCategory = (id) => {
    // Guard + alert live OUTSIDE the updater: updaters must be pure, and
    // StrictMode runs them twice in dev (=> two alerts).
    if (categories.length <= 1) {
      alert('Keep at least one category — this is your last one.');
      return;
    }
    setState((s) => {
      const remaining = s.categories.filter((c) => c.id !== id);
      const fallback = remaining[0]?.id;
      if (!fallback) return s;
      return {
        ...s,
        categories: remaining,
        bookmarks: s.bookmarks.map((b) => (b.categoryId === id ? { ...b, categoryId: fallback } : b)),
      };
    });
  };

  const openAddBookmarkFor = (categoryId) => {
    setEditingBookmark(null);
    setBookmarkPopoverAnchor(null);
    setPendingCategoryId(categoryId || null);
    setAddBookmarkOpen(true);
  };

  const openEditBookmark = (bookmark, rect) => {
    setEditingBookmark(bookmark);
    setBookmarkPopoverAnchor(rect || null);
    setAddBookmarkOpen(true);
  };

  // --- DnD wiring ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
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
    <DndContext
      sensors={sensors}
      accessibility={accessibility}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => { setActiveDragBookmark(null); setActiveDragCategory(null); }}
    >
      <div className="pf-app">
        <Header
          bookmarkCount={bookmarks.length}
          getStateSnapshot={getStateSnapshot}
          onRestore={handleRestore}
          layout={layout}
          onToggleLayout={() => setLayout((l) => (l === 'vertical' ? 'horizontal' : 'vertical'))}
        />

        <main className="pf-main">
          <div className="pf-cols-scroll">
            <BookmarkColumns
              layout={layout}
              categoryHeights={categoryHeights}
              onResizeCategoryHeight={setCategoryHeight}
              secondaryHeights={secondaryHeights}
              onResizeSecondaryHeight={setSecondaryHeight}
              containerGrid={containerGrid}
              onGrowContainerGrid={growContainerGrid}
              maxRowsPerSubcol={MAX_ROWS_PER_SUBCOL}
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
          categories={categories}
          defaultCategoryId={pendingCategoryId || undefined}
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
          initial={editingCategory}
          anchorRect={categoryPopoverAnchor}
        />
      </div>

      <DragOverlay
        dropAnimation={{ duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        {activeDragBookmark ? (
          <BookmarkCard bookmark={activeDragBookmark} dragOverlay />
        ) : activeDragCategory ? (
          <CategoryDragPreview category={activeDragCategory} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
