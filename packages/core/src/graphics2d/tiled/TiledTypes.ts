export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets: TiledTilesetRef[];
  orientation?: string;
  renderorder?: string;
  infinite?: boolean;
}

export interface TiledLayer {
  id: number;
  name: string;
  type: "tilelayer" | "objectgroup" | "imagelayer" | "group";
  data?: number[];
  objects?: TiledObject[];
  visible: boolean;
  opacity: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  properties?: TiledProperty[];
}

export interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
  properties?: TiledProperty[];
}

export interface TiledTilesetRef {
  firstgid: number;
  source?: string;
  name?: string;
  tilewidth?: number;
  tileheight?: number;
  imagewidth?: number;
  imageheight?: number;
  image?: string;
  tilecount?: number;
  columns?: number;
  tiles?: TiledTileDef[];
  margin?: number;
  spacing?: number;
}

export interface TiledTileDef {
  id: number;
  animation?: Array<{ tileid: number; duration: number }>;
  properties?: TiledProperty[];
}

export interface TiledProperty {
  name: string;
  type: string;
  value: any;
}
