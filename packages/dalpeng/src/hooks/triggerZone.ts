import type { TileCollider, TriggerZone } from "@dalpeng/core";
import { Transform } from "@dalpeng/core";
import { onUpdate, useComponent } from "./gameEntity";

export interface TriggerZoneCallbacks {
  onEnter?: (zone: TriggerZone) => void;
  onExit?: (zone: TriggerZone) => void;
  onStay?: (zone: TriggerZone) => void;
}

export function useTriggerZone(
  getCollider: () => TileCollider | null,
  halfW: number,
  halfH: number,
  callbacks: TriggerZoneCallbacks
): void {
  const transform = useComponent(Transform);
  const previous = new Map<number, TriggerZone>();

  onUpdate(() => {
    const collider = getCollider();
    if (!collider) return;

    const pos = transform.position;
    const current = collider.overlappingTriggers(pos[0], pos[1], halfW, halfH);

    const currentMap = new Map<number, TriggerZone>();
    for (const zone of current) {
      currentMap.set(zone.id, zone);
    }

    if (callbacks.onEnter) {
      for (const [id, zone] of currentMap) {
        if (!previous.has(id)) {
          callbacks.onEnter(zone);
        }
      }
    }

    if (callbacks.onExit) {
      for (const [id, zone] of previous) {
        if (!currentMap.has(id)) {
          callbacks.onExit(zone);
        }
      }
    }

    if (callbacks.onStay) {
      for (const [id, zone] of currentMap) {
        if (previous.has(id)) {
          callbacks.onStay(zone);
        }
      }
    }

    previous.clear();
    for (const [id, zone] of currentMap) {
      previous.set(id, zone);
    }
  });
}
