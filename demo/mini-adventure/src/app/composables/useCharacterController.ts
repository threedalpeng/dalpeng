import { Quaternion, Vec3, vec3 } from "@dalpeng/math";
import {
  Animator,
  Time,
  Transform,
  useComponent,
  onUpdate,
  useActionDown,
  useActionState,
} from "dalpeng";
import type { GameEntity } from "dalpeng";
import { moveSpeed, runSpeed, turnSpeed } from "./characterConfig";

// Fox.glb clip indices: 0=Survey(idle), 1=Walk, 2=Run
const IDLE_CLIP = 0;
const WALK_CLIP = 1;
const RUN_CLIP = 2;

const INITIAL_POS = vec3(0, 0, 0);
const INITIAL_ROT = new Quaternion([0, 0, 0, 1]);

export default function useCharacterController() {
  const transform = useComponent(Transform);

  let animator: Animator | null = null;
  let cameraTransform: Transform | null = null;
  let prevState: "idle" | "walk" | "run" = "idle";
  let currentRotation = new Quaternion([0, 0, 0, 1]);

  function findAnimator(entity: GameEntity): Animator | null {
    const anim = entity.getComponent(Animator);
    if (anim) return anim;
    for (const child of entity.children) {
      const found = findAnimator(child);
      if (found) return found;
    }
    return null;
  }

  useActionDown("reset", () => {
    transform.position = INITIAL_POS;
    currentRotation = INITIAL_ROT;
    transform.rotation = currentRotation;
    if (animator) animator.crossfade(IDLE_CLIP, 0.2, { loop: true });
    prevState = "idle";
  });

  const sprinting = useActionState("sprint");

  onUpdate(() => {
    const dt = Time.delta() * 0.001;
    const input = transform.gameEntity.currentApp.input;

    if (!animator) {
      animator = findAnimator(transform.gameEntity);
    }

    if (!cameraTransform) {
      const cam = transform.gameEntity.scene?.findByName("Camera");
      if (cam) cameraTransform = cam.getComponent(Transform);
      if (!cameraTransform) return;
    }

    let inputFwd = 0;
    let inputRight = 0;
    if (input.actionPressed("forward")) inputFwd += 1;
    if (input.actionPressed("back")) inputFwd -= 1;
    if (input.actionPressed("left")) inputRight -= 1;
    if (input.actionPressed("right")) inputRight += 1;

    const isMoving = inputFwd !== 0 || inputRight !== 0;

    if (isMoving) {
      const len = Math.sqrt(inputFwd * inputFwd + inputRight * inputRight);
      inputFwd /= len;
      inputRight /= len;

      const camFwd = cameraTransform.forward;
      const fwdLen = Math.sqrt(camFwd.x * camFwd.x + camFwd.z * camFwd.z);
      const fwd =
        fwdLen > 1e-6
          ? vec3(camFwd.x / fwdLen, 0, camFwd.z / fwdLen)
          : vec3(0, 0, -1);
      const rgt = vec3(-fwd.z, 0, fwd.x);

      const moveDir = fwd.scale(inputFwd).add(rgt.scale(inputRight));

      const isSprinting = sprinting.value;
      const speed = isSprinting ? runSpeed.value : moveSpeed.value;

      transform.position = transform.position.add(moveDir.scale(speed * dt));

      const targetRot = Quaternion.fromLookRotation(moveDir.scale(-1), Vec3.up());
      const t = 1 - Math.exp(-turnSpeed.value * dt);
      currentRotation = Quaternion.slerp(currentRotation, targetRot, t);
      transform.rotation = currentRotation;

      const newState: "walk" | "run" = isSprinting ? "run" : "walk";
      if (newState !== prevState && animator) {
        const clip = newState === "walk" ? WALK_CLIP : RUN_CLIP;
        animator.crossfade(clip, 0.3, { loop: true });
      }
      prevState = newState;
    } else {
      if (prevState !== "idle" && animator) {
        animator.crossfade(IDLE_CLIP, 0.3, { loop: true });
      }
      prevState = "idle";
    }
  });
}
