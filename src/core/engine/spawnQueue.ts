/**
 * 生成队列（spawn queue）：增量游戏里"批量购买后逐个释放"的通用机制。
 *
 * 参考 idle / incremental 游戏（Antimatter Dimensions、Cookie Clicker 等）的
 * purchase / emit 队列：购买与雇佣会一次性改变数值（bought / count），但视觉
 * 精灵不必瞬间全部出现。本队列把"待生成的 N 个精灵"缓冲起来，按固定间隔
 * 逐个释放，并暴露剩余数与进度（已释放 / 总数），供倒计时进度条展示。
 *
 * 纯逻辑、无框架依赖，可独立测试。
 */

export interface SpawnQueueOptions {
  /** 每释放一个精灵的间隔（毫秒），默认 60。 */
  intervalMs?: number
}

export class SpawnQueue {
  /** 每释放一个精灵的间隔（毫秒）。 */
  readonly intervalMs: number

  /** 待释放的精灵数。 */
  private pending = 0
  /** 当前活跃批次累计入队总数（用于计算进度 0~1）。 */
  private batchTotal = 0
  /** 距下一次释放的累计时间（毫秒）。 */
  private elapsed = 0

  constructor(options: SpawnQueueOptions = {}) {
    this.intervalMs = options.intervalMs ?? 60
  }

  /** 尚未释放的精灵数。 */
  get remaining(): number {
    return this.pending
  }

  /** 是否还有待释放的精灵（队列是否忙碌）。 */
  get busy(): boolean {
    return this.pending > 0
  }

  /** 当前活跃批次累计入队总数。 */
  get total(): number {
    return this.batchTotal
  }

  /** 当前活跃批次已释放的精灵数。 */
  get released(): number {
    return this.batchTotal - this.pending
  }

  /**
   * 入队 count 个精灵（正值累加并计入当前批次；非正数忽略）。
   * 若队列此前已空闲，则开启一个新批次。
   */
  enqueue(count: number): void {
    if (count <= 0) return
    // 队列空闲时开启一个新批次（重置总数），释放中途追加则并入当前批次。
    if (this.pending === 0) {
      this.batchTotal = 0
    }
    this.pending += count
    this.batchTotal += count
  }

  /**
   * 推进 dtMs 毫秒，返回本帧应释放的精灵数（通常 0 或 1，掉帧时可能多个）。
   * 队列为空时不累积时间。
   */
  tick(dtMs: number): number {
    if (this.pending <= 0) {
      this.elapsed = 0
      return 0
    }
    this.elapsed += dtMs
    let released = 0
    while (this.elapsed >= this.intervalMs && this.pending > 0) {
      this.elapsed -= this.intervalMs
      this.pending -= 1
      released += 1
    }
    return released
  }

  /** 清空队列（用于重置 / 卸载 / 数量减少时立即清除）。 */
  clear(): void {
    this.pending = 0
    this.batchTotal = 0
    this.elapsed = 0
  }
}
