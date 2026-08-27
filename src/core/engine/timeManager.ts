/**
 * 时间管理器：负责实时时间记录、离线时长计算与离线模拟调度。
 * 参考 antimatter-dimensions 的 simulateTime：离线收益不逐帧模拟，
 * 先公式结算，再小规模补算动态机制，tick 数设上限防卡死。
 */

export interface OfflineResult {
  /** 离线真实时长（毫秒）。 */
  realMs: number
  /** 离线游戏时长（毫秒，含速度倍率）。 */
  gameMs: number
  /** 实际模拟的 tick 数。 */
  ticks: number
}

export class TimeManager {
  private lastUpdate: number
  /** 游戏速度倍率（如黑洞/加速等），默认 1。 */
  gameSpeed = 1
  /** 离线结算单步时长（毫秒），默认 33ms（参考原项目 33ms 下限）。 */
  stepMs = 33
  /** 离线结算最大 tick 数，防卡死。 */
  maxTicks = 1000

  constructor(now: () => number = Date.now) {
    this.lastUpdate = now()
  }

  /** 记录当前时间戳（每次主循环/保存后调用），返回当前时间。 */
  touch(now: number = Date.now()): number {
    this.lastUpdate = now
    return now
  }

  getLastUpdate(): number {
    return this.lastUpdate
  }

  /** 计算从上次 touch 至今的离线时长，并推进时间戳。 */
  consumeOffline(now: number = Date.now()): OfflineResult {
    const realMs = Math.max(0, now - this.lastUpdate)
    this.lastUpdate = now
    const gameMs = realMs * this.gameSpeed
    const ticks = Math.min(Math.floor(gameMs / this.stepMs), this.maxTicks)
    return { realMs, gameMs, ticks }
  }

  /**
   * 执行离线模拟：先做快速公式结算（见 simulate 回调），
   * 再按固定步长小规模补算动态机制。返回实际 tick 数。
   */
  simulate(
    realMs: number,
    onFormula: (realMs: number, gameMs: number) => void,
    onTick: (deltaMs: number) => void,
  ): OfflineResult {
    const gameMs = realMs * this.gameSpeed
    const ticks = Math.min(Math.floor(gameMs / this.stepMs), this.maxTicks)
    onFormula(realMs, gameMs)
    let remainingGameMs = gameMs
    for (let i = ticks; i > 0; i -= 1) {
      const delta = remainingGameMs / i
      onTick(delta)
      remainingGameMs -= delta
    }
    return { realMs, gameMs, ticks }
  }
}
