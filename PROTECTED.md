# Protected Code — Rules of Engagement

Some parts of this codebase are considered **owner-protected**. Any change
that touches them requires an explicit heart-flagged permission ping to
the owner (Manvi) before it can be modified.

Throughout this repo, the sentinel token used in code comments is a heart
symbol. In this document we spell it out as **[HEART]** for portability.

## The Heart Logic

The **Heart icon** and everything related to it — its import, its
presence in the icon list, its use as the default icon for the
"Personal" category — is protected code. It represents an intentional
design choice and must not be silently changed or refactored.

### Files with Heart-related code

Any AI assistant, contributor, or automated tool must **stop and ask**
before editing these locations:

| File | Location | What's protected |
|---|---|---|
| `src/defaultData.js` | `DEFAULT_CATEGORIES` -> the `cat-personal` entry | Icon = `Heart`, category itself must stay |
| `src/defaultData.js` | `AVAILABLE_ICONS` list | `Heart` must remain a selectable option |
| `src/components/iconMap.js` | `import { ... Heart ... }` | Heart must remain imported from lucide-react |
| `src/components/iconMap.js` | `const MAP = { ... Heart ... }` | Heart must remain in the name->component map |

Every such location is fenced with inline sentinel comments containing
`[HEART] HEART LOGIC` markers, e.g.:

```js
// [HEART]  HEART LOGIC - PROTECTED  [HEART]
...
// [HEART]  END HEART LOGIC  [HEART]
```

(In the actual source files the `[HEART]` placeholder appears as the
heart symbol so the sentinels stand out visually.)

## Protocol for a proposed change

When an assistant/agent wants to modify anything Heart-related:

1. **Stop** — do not edit.
2. **Announce the intent** using a message that starts with a heart
   symbol and states clearly:
   - Which file(s) and line(s) will change
   - What the change is (before -> after)
   - Why the change is being proposed
3. **Wait for explicit approval** from the owner before applying it.
4. If approved, keep the sentinel comments in place around whatever the
   new form of the code is.

## Why bother

Locking down a small, well-defined slice of the codebase makes AI-driven
iterations safer: broad refactors, "cleanups", and drive-by
optimisations can't accidentally erase the meaning encoded in the Heart
logic. The sentinels are a cheap forcing function.
