import { registerCleanup, requireEntity } from "../context";
import { ref, type Ref } from "../reactive";

export function useInput() {
  const entity = requireEntity("useInput");
  return entity.currentApp.input;
}

export function useActionDown(action: string, cb: () => void) {
  const entity = requireEntity("useActionDown");
  const unsub = entity.currentApp.input.onActionDown(action, cb);
  registerCleanup(unsub);
}

export function useActionUp(action: string, cb: () => void) {
  const entity = requireEntity("useActionUp");
  const unsub = entity.currentApp.input.onActionUp(action, cb);
  registerCleanup(unsub);
}

export function useActionState(action: string): Ref<boolean> {
  const entity = requireEntity("useActionState");
  const input = entity.currentApp.input;
  const state = ref(input.actionPressed(action));
  const unsub = input.onActionChange(action, (pressed) => {
    state.value = pressed;
  });
  registerCleanup(unsub);
  return state;
}

export function useKeyDown(key: string, cb: () => void) {
  const entity = requireEntity("useKeyDown");
  const unsub = entity.currentApp.input.onKeyDown(key, cb);
  registerCleanup(unsub);
}

export function useKeyUp(key: string, cb: () => void) {
  const entity = requireEntity("useKeyUp");
  const unsub = entity.currentApp.input.onKeyUp(key, cb);
  registerCleanup(unsub);
}
