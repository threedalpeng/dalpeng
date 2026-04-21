import Component from "@/ecs/Component";
import GameEntity from "@/ecs/GameEntity";
import Transform from "@/ecs/Transform";
import { type Mesh } from "@/utils/mesh";

export default class BaseRenderer extends Component {
  // Reserved for any backend-specific context if needed later
  context: unknown;
  mesh!: Mesh;
  transform!: Transform;

  constructor(gameEntity: GameEntity) {
    super(gameEntity);
  }
  async render() {}
}
