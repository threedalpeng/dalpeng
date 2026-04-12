import Component from "../ecs/Component";
import type GameEntity from "../ecs/GameEntity";
import type SpriteAtlas from "./SpriteAtlas";
import type { ParsedTiledMap, ParsedTileset } from "./tiled/TiledImporter";

export interface TilemapLayerBatch {
  atlas: SpriteAtlas;
  instanceData: Float32Array;
  tileCount: number;
}

export default class TilemapRenderer extends Component {
  #map: ParsedTiledMap | null = null;
  #layerBatches: TilemapLayerBatch[] = [];
  pixelsPerUnit = 16;

  constructor(gameEntity: GameEntity) {
    super(gameEntity);
  }

  get map(): ParsedTiledMap | null {
    return this.#map;
  }
  get layerBatches(): TilemapLayerBatch[] {
    return this.#layerBatches;
  }

  build(map: ParsedTiledMap, atlases: Map<ParsedTileset, SpriteAtlas>): void {
    this.#map = map;
    this.#layerBatches = [];
    const ppu = this.pixelsPerUnit;

    for (const layer of map.tileLayers) {
      if (!layer.visible || layer.isCollision) continue;

      // Group tiles by tileset
      const tilesByTileset = new Map<
        ParsedTileset,
        Array<{ col: number; row: number; localId: number }>
      >();

      for (let i = 0; i < layer.tiles.length; i++) {
        const gid = layer.tiles[i];
        if (gid === 0) continue;

        const col = i % map.mapWidth;
        const row = Math.floor(i / map.mapWidth);
        const tileset = this.#findTileset(gid, map.tilesets);
        if (!tileset) continue;

        const localId = gid - tileset.firstGid;
        let arr = tilesByTileset.get(tileset);
        if (!arr) {
          arr = [];
          tilesByTileset.set(tileset, arr);
        }
        arr.push({ col, row, localId });
      }

      // Build batch per tileset
      for (const [tileset, tiles] of tilesByTileset) {
        const atlas = atlases.get(tileset);
        if (!atlas) continue;

        const floatsPerTile = 14;
        const instanceData = new Float32Array(tiles.length * floatsPerTile);

        for (let i = 0; i < tiles.length; i++) {
          const { col, row, localId } = tiles[i];
          const uv = atlas.getUV(localId);
          const offset = i * floatsPerTile;
          const tileW = tileset.tileWidth / ppu;
          const tileH = tileset.tileHeight / ppu;

          instanceData[offset + 0] = col * tileW + tileW * 0.5;
          instanceData[offset + 1] = (map.mapHeight - 1 - row) * tileH + tileH * 0.5;
          instanceData[offset + 2] = tileW; // width
          instanceData[offset + 3] = tileH; // height
          instanceData[offset + 4] = uv[0]; // uvX
          instanceData[offset + 5] = uv[1]; // uvY
          instanceData[offset + 6] = uv[2]; // uvW
          instanceData[offset + 7] = uv[3]; // uvH
          instanceData[offset + 8] = 1; // tint r
          instanceData[offset + 9] = 1; // tint g
          instanceData[offset + 10] = 1; // tint b
          instanceData[offset + 11] = layer.opacity; // tint a
          instanceData[offset + 12] = 0; // depth (tiles have fixed order)
          instanceData[offset + 13] = 0; // pad
        }

        this.#layerBatches.push({ atlas, instanceData, tileCount: tiles.length });
      }
    }
  }

  #findTileset(gid: number, tilesets: ParsedTileset[]): ParsedTileset | null {
    for (let i = tilesets.length - 1; i >= 0; i--) {
      if (gid >= tilesets[i].firstGid) return tilesets[i];
    }
    return null;
  }
}
