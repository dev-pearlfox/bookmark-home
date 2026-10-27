import { createContext, useContext } from 'react';

/**
 * The "online lookups" setting: may the app ask Microlink for a page title and
 * Google for a site icon? On by default (that is how the app has always worked).
 * Off means no request to either service: titles come from the domain name and
 * icons become a letter tile.
 *
 * Saved as the text 'on' or 'off' under its own key (see storage.js). Anything
 * that is not exactly 'off' counts as on, so a missing or damaged value never
 * silently switches the lookups off or throws.
 */
export function parseLookups(raw) {
  return raw !== 'off';
}

export function serializeLookups(on) {
  return on ? 'on' : 'off';
}

/** Provided once in App; read by anything that would make an online lookup. */
export const LookupsContext = createContext(true);

export function useLookups() {
  return useContext(LookupsContext);
}
