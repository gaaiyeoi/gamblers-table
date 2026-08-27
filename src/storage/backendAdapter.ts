import type { GameState } from '../core/state/gameState'
import type { StorageAdapter } from './storageAdapter'

/**
 * 后端/云端存档适配器（预留空壳）。
 * 未来接入后端时实现 save/load/wipe，将存档同步到服务器，
 * 并在 GameStore 中切换到该适配器即可，业务逻辑无需改动。
 */
export class BackendAdapter implements StorageAdapter {
  readonly name = 'backend'

  async save(_state: GameState): Promise<void> {
    throw new Error('BackendAdapter 尚未实现：请接入后端存档接口')
  }

  async load(): Promise<GameState | null> {
    // 未接入后端时视为无远程存档
    return null
  }

  async wipe(): Promise<void> {
    // noop：无远程存档可清除
  }
}
