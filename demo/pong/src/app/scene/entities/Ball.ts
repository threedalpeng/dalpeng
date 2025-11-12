import useQuad from "@app/composables/render/useQuad";
import { vec3 } from "@dalpeng/math";
import { defineGameEntity, onUpdate, Transform, useComponent, withName } from "dalpeng";

export default defineGameEntity(() => {
  withName("Ball");

  const t = useComponent(Transform);
  t.position = vec3(0, 0, 0);
  t.scale = vec3(0.4, 0.4, 1);

  const r = useQuad();
  r.material.baseColor = vec3(0.2, 0.9, 0.2);

  // simple ball movement and collision using closure state
  let velocity = vec3(4, 3, 0);
  const boundsY = 5.8;
  let leftPaddle: Transform | null = null;
  let rightPaddle: Transform | null = null;

  onUpdate(() => {
    const p = t.position;
    // integrate with fixed step (uses Time.delta under the hood in engine)
    const dt = (window as any).__dalpeng_dt ? (window as any).__dalpeng_dt : 16.67;
    const sec = dt * 0.001;
    const np = vec3(p.x + velocity.x * sec, p.y + velocity.y * sec, p.z);

    if (np.y > boundsY) {
      np.y = boundsY;
      velocity.y = -Math.abs(velocity.y);
    } else if (np.y < -boundsY) {
      np.y = -boundsY;
      velocity.y = Math.abs(velocity.y);
    }

    const scene = t.gameEntity.scene;
    if (scene && !leftPaddle) {
      leftPaddle = scene.findByTag("paddle-left")[0]?.getComponent(Transform)!;
      rightPaddle = scene.findByTag("paddle-right")[0]?.getComponent(Transform)!;
    }

    const radius = t.scale.x * 0.5;
    const hitPaddle = (pad: Transform | null | undefined, isLeft: boolean) => {
      if (!pad) return false;
      const hw = pad.scale.x * 0.5;
      const hh = pad.scale.y * 0.5;
      const minX = pad.position.x - hw;
      const maxX = pad.position.x + hw;
      const minY = pad.position.y - hh;
      const maxY = pad.position.y + hh;
      const cx = Math.max(minX, Math.min(np.x, maxX));
      const cy = Math.max(minY, Math.min(np.y, maxY));
      const dx = np.x - cx;
      const dy = np.y - cy;
      const dist2 = dx * dx + dy * dy;
      if (dist2 <= radius * radius) {
        velocity.x = Math.abs(velocity.x) * (isLeft ? 1 : -1);
        return true;
      }
      return false;
    };

    hitPaddle(leftPaddle, true);
    hitPaddle(rightPaddle, false);

    t.position = np;
  });
});
