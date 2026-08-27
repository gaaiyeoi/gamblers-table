import { createDefaultGameState, type GameState } from '../core/state/gameState'
import { deepMergeAll } from '../core/state/deepMerge'
import { migrate } from '../core/state/schema'
import { deserializeState, serializeState } from '../core/state/serializer'
import { STORAGE_KEY, type StorageAdapter } from './storageAdapter'

/**
 * localStorage 存档实现。
 * 加载流程：读取原始 JSON → 反序列化（Decimal 还原）→ 深度合并补齐缺省 →
 * 版本迁移 → 返回。
 */
export class LocalStorageAdapter implements StorageAdapter {
  readonly name = 'local'

  constructor(private readonly key: string = STORAGE_KEY) {}

  async save(state: GameState): Promise<void> {
    const serialized = serializeState(state)
    localStorage.setItem(this.key, JSON.stringify(serialized))
  }

  async load(): Promise<GameState | null> {
    const raw = localStorage.getItem(this.key)
    if (raw === null) return null
    try {
      const data = deserializeState<GameState>(JSON.parse(raw))
      const defaults = createDefaultGameState()
      const merged = deepMergeAll(defaults, data)
      return migrate(merged)
    } catch (error) {
      console.error('[localAdapter] 存档加载失败，返回 null', error)
      return null
    }
  }

  async wipe(): Promise<void> {
    localStorage.removeItem(this.key)
  }
}
