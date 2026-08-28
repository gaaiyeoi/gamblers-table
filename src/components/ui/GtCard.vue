<script setup lang="ts">
/**
 * GtCard —— 游戏原生像素卡片。
 *
 * 支持具名插槽 #header（有内容才渲染 header 区）和默认内容插槽。
 * dark prop：切换深色底（--bg-2）vs 默认底（--bg-3）。
 */
withDefaults(
  defineProps<{
    dark?: boolean
  }>(),
  { dark: false },
)
</script>

<template>
  <div class="gt-card" :class="{ 'gt-card--dark': dark }">
    <div v-if="$slots.header" class="gt-card__header">
      <slot name="header" />
    </div>
    <div class="gt-card__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.gt-card {
  --card-bg: var(--bg-3);
  --card-border: var(--gold-500);

  background: var(--card-bg);
  color: var(--txt-main);

  /* 像素实线外边框 + 内嵌右下阴影 */
  box-shadow:
    inset 0 0 0 2px var(--card-border),
    inset -3px -3px 0 rgba(0, 0, 0, 0.4),
    4px 4px 0 rgba(0, 0, 0, 0.5);

  image-rendering: pixelated;
}

.gt-card--dark {
  --card-bg: var(--bg-2);
}

/* header 区：底部 1px 虚线分隔，金色小标题排版由子元素自定 */
.gt-card__header {
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px dashed var(--line-2);
}

.gt-card__body {
  padding: var(--sp-3);
}
</style>
