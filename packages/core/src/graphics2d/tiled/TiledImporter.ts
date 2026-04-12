import type { TriggerZone } from "../TriggerZone";
import type { TiledMap, TiledTilesetRef } from "./TiledTypes";

export interface ParsedTileset {
  firstGid: number;
  columns: number;
  tileCount: number;
  tileWidth: number;
  tileHeight: number;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  animatedTiles: Map<number, Array<{ localId: number; duration: number }>>;
}

export interface ParsedTileLayer {
  name: string;
  tiles: Uint32Array; // GIDs, mapWidth * mapHeight
  opacity: number;
  visible: boolean;
  isCollision: boolean;
}

export interface ParsedObjectLayer {
  name: string;
  objects: TriggerZone[];
}

export interface ParsedTiledMap {
  mapWidth: number;
  mapHeight: number;
  tileWidth: number;
  tileHeight: number;
  tileLayers: ParsedTileLayer[];
  objectLayers: ParsedObjectLayer[];
  tilesets: ParsedTileset[];
}

export default class TiledImporter {
  static async load(url: string): Promise<ParsedTiledMap> {
    const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);
    const response = await fetch(url);
    const json: TiledMap = await response.json();

    // Resolve external tilesets
    const tilesets: ParsedTileset[] = [];
    for (const ref of json.tilesets) {
      const resolved = ref.source
        ? await TiledImporter.#loadExternalTileset(baseUrl + ref.source, ref.firstgid)
        : TiledImporter.#parseInlineTileset(ref);
      // Resolve relative image URL
      if (resolved.imageUrl && !resolved.imageUrl.startsWith("http")) {
        resolved.imageUrl = baseUrl + resolved.imageUrl;
      }
      tilesets.push(resolved);
    }

    // Sort tilesets by firstGid ascending for lookup
    tilesets.sort((a, b) => a.firstGid - b.firstGid);

    // Parse layers
    const tileLayers: ParsedTileLayer[] = [];
    const objectLayers: ParsedObjectLayer[] = [];

    for (const layer of json.layers) {
      if (layer.type === "tilelayer" && layer.data) {
        const isCollision =
          layer.name.toLowerCase() === "collision" ||
          (layer.properties?.some((p) => p.name === "collision" && p.value === true) ?? false);
        tileLayers.push({
          name: layer.name,
          tiles: new Uint32Array(layer.data),
          opacity: layer.opacity,
          visible: layer.visible,
          isCollision,
        });
      } else if (layer.type === "objectgroup" && layer.objects) {
        const ppu = json.tilewidth;
        const mapWorldH = json.height; // map height in world units (1 tile = 1 unit)
        objectLayers.push({
          name: layer.name,
          objects: layer.objects.map((obj) => ({
            id: obj.id,
            name: obj.name,
            type: obj.type,
            worldX: obj.x / ppu,
            worldY: mapWorldH - obj.y / ppu,
            worldW: obj.width / ppu,
            worldH: obj.height / ppu,
            properties: Object.fromEntries((obj.properties ?? []).map((p) => [p.name, p.value])),
          })),
        });
      }
    }

    return {
      mapWidth: json.width,
      mapHeight: json.height,
      tileWidth: json.tilewidth,
      tileHeight: json.tileheight,
      tileLayers,
      objectLayers,
      tilesets,
    };
  }

  static async #loadExternalTileset(url: string, firstGid: number): Promise<ParsedTileset> {
    const response = await fetch(url);
    const json: TiledTilesetRef = await response.json();
    return TiledImporter.#parseInlineTileset({ ...json, firstgid: firstGid });
  }

  static #parseInlineTileset(ref: TiledTilesetRef): ParsedTileset {
    const animatedTiles = new Map<number, Array<{ localId: number; duration: number }>>();
    if (ref.tiles) {
      for (const tile of ref.tiles) {
        if (tile.animation) {
          animatedTiles.set(
            tile.id,
            tile.animation.map((a) => ({
              localId: a.tileid,
              duration: a.duration / 1000, // ms → seconds
            }))
          );
        }
      }
    }

    return {
      firstGid: ref.firstgid,
      columns: ref.columns ?? 1,
      tileCount: ref.tilecount ?? 0,
      tileWidth: ref.tilewidth ?? 0,
      tileHeight: ref.tileheight ?? 0,
      imageUrl: ref.image ?? "",
      imageWidth: ref.imagewidth ?? 0,
      imageHeight: ref.imageheight ?? 0,
      animatedTiles,
    };
  }
}
