import {
  Animator,
  Camera,
  Light,
  MeshRenderer,
  Script,
  Sprite2DRenderer,
  Transform,
} from "@dalpeng/core";
import {
  enumField,
  numberField,
  readonlyField,
  registerComponentSchema,
  toggleField,
  vec3CodeFormat,
  vec3Field,
} from "./editSchema";

let registered = false;

export function registerDefaultSchemas(): void {
  if (registered) return;
  registered = true;

  registerComponentSchema(Transform, {
    fields: {
      position: vec3Field({ step: 0.1, copyFormat: vec3CodeFormat }),
      // rotation is a Quaternion (xyzw) — proper quat/euler editor TBD.
      rotation: readonlyField((v) => {
        const q = v as ArrayLike<number>;
        const fmt = (n: number) => n.toFixed(3).replace(/\.?0+$/, "");
        return `quat(${fmt(q[0] ?? 0)}, ${fmt(q[1] ?? 0)}, ${fmt(q[2] ?? 0)}, ${fmt(q[3] ?? 1)})`;
      }),
      scale: vec3Field({ step: 0.1, min: 0, copyFormat: vec3CodeFormat }),
    },
  });

  registerComponentSchema(Sprite2DRenderer, {
    fields: {
      frame: numberField({ min: 0, step: 1 }),
      sortingLayer: numberField({ min: 0, step: 1 }),
      pixelsPerUnit: numberField({ min: 1, step: 1 }),
      flipX: toggleField(),
      flipY: toggleField(),
    },
  });

  registerComponentSchema(MeshRenderer, {
    fields: {
      castShadow: toggleField(),
      receiveShadow: toggleField(),
    },
  });

  registerComponentSchema(Camera, {
    fields: {
      fov: numberField({ min: 1, max: 179, step: 1, unit: "deg" }),
      near: numberField({ min: 0.001, step: 0.1 }),
      far: numberField({ min: 0.1, step: 1 }),
      orthographic: toggleField(),
      orthographicSize: numberField({ min: 0.1, step: 0.5 }),
    },
  });

  registerComponentSchema(Light, {
    fields: {
      type: enumField(["directional", "point", "spot"] as const),
      intensity: numberField({ min: 0, step: 0.1 }),
      color: vec3Field({ min: 0, max: 1, step: 0.01 }),
      range: numberField({ min: 0, step: 0.5 }),
    },
  });

  registerComponentSchema(Animator, {
    fields: {
      isPlaying: readonlyField((v) => String(v)),
      currentClip: readonlyField((v) => (v == null ? "—" : String(v))),
      speed: numberField({ min: 0, step: 0.1 }),
    },
  });

  registerComponentSchema(Script, {
    fields: {
      isActive: toggleField(),
    },
  });
}
