import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  buyDimension,
  challengeOf,
  checkCoinUnlocks,
  checkHelperUnlocks,
  checkLevels,
  clickMultiplier,
  coinTypeOf,
  confirmLevelAdvance,
  dismissLevelAdvance,
  createDefaultGameState,
  enhanceDimension,
  helperTypeOf,
  talentOf,
  EventHub,
  flipCoin,
  freeResetTalents,
  gachaPull,
  GAME_EVENT,
  GameLoop,
  hireHelper,
  incomeMultiplier,
  buyUpgrade,
  upgradeHelper,
  upgradeOf,
  meltAll,
  meltCoins,
  MELT_RATIO,
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
  flipCoins,
  evaluateScript,
  TimeManager,
  type GameState,
} from '../core'
import { LocalStorageAdapter } from '../storage/localAdapter'
import type { StorageAdapter } from '../storage/storageAdapter'
import { useSound } from '../composables/useSound'
import { i18n } from '../i18n'
import { formatCash } from '../core/format'
import { useUiStore, type ToastType } from './uiStore'

const {
  playFlip,
  playBuy,
  playError,
  playPrestige,
  playGacha,
  playUpgrade,
  playToggle,
  playClick,
} = useSound()

/** 自动保存间隔（毫秒）。 */
const AUTOSAVE_INTERVAL_MS = 5_000
/** UI 刷新间隔（毫秒）：数值显示无需 20fps，节流到 5fps 避免全应用高频重渲染。 */
const UI_REFRESH_INTERVAL_MS = 200

/**
 * 绑定层：唯一的 UI/框架桥接点。
 * 持有响应式 GameState，管理主循环与存档，把 core 纯函数暴露给 UI。
 */
export const useGameStore = defineStore('game', () => {
  const state = ref<GameState>(createDefaultGameState())
  const storage: StorageAdapter = new LocalStorageAdapter()

  const timeManager = new TimeManager()
  let elapsedSinceSave = 0
  let elapsedSinceUiRefresh = 0
  /** UI 刷新计数器：Decimal 对象内部变化不触发 Vue 响应式，靠此计数器驱动重渲染。 */
  const uiVersion = ref(0)
  /**
   * 可视化自动生产接管标记：桌布可视化层（CoinScene）挂载时置 true，
   * 此时在线自动生产改由可视化层按次结算（tickHelpers 暂停，避免双倍）；
   * 可视化层卸载或离线结算时恢复 tickHelpers 兜底。
   */
  const visualAuto = ref(false)

  const loop = new GameLoop((deltaMs) => {
    tick(deltaMs)
  })

  // ---- 内部逻辑 ----

  function tick(deltaMs: number): void {
    const now = timeManager.touch()
    // 导数级联生产链（机制 1）
    tickDerivativeChain(state.value, deltaMs)
    // 助手自动抛硬币（机制 4 自动化）：可视化层接管时由 CoinScene 逐次结算，否则按速率批量
    if (!visualAuto.value) {
      tickHelpers(state.value, deltaMs, Math.random, incomeMultiplier(state.value))
    }
    tickChallenge(state.value, deltaMs)
    // 自动购买器（条件自动化雏形）
    tickAutobuyers(state.value, now)
    runAutomator(now)
    // 任务关卡推进（主线）
    checkLevels(state.value)
    // 助手按顺序解锁（基于累计统计）
    checkHelperUnlocks(state.value)
    // 硬币按顺序解锁（基于累计统计）
    checkCoinUnlocks(state.value)
    // UI 刷新节流：数值显示无需每 tick（50ms）重渲染，累积到 UI_REFRESH_INTERVAL_MS 才递增一次。
    elapsedSinceUiRefresh += deltaMs
    if (elapsedSinceUiRefresh >= UI_REFRESH_INTERVAL_MS) {
      elapsedSinceUiRefresh = 0
      uiVersion.value += 1
    }
    elapsedSinceSave += deltaMs
    if (elapsedSinceSave >= AUTOSAVE_INTERVAL_MS) {
      elapsedSinceSave = 0
      void saveNow()
    }
  }

  // ---- 暴露给 UI 的 action ----

  /** 点击抛硬币。 */
  function doFlip(): ReturnType<typeof flipCoin> {
    const result = flipCoin(state.value, Math.random, clickMultiplier(state.value))
    checkLevels(state.value)
    uiVersion.value += 1
    void saveNow()
    playFlip()
    return result
  }

  /** 批量结算 n 次抛硬币（可视化层高频兜底，避免高频时动画溢出）。 */
  function flipCoinsNow(count: number): ReturnType<typeof flipCoins> {
    const results = flipCoins(state.value, count, Math.random, clickMultiplier(state.value))
    checkLevels(state.value)
    uiVersion.value += 1
    return results
  }

  /** 切换可视化自动生产接管（CoinScene 挂载/卸载时调用）。 */
  function setVisualAuto(flag: boolean): void {
    visualAuto.value = flag
  }

  /** 购买硬币维度。 */
  function buyDim(tier: number, count = 1): boolean {
    const ok = buyDimension(state.value, tier, count)
    if (ok) {
      checkLevels(state.value)
      uiVersion.value += 1
      playBuy()
      const name = i18n.global.t(coinTypeOf(tier).nameKey)
      notify(`购买了 ${name} ×${count}`)
    } else {
      playError()
    }
    return ok
  }

  /** 熔铸硬币：把低阶硬币合成高阶硬币（减少桌布渲染数量）。返回是否成功。 */
  function meltDim(tier: number, groups = 1): boolean {
    const actual = meltCoins(state.value, tier, groups)
    if (actual > 0) {
      checkLevels(state.value)
      uiVersion.value += 1
      playBuy()
      const lowName = i18n.global.t(coinTypeOf(tier).nameKey)
      const highName = i18n.global.t(coinTypeOf(tier + 1).nameKey)
      notify(`熔铸了 ${actual * MELT_RATIO} 枚${lowName} → ${actual} 枚${highName}`)
    } else {
      playError()
    }
    return actual > 0
  }

  /** 一次性把某阶所有可熔铸的低阶币全部熔铸到下一阶。返回熔铸组数。 */
  function meltAllDim(tier: number): number {
    const groups = meltAll(state.value, tier)
    if (groups > 0) {
      checkLevels(state.value)
      uiVersion.value += 1
      playBuy()
      const lowName = i18n.global.t(coinTypeOf(tier).nameKey)
      const highName = i18n.global.t(coinTypeOf(tier + 1).nameKey)
      notify(`熔铸了 ${groups * MELT_RATIO} 枚${lowName} → ${groups} 枚${highName}`)
    } else {
      playError()
    }
    return groups
  }

  /** 购买当局升级（用现金，转生后清空）。 */
  function buyUpgradeAction(upgradeId: string): boolean {
    const ok = buyUpgrade(state.value, upgradeId)
    if (ok) {
      checkLevels(state.value)
      uiVersion.value += 1
      playUpgrade()
      const name = i18n.global.t(upgradeOf(upgradeId).nameKey)
      notify(`已购买当局升级「${name}」`)
    } else {
      playError()
    }
    return ok
  }

  /** 雇佣助手。 */
  function hireHelperAction(helperId: string, count = 1): boolean {
    const ok = hireHelper(state.value, helperId, count)
    if (ok) {
      checkLevels(state.value)
      uiVersion.value += 1
      playBuy()
      const name = i18n.global.t(helperTypeOf(helperId).nameKey)
      notify(`雇佣了 ${name} ×${count}`)
    } else {
      playError()
    }
    return ok
  }

  /** 升级助手（每级提升翻转速率）。 */
  function upgradeHelperAction(helperId: string): boolean {
    const ok = upgradeHelper(state.value, helperId)
    if (ok) {
      checkLevels(state.value)
      uiVersion.value += 1
      playUpgrade()
      const name = i18n.global.t(helperTypeOf(helperId).nameKey)
      notify(`「${name}」升级至 Lv${state.value.helpers[helperId]!.level}`)
    } else {
      playError()
    }
    return ok
  }

  /** 强化硬币维度（每级提升该阶产出倍率）。 */
  function enhanceDim(tier: number): boolean {
    const ok = enhanceDimension(state.value, tier)
    if (ok) {
      checkLevels(state.value)
      uiVersion.value += 1
      playUpgrade()
      const name = i18n.global.t(coinTypeOf(tier).nameKey)
      notify(`「${name}」强化至 Lv${state.value.dimensions[tier - 1]!.enhanceLevel}`)
    } else {
      playError()
    }
    return ok
  }

  /** 扭蛋抽卡（消耗骷髅代币）。 */
  function doGacha(count = 1): ReturnType<typeof gachaPull> {
    const results = gachaPull(state.value, count)
    checkLevels(state.value)
    uiVersion.value += 1
    playGacha()
    if (results !== null && results.length > 0) {
      const names = results.map((hat) => i18n.global.t(`hats.${hat.id}`))
      notify(`抽卡获得：${names.join('、')}`)
    }
    return results
  }

  /** 给助手戴帽子。 */
  function equipHat(helperId: string, hatId: string): void {
    setHelperHat(state.value, helperId, hatId)
    uiVersion.value += 1
    const helperName = i18n.global.t(helperTypeOf(helperId).nameKey)
    const hatName = i18n.global.t(`hats.${hatId}`)
    notify(`给 ${helperName} 戴上了 ${hatName}`)
  }

  /** 切换指定维度自动购买器开关。 */
  function toggleAutobuyer(tier: number): void {
    const enabled = toggleAutobuyerCore(state.value, tier)
    if (enabled !== null) {
      uiVersion.value += 1
      playToggle(enabled)
      notify(
        enabled ? `已开启 D${tier} 自动购买` : `已关闭 D${tier} 自动购买`,
        enabled ? 'success' : 'info',
      )
    }
  }

  /** 执行转生（Tier1 MVP）。 */
  function doPrestige(tier = 1) {
    const reward = prestigeReset(state.value, tier)
    uiVersion.value += 1
    playPrestige()
    if (reward.gt(0)) {
      notify(`转生完成！获得 ${formatCash(reward)} 通货`)
    } else {
      addEvent('未能转生：未达到转生阈值')
    }
    return reward
  }

  /** 确认过关：应用当前待确认关的奖励并进入下一关（开新一局）。 */
  function confirmLevel(): string | null {
    const completedId = confirmLevelAdvance(state.value)
    if (completedId !== null) {
      uiVersion.value += 1
      checkLevels(state.value)
      playUpgrade()
      notify('过关成功，进入下一关')
      void saveNow()
    }
    return completedId
  }

  /** 暂缓过关：关掉确认弹窗，留在当前关继续积攒资源（不推进）。 */
  function dismissLevel(): void {
    const dismissedId = dismissLevelAdvance(state.value)
    if (dismissedId !== null) {
      uiVersion.value += 1
      playClick()
    }
  }

  /** 点亮天赋节点。 */
  function doSpendTalent(talentId: string): boolean {
    const ok = spendTalent(state.value, talentId)
    if (ok) {
      uiVersion.value += 1
      playUpgrade()
      const name = i18n.global.t(talentOf(talentId).nameKey)
      notify(`已点亮天赋「${name}」`)
    } else {
      playError()
    }
    return ok
  }

  /** 无损重置天赋。 */
  function doFreeResetTalents(): void {
    freeResetTalents(state.value)
    uiVersion.value += 1
    playClick()
    notify('已重置全部天赋点', 'info')
  }

  /** 预览本次 prestige 奖励。 */
  function previewPrestige(tier = 1) {
    return previewPrestigeReward(state.value, tier)
  }

  /** 启动挑战。 */
  function doStartChallenge(challengeId: string): boolean {
    const ok = startChallenge(state.value, challengeId)
    if (ok) {
      uiVersion.value += 1
      playBuy()
      const name = i18n.global.t(challengeOf(challengeId).nameKey)
      notify(`开始挑战「${name}」`)
    } else {
      playError()
    }
    return ok
  }

  /** 停止挑战。 */
  function doStopChallenge(): void {
    stopChallenge(state.value)
    uiVersion.value += 1
    playClick()
    notify('已停止当前挑战', 'info')
  }

  /** 启用/停用 DSL 自动化。 */
  function setAutomator(enabled: boolean, script = state.value.automator.script): void {
    state.value.automator.enabled = enabled
    state.value.automator.script = script
    uiVersion.value += 1
    playToggle(enabled)
    notify(enabled ? '已启用自动化脚本' : '已停用自动化脚本', enabled ? 'success' : 'info')
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

  /**
   * 统一通知：同时写入事件流（侧栏"事件流"）并弹出右上角提示。
   * 供各用户操作与关键里程碑事件调用，让玩家知道刚才发生了什么。
   */
  function notify(msg: string, type: ToastType = 'success'): void {
    addEvent(msg)
    useUiStore().pushToast(msg, type)
  }

  // ---- 被动里程碑事件：也写入事件流并提示（非用户点击，但值得让玩家知道） ----
  EventHub.logic.on(GAME_EVENT.HELPER_UNLOCKED, (payload) => {
    const { helperId } = payload as { helperId: string }
    const name = i18n.global.t(helperTypeOf(helperId).nameKey)
    notify(`解锁了新助手：${name}`, 'info')
  })
  EventHub.logic.on(GAME_EVENT.LEVEL_READY, (payload) => {
    const { levelId } = payload as { levelId: string }
    notify(`第 ${levelId} 关已达成，可以过关`, 'info')
  })
  EventHub.logic.on(GAME_EVENT.LEVEL_COMPLETED, (payload) => {
    const { levelId } = payload as { levelId: string }
    notify(`通过第 ${levelId} 关！`)
  })
  EventHub.logic.on(GAME_EVENT.CHALLENGE_COMPLETED, (payload) => {
    const { challengeId } = payload as { challengeId: string }
    const name = i18n.global.t(challengeOf(challengeId).nameKey)
    notify(`挑战「${name}」完成！`)
  })
  EventHub.logic.on(GAME_EVENT.CHALLENGE_FAILED, (payload) => {
    const { challengeId } = payload as { challengeId: string }
    const name = i18n.global.t(challengeOf(challengeId).nameKey)
    notify(`挑战「${name}」失败`, 'error')
  })

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
          tickHelpers(state.value, dt, Math.random, incomeMultiplier(state.value))
          checkLevels(state.value)
        },
      )
      // 离线结算可能达成累计统计，重新推进关卡、助手与硬币解锁。
      checkLevels(state.value)
      checkHelperUnlocks(state.value)
      checkCoinUnlocks(state.value)

      // 仅在真正重新进入游戏（存在离线收益结算）时才提示，避免每次刷新重复堆叠。
      addEvent('欢迎回到硬币赌桌！')
    }

    EventHub.logic.emit(GAME_EVENT.GAME_LOAD)
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
    flipCoinsNow,
    setVisualAuto,
    buyDim,
    meltDim,
    meltAllDim,
    hireHelperAction,
    upgradeHelperAction,
    enhanceDim,
    buyUpgradeAction,
    doGacha,
    equipHat,
    toggleAutobuyer,
    doPrestige,
    confirmLevel,
    dismissLevel,
    doSpendTalent,
    doFreeResetTalents,
    previewPrestige,
    doStartChallenge,
    doStopChallenge,
    setAutomator,
    addEvent,
    notify,
  }
})
