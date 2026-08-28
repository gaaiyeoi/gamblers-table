<script setup lang="ts">
/**
 * 里程碑提示 —— 到达主线关键节点时弹出，说明"解锁了什么 + 下一步做什么"。
 *
 * 同步 Gooboo 解锁通知逻辑：非阻塞、多条一起堆叠显示在右上角，
 * 每条可单独关闭，不再用全屏模态逐个阻塞（避免深度跳跃时连环刷屏）。
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useSound } from '../../composables/useSound'
import { useUiStore } from '../../stores/uiStore'
import GtButton from '../ui/GtButton.vue'

const ui = useUiStore()
const { milestones } = storeToRefs(ui)
const { play } = useSound()

/** 当前要堆叠展示的里程碑列表（空则整个组件不渲染）。 */
const list = computed(() => milestones.value)

function onClose(id: string): void {
  // 先关闭里程碑，再播关闭音效——避免音效播放异常阻断弹窗关闭
  ui.dismissMilestone(id)
  play('close')
}
</script>

<template>
  <div v-if="list.length > 0" class="milestone-stack" role="status" aria-live="polite">
    <TransitionGroup name="milestone">
      <div v-for="ms in list" :key="ms.id" class="milestone">
        <div class="milestone__head">
          <span class="milestone__tag">里程碑</span>
          <span class="milestone__icon">{{ ms.icon }}</span>
        </div>

        <h3 class="milestone__title pixel-number text-gold">{{ ms.title }}</h3>

        <div class="milestone__block">
          <span class="milestone__label">已解锁</span>
          <p class="milestone__text">{{ ms.desc }}</p>
        </div>

        <div class="milestone__block milestone__block--next">
          <span class="milestone__label">下一步</span>
          <p class="milestone__text milestone__text--next">{{ ms.next }}</p>
        </div>

        <GtButton type="success" class="milestone__btn" @click="onClose(ms.id)">
          继续
        </GtButton>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.milestone-stack {
  position: fixed;
  top: calc(64px * var(--ui-scale));
  right: var(--sp-3);
  z-index: 105;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  width: calc(360px * var(--ui-scale));
  max-height: calc(100vh - 96px);
  overflow-y: auto;
  pointer-events: none;
}

.milestone {
  pointer-events: auto;
  background: var(--bg-2);
  border: 2px solid var(--gold-500);
  box-shadow:
    inset 0 0 0 2px var(--line-0),
    0 0 14px var(--gold-glow),
    4px 4px 0 rgba(0, 0, 0, 0.45);
  padding: var(--sp-3);
}

.milestone__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
}

.milestone__tag {
  color: var(--gold-400);
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.milestone__icon {
  font-size: calc(24px * var(--ui-scale));
  line-height: 1;
}

.milestone__title {
  margin: 0 0 var(--sp-3);
  font-size: var(--fs-base);
  letter-spacing: 1px;
}

.milestone__block {
  border-top: 1px dashed var(--line-2);
  padding: var(--sp-3) 0;
}
.milestone__block:first-of-type {
  border-top: none;
  padding-top: 0;
}
.milestone__block--next {
  background: rgba(61, 220, 132, 0.06);
  border-left: 2px solid var(--pos);
  padding-left: var(--sp-2);
}

.milestone__label {
  display: block;
  color: var(--txt-dim);
  font-size: var(--fs-xs);
  letter-spacing: 1px;
  margin-bottom: var(--sp-1);
}

.milestone__text {
  margin: 0;
  color: var(--txt-main);
  font-size: var(--fs-base);
  line-height: 1.5;
}
.milestone__text--next {
  color: var(--gold-300);
}

.milestone__btn {
  margin-top: var(--sp-2);
  width: 100%;
}

/* 进出场动画 */
.milestone-enter-active,
.milestone-leave-active {
  transition: transform 0.18s ease, opacity 0.18s ease;
}
.milestone-enter-from {
  transform: translateX(30px);
  opacity: 0;
}
.milestone-leave-to {
  transform: translateX(30px);
  opacity: 0;
}
</style>
