import type { GameState } from '../core/state/gameState'

/**
 * 存储抽象接口（关键可移植设计）：
 * 当前使用 LocalStorageAdapter（本地存档），未来接入后端/云端只需
 * 新增一个实现（如 BackendAdapter），业务逻辑零改动。
 */
export interface StorageAdapter {
  /** 适配器名称（用于日志/调试）。 */
  readonly name: string
  /** 保存存档。 */
  save(state: GameState): Promise<void>
  /** 读取存档；无存档返回 null。 */
  load(): Promise<GameState | null>
  /** 清除存档（重置游戏）。 */
  wipe(): Promise<void>
}

export const STORAGE_KEY = 'coin-flip-game:save'
