import { ref, defineControlGroup, defineRange } from "dalpeng";

export const moveSpeed = ref(3);
export const runSpeed = ref(6);
export const turnSpeed = ref(10);
export const cameraDistance = ref(8);
export const cameraHeight = ref(1.0);

export const CHARACTER_GROUP = defineControlGroup(
  "Character",
  () => [
    defineRange(moveSpeed, "Walk Speed", { min: 1, max: 10, step: 0.5 }),
    defineRange(runSpeed, "Run Speed", { min: 2, max: 15, step: 0.5 }),
    defineRange(turnSpeed, "Turn Speed", { min: 1, max: 30, step: 1 }),
    defineRange(cameraDistance, "Cam Distance", { min: 2, max: 20, step: 0.5 }),
    defineRange(cameraHeight, "Cam Height", { min: 0, max: 3, step: 0.1 }),
  ],
  { id: "character", priority: 180 }
);
