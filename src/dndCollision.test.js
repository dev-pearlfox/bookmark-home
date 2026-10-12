import { beforeEach, describe, expect, it, vi } from 'vitest';

// Spy on dnd-kit's keyboard getter so we can inspect exactly which droppables
// it is allowed to see; the real one needs real DOM nodes.
vi.mock('@dnd-kit/sortable', () => ({ sortableKeyboardCoordinates: vi.fn(() => 'coords') }));

const { sortableKeyboardCoordinates } = await import('@dnd-kit/sortable');
const { collisionDetection, keyboardCoordinates } = await import('./dndCollision.js');

const rect = (left, top, width, height) => ({
  left, top, width, height, right: left + width, bottom: top + height,
});
const droppable = (id, type, categoryId, container) => ({ id, data: { current: { type, categoryId, container } } });
const active = (type, categoryId) => ({ data: { current: { type, categoryId } } });

describe('collisionDetection', () => {
  // A tall column (centre far below) holding a small card near the top; the
  // dragged rect sits right on the card, so the CARD is geometrically closest.
  const columnA = droppable('col-A', 'category');
  const columnB = droppable('col-B', 'category');
  const cardInB = droppable('bm-1', 'bookmark');
  const droppableRects = new Map([
    ['col-A', rect(0, 0, 300, 700)],
    ['col-B', rect(320, 0, 300, 700)],
    ['bm-1', rect(330, 10, 280, 60)],
  ]);
  const base = {
    droppableRects,
    droppableContainers: [columnA, columnB, cardInB],
    collisionRect: rect(330, 10, 280, 60),
    pointerCoordinates: null,
  };

  it('lets a dragged BOOKMARK collide with cards (closest wins)', () => {
    const result = collisionDetection({ ...base, active: active('bookmark') });
    expect(result[0].id).toBe('bm-1');
  });

  it('only lets a dragged CATEGORY collide with categories', () => {
    const result = collisionDetection({ ...base, active: active('category') });
    expect(result.map((c) => c.id)).not.toContain('bm-1');
    expect(result[0].id).toBe('col-B');
  });

  describe('empty tall column vs. a nearer-centred neighbour card', () => {
    // The keyboard bug: the dragged card is snapped onto the top-left of the
    // EMPTY column (centre far below), while a small card elsewhere has a
    // closer centre but does not overlap the dragged card at all.
    const emptyColumn = droppable('col-empty', 'category');
    const neighbourCard = droppable('bm-near', 'bookmark');
    const rects = new Map([
      ['col-empty', rect(0, 0, 300, 700)],
      ['bm-near', rect(140, -100, 20, 20)],
    ]);
    const args = {
      active: active('bookmark'),
      droppableRects: rects,
      droppableContainers: [emptyColumn, neighbourCard],
      collisionRect: rect(10, 10, 280, 60),
    };

    it('KEYBOARD drag (no pointer) picks the column the card sits inside', () => {
      const result = collisionDetection({ ...args, pointerCoordinates: null });
      expect(result.map((c) => c.id)).toEqual(['col-empty']);
    });

    it('POINTER drag keeps using closest-centre (behaviour unchanged)', () => {
      const result = collisionDetection({ ...args, pointerCoordinates: { x: 150, y: 40 } });
      expect(result[0].id).toBe('bm-near');
    });
  });

  it('returns nothing (not a crash) when there are no category targets', () => {
    const result = collisionDetection({
      ...base,
      active: active('category'),
      droppableContainers: [cardInB],
    });
    expect(result).toEqual([]);
  });
});

describe('keyboardCoordinates', () => {
  // col-A holds card bm-1 (the one being dragged in the bookmark tests);
  // col-B holds bm-2.
  const containers = [
    droppable('col-A', 'category', 'A'),
    droppable('bm-1', 'bookmark', 'A'),
    droppable('col-B', 'category', 'B'),
    droppable('bm-2', 'bookmark', 'B'),
  ];
  const map = {
    getEnabled: () => containers,
    get: (id) => containers.find((c) => c.id === id),
  };
  const makeArgs = (activeItem) => ({ context: { active: activeItem, droppableContainers: map } });
  const stopsSeenByLibrary = () => {
    const [, passedArgs] = sortableKeyboardCoordinates.mock.calls[0];
    return passedArgs.context.droppableContainers;
  };

  beforeEach(() => sortableKeyboardCoordinates.mockClear());

  it('returns whatever the underlying getter returns', () => {
    expect(keyboardCoordinates({ code: 'ArrowRight' }, makeArgs(active('bookmark', 'A')))).toBe('coords');
  });

  it('dragging a BOOKMARK: sees all cards and OTHER columns, but not its own column', () => {
    keyboardCoordinates({ code: 'ArrowLeft' }, makeArgs(active('bookmark', 'A')));
    expect(stopsSeenByLibrary().getEnabled().map((c) => c.id)).toEqual(['bm-1', 'col-B', 'bm-2']);
  });

  it('dragging a bookmark from column B hides column B instead', () => {
    keyboardCoordinates({ code: 'ArrowLeft' }, makeArgs(active('bookmark', 'B')));
    expect(stopsSeenByLibrary().getEnabled().map((c) => c.id)).toEqual(['col-A', 'bm-1', 'bm-2']);
  });

  it('dragging a CATEGORY: sees categories only', () => {
    keyboardCoordinates({ code: 'ArrowRight' }, makeArgs(active('category', 'A')));
    const seen = stopsSeenByLibrary();
    expect(seen.getEnabled().map((c) => c.id)).toEqual(['col-A', 'col-B']);
    // lookups by id still resolve any droppable (the library reads the active one)
    expect(seen.get('bm-1').id).toBe('bm-1');
  });

  it('preserves the rest of the context for the library', () => {
    const args = makeArgs(active('category', 'A'));
    args.context.collisionRect = rect(0, 0, 10, 10);
    keyboardCoordinates({ code: 'ArrowLeft' }, args);
    const [, passedArgs] = sortableKeyboardCoordinates.mock.calls[0];
    expect(passedArgs.context.collisionRect).toBe(args.context.collisionRect);
    expect(passedArgs.context.active).toBe(args.context.active);
  });
});

describe('containers (categories stacked under a column)', () => {
  const column = droppable('col-A', 'category', 'A');
  const container = droppable('col-grp-A', 'category', 'grp-A', true);
  const rects = new Map([
    ['col-A', rect(0, 0, 300, 360)],
    ['col-grp-A', rect(0, 372, 300, 260)],
  ]);

  it('a dragged COLUMN never collides with a container, even when it is closest', () => {
    const result = collisionDetection({
      active: active('category', 'B'),
      droppableRects: rects,
      droppableContainers: [column, container],
      collisionRect: rect(0, 380, 300, 100), // right on top of the container
      pointerCoordinates: { x: 10, y: 400 },
    });
    expect(result.map((r) => r.id)).toEqual(['col-A']);
  });

  it('a dragged BOOKMARK can still land on a container', () => {
    const result = collisionDetection({
      active: active('bookmark', 'A'),
      droppableRects: rects,
      droppableContainers: [column, container],
      collisionRect: rect(0, 380, 300, 100),
      pointerCoordinates: { x: 10, y: 400 },
    });
    expect(result[0].id).toBe('col-grp-A');
  });

  it('keyboard: a dragged column cannot stop on a container; a bookmark can', () => {
    const items = [column, container, droppable('bm-1', 'bookmark', 'A')];
    const context = (a) => ({ active: a, droppableContainers: { getEnabled: () => items, get: () => undefined } });
    keyboardCoordinates({}, { context: context(active('category', 'B')) });
    const forColumn = sortableKeyboardCoordinates.mock.calls.at(-1)[1].context.droppableContainers.getEnabled();
    expect(forColumn.map((d) => d.id)).toEqual(['col-A']);

    keyboardCoordinates({}, { context: context(active('bookmark', 'zzz')) });
    const forBookmark = sortableKeyboardCoordinates.mock.calls.at(-1)[1].context.droppableContainers.getEnabled();
    expect(forBookmark.map((d) => d.id)).toEqual(['col-A', 'col-grp-A', 'bm-1']);
  });
});
