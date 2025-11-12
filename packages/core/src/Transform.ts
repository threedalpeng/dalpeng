import { Mat3, Mat4, Quaternion, Vec3 } from "@dalpeng/math";
import Component from "./component/Component";

export default class Transform extends Component {
  // ─── Local State ───────────────────────────────────────────────────────────
  // Stores position, rotation, scale and their world-space counterparts.
  #position: Vec3 = new Vec3([0, 0, 0]);
  get position() {
    return this.#position;
  }
  set position(value: Vec3) {
    this.#position = value;
    this.markDirty();
  }
  #worldPosition: Vec3 = new Vec3([0, 0, 0]);
  get worldPosition() {
    return this.#worldPosition;
  }

  #rotation: Quaternion = new Quaternion([0, 0, 0, 1]);
  get rotation() {
    return this.#rotation;
  }
  set rotation(value: Quaternion) {
    this.#rotation = value;
    this.markDirty();
  }
  #worldRotation: Quaternion = new Quaternion([0, 0, 0, 1]);
  get worldRotation() {
    return this.#worldRotation;
  }

  #scale: Vec3 = new Vec3([1, 1, 1]);
  get scale() {
    return this.#scale;
  }
  set scale(value: Vec3) {
    this.#scale = value;
    this.markDirty();
  }

  #isDirty: boolean = true;
  get isDirty() {
    return this.#isDirty;
  }

  // ─── Mutation Helpers ──────────────────────────────────────────────────────
  // High-level operations that mutate local transform state.
  translate(v: Float32List) {
    this.#position = this.#position.add(v);
    this.markDirty();
  }

  rotate(axis: Vec3, angle: number) {
    this.#rotation = this.#rotation.mul(Quaternion.fromAxisAngle(axis, angle));
    this.markDirty();
  }
  rotateAround(worldPoint: Vec3, axis: Vec3, angle: number) {
    const q = Quaternion.fromAxisAngle(axis, angle);
    this.#position = q.mulv(this.#position.sub(worldPoint)).add(worldPoint);
    this.#rotation = q.mul(this.#rotation);
    this.markDirty();
  }
  lookAt(target: Vec3, up: Vec3 = Vec3.up()) {
    const dir = target.sub(this.#position);
    this.#rotation = Quaternion.fromLookRotation(dir, up);
    this.markDirty();
  }

  // ─── Matrix Computation ────────────────────────────────────────────────────
  // Builds model matrices and propagates updates to child entities.
  #modelMatrix: Mat4 = new Mat4();
  get modelMatrix() {
    return this.#modelMatrix;
  }
  #calculateModelMatrix(parentMatrix?: Mat4) {
    this.#modelMatrix = Mat4.compose(this.#position, this.#rotation, this.#scale);
    if (parentMatrix) {
      this.#modelMatrix = parentMatrix.mul(this.#modelMatrix);
    }
  }

  updateModelMatrix(parentMatrix?: Mat4) {
    this.#calculateModelMatrix(parentMatrix);
    this.#isDirty = false;
    for (let child of this.gameEntity.children) {
      child.getComponent(Transform)?.updateModelMatrix(this.#modelMatrix);
    }
  }
  checkModelMatrixToBeUpdated() {
    if (this.#isDirty) {
      const parent = this.gameEntity.parent;
      if (parent) {
        const parentTransform = parent.getComponent(Transform)!;
        this.updateModelMatrix(parentTransform.modelMatrix);
        this.#worldPosition = this.#modelMatrix.translation();
        this.#worldRotation = parentTransform.#worldRotation.mul(
          this.#rotation
        );
      } else {
        this.updateModelMatrix();
        this.#worldPosition = this.#position;
        this.#worldRotation = this.#rotation;
      }
    } else {
      // Parent may have refreshed our model matrix already; refresh world caches.
      const parent = this.gameEntity.parent;
      if (parent) {
        const parentTransform = parent.getComponent(Transform)!;
        this.#worldPosition = this.#modelMatrix.translation();
        this.#worldRotation = parentTransform.#worldRotation.mul(this.#rotation);
      } else {
        this.#worldPosition = this.#position;
        this.#worldRotation = this.#rotation;
      }
      for (let child of this.gameEntity.children) {
        child.getComponent(Transform)?.checkModelMatrixToBeUpdated();
      }
    }
  }

  // ─── Coordinate Conversion ─────────────────────────────────────────────────
  // Converts points between local and world space using the cached matrices.
  localToWorldPoint(v: Vec3) { return this.#modelMatrix.toMat3().mulv(v); }

  worldToLocalPoint(v: Vec3) { return this.#modelMatrix.toMat3().transpose().mulv(v); }

  get forward() { return this.#worldRotation.mulv([0, 0, -1]); }
  get up() { return this.#worldRotation.mulv([0, 1, 0]); }
  get right() { return this.#worldRotation.mulv([1, 0, 0]); }

  // ─── Dirty Tracking ────────────────────────────────────────────────────────
  // Notifies the owning Application when transform data needs processing.
  markDirty() {
    this.#isDirty = true;
    const app = this.gameEntity.scene?.app;
    if (app) {
      app.queueTransformUpdate(this);
    }
  }
}
