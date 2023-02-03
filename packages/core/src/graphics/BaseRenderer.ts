import Component from "@/component/Component";
import GameEntity from "@/entity/GameEntity";
import Transform from "@/Transform";
import { Mesh } from "@/utils/mesh";

export default class BaseRenderer extends Component {
  context!: WebGL2RenderingContext;
  mesh!: Mesh;
  transform!: Transform;

  constructor(gameEntity: GameEntity) {
    super(gameEntity);
  }
  async render() {}
}
