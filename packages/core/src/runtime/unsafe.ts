// @dalpeng/core/unsafe — dangerous, low-level escape hatches.
//
// Importing from this path is an explicit acknowledgment that you are bypassing
// the timing contract. See docs/design/flow-kernel.md for when these are
// appropriate (tests / teardown assertions / debugging) and when they are not
// (general game/UI logic).

import { _flushSyncInternal } from "./flow";

/**
 * Force immediate drain of pending reactive writes, bypassing the frame
 * boundary contract.
 *
 * Writes performed inside `fn` fire their subscribers synchronously rather
 * than waiting for the next boundary. Any writes pending from an outer batch
 * are drained before `fn` runs so it sees a fresh snapshot.
 *
 * Do not use in game/UI logic. Use in tests, destruction assertions, or
 * debugging where synchronous subscriber observation is required.
 */
export function flushSync<R>(fn: () => R): R {
  return _flushSyncInternal(fn);
}
