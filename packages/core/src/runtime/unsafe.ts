// Importing from this subpath is an explicit acknowledgment that the timing
// contract is being bypassed. Tests / destruction assertions / debugging only.

import { _flushSyncInternal } from "./flow";

/** Bypass the frame boundary: drain pending writes, then run fn synchronously. */
export function flushSync<R>(fn: () => R): R {
  return _flushSyncInternal(fn);
}
