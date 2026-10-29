export type NodeKind =
  | "laptop"
  | "pc"
  | "server"
  | "camera"
  | "payment"
  | "router"
  | "ap"
  | "iot"
  | "firewall"
  | "kiosk"
  | "tv";

export interface NodeDef {
  id: string;
  code: string;
  label: string;
  x: number;
  y: number;
  kind: NodeKind;
  protected?: boolean;
  essential?: boolean;
  anchor?: boolean;
}

export interface EdgeDef {
  id: string;
  a: string;
  b: string;
  label: string;
  /** GHOST can cross an enabled vulnerable link. Patched links carry service only. */
  vulnerable: boolean;
  /** Perpendicular bow of the cable, in board units. */
  bend?: number;
  group: string;
}

export interface EssentialDef {
  service: string;
  anchor: string;
  name: string;
}

export interface ZoneDef {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tone: "danger" | "safe" | "neutral";
}

export interface LevelDef {
  id: number;
  codename: string;
  title: string;
  objective: string;
  principle: string;
  countdown: number;
  /** Null means the player can cut as many links as they want. */
  maxCuts: number | null;
  nodes: NodeDef[];
  edges: EdgeDef[];
  infected: string[];
  essentials: EssentialDef[];
  zones: ZoneDef[];
  intro: string[];
  hint: string;
  success: string[];
  notes: { compromised: string; outage: string };
  /** Edge id the tutorial should pulse. */
  spotlight?: string;
}

export interface SpreadEvent {
  node: string;
  from: string;
  edge: string;
}

export interface BlockEvent {
  edge: string;
  from: string;
  to: string;
}

export interface ServiceState {
  id: string;
  name: string;
  serviceLabel: string;
  anchorLabel: string;
  ok: boolean;
}

export type Outcome =
  | { type: "ongoing" }
  | { type: "win" }
  | {
      type: "loss";
      kind: "compromised" | "outage";
      headline: string;
      detail: string;
    };
