export { MatrixMotel } from "./MatrixMotel";
export type { MatrixMotelProps } from "./MatrixMotel";
export { LESSONS, LEVELS } from "../game/levels";
export {
  attackRoutes,
  blockedAttempts,
  forecast,
  judge,
  pathEdgesTo,
  propagate,
  reaches,
  serviceStatus,
  simulate,
  validateLevel,
} from "../game/engine";
export type { LevelDef, Outcome, ServiceState, SpreadEvent } from "../game/types";
