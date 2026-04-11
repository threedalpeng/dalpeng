export interface TriggerZone {
  id: number;
  name: string;
  type: string;
  worldX: number;
  worldY: number;
  worldW: number;
  worldH: number;
  properties: Record<string, any>;
}
