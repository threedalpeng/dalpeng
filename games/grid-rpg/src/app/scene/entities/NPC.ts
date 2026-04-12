import { Sprite2DRenderer, SpriteAtlas, Transform } from "@dalpeng/core";
import { vec3 } from "@dalpeng/math";
import type { DialogueLine } from "dalpeng";
import {
  defineGameEntity,
  Dialogue,
  onStart,
  onUpdate,
  useComponent,
  useDialogueController,
  useInput,
  useSceneSwitch,
  withName,
} from "dalpeng";
import FieldScene from "../FieldScene";

const SPRITE_URL = "/assets/sprites/player.png";

export default defineGameEntity(() => {
  withName("NPC");

  const transform = useComponent(Transform, (t) => {
    t.position = vec3(10.5, 10.5, 0);
    t.scale = vec3(1, 1, 1);
  });

  const sprite = useComponent(Sprite2DRenderer, (s) => {
    s.pixelsPerUnit = 16;
    s.sortingLayer = 1;
  });

  const sceneSwitch = useSceneSwitch();

  const lines: DialogueLine[] = [
    {
      speaker: "Villager",
      text: "Hello, traveler! Welcome to our little town.",
    },
    {
      speaker: "Villager",
      text: "There's a wide field to the east. Would you like to go there?",
      choices: [
        {
          label: "Yes, let's go!",
          onSelect: () => {
            sceneSwitch.switchTo(FieldScene, { type: "fade", duration: 400 });
          },
        },
        {
          label: "Not right now.",
          onSelect: () => {},
        },
      ],
    },
  ];

  const dialogue = useDialogueController(lines);

  onStart(async () => {
    const app = sprite.gameEntity.currentApp;
    try {
      const tex = await app.textures.load(SPRITE_URL, {
        srgb: true,
        mipmaps: false,
      });
      sprite.atlas = SpriteAtlas.fromUniform(tex, 64, 64, 16, 16);
      sprite.frame = 4; // idle-up, to distinguish from player (idle-down)
    } catch {
      console.warn("[NPC] Could not load sprite:", SPRITE_URL);
    }
  });

  const input = useInput();

  onUpdate(() => {
    const scene = sprite.gameEntity.scene;
    if (!scene) return;

    const playerEntities = scene.findByTag("player");
    if (!playerEntities || playerEntities.length === 0) return;

    const playerTransform = playerEntities[0].getComponent(Transform);
    if (!playerTransform) return;

    const npcPos = transform.position;
    const px = playerTransform.position[0];
    const py = playerTransform.position[1];
    const dx = px - npcPos[0];
    const dy = py - npcPos[1];
    const dist = Math.sqrt(dx * dx + dy * dy);

    const inRange = dist <= 1.5;

    if (inRange && (input.keyDown("KeyE") || input.keyDown("Enter"))) {
      if (!dialogue.isOpen.value) {
        dialogue.open();
      }
    }
  });

  return [Dialogue(dialogue)];
});
