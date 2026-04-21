import type Scene from "../Scene";
import type { UIDescriptor } from "./Descriptor";
import type { EntityInstance, UIInstance } from "./Instance";
import type { ProjectionContext } from "./ProjectionContext";

export interface UIRenderer {
  materialize(
    descriptor: UIDescriptor,
    context: ProjectionContext,
    owner: EntityInstance | Scene
  ): UIInstance;
}
