import Decimal from 'break_infinity.js'
import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  buyGasUpgrade,
  buyGasUpgradeMax,
  buyMiningPrestige,
  buyMiningPrestigeMax,
  buyMiningUpgrade,
  buyMiningUpgradeMax,
  canBuyGasUpgrade,
  canBuyMiningPrestige,
  canBuyMiningUpgrade,
  canEnhancePickaxe,
  canPrestige as canPrestigeCore,
  checkNewMilestones,
  createDefaultGameState,
  doMiningPrestige,
  enhanceBlockReason,
  enhancePickaxe,
  ensureDurability,
  evaluateScript,
  EventHub,
  fillFurnace,
  fillFurnaceBlockReason,
  formatNumber,
  GAME_EVENT,
  GameLoop,
  gasUpgradeBlockReason,
  initMining,
  MINING_UPGRADE_NAMES,
  miningActivateCards,
  miningAddIngredient,
  miningAddToSmeltery,
  miningBuyPremium,
  miningBuyPremiumMax,
  miningCraftPickaxe,
  miningOpenPack,
  miningUseRelicActive,
  miningToggleCard,
  miningUnequipCards,
  miningPrestigePreview,
  miningRemoveIngredient,
  miningSetAutoBuyUpgrades,
  miningSetAutoProgress,
  miningSetDepth,
  miningUpgradeBlockReason,
  prestigeBlockReason,
  prestigeReset,
  prestigeUpgradeBlockReason,
  previewPrestigeReward,
  tickMining,
  TimeManager,
  type BlockReason,
  type GasUpgradeId,
  type GameState,
  type MiningBarId,
  type MiningPrestigeId,
  type MiningUpgradeId,
} from '../core'
import { LocalStorageAdapter } from '../storage/localAdapter'
import type { StorageAdapter } from '../storage/storageAdapter'
import { useSound } from '../composables/useSound'
import { i18n } from '../i18n'
import { formatCash } from '../core/format'
import { useUiStore, type ToastType } from './uiStore'

const { playError, playUpgrade, playToggle } = useSound()

/** 自动保存间隔（毫秒）。 */
const AUTOSAVE_INTERVAL_MS = 5_000
/** UI 刷新间隔（毫秒）：数值显示无需 20fps，节流到 5fps 避免全应用高频重渲染。 */
const UI_REFRESH_INTERVAL_MS = 200

/**
 * 绑定层：唯一的 UI/框架桥接点。
 * 持有响应式 GameState，管理主循环与存档，把 core 纯函数暴露给 UI。
 * 经济循环：采矿（被动挖矿→矿石→现金）→ 转生（reputation）→ 天赋。
 */
export const useGameStore = defineStore('game', () => {
  const state = ref<GameState>(createDefaultGameState())
  const storage: StorageAdapter = new LocalStorageAdapter()

  const timeManager = new TimeManager()
  let elapsedSinceSave = 0
  let elapsedSinceUiRefresh = 0
  /** UI 刷新计数器：Decimal 对象内部变化不触发 Vue 响应式，靠此计数器驱动重渲染。 */
  const uiVersion = ref(0)

  const loop = new GameLoop((deltaMs) => {
    tick(deltaMs)
  })

  // ---- 内部逻辑 ----

  function tick(deltaMs: number): void {
    const now = timeManager.touch()
    // 采矿（唯一经济）：小动物军团被动刨土，矿石 → 现金
    tickMining(state.value, deltaMs, now)
    runAutomator(now)
    // UI 刷新节流：数值显示无需每 tick（50ms）重渲染，累积到 UI_REFRESH_INTERVAL_MS 才递增一次。
    elapsedSinceUiRefresh += deltaMs
    if (elapsedSinceUiRefresh >= UI_REFRESH_INTERVAL_MS) {
      elapsedSinceUiRefresh = 0
      uiVersion.value += 1
      checkMilestones()
    }
    elapsedSinceSave += deltaMs
    if (elapsedSinceSave >= AUTOSAVE_INTERVAL_MS) {
      elapsedSinceSave = 0
      void saveNow()
    }
  }

  // ---- 暴露给 UI 的 action ----

  /** 资源计数展示：小数保留 1 位，大数用工程记法（20 / 1.23 M）。 */
  function formatCount(value: number): string {
    if (value > 0 && value < 1) return value.toFixed(1)
    return formatNumber(new Decimal(value), 'engineering')
  }

  /** 资源/升级名称：i18n 缺失时回退到 id，避免整块 UI 报错。 */
  function nameOf(key: string, fallback: string): string {
    return i18n.global.te(key) ? i18n.global.t(key) : fallback
  }

  /** 把「不可操作原因」翻译成玩家可读的一句话（写入事件流/提示）。 */
  function blockText(reason: BlockReason | null): string {
    if (reason === null) return ''
    const t = i18n.global.t
    const need = reason.need ?? 0
    const have = reason.have ?? 0
    switch (reason.kind) {
      case 'locked': {
        const id = reason.requiresId ?? ''
        return t('block.locked', {
          name: MINING_UPGRADE_NAMES[id] ?? id,
          level: reason.requiresLevel ?? 0,
        })
      }
      case 'capped':
        return t('block.capped', { cap: reason.cap ?? 0 })
      case 'scrap':
        return t('block.scrap', {
          need: formatCash(new Decimal(need)),
          have: formatCash(new Decimal(have)),
        })
      case 'ore':
      case 'bars':
        return t('block.resource', {
          name: nameOf(`mining.currency.${reason.resourceId ?? 'scrap'}`, reason.resourceId ?? ''),
          need: formatCount(need),
          have: formatCount(have),
        })
      case 'gas':
        return t('block.resource', {
          name: nameOf(`mining.currency.${reason.resourceId ?? 'helium'}`, reason.resourceId ?? ''),
          need: formatCount(need),
          have: formatCount(have),
        })
      case 'helium':
        return t('block.resource', { name: t('mining.helium'), need: formatCount(need), have: formatCount(have) })
      case 'crystal':
        return t('block.resource', { name: t('mining.crystal'), need: formatCount(need), have: formatCount(have) })
      case 'depth':
        return t('block.depth', { need: Math.round(need), have: Math.round(have) })
      case 'threshold':
        return t('block.threshold', { need: Math.round(need), have: Math.round(have) })
      case 'furnace':
        return t('block.furnace', { need: Math.round(need), have: Math.round(have) })
      case 'ingredient':
        return t('block.ingredient')
      default:
        return t('block.unknown')
    }
  }

  /** 操作失败：播放错误音，并把「为什么不行」写入事件流 + 弹出提示。 */
  function fail(reason: BlockReason | null): void {
    playError()
    const text = blockText(reason)
    notify(text === '' ? i18n.global.t('block.unknown') : text, 'error')
  }

  /**
   * 执行转生（Tier1 MVP）：现金 → 通货（reputation）。
   * 声音说明：成功音由按钮（sound="prestige"）在点击时播放，这里只补失败音。
   */
  function doPrestige(tier = 1) {
    const reward = prestigeReset(state.value, tier)
    uiVersion.value += 1
    if (reward.gt(0)) {
      notify(`转生完成！获得 ${formatCash(reward)} 通货`)
    } else {
      fail(prestigeBlockReason(state.value, tier))
    }
    return reward
  }

  /** 购买采矿升级（升级树，废料/矿石）；成功音由按钮播放，这里只补失败音。 */
  function doBuyMiningUpgrade(id: MiningUpgradeId): boolean {
    const ok = buyMiningUpgrade(state.value, id)
    if (ok) {
      uiVersion.value += 1
      const name = MINING_UPGRADE_NAMES[id] ?? id
      notify(`升级「${name}」升至 Lv${state.value.mining.upgrades[id]}`)
    } else {
      fail(miningUpgradeBlockReason(state.value, id))
    }
    return ok
  }

  /** 批量购买升级树直到买不起 / 满级；返回是否买到了任何等级。 */
  function doBuyMiningUpgradeMax(id: MiningUpgradeId): boolean {
    const count = buyMiningUpgradeMax(state.value, id)
    if (count > 0) {
      uiVersion.value += 1
      const name = MINING_UPGRADE_NAMES[id] ?? id
      notify(`升级「${name}」连升 ${count} 级 → Lv${state.value.mining.upgrades[id]}`)
    } else {
      fail(miningUpgradeBlockReason(state.value, id))
    }
    return count > 0
  }

  /** 判断某升级树是否可购买。 */
  function canBuyMining(id: MiningUpgradeId): boolean {
    return canBuyMiningUpgrade(state.value, id)
  }

  /** 购买声望升级（绿水晶）；成功音由按钮播放，这里只补失败音。 */
  function doBuyMiningPrestige(id: MiningPrestigeId): boolean {
    const ok = buyMiningPrestige(state.value, id)
    if (ok) {
      uiVersion.value += 1
      const name = MINING_UPGRADE_NAMES[id] ?? id
      notify(`声望升级「${name}」升至 Lv${state.value.mining.prestigeUpgrades[id]}`)
    } else {
      fail(prestigeUpgradeBlockReason(state.value, id))
    }
    return ok
  }

  /** 批量购买声望升级直到买不起 / 满级；返回是否买到了任何等级。 */
  function doBuyMiningPrestigeMax(id: MiningPrestigeId): boolean {
    const count = buyMiningPrestigeMax(state.value, id)
    if (count > 0) {
      uiVersion.value += 1
      const name = MINING_UPGRADE_NAMES[id] ?? id
      notify(`声望升级「${name}」连升 ${count} 级 → Lv${state.value.mining.prestigeUpgrades[id]}`)
    } else {
      fail(prestigeUpgradeBlockReason(state.value, id))
    }
    return count > 0
  }

  /** 判断某声望升级是否可购买。 */
  function canBuyPrestige(id: MiningPrestigeId): boolean {
    return canBuyMiningPrestige(state.value, id)
  }

  /** 购买气态升级（废料/氦/气态资源）；成功音由按钮播放，这里只补失败音。 */
  function doBuyGasUpgrade(id: GasUpgradeId): boolean {
    const ok = buyGasUpgrade(state.value, id)
    if (ok) {
      uiVersion.value += 1
      const name = MINING_UPGRADE_NAMES[id] ?? id
      notify(`气态升级「${name}」升至 Lv${state.value.mining.upgrades[id]}`)
    } else {
      fail(gasUpgradeBlockReason(state.value, id))
    }
    return ok
  }

  /** 批量购买气态升级直到买不起 / 满级；返回是否买到了任何等级。 */
  function doBuyGasUpgradeMax(id: GasUpgradeId): boolean {
    const count = buyGasUpgradeMax(state.value, id)
    if (count > 0) {
      uiVersion.value += 1
      const name = MINING_UPGRADE_NAMES[id] ?? id
      notify(`气态升级「${name}」连升 ${count} 级 → Lv${state.value.mining.upgrades[id]}`)
    } else {
      fail(gasUpgradeBlockReason(state.value, id))
    }
    return count > 0
  }

  /** 判断某气态升级是否可购买。 */
  function canBuyGas(id: GasUpgradeId): boolean {
    return canBuyGasUpgrade(state.value, id)
  }

  /** 熔炼产线投料：消耗矿石与稀有物，按温度/时间产出锭；成功音由按钮播放。 */
  function doFillFurnace(barId: MiningBarId): boolean {
    const ok = fillFurnace(state.value, barId)
    if (ok) {
      uiVersion.value += 1
      notify(`熔炼产线投料：${nameOf(`mining.currency.${barId}`, barId)}`)
    } else {
      fail(fillFurnaceBlockReason(state.value, barId))
    }
    return ok
  }

  /** 向指定产线投一批料；成功音由按钮播放。 */
  function doAddToSmeltery(line: string, max = false): boolean {
    const added = miningAddToSmeltery(state.value, line as never, max)
    if (added > 0) {
      uiVersion.value += 1
      notify(`投料 ${added} 炉`)
      return true
    }
    fail(fillFurnaceBlockReason(state.value, line as never))
    return false
  }

  /** 往锻造槽位加一份矿石。 */
  function doAddIngredient(ore: string): boolean {
    const ok = miningAddIngredient(state.value, ore as never)
    if (!ok) {
      notify('槽位已满或矿石不足', 'error')
    }
    uiVersion.value += 1
    return ok
  }

  /** 移出指定槽位。 */
  function doRemoveIngredient(index: number): void {
    miningRemoveIngredient(state.value, index)
    uiVersion.value += 1
  }

  /**
   * 锻造镐子（RNG 决定威力是否提升）。
   * 两段式反馈：按钮先播"锤击"（sound="craft"），这里再按 RNG 结果补成功/失败音。
   */
  function doCraftPickaxe(): void {
    const result = miningCraftPickaxe(state.value)
    uiVersion.value += 1
    if (!result.ok) {
      playError()
      notify('槽位为空或材料不足', 'error')
      return
    }
    if (result.improved) {
      playUpgrade()
      notify(`锻造成功！镐子威力 → ${formatCount(result.power)}`)
    } else {
      playError()
      notify(`锻造失败，威力保持 ${formatCount(result.power)}`, 'error')
    }
  }

  /** 切换到指定深度层（1..maxDepth）；音效由导航按钮按方向播放（上/下不同）。 */
  function doSetMiningDepth(depth: number): void {
    if (miningSetDepth(state.value, depth)) {
      uiVersion.value += 1
    }
  }

  /** 预览本次采矿转生可领取的水晶。 */
  function previewMiningPrestige(): number {
    return miningPrestigePreview(state.value)
  }

  /** 设置自动下潜阈值（秒）；0 = 关闭，需手动用导航条下潜。 */
  function doSetAutoProgress(seconds: number): void {
    miningSetAutoProgress(state.value, seconds)
    uiVersion.value += 1
  }

  /** 开启/关闭自动升级（本项目扩展，Gooboo 无此功能）。 */
  function doSetAutoBuyUpgrades(on: boolean): void {
    miningSetAutoBuyUpgrades(state.value, on)
    uiVersion.value += 1
    notify(on ? '已开启自动升级' : '已关闭自动升级', on ? 'success' : 'info')
  }

  /** 购买 Premium 升级（ruby）。 */
  function doBuyPremium(id: string): boolean {
    const ok = miningBuyPremium(state.value, id)
    if (ok) {
      uiVersion.value += 1
      playUpgrade()
      notify(`Premium 升级「${id}」升至 Lv${state.value.mining.premiumUpgrades[id]}`)
    }
    return ok
  }

  /** 批量购买 Premium 升级直到买不起 / 满级；返回是否买到了任何等级。 */
  function doBuyPremiumMax(id: string): boolean {
    const count = miningBuyPremiumMax(state.value, id)
    if (count > 0) {
      uiVersion.value += 1
      playUpgrade()
      notify(`Premium 升级「${id}」连升 ${count} 级 → Lv${state.value.mining.premiumUpgrades[id]}`)
    }
    return count > 0
  }

  /** 使用遗物主动技能。 */
  function doUseRelicActive(id: string): boolean {
    const result = miningUseRelicActive(state.value, id)
    uiVersion.value += 1
    if (result.ok) {
      playUpgrade()
      notify(`遗物技能发动，获得 ${formatCount(result.gain)}`)
    } else {
      notify('遗物之力不足或未解锁', 'error')
    }
    return result.ok
  }

  /** 购买并开一个卡包。 */
  function doOpenCardPack(packId: string): boolean {
    const result = miningOpenPack(state.value, packId)
    uiVersion.value += 1
    if (!result.ok) {
      notify('无法购买卡包（绿宝石不足或未解锁）', 'error')
      return false
    }
    playUpgrade()
    notify(`开启卡包，获得 ${result.cards.length} 张卡！`, 'success')
    return true
  }

  /** 切换某卡是否装备。 */
  function doToggleCard(id: number): void {
    miningToggleCard(state.value, id)
    uiVersion.value += 1
  }

  /** 提交卡组装备。 */
  function doActivateCards(): void {
    miningActivateCards(state.value)
    uiVersion.value += 1
    playToggle(true)
  }

  /** 卸下全部装备卡。 */
  function doUnequipCards(): void {
    miningUnequipCards(state.value)
    uiVersion.value += 1
  }

  /** 镐增强（炉子填满后，按锭型给效果）；成功音由按钮播放，这里只补失败音。 */
  function doEnhancePickaxe(): boolean {
    const ok = enhancePickaxe(state.value)
    if (ok) {
      uiVersion.value += 1
      notify('镐增强完成！本声望内产出提升')
    } else {
      fail(enhanceBlockReason(state.value))
    }
    return ok
  }

  /** 判断炉子是否可增强。 */
  function canEnhance(): boolean {
    return canEnhancePickaxe(state.value)
  }

  /** 判断某种锭是否可制作（对应金属矿够不够）。 */
  function canFillFurnace(barId: MiningBarId): boolean {
    return fillFurnaceBlockReason(state.value, barId) === null
  }

  /* ── 「为什么不能点」：供按钮悬停/点击时展示原因 ── */

  /** 升级树买不了的原因（可用时为空串）。 */
  function whyCannotBuyMining(id: MiningUpgradeId): string {
    return blockText(miningUpgradeBlockReason(state.value, id))
  }

  /** 气态升级买不了的原因。 */
  function whyCannotBuyGas(id: GasUpgradeId): string {
    return blockText(gasUpgradeBlockReason(state.value, id))
  }

  /** 声望升级买不了的原因。 */
  function whyCannotBuyPrestige(id: MiningPrestigeId): string {
    return blockText(prestigeUpgradeBlockReason(state.value, id))
  }

  /** 锭制作不了的原因。 */
  function whyCannotFillFurnace(barId: MiningBarId): string {
    return blockText(fillFurnaceBlockReason(state.value, barId))
  }

  /** 增强不了的原因。 */
  function whyCannotEnhance(): string {
    return blockText(enhanceBlockReason(state.value))
  }

  /** 转生不了的原因。 */
  function whyCannotPrestige(tier = 1): string {
    return blockText(prestigeBlockReason(state.value, tier))
  }

  /** 预览本次 prestige 奖励。 */
  function previewPrestige(tier = 1) {
    return previewPrestigeReward(state.value, tier)
  }

  /** 判断当前是否满足指定层转生条件（UI 用于禁用按钮）。 */
  function canPrestige(tier = 1): boolean {
    return canPrestigeCore(state.value, tier)
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
  }

  async function saveNow(): Promise<void> {
    await storage.save(state.value)
    EventHub.logic.emit(GAME_EVENT.GAME_SAVE)
  }

  /**
   * 添加事件日志条目（最多保留 50 条）。
   * 与最新一条完全相同的消息只刷新时间、不新增行，避免连点同一按钮把事件流刷爆。
   */
  function addEvent(msg: string, type: ToastType = 'info'): void {
    const now = new Date()
    const pad = (n: number): string => n.toString().padStart(2, '0')
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    const id = Date.now()
    const head = state.value.eventLog[0]
    if (head !== undefined && head.msg === msg) {
      head.time = time
      head.id = id
      head.type = type
      return
    }
    state.value.eventLog.unshift({ id, time, msg, type })
    if (state.value.eventLog.length > 50) state.value.eventLog.splice(50)
  }

  /**
   * 统一通知：同时写入事件流（侧栏"事件流"）并弹出右上角提示。
   * 供各用户操作与关键里程碑事件调用，让玩家知道刚才发生了什么。
   */
  function notify(msg: string, type: ToastType = 'success'): void {
    addEvent(msg, type)
    useUiStore().pushToast(msg, type)
  }

  /**
   * 里程碑检测：从当前采矿状态筛出"已达成且未展示过"的里程碑并入队。
   * 由 UI 刷新节流触发，保证主线节点到达时自动弹出引导。
   */
  function checkMilestones(): void {
    const ui = useUiStore()
    const fresh = checkNewMilestones(state.value.mining, ui.seenMilestones)
    for (const def of fresh) {
      ui.enqueueMilestone(def)
    }
  }

  /** 下次转生要进入的子模式（0 = 普通矿，1 = 气态；需已解锁）。 */
  const prestigeSubfeature = ref<0 | 1>(0)

  /** 选择下次转生进入的子模式。 */
  function setPrestigeSubfeature(sf: 0 | 1): void {
    prestigeSubfeature.value = sf
    uiVersion.value += 1
  }

  // 转生后重置采矿当局进度：把深度居民兑换成水晶，清空层/镐子/升级/熔炼/增强，
  // 保留水晶、余烬、气体、声望升级与 keepUpgrade 标记的常规升级。
  EventHub.logic.on(GAME_EVENT.PRESTIGE_RESET_AFTER, () => {
    doMiningPrestige(state.value, prestigeSubfeature.value)
  })

  /**
   * 离线结算：把从上次 `timeManager.touch()` 至今经过的真实时间补算进采矿进度。
   * 首次加载（关闭期间）与标签页回到前台（后台期间）都会走到这里。
   */
  function settleOffline(): void {
    const offline = timeManager.consumeOffline()
    if (offline.realMs <= 1000) {
      return
    }
    console.warn(`[gameStore] 离线时长 ${(offline.realMs / 1000).toFixed(1)}s，进入离线结算流程`)
    timeManager.simulate(
      offline.realMs,
      (_realMs, _gameMs) => {
        // TODO(离线优化): 快速公式结算
      },
      (dt) => {
        tickMining(state.value, dt, 0)
      },
    )
    uiVersion.value += 1
    addEvent('欢迎回到 Digiverse！')
  }

  /**
   * 监听标签页回到前台：后台期间 rAF 被浏览器暂停、主循环不会推进，
   * 若不加离线结算，后台经过的时间会被白白丢弃（表现为"在线数字不动，刷新才变大"）。
   */
  function onVisibilityChange(): void {
    if (typeof document === 'undefined') {
      return
    }
    if (document.visibilityState === 'visible') {
      settleOffline()
      // 离线结算已补齐后台时间，重置主循环基线避免重复计收益
      loop.resetBaseline()
    }
  }

  /** 初始化：加载存档 → 重建乘区 → 离线结算 → 启动主循环。 */
  async function init(): Promise<void> {
    const loaded = await storage.load()
    if (loaded !== null) {
      state.value = loaded
    }
    initMining(state.value)
    ensureDurability(state.value)

    // 首次加载离线结算（关闭期间）
    settleOffline()

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange)
    }

    EventHub.logic.emit(GAME_EVENT.GAME_LOAD)
    // 载入后立即检查一次里程碑，让当前进度的主线引导直接入队
    checkMilestones()
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
    doPrestige,
    previewPrestige,
    canPrestige,
    setAutomator,
    doBuyMiningUpgrade,
    doBuyMiningUpgradeMax,
    canBuyMining,
    doBuyMiningPrestige,
    doBuyMiningPrestigeMax,
    canBuyPrestige,
    doBuyGasUpgrade,
    doBuyGasUpgradeMax,
    canBuyGas,
    doFillFurnace,
    canFillFurnace,
    doAddToSmeltery,
    doAddIngredient,
    doRemoveIngredient,
    doCraftPickaxe,
    doSetMiningDepth,
    doSetAutoProgress,
    doSetAutoBuyUpgrades,
    doBuyPremium,
    doBuyPremiumMax,
    doUseRelicActive,
    doOpenCardPack,
    doToggleCard,
    doActivateCards,
    doUnequipCards,
    previewMiningPrestige,
    prestigeSubfeature,
    setPrestigeSubfeature,
    doEnhancePickaxe,
    canEnhance,
    whyCannotBuyMining,
    whyCannotBuyGas,
    whyCannotBuyPrestige,
    whyCannotFillFurnace,
    whyCannotEnhance,
    whyCannotPrestige,
    addEvent,
    notify,
  }
})
