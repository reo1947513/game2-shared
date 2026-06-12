// ARENA STRIKE オンラインの共有プロトコル型（クライアント/サーバー共通の正本）。
// game2 と game2-server の双方に git サブモジュールとして取り込み、各リポジトリの
// netTypes は本ファイルを再エクスポートする。ここを編集すれば両側へ反映される。

// ROOFTOP DUEL の型・ステージ幾何は rooftop.ts に分離し、本ファイル末尾で再エクスポートする。
import type { RooftopShared } from "./rooftop";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// プレイヤー1人の状態（クライアントが送り、サーバーが中継してブロードキャストする）。
// hp はフェーズ2でサーバー権威となり、サーバーが上書きして配る。
export interface PlayerState {
  playerId: string;
  position: Vec3;
  velocity: Vec3;
  yaw: number;
  pitch: number;
  hp: number;
  onGround: boolean;
  seq: number; // クライアントの入力シーケンス番号（lastProcessedSeq用）
}

// サーバー権威で物理計算するグレネードの飛行状態。
export interface ProjectileState {
  id: string;
  type: "frag" | "flash";
  position: Vec3;
  velocity: Vec3;
  fuse: number;
}

// 命中・撃破・爆発などの単発イベント。
export interface GameEvent {
  type: "HIT" | "KILL" | "GRENADE_EXPLODE" | "FLASHBANG_EXPLODE" | "COOP_BONUS";
  payload: Record<string, unknown>;
  tick: number;
}

// ステージの当たり判定箱（ホストが開始時に送る）。
export interface Box {
  min: Vec3;
  max: Vec3;
}

export type Team = "RED" | "BLUE";

// チームデスマッチの1人分の集計（スコアボード・リザルト内訳用）。
export interface TDMPlayerShared {
  playerId: string;
  team: Team;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  high: number; // 高所キル数
  melee: number; // 近接キル数
  grenade: number; // グレネードキル数
  streak: number; // 連続キルボーナス回数
}

// チームデスマッチの共有状態（WorldStateに同梱して全クライアントへ配る）。
export interface TDMShared {
  phase: "PLAYING" | "RESULT";
  timeRemaining: number; // 秒
  scores: { RED: number; BLUE: number };
  kills: { RED: number; BLUE: number };
  killLimit: number;
  teams: Record<string, Team>; // playerId → チーム
  respawn: Record<string, number>; // playerId → 復活までの残り秒（0=生存）
  winner?: Team | "DRAW";
  players: TDMPlayerShared[]; // 各プレイヤーの集計
}

// ===== コープ・ガントレット／タワー共通の敵種別 =====
// 既存コープが使う grunt/fast/boss は温存する（退行防止）。
// standard〜summoner はタワーモードの通常敵6種、boss_* はタワーのボス5種。
export type EnemyType =
  | "grunt"
  | "fast"
  | "boss"
  | "standard"
  | "tank"
  | "ranged"
  | "exploder"
  | "summoner"
  | "boss_crusher"
  | "boss_phantom"
  | "boss_warlord"
  | "boss_hivemind"
  | "boss_siege";

// タワーのボス5種の識別子（ServerBossState.bossType・BOSS_SCHEDULE で使用）。
export type BossType = "crusher" | "phantom" | "warlord" | "hivemind" | "siege";

export interface ServerEnemyState {
  id: string;
  etype: EnemyType;
  position: Vec3;
  hp: number;
  maxHp: number;
  currentTarget: string | null; // 追跡中のプレイヤーID（フォローキル判定用）
  flashedBy: string | null; // フラッシュを当てた投擲者ID
  flashedUntil: number; // フラッシュ有効期限（epoch ms）
}

// タワーのボス1体ぶんの権威状態。ServerEnemyState を継承し、ボス固有の表示情報を足す。
// hp/maxHp は ServerEnemyState のものをそのまま使う（currentHp は hp と同義）。
export interface ServerBossState extends ServerEnemyState {
  bossType: BossType;
  phase: number; // 1/2/3（HPに応じた行動フェーズ。siege のみ3まで）
  label: string; // HUD表示名（例 "CRUSHER" / "SIEGE ENGINE 最終形態"）
  action: "none" | "charge" | "teleport" | "barrage" | "summon"; // クライアントFX用の現在アクション
}

export type CoopStatus = "ALIVE" | "DOWN" | "DEAD";

export interface CoopPlayerShared {
  playerId: string;
  status: CoopStatus;
  hp: number;
  downTimer: number; // 0..5（フィニッシュまでの秒）
  reviveProgress: number; // 0..5（蘇生完了までの秒）
  score: number;
}

export interface CoopShared {
  phase: "WAVE" | "REST" | "RESULT";
  currentWave: number;
  restCountdown: number; // 秒
  enemiesRemaining: number;
  enemies: ServerEnemyState[];
  players: CoopPlayerShared[];
  totalScore: number;
  wipe?: boolean; // RESULT時：全滅したか
}

// ===== タワー（100層フロア制）=====
// コープの蘇生システムを流用しつつ、フロア進行とボスフロアを足したモード。
export type TowerPhase =
  | "LOBBY" // 開始前（湧き待ち）
  | "COUNTDOWN" // フロア開始のカウントダウン
  | "WAVE" // 通常Wave戦闘中
  | "BOSS" // ボスフロア戦闘中
  | "REST" // フロアクリア後の休憩
  | "RESULT" // 全滅で終了
  | "CLEARED"; // 100層クリアで終了

// タワーのプレイヤー1人ぶんの共有状態。コープの集計に到達層を足す。
export interface TowerPlayerShared extends CoopPlayerShared {
  floorReached: number; // そのプレイヤーが到達した最高層
}

// タワーの共有状態（WorldStateに同梱して全クライアントへ配る）。
export interface TowerShared {
  phase: TowerPhase;
  currentFloor: number; // 1..100
  waveEnemiesRemaining: number; // 通常敵の残数（ボスは含めない）
  restCountdown: number; // 秒（フロアクリア後の休憩）
  countdown: number; // 秒（COUNTDOWN中の残り）
  enemies: ServerEnemyState[]; // 通常敵（ボスは boss フィールドへ分離）
  boss: ServerBossState | null; // ボスフロア時のみ
  players: TowerPlayerShared[];
  totalScore: number;
  startedAt: number; // 開始時刻（epoch ms。クリアタイム算出用）
  cleared: boolean; // 100層クリア済みか
  clearTimeSec?: number; // クリアタイム（秒、クリア時のみ）
  wipe?: boolean; // RESULT時：全滅したか
}

// ロビーに出すプレイヤー情報。
export interface PlayerInfo {
  playerId: string;
  name: string;
  isHost: boolean;
}

// 20tick/s でブロードキャストする世界状態。
export interface WorldState {
  tick: number;
  timestamp: number;
  players: PlayerState[];
  projectiles: ProjectileState[]; // サーバー権威のグレネード飛行状態
  events: GameEvent[]; // このtickで発生した単発イベント
  lastProcessedSeq: Record<string, number>; // プレイヤーごとの処理済みseq
  tdm?: TDMShared; // チームデスマッチ時のみ
  coop?: CoopShared; // コープ・ガントレット時のみ
  tower?: TowerShared; // タワー（coop_tower）時のみ
  rooftop?: RooftopShared; // ROOFTOP DUEL 時のみ
}

export type ErrorCode =
  | "ERR_ROOM_NOT_FOUND"
  | "ERR_ROOM_FULL"
  | "ERR_BAD_MESSAGE"
  | "ERR_NOT_IN_ROOM";

// ===== クライアント → サーバー =====
export type ClientMessage =
  | { type: "IDENTIFY"; payload: { playerId: string } } // 端末固定ID（戦績の累積キー）
  | { type: "CREATE_ROOM"; payload: { maxPlayers: number; mode: string; stage: string } }
  | { type: "JOIN_ROOM"; payload: { roomCode: string } }
  | { type: "PLAYER_STATE"; payload: PlayerState }
  | { type: "START_GAME" }
  | { type: "LEAVE_ROOM" }
  // フェーズ2：戦闘
  | { type: "SET_COLLIDERS"; payload: { colliders: Box[] } } // ホストがステージの当たり判定を送る
  | { type: "SHOT"; payload: { origin: Vec3; direction: Vec3; seq: number; rtt: number; damage: number } }
  | { type: "THROW_GRENADE"; payload: { gtype: "frag" | "flash"; origin: Vec3; velocity: Vec3 } }
  | { type: "MELEE_HIT"; payload: { kind: "knife" | "kick" } }
  | { type: "REVIVE"; payload: { active: boolean } }
  | { type: "USE_ZIPLINE"; payload: { ziplineId: string } } // ROOFTOP DUEL：ジップライン乗り込み要求
  | { type: "PING"; payload: { clientTime: number } };

// ===== サーバー → クライアント =====
export type ServerMessage =
  | { type: "ROOM_CREATED"; payload: { roomCode: string; playerId: string; players: PlayerInfo[]; maxPlayers: number } }
  | { type: "ROOM_JOINED"; payload: { roomCode: string; playerId: string; players: PlayerInfo[]; maxPlayers: number } }
  | { type: "PLAYER_JOINED"; payload: PlayerInfo }
  | { type: "PLAYER_LEFT"; payload: { playerId: string } }
  | { type: "GAME_START"; payload: { mode: string; stage: string } }
  | { type: "WORLD_STATE"; payload: WorldState }
  | { type: "PONG"; payload: { clientTime: number; serverTime: number } }
  | { type: "ERROR"; payload: { code: ErrorCode; message: string } };

// ROOFTOP DUEL の型・ステージ幾何（SKYLINE FIVE）を再エクスポートする。
// これにより両リポジトリの netTypes（export * from protocol）から参照できる。
export * from "./rooftop";
