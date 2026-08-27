<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useUiStore, type ToastType } from '../../stores/uiStore'

const ui = useUiStore()
const { toasts } = storeToRefs(ui)

/** 每种类型对应的图标标记与强调色。 */
const META: Record<ToastType, { icon: string; cls: string }> = {
  success: { icon: '✓', cls: 'toast--success' },
  info: { icon: 'i', cls: 'toast--info' },
  warn: { icon: '!', cls: 'toast--warn' },
  error: { icon: '✕', cls: 'toast--error' },
}

const TOAST_DURATION_MS = 800
const timers = new Map<number, ReturnType<typeof setTimeout>>()

/** 定时自动关闭单条提示。 */
function scheduleDismiss(id: number): void {
  const timer = setTimeout(() => {
    timers.delete(id)
    ui.dismissToast(id)
  }, TOAST_DURATION_MS)
  timers.set(id, timer)
}

function onClose(id: number): void {
  const timer = timers.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    timers.delete(id)
  }
  ui.dismissToast(id)
}

// 为每条（含后续通过 pushToast 新增的）提示安排自动关闭。
// 之前的实现只在 onMounted 时对已存在的提示安排一次，导致新增提示“持久停留”不消失。
watch(
  toasts,
  (newToasts) => {
    for (const toast of newToasts) {
      if (!timers.has(toast.id)) {
        scheduleDismiss(toast.id)
      }
    }
  },
  { immediate: true, deep: true },
)

onBeforeUnmount(() => {
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
})
</script>

<template>
  <div class="toast-container" role="status" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="META[toast.type]?.cls ?? 'toast--info'"
        @click="onClose(toast.id)"
      >
        <span class="toast__icon">{{ META[toast.type]?.icon ?? 'i' }}</span>
        <span class="toast__msg pixel-number">{{ toast.msg }}</span>
        <span class="toast__close">×</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 64px;
  right: 12px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 280px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--app-bg);
  border: 3px solid #212121;
  box-shadow:
    inset 0 0 0 2px #3a3a3a,
    4px 4px 0 rgba(0, 0, 0, 0.4);
  cursor: pointer;
  pointer-events: auto;
}

.toast__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border: 2px solid #212121;
  color: #212121;
  font-weight: 700;
  line-height: 1;
}

.toast__msg {
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
}

.toast__close {
  color: var(--text-dim);
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1;
}

/* 类型配色 */
.toast--success .toast__icon { background: #2f9e44; }
.toast--info .toast__icon { background: #1971c2; }
.toast--warn .toast__icon { background: #f08c00; }
.toast--error .toast__icon { background: #e03131; }

/* 进出场动画 */
.toast-enter-active,
.toast-leave-active {
  transition: transform 0.18s ease, opacity 0.18s ease;
}
.toast-enter-from {
  transform: translateX(30px);
  opacity: 0;
}
.toast-leave-to {
  transform: translateX(30px);
  opacity: 0;
}
</style>
