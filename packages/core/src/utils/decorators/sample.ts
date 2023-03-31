import { resource } from "./resource";

@resource
class SamRes {
  x: number;
  constructor(x: number) {
    this.x = x;
  }
}

export { SamRes };
