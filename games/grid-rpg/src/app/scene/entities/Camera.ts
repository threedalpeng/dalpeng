import { Camera, CameraFollow2D } from "@dalpeng/core";
import { vec3 } from "@dalpeng/math";
import { defineEntity, onStart, Transform, useComponent, withName } from "dalpeng";

export default defineEntity(() => {
  withName("Camera");

  useComponent(Transform, (t) => {
    t.position = vec3(0, 0, 10);
  });

  const camera = useComponent(Camera, (c) => {
    c.isOrthographic = true;
    c.size = 5;
    c.dNear = 0.1;
    c.dFar = 100;
  });

  // Map is 20x15 tiles, 1 tile = 1 world unit
  const follow = useComponent(CameraFollow2D, (f) => {
    f.lerpFactor = 0.12;
    f.pixelPerfect = true;
    f.pixelsPerUnit = 32;
    f.bounds = { minX: 0, maxX: 20, minY: 0, maxY: 15 };
  });

  onStart(() => {
    // Locate the player entity lazily so entity creation order doesn't matter
    const playerEntities = camera.gameEntity.scene?.findByTag("player");
    if (playerEntities && playerEntities.length > 0) {
      follow.target = playerEntities[0];
    }
  });
});
