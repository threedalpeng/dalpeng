import { SpriteAtlas, TileCollider, TiledImporter, TilemapRenderer } from "@dalpeng/core";
import { defineEntity, onStart, Transform, useComponent, withName } from "dalpeng";
import { setTileCollider } from "../shared";

const TILEMAP_URL = "/assets/maps/world.tmj";

export default defineEntity(() => {
  withName("Tilemap");

  useComponent(Transform);

  const renderer = useComponent(TilemapRenderer, (r) => {
    r.pixelsPerUnit = 32;
  });

  onStart(async () => {
    try {
      const map = await TiledImporter.load(TILEMAP_URL);

      const app = renderer.gameEntity.currentApp;
      const atlasMap = new Map<(typeof map.tilesets)[number], SpriteAtlas>();

      for (const tileset of map.tilesets) {
        const texture = await app.textures.load(tileset.imageUrl, { srgb: true, mipmaps: false });
        const atlas = SpriteAtlas.fromUniform(
          texture,
          tileset.imageWidth,
          tileset.imageHeight,
          tileset.tileWidth,
          tileset.tileHeight
        );
        atlasMap.set(tileset, atlas);
      }

      renderer.build(map, atlasMap);

      const collider = new TileCollider(map, renderer.pixelsPerUnit);
      setTileCollider(collider);
    } catch (err) {
      // Asset may not exist yet — skip gracefully so the project stays runnable.
      console.warn("[Tilemap] Could not load tilemap:", TILEMAP_URL, err);
    }
  });
});
