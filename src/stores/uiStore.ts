import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 主区可切换的面板。 */
export type CenterPanel = 'table' | 'talent' | 'challenges' | 'gacha'

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
  /** 装饰扭蛋弹窗开关。 */
  const gachaOpen = ref(false)
  /** 顶栏下拉菜单开关。 */
  const menuOpen = ref(false)
  /** 设置弹窗开关。 */
  const settingsOpen = ref(false)
  /** 右上角提示弹窗列表（新消息排在最前）。 */
  const toasts = ref<Toast[]>([])
  /** 自增 id 计数器。 */
  let toastSeq = 0

  /** 弹出右上角提示（自动在 ToastContainer 中定时消失）。 */
  function pushToast(msg: string, type: ToastType = 'info'): void {
    toastSeq += 1
    toasts.value.unshift({ id: toastSeq, type, msg })
  }

  /** 手动关闭某条提示。 */
  function dismissToast(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  /** 导航到指定面板，同时收起下拉菜单。gacha 特殊处理为弹窗。 */
  function navigate(panel: CenterPanel): void {
    menuOpen.value = false
    if (panel === 'gacha') {
      gachaOpen.value = true
      return
    }
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
    gachaOpen,
    menuOpen,
    settingsOpen,
    toasts,
    navigate,
    openSettings,
    closeSettings,
    toggleMenu,
    pushToast,
    dismissToast,
  }
})
