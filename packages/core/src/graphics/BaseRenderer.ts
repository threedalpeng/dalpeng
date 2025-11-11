import Component from "@/component/Component";
import GameEntity from "@/entity/GameEntity";
import Transform from "@/Transform";
import { type Mesh } from "@/utils/mesh";

export default class BaseRenderer extends Component {
  // Reserved for any backend-specific context if needed later
  context: any;
  mesh!: Mesh;
  transform!: Transform;

  constructor(gameEntity: GameEntity) {
    super(gameEntity);
  }
  async render() {}
}
