/**
 * Lazy-load geminiService and ramadanTemplate so they are not executed at app init.
 * Fixes "Cannot access 'X' before initialization" from bundle init order.
 */

let geminiPromise: Promise<typeof import('./geminiService')> | null = null;
let ramadanPromise: Promise<typeof import('./ramadanTemplate')> | null = null;

export function loadGemini() {
  if (!geminiPromise) geminiPromise = import('./geminiService');
  return geminiPromise;
}

export function loadRamadan() {
  if (!ramadanPromise) ramadanPromise = import('./ramadanTemplate');
  return ramadanPromise;
}
