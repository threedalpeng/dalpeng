import { Mat3, Mat4, Quaternion, Vec3 } from "@dalpeng/math";
import Component from "./component/Component";

export default class Transform extends Component {
  #position: Vec3 = new Vec3([0, 0, 0]);
  get position() {
    return this.#position;
  }
  set position(value: Vec3) {
    this.#position = value;
    this.#isDirty = true;
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
    this.#isDirty = true;
  }
  #worldRotation: Quaternion = new Quaternion([0, 0, 0, 1]);
  get worldRotation() {
    return this.#rotation;
  }

  #scale: Vec3 = new Vec3([1, 1, 1]);
  get scale() {
    return this.#scale;
  }
  set scale(value: Vec3) {
    this.#scale = value;
    this.#isDirty = true;
  }

  #isDirty: boolean = true;
  get isDirty() {
    return this.#isDirty;
  }

  translate(v: Float32List) {
    this.#position = this.#position.add(v);
    this.#isDirty = true;
  }

  rotate(axis: Vec3, angle: number) {
    this.#rotation = this.#rotation.mul(Quaternion.fromAxisAngle(axis, angle));
    this.#isDirty = true;
  }
  rotateAround(worldPoint: Vec3, axis: Vec3, angle: number) {
    const q = Quaternion.fromAxisAngle(axis, angle);
    this.#position = q.mulv(this.#position.sub(worldPoint)).add(worldPoint);
    this.#rotation = q.mul(this.#rotation);
  }

  #modelMatrix: Mat4 = new Mat4();
  get modelMatrix() {
    return this.#modelMatrix;
  }
  #calculateModelMatrix(parentMatrix?: Mat4) {
    this.#modelMatrix = Mat4.translate(this.#position)
      .mul(Mat4.rotate(this.#rotation))
      .mul(Mat4.scale(this.#scale));
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
        this.#worldPosition = new Vec3([
          this.#modelMatrix._03,
          this.#modelMatrix._13,
          this.#modelMatrix._23,
        ]);
        this.#worldRotation = parentTransform.#worldRotation.mul(
          this.#rotation
        );
      } else {
        this.updateModelMatrix();
        this.#worldPosition = this.#position;
        this.#worldRotation = this.#rotation;
      }
    } else {
      for (let child of this.gameEntity.children) {
        child.getComponent(Transform)?.checkModelMatrixToBeUpdated();
      }
    }
  }

  localToWorldPoint(v: Vec3) {
    return new Mat3(this.#modelMatrix).mulv(v);
  }

  worldToLocalPoint(v: Vec3) {
    return new Mat3(this.#modelMatrix).transpose().mulv(v);
  }
}
