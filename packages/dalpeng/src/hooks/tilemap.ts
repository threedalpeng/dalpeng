import type { ParsedTiledMap, ParsedTileset, TriggerZone } from "@dalpeng/core";
import { SpriteAtlas, TileCollider, TiledImporter, TilemapRenderer } from "@dalpeng/core";
import { requireEntity } from "../context";
import { useComponent } from "./gameEntity";

export interface TilemapHandle {
  ready: Promise<void>;
  collider: TileCollider | null;
  renderer: TilemapRenderer;
  /** Returns trigger zone objects from object layers matching `type`. Valid after `ready` resolves. */
  getObjects(type: string): TriggerZone[];
}

/** Must be called inside defineEntity() setup. */
export function useTilemap(url: string, pixelsPerUnit = 16): TilemapHandle {
  const entity = requireEntity("useTilemap");
  const atlases = entity.currentApp.atlases;

  const renderer = useComponent(TilemapRenderer);
  renderer.pixelsPerUnit = pixelsPerUnit;

  let parsedMap: ParsedTiledMap | null = null;

  const handle: TilemapHandle = {
    ready: Promise.resolve(),
    collider: null,
    renderer,
    getObjects(type: string): TriggerZone[] {
      if (!parsedMap) return [];
      const results: TriggerZone[] = [];
      for (const layer of parsedMap.objectLayers) {
        for (const obj of layer.objects) {
          if (obj.type === type) results.push(obj);
        }
      }
      return results;
    },
  };

  handle.ready = TiledImporter.load(url)
    .then(async (map) => {
      parsedMap = map;

      const atlasMap = new Map<ParsedTileset, SpriteAtlas>();
      await Promise.all(
        map.tilesets.map(async (tileset) => {
          const atlas = await atlases.loadUniform(
            tileset.imageUrl,
            tileset.tileWidth,
            tileset.tileHeight
          );
          atlasMap.set(tileset, atlas);
        })
      );

      renderer.build(map, atlasMap);
      handle.collider = new TileCollider(map, pixelsPerUnit);
    })
    .catch((err: unknown) => {
      console.error("[useTilemap] Failed to load:", url, err);
      throw err;
    });

  return handle;
}
