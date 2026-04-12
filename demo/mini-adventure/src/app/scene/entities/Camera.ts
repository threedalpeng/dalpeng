import { vec3 } from "@dalpeng/math";
import { Camera, defineEntity, Transform, useComponent, withName } from "dalpeng";
import useThirdPersonCamera from "../../composables/useThirdPersonCamera";

export default defineEntity(() => {
  withName("Camera");

  useComponent(Transform, (t) => {
    t.position = vec3(0, 5, 8);
  });

  useComponent(Camera, (c) => {
    c.fovy = (60 * Math.PI) / 180;
    c.dNear = 0.1;
    c.dFar = 200;
  });

  useThirdPersonCamera();
});
