import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

import type { MilestoneDef } from '../core'

/** 主区可切换的面板（当前仅矿场）。 */
export type CenterPanel = 'table'

/**
 * 可选的界面缩放档位。
 * 各档位都让设计令牌（基准值均为 4 的倍数）落在整像素上，避免点阵字体发虚。
 */
export const UI_SCALE_STEPS = [1, 1.25, 1.5, 1.75] as const

/** 界面缩放档位类型。 */
export type UiScale = (typeof UI_SCALE_STEPS)[number]

const SCALE_KEY = 'gamblers_ui_scale'
const DEFAULT_SCALE: UiScale = 1.25

/** 存档里读出来的值可能是任意数字，需要夹到合法档位上。 */
function normalizeScale(raw: number): UiScale {
  const valid = UI_SCALE_STEPS as readonly number[]
  return (valid.find((s) => Math.abs(s - raw) < 0.001) ?? DEFAULT_SCALE) as UiScale
}

/** 读取上次的界面缩放档位（localStorage 不可用时回落默认值）。 */
function readScale(): UiScale {
  try {
    return normalizeScale(Number.parseFloat(localStorage.getItem(SCALE_KEY) ?? ''))
  } catch {
    return DEFAULT_SCALE
  }
}

/** 把缩放系数写到 <html>，驱动所有基于 --ui-scale 的尺寸令牌。 */
function applyScale(scale: UiScale): void {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty('--ui-scale', String(scale))
}

/** 右上角提示弹窗类型。 */
export type ToastType = 'info' | 'success' | 'warn' | 'error'

/** 右上角提示弹窗条目。 */
export interface Toast {
  id: number
  type: ToastType
  msg: string
}

/**
 * 全局 UI 状态：协调顶栏菜单、侧边栏导航、设置弹窗、右上角提示等"没有接线"的入口。
 * 统一由 navigate()/openSettings()/pushToast() 驱动，避免各组件各自维护开关状态。
 */
export const useUiStore = defineStore('ui', () => {
  /** 当前主区面板。 */
  const activePanel = ref<CenterPanel>('table')
  /** 顶栏下拉菜单开关。 */
  const menuOpen = ref(false)
  /** 设置弹窗开关。 */
  const settingsOpen = ref(false)
  /** 右上角提示弹窗列表（新消息排在最前）。 */
  const toasts = ref<Toast[]>([])
  /** 自增 id 计数器。 */
  let toastSeq = 0
  /** 已展示过的里程碑 id（游戏生命周期内只弹一次，跨转生不重复）。 */
  const seenMilestones = ref<Set<string>>(new Set())
  /**
   * 当前堆叠展示的里程碑 snackbar 列表（同步 Gooboo 解锁通知逻辑：非阻塞、多条一起堆叠显示）。
   * 不再用模态弹窗逐个阻塞，避免深度跳跃时"深度5/深度15"连环刷屏。
   */
  const milestones = ref<MilestoneDef[]>([])
  /** 界面缩放系数（写入 <html> 的 --ui-scale，全局尺寸随它缩放）。 */
  const uiScale = ref<UiScale>(readScale())
  applyScale(uiScale.value)
  watch(uiScale, (v) => {
    applyScale(v)
    try {
      localStorage.setItem(SCALE_KEY, String(v))
    } catch {
      // localStorage 不可用时仅本次会话生效
    }
  })

  /** 切换到下一个界面缩放档位（到顶回到最小档）。 */
  function cycleScale(): void {
    const idx = UI_SCALE_STEPS.indexOf(uiScale.value)
    uiScale.value = UI_SCALE_STEPS[(idx + 1) % UI_SCALE_STEPS.length]
  }

  /** 直接设置界面缩放档位。 */
  function setScale(scale: number): void {
    uiScale.value = normalizeScale(scale)
  }

  /** 弹出右上角提示（自动在 ToastContainer 中定时消失）。 */
  function pushToast(msg: string, type: ToastType = 'info'): void {
    toastSeq += 1
    toasts.value.unshift({ id: toastSeq, type, msg })
  }

  /** 手动关闭某条提示。 */
  function dismissToast(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  /**
   * 入队一个已达成的新里程碑并堆叠展示（Gooboo 风格：非阻塞）。
   * 内部用 seen 集合去重，保证每个里程碑只弹一次。
   */
  function enqueueMilestone(m: MilestoneDef): void {
    if (seenMilestones.value.has(m.id)) {
      return
    }
    seenMilestones.value.add(m.id)
    milestones.value.push(m)
  }

  /** 关闭某条里程碑 snackbar（Gooboo 通知可单独关闭）。 */
  function dismissMilestone(id: string): void {
    milestones.value = milestones.value.filter((ms) => ms.id !== id)
  }

  /** 导航到指定面板，同时收起下拉菜单。 */
  function navigate(panel: CenterPanel): void {
    menuOpen.value = false
    activePanel.value = panel
  }

  /** 打开设置弹窗（同时收起下拉菜单）。 */
  function openSettings(): void {
    menuOpen.value = false
    settingsOpen.value = true
  }

  /** 关闭设置弹窗。 */
  function closeSettings(): void {
    settingsOpen.value = false
  }

  /** 切换顶栏下拉菜单开关。 */
  function toggleMenu(): void {
    menuOpen.value = !menuOpen.value
  }

  return {
    activePanel,
    menuOpen,
    settingsOpen,
    toasts,
    seenMilestones,
    milestones,
    uiScale,
    navigate,
    openSettings,
    closeSettings,
    toggleMenu,
    cycleScale,
    setScale,
    pushToast,
    dismissToast,
    enqueueMilestone,
    dismissMilestone,
  }
})
