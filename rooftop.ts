// ARENA STRIKE「ROOFTOP DUEL」モードの共有定義（クライアント/サーバー共通の正本）。
// 型（ワイヤ）とステージ SKYLINE FIVE の幾何データを1か所にまとめ、
// クライアントの見た目とサーバーのコライダー・ジップライン端点を同じ数値から導出する。
// protocol.ts が本ファイルを `export * from "./rooftop"` で再エクスポートし、
// 両リポジトリの netTypes から参照できるようにする。

import type { Vec3, Box } from "./protocol";

// ===== ルール・フェーズ =====
export type RooftopRule = "deathmatch" | "survival";
export type RooftopPhase = "LOBBY" | "COUNTDOWN" | "PLAYING" | "ROUND_END" | "RESULT";

// 5棟の識別子。
export type BuildingId = "A" | "B" | "C" | "D" | "E";

// ===== ジップライン（屋上間の片道移動）=====
// 高い屋上から低い屋上へのみ移動できる。サーバーが inUse でロックする。
export interface ZiplineState {
  id: string;
  fromBuilding: BuildingId;
  toBuilding: BuildingId;
  from: Vec3; // 出発アンカー（高い屋上の端）
  to: Vec3; // 到着アンカー（低い屋上の端）
  direction: Vec3; // normalize(to - from)
  length: number; // |to - from|
  speed: number; // m/s（ZIPLINE_SPEED 固定）
  inUse: string | null; // 使用中プレイヤーID（null=空き）
  cooldown: number; // 連続使用クールダウン残り（秒）
}

// ===== プレイヤー1人ぶんの共有状態 =====
export interface RooftopPlayerShared {
  playerId: string;
  kills: number;
  deaths: number;
  score: number;
  isAlive: boolean;
  respawnCountdown: number; // 0=生存、>0=リスポーンまでの残り秒
  invulnUntil: number; // 無敵終了時刻（epoch ms。リスポーン直後2秒間）
  onZipline: string | null; // 乗り込み中のジップラインID（null=非搭乗）
  ziplineProgress: number; // 0..1
  spectatingId: string | null; // サバイバル死亡後の観戦対象
  roundWins: number; // サバイバルのラウンド勝利数
}

// ===== モード全体の共有状態（WorldState.rooftop に同梱）=====
export interface RooftopShared {
  rule: RooftopRule;
  phase: RooftopPhase;
  timeRemaining: number; // 秒
  round: number; // サバイバル：現在ラウンド（1..3）。デスマッチでは常に1
  killLimit: number; // デスマッチ：キル上限（人数で変動）
  dangerZones: BuildingId[]; // サバイバル：危険ゾーンになった棟
  ziplines: ZiplineState[];
  players: RooftopPlayerShared[];
  winnerId?: string; // 確定した勝者（RESULT時）
}

// ===== ステージ SKYLINE FIVE の幾何 =====
// 各棟は屋上フットプリントをそのまま地上まで伸ばした矩形タワーとして扱う。
export interface BuildingDef {
  id: BuildingId;
  cx: number; // 中心X
  cz: number; // 中心Z
  roofY: number; // 屋上面の高さ
  sizeX: number; // 屋上の広さX
  sizeZ: number; // 屋上の広さZ
}

export const MAP_SIZE = 320;
export const PARAPET_HEIGHT = 0.9; // 屋上四周のパラペット（伏せ遮蔽）
export const PARAPET_THICK = 0.3;
export const ZIPLINE_SPEED = 14; // m/s
export const ZIPLINE_COOLDOWN = 3; // 秒

export const BUILDINGS: BuildingDef[] = [
  { id: "A", cx: -80, cz: -80, roofY: 38, sizeX: 18, sizeZ: 22 }, // 北西・遮蔽多め
  { id: "B", cx: 80, cz: -80, roofY: 52, sizeX: 14, sizeZ: 18 }, // 北東・最高点・露出
  { id: "C", cx: 0, cz: 10, roofY: 44, sizeX: 20, sizeZ: 20 }, // 中央・激戦区
  { id: "D", cx: -70, cz: 90, roofY: 32, sizeX: 22, sizeZ: 16 }, // 南西・最低点・面積最大
  { id: "E", cx: 70, cz: 90, roofY: 46, sizeX: 16, sizeZ: 20 }, // 南東・細い遮蔽多め
];

// 屋上の遮蔽小物。dx/dz は屋上中心からの相対水平位置。
// box: sizeX×sizeY×sizeZ。cylinder: 半径=sizeX/2, 高さ=sizeY（コライダーはAABB近似）。
export type PropKind = "box" | "cylinder";
export interface PropDef {
  building: BuildingId;
  kind: PropKind;
  dx: number;
  dz: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  label: string; // 視覚生成・デバッグ用の種別ラベル
}

export const PROPS: PropDef[] = [
  // 棟A：大型空調1基＋小型2基（籠もり向き）
  { building: "A", kind: "box", dx: 0, dz: 0, sizeX: 2, sizeY: 1.8, sizeZ: 4, label: "ac_large" },
  { building: "A", kind: "box", dx: -5, dz: 6, sizeX: 1.2, sizeY: 1.0, sizeZ: 1.2, label: "ac_small" },
  { building: "A", kind: "box", dx: 5, dz: -6, sizeX: 1.2, sizeY: 1.0, sizeZ: 1.2, label: "ac_small" },
  // 棟B：小型空調2基のみ（ほぼ露出）
  { building: "B", kind: "box", dx: -3, dz: 3, sizeX: 1.2, sizeY: 1.0, sizeZ: 1.2, label: "ac_small" },
  { building: "B", kind: "box", dx: 3, dz: -3, sizeX: 1.2, sizeY: 1.0, sizeZ: 1.2, label: "ac_small" },
  // 棟C：中央に非常階段出口の小屋＋四隅に小型機器
  { building: "C", kind: "box", dx: 0, dz: 0, sizeX: 3, sizeY: 2.5, sizeZ: 3, label: "stair_hut" },
  { building: "C", kind: "box", dx: -7, dz: -7, sizeX: 1.0, sizeY: 0.9, sizeZ: 1.0, label: "unit" },
  { building: "C", kind: "box", dx: 7, dz: -7, sizeX: 1.0, sizeY: 0.9, sizeZ: 1.0, label: "unit" },
  { building: "C", kind: "box", dx: -7, dz: 7, sizeX: 1.0, sizeY: 0.9, sizeZ: 1.0, label: "unit" },
  { building: "C", kind: "box", dx: 7, dz: 7, sizeX: 1.0, sizeY: 0.9, sizeZ: 1.0, label: "unit" },
  // 棟D：給水タンク（円柱）＋パレット積みの資材（段積み）
  { building: "D", kind: "cylinder", dx: 6, dz: 0, sizeX: 2.4, sizeY: 2.5, sizeZ: 2.4, label: "water_tank" },
  { building: "D", kind: "box", dx: -6, dz: 3, sizeX: 2.0, sizeY: 1.6, sizeZ: 2.0, label: "crates" },
  { building: "D", kind: "box", dx: -6, dz: 3, sizeX: 1.4, sizeY: 2.4, sizeZ: 1.4, label: "crates_top" },
  // 棟E：アンテナ塔（細い円柱群）＋機器ボックス複数（隙間射撃）
  { building: "E", kind: "cylinder", dx: 0, dz: 0, sizeX: 0.3, sizeY: 6.0, sizeZ: 0.3, label: "antenna" },
  { building: "E", kind: "cylinder", dx: 1.5, dz: 1.0, sizeX: 0.24, sizeY: 4.5, sizeZ: 0.24, label: "antenna" },
  { building: "E", kind: "cylinder", dx: -1.5, dz: -1.0, sizeX: 0.24, sizeY: 4.5, sizeZ: 0.24, label: "antenna" },
  { building: "E", kind: "box", dx: 5, dz: 5, sizeX: 1.2, sizeY: 1.0, sizeZ: 1.2, label: "unit" },
  { building: "E", kind: "box", dx: -5, dz: -5, sizeX: 1.2, sizeY: 1.0, sizeZ: 1.2, label: "unit" },
  { building: "E", kind: "box", dx: -5, dz: 5, sizeX: 1.0, sizeY: 0.8, sizeZ: 1.0, label: "unit" },
];

// 高い方から低い方へ向かうジップライン6本（[from, to]）。
const ZIPLINE_LINKS: [BuildingId, BuildingId][] = [
  ["B", "C"],
  ["B", "A"],
  ["C", "A"],
  ["C", "D"],
  ["E", "C"],
  ["E", "D"],
];

// ===== 小さなベクトルヘルパー =====
function buildingById(id: BuildingId): BuildingDef {
  const b = BUILDINGS.find((x) => x.id === id);
  if (!b) throw new Error(`unknown building ${id}`);
  return b;
}

// 棟 b の屋上端のうち partner 方向のアンカー位置（ワイヤ接続点）。
function anchorToward(b: BuildingDef, partner: BuildingDef): Vec3 {
  const dx = partner.cx - b.cx;
  const dz = partner.cz - b.cz;
  const d = Math.hypot(dx, dz) || 1;
  const inset = Math.min(b.sizeX, b.sizeZ) / 2 - 0.5; // パラペットの少し内側
  return {
    x: b.cx + (dx / d) * inset,
    y: b.roofY + 1.1, // アンカー柱の上端（ワイヤ高さ）
    z: b.cz + (dz / d) * inset,
  };
}

// ジップラインの初期状態を生成する（サーバー権威の seed。client も同じ端点で描画）。
export function buildZiplines(): ZiplineState[] {
  return ZIPLINE_LINKS.map(([fromId, toId], i) => {
    const fb = buildingById(fromId);
    const tb = buildingById(toId);
    const from = anchorToward(fb, tb);
    const to = anchorToward(tb, fb);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const length = Math.hypot(dx, dy, dz) || 1;
    return {
      id: `zip_${i + 1}_${fromId}${toId}`,
      fromBuilding: fromId,
      toBuilding: toId,
      from,
      to,
      direction: { x: dx / length, y: dy / length, z: dz / length },
      length,
      speed: ZIPLINE_SPEED,
      inUse: null,
      cooldown: 0,
    };
  });
}

// 各棟の屋上中心（リスポーン候補）。y は屋上面の少し上。
export function roofSpawnPoints(): { id: BuildingId; pos: Vec3 }[] {
  return BUILDINGS.map((b) => ({ id: b.id, pos: { x: b.cx, y: b.roofY + 1.0, z: b.cz } }));
}

// ステージのコライダー（AABB群）を生成する。
// 内訳：各棟のビル本体（地上〜屋上）＋四周パラペット＋屋上小物。
// クライアント（ホスト）が SET_COLLIDERS で送るのも、サーバーが参照するのもこの集合。
export function buildColliders(): Box[] {
  const boxes: Box[] = [];
  for (const b of BUILDINGS) {
    const hx = b.sizeX / 2;
    const hz = b.sizeZ / 2;
    // ビル本体（地上から屋上面まで）。屋上面に乗る。
    boxes.push({
      min: { x: b.cx - hx, y: 0, z: b.cz - hz },
      max: { x: b.cx + hx, y: b.roofY, z: b.cz + hz },
    });
    // パラペット4枚（屋上面〜+PARAPET_HEIGHT）
    const t = PARAPET_THICK;
    const top = b.roofY + PARAPET_HEIGHT;
    // 北（-Z）
    boxes.push({ min: { x: b.cx - hx, y: b.roofY, z: b.cz - hz - t }, max: { x: b.cx + hx, y: top, z: b.cz - hz + t } });
    // 南（+Z）
    boxes.push({ min: { x: b.cx - hx, y: b.roofY, z: b.cz + hz - t }, max: { x: b.cx + hx, y: top, z: b.cz + hz + t } });
    // 西（-X）
    boxes.push({ min: { x: b.cx - hx - t, y: b.roofY, z: b.cz - hz }, max: { x: b.cx - hx + t, y: top, z: b.cz + hz } });
    // 東（+X）
    boxes.push({ min: { x: b.cx + hx - t, y: b.roofY, z: b.cz - hz }, max: { x: b.cx + hx + t, y: top, z: b.cz + hz } });
  }
  // 屋上小物
  for (const p of PROPS) {
    const b = buildingById(p.building);
    const cx = b.cx + p.dx;
    const cz = b.cz + p.dz;
    const hx = p.sizeX / 2;
    const hz = p.sizeZ / 2;
    boxes.push({
      min: { x: cx - hx, y: b.roofY, z: cz - hz },
      max: { x: cx + hx, y: b.roofY + p.sizeY, z: cz + hz },
    });
  }
  return boxes;
}
