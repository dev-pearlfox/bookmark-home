import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

import Header from './components/Header.jsx';
import BookmarkColumns from './components/BookmarkColumns.jsx';
import BookmarkCard from './components/BookmarkCard.jsx';
import CategoryDragPreview from './components/CategoryDragPreview.jsx';
import AddBookmarkModal from './components/AddBookmarkModal.jsx';
import AddCategoryModal from './components/AddCategoryModal.jsx';
import { useHeightsMap } from './components/useHeightsMap.js';

import { DEFAULT_CATEGORIES, SAMPLE_BOOKMARKS } from './defaultData.js';
import { loadState, saveState } from './storage.js';
import { tryLoadBackupOnStartup, writeBackup } from './backup.js';

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
    activeCategoryId: 'all',
  };
}

export default function App() {
  const [state, setState] = useState(() => {
    const loaded = loadState();
    if (loaded?.bookmarks) {
      // Normalize display order on first load: oldest first, so subsequent
      // drag-reorders can use the natural array position as source of truth.
      loaded.bookmarks = [...loaded.bookmarks].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }
    return loaded || seedState();
  });
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
  const [categoryHeights, setCategoryHeight] = useHeightsMap(COL_HEIGHTS_KEY);
  const [secondaryHeights, setSecondaryHeight] = useHeightsMap(SECONDARY_HEIGHTS_KEY);

  /* Per-category mini-grid of extra containers beyond primary+secondary.
     Missing entry ⇒ {cols: 0, rows: 0} ⇒ the default 1×2 layout. */
  const [containerGrid, setContainerGridEntry] = useHeightsMap(CONTAINER_GRID_KEY);

  const growContainerGrid = useCallback((categoryId) => {
    if (!categoryId) return;
    const cur = containerGrid[categoryId] || { cols: 0, rows: 0 };
    if (cur.rows >= MAX_ROWS_PER_SUBCOL - 2) return;
    setContainerGridEntry(categoryId, { ...cur, rows: cur.rows + 1 });
  }, [containerGrid, setContainerGridEntry]);

  const columnsRef = useRef(null);

  // Persist state — localStorage is the fast primary cache, backup file is
  // the durable secondary (survives cache clears / reinstalls).
  useEffect(() => { saveState(state); }, [state]);

  // Debounced backup writer — coalesces rapid state changes into one write.
  const backupTimer = useRef(null);
  useEffect(() => {
    if (backupTimer.current) clearTimeout(backupTimer.current);
    backupTimer.current = setTimeout(() => {
      writeBackup(JSON.stringify(state, null, 2));
    }, 500);
    return () => backupTimer.current && clearTimeout(backupTimer.current);
  }, [state]);

  // On startup, if a backup file handle is remembered AND its content looks
  // newer/richer than what localStorage has, offer to restore automatically.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const backup = await tryLoadBackupOnStartup();
      if (cancelled || !backup?.state) return;
      // Simple heuristic: use the backup if we currently have no bookmarks
      // (fresh browser / cache-cleared) but the file has some.
      const local = state?.bookmarks?.length || 0;
      const remote = backup.state?.bookmarks?.length || 0;
      if (local === 0 && remote > 0) {
        setState(backup.state);
      }
    })();
    return () => { cancelled = true; };
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStateSnapshot = useCallback(() => state, [state]);
  const handleRestore = useCallback((restored) => {
    if (restored && typeof restored === 'object') setState(restored);
  }, []);

  const { categories, bookmarks, activeCategoryId } = state;

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

  /**
   * Move / reorder a bookmark based on where it was dropped.
   *  - Dropped on another bookmark: insert at that bookmark's position.
   *    If categories differ, the moved bookmark also switches category.
   *  - Dropped on a category (empty area of the column): append to that
   *    category's group.
   */
  const handleBookmarkDrop = (activeBookmarkId, overData) => {
    if (!overData) return;
    setState((s) => {
      const bookmarks = [...s.bookmarks];
      const srcIdx = bookmarks.findIndex((b) => b.id === activeBookmarkId);
      if (srcIdx === -1) return s;

      if (overData.type === 'bookmark') {
        const dstIdx = bookmarks.findIndex((b) => b.id === overData.bookmarkId);
        if (dstIdx === -1 || dstIdx === srcIdx) return s;
        const targetCategoryId = bookmarks[dstIdx].categoryId;
        if (bookmarks[srcIdx].categoryId !== targetCategoryId) {
          bookmarks[srcIdx] = { ...bookmarks[srcIdx], categoryId: targetCategoryId };
        }
        return { ...s, bookmarks: arrayMove(bookmarks, srcIdx, dstIdx) };
      }

      if (overData.type === 'category') {
        const targetCategoryId = overData.categoryId;
        if (!targetCategoryId || targetCategoryId === 'all') return s;
        // Move source to the end of the target category's group
        if (bookmarks[srcIdx].categoryId !== targetCategoryId) {
          bookmarks[srcIdx] = { ...bookmarks[srcIdx], categoryId: targetCategoryId };
        }
        let lastIdx = -1;
        for (let i = 0; i < bookmarks.length; i++) {
          if (bookmarks[i].categoryId === targetCategoryId) lastIdx = i;
        }
        if (lastIdx === -1 || lastIdx === srcIdx) return { ...s, bookmarks };
        return { ...s, bookmarks: arrayMove(bookmarks, srcIdx, lastIdx) };
      }

      return s;
    });
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
    setState((s) => {
      const remaining = s.categories.filter((c) => c.id !== id);
      const fallback = remaining[0]?.id;
      if (!fallback) {
        alert('Keep at least one category — this is your last one.');
        return s;
      }
      return {
        ...s,
        categories: remaining,
        bookmarks: s.bookmarks.map((b) => (b.categoryId === id ? { ...b, categoryId: fallback } : b)),
        activeCategoryId: s.activeCategoryId === id ? 'all' : s.activeCategoryId,
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
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

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

  const reorderCategories = (activeId, overId) => {
    if (!activeId || !overId || activeId === overId) return;
    setState((s) => {
      const oldIndex = s.categories.findIndex((c) => c.id === activeId);
      const newIndex = s.categories.findIndex((c) => c.id === overId);
      if (oldIndex === -1 || newIndex === -1) return s;
      return { ...s, categories: arrayMove(s.categories, oldIndex, newIndex) };
    });
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
      reorderCategories(active.data.current.categoryId, over.data.current.categoryId);
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
      collisionDetection={closestCenter}
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
          <div className="pf-cols-scroll" ref={columnsRef}>
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
