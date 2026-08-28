<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useSound } from '../../composables/useSound'
import { useUiStore, type ToastType } from '../../stores/uiStore'

const ui = useUiStore()
const { toasts } = storeToRefs(ui)
const { play } = useSound()

/** 每种类型对应的图标标记与强调色。 */
const META: Record<ToastType, { icon: string; cls: string }> = {
  success: { icon: '✓', cls: 'toast--success' },
  info: { icon: 'i', cls: 'toast--info' },
  warn: { icon: '!', cls: 'toast--warn' },
  error: { icon: '✕', cls: 'toast--error' },
}

const TOAST_DURATION_MS = 3000
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
  play('remove')
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
  top: calc(64px * var(--ui-scale));
  right: var(--sp-3);
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  width: calc(280px * var(--ui-scale));
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-3);
  background: var(--bg-3);
  border: 2px solid var(--gold-500);
  box-shadow:
    inset 0 0 0 2px var(--line-0),
    0 0 14px var(--gold-glow),
    4px 4px 0 rgba(0, 0, 0, 0.45);
  cursor: pointer;
  pointer-events: auto;
}

.toast__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(24px * var(--ui-scale));
  height: calc(24px * var(--ui-scale));
  flex-shrink: 0;
  border: 2px solid var(--line-0);
  color: #fff;
  font-weight: 700;
  font-size: var(--fs-sm);
  line-height: 1;
}

.toast__msg {
  flex: 1;
  font-size: var(--fs-base);
  font-weight: 700;
  line-height: 1.5;
  color: var(--text-primary);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.6);
}

.toast__close {
  color: var(--text-dim);
  flex-shrink: 0;
  font-size: var(--fs-sm);
  line-height: 1;
}

/* 类型配色 */
.toast--success .toast__icon { background: var(--pos); }
.toast--info .toast__icon { background: var(--info); }
.toast--warn .toast__icon { background: var(--warn); }
.toast--error .toast__icon { background: var(--neg); }

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
