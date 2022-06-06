class EventHandler {}

export class OneToMany {
  id = 0;
}

class Jumpable {
  jump() {}
}
class Duckable {}
// Including the base
class Sprite {
  x = 0;
  y = 0;
}

// Then you create an interface which merges
// the expected mixins with the same name as your base
interface Sprite extends Jumpable, Duckable {}
// Apply the mixins into the base class via
// the JS at runtime
applyMixins(Sprite, [Jumpable, Duckable]);

let player = new Sprite();
player.jump();
console.log(player.x, player.y);

// This can live anywhere in your codebase:

type AnyConstructor = new () => void;
export function applyMixins(
  derivedCtor: AnyConstructor,
  constructors: AnyConstructor[]
) {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      Object.defineProperty(
        derivedCtor.prototype,
        name,
        Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
          Object.create(null)
      );
    });
  });
}
