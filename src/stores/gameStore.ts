import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  buyDimension,
  createDefaultGameState,
  EventHub,
  flipCoin,
  freeResetTalents,
  gachaPull,
  GAME_EVENT,
  GameLoop,
  hireHelper,
  prestigeReset,
  previewPrestigeReward,
  registerDimensionCaches,
  registerHelperCaches,
  setHelperHat,
  spendTalent,
  startChallenge,
  stopChallenge,
  tickAutobuyers,
  toggleAutobuyer as toggleAutobuyerCore,
  tickChallenge,
  tickDerivativeChain,
  tickHelpers,
  evaluateScript,
  TimeManager,
  type GameState,
} from '../core'
import { LocalStorageAdapter } from '../storage/localAdapter'
import type { StorageAdapter } from '../storage/storageAdapter'

/** 自动保存间隔（毫秒）。 */
const AUTOSAVE_INTERVAL_MS = 5_000

/**
 * 绑定层：唯一的 UI/框架桥接点。
 * 持有响应式 GameState，管理主循环与存档，把 core 纯函数暴露给 UI。
 */
export const useGameStore = defineStore('game', () => {
  const state = ref<GameState>(createDefaultGameState())
  const storage: StorageAdapter = new LocalStorageAdapter()

  const timeManager = new TimeManager()
  let elapsedSinceSave = 0
  /** UI 刷新计数器：Decimal 对象内部变化不触发 Vue 响应式，靠此计数器驱动重渲染。 */
  const uiVersion = ref(0)

  const loop = new GameLoop((deltaMs) => {
    tick(deltaMs)
  })

  // ---- 内部逻辑 ----

  function tick(deltaMs: number): void {
    const now = timeManager.touch()
    // 导数级联生产链（机制 1）
    tickDerivativeChain(state.value, deltaMs)
    // 助手自动抛硬币（机制 4 自动化）
    tickHelpers(state.value, deltaMs)
    tickChallenge(state.value, deltaMs)
    // 自动购买器（条件自动化雏形）
    tickAutobuyers(state.value, now)
    runAutomator(now)
    uiVersion.value += 1
    elapsedSinceSave += deltaMs
    if (elapsedSinceSave >= AUTOSAVE_INTERVAL_MS) {
      elapsedSinceSave = 0
      void saveNow()
    }
  }

  // ---- 暴露给 UI 的 action ----

  /** 点击抛硬币。 */
  function doFlip(): ReturnType<typeof flipCoin> {
    const result = flipCoin(state.value)
    uiVersion.value += 1
    void saveNow()
    return result
  }

  /** 购买硬币维度。 */
  function buyDim(tier: number, count = 1): boolean {
    const ok = buyDimension(state.value, tier, count)
    if (ok) uiVersion.value += 1
    return ok
  }

  /** 雇佣助手。 */
  function hireHelperAction(helperId: string, count = 1): boolean {
    const ok = hireHelper(state.value, helperId, count)
    if (ok) uiVersion.value += 1
    return ok
  }

  /** 扭蛋抽卡（消耗骷髅代币）。 */
  function doGacha(count = 1): ReturnType<typeof gachaPull> {
    const results = gachaPull(state.value, count)
    uiVersion.value += 1
    return results
  }

  /** 给助手戴帽子。 */
  function equipHat(helperId: string, hatId: string): void {
    setHelperHat(state.value, helperId, hatId)
    uiVersion.value += 1
  }

  /** 切换指定维度自动购买器开关。 */
  function toggleAutobuyer(tier: number): void {
    if (toggleAutobuyerCore(state.value, tier) !== null) {
      uiVersion.value += 1
    }
  }

  /** 执行转生（Tier1 MVP）。 */
  function doPrestige(tier = 1) {
    const reward = prestigeReset(state.value, tier)
    uiVersion.value += 1
    return reward
  }

  /** 点亮天赋节点。 */
  function doSpendTalent(talentId: string): boolean {
    const ok = spendTalent(state.value, talentId)
    if (ok) uiVersion.value += 1
    return ok
  }

  /** 无损重置天赋。 */
  function doFreeResetTalents(): void {
    freeResetTalents(state.value)
    uiVersion.value += 1
  }

  /** 预览本次 prestige 奖励。 */
  function previewPrestige(tier = 1) {
    return previewPrestigeReward(state.value, tier)
  }

  /** 启动挑战。 */
  function doStartChallenge(challengeId: string): boolean {
    const ok = startChallenge(state.value, challengeId)
    if (ok) uiVersion.value += 1
    return ok
  }

  /** 停止挑战。 */
  function doStopChallenge(): void {
    stopChallenge(state.value)
    uiVersion.value += 1
  }

  /** 启用/停用 DSL 自动化。 */
  function setAutomator(enabled: boolean, script = state.value.automator.script): void {
    state.value.automator.enabled = enabled
    state.value.automator.script = script
    uiVersion.value += 1
  }

  /** 每秒最多执行一次 DSL 动作，避免同一帧重复重置。 */
  function runAutomator(now: number): void {
    const automator = state.value.automator
    if (!automator.enabled || automator.script.trim() === '' || now - automator.lastActionAt < 1000) return
    const result = evaluateScript(state.value, automator.script)
    if (result.error !== null) {
      console.warn(result.error)
      automator.enabled = false
      return
    }
    if (result.action === null) return
    automator.lastActionAt = now
    if (result.action.type === 'prestige') prestigeReset(state.value, result.action.tier)
    if (result.action.type === 'startChallenge') startChallenge(state.value, result.action.challengeId)
    if (result.action.type === 'stop') stopChallenge(state.value)
  }

  async function saveNow(): Promise<void> {
    await storage.save(state.value)
    EventHub.logic.emit(GAME_EVENT.GAME_SAVE)
  }

  /** 添加事件日志条目（最多保留 50 条）。 */
  function addEvent(msg: string): void {
    const now = new Date()
    const pad = (n: number): string => n.toString().padStart(2, '0')
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    const id = Date.now()
    state.value.eventLog.unshift({ id, time, msg })
    if (state.value.eventLog.length > 50) state.value.eventLog.splice(50)
  }

  /** 初始化：加载存档 → 注册缓存 → 离线结算 → 启动主循环。 */
  async function init(): Promise<void> {
    const loaded = await storage.load()
    if (loaded !== null) {
      state.value = loaded
    }
    registerDimensionCaches(state.value)
    registerHelperCaches(state.value)

    // 离线结算：固定步长补算（公式结算留待后续机制优化）
    const offline = timeManager.consumeOffline()
    if (offline.realMs > 1000) {
      console.warn(`[gameStore] 离线时长 ${(offline.realMs / 1000).toFixed(1)}s，进入离线结算流程`)
      timeManager.simulate(
        offline.realMs,
        (_realMs, _gameMs) => {
          // TODO(离线优化): 快速公式结算
        },
        (dt) => {
          tickDerivativeChain(state.value, dt)
          tickHelpers(state.value, dt)
        },
      )
    }

    EventHub.logic.emit(GAME_EVENT.GAME_LOAD)
    addEvent('欢迎回到硬币赌桌！')
    loop.start()
  }

  /** 重置游戏（清档 + 重新初始化）。 */
  async function resetGame(): Promise<void> {
    loop.stop()
    await storage.wipe()
    state.value = createDefaultGameState()
    await init()
  }

  /** 立即手动保存。 */
  function manualSave(): Promise<void> {
    return saveNow()
  }

  return {
    state,
    storage,
    timeManager,
    uiVersion,
    init,
    saveNow,
    manualSave,
    resetGame,
    doFlip,
    buyDim,
    hireHelperAction,
    doGacha,
    equipHat,
    toggleAutobuyer,
    doPrestige,
    doSpendTalent,
    doFreeResetTalents,
    previewPrestige,
    doStartChallenge,
    doStopChallenge,
    setAutomator,
    addEvent,
  }
})
