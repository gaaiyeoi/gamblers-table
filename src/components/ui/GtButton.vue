<script setup lang="ts">
/**
 * GtButton —— 游戏原生像素按钮。
 *
 * 完全自实现，不依赖 pixel-ui。所有变体通过 CSS 自定义属性驱动：
 * 一套交互动画（hover +2px / active +4px 像素位移）所有 type 复用。
 *
 * 注意：disabled 状态保留 pointer-events，由 ActionButton 的外层容器
 * 负责捕获点击并解释原因；ActionButton 内部会对 button[disabled] 补 pointer-events:none。
 */
type BtnType = 'primary' | 'success' | 'warning' | 'danger' | 'base' | 'ghost'
type BtnSize = 'small' | 'default' | 'large'

withDefaults(
  defineProps<{
    type?: BtnType
    size?: BtnSize
    disabled?: boolean
  }>(),
  {
    type: 'base',
    size: 'default',
    disabled: false,
  },
)
</script>

<template>
  <button
    class="gt-btn"
    :class="[`gt-btn--${type}`, `gt-btn--${size}`, { 'gt-btn--disabled': disabled }]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
/* ── 基础层 ── */
.gt-btn {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: calc(6px * var(--ui-scale));
  white-space: nowrap;
  font-family: var(--font-pixel);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
  line-height: 1;
  cursor: pointer;
  user-select: none;
  border: none;
  outline: none;
  image-rendering: pixelated;
  -webkit-font-smoothing: none;

  /* 像素 3D 阴影变量 */
  --btn-depth: calc(4px * var(--ui-scale));

  /* 颜色变量（由 type modifier 覆盖） */
  --btn-bg: var(--bg-4);
  --btn-bg-hover: var(--bg-5);
  --btn-border: var(--line-2);
  --btn-color: var(--txt-main);
  --btn-shadow-inset: rgba(0, 0, 0, 0.4);
  --btn-shadow-drop: rgba(0, 0, 0, 0.55);

  /* 尺寸变量（由 size modifier 覆盖） */
  --btn-h: calc(32px * var(--ui-scale));
  --btn-px: calc(14px * var(--ui-scale));
  --btn-fs: calc(14px * var(--ui-scale));

  height: var(--btn-h);
  padding: 0 var(--btn-px);
  font-size: var(--btn-fs);
  background: var(--btn-bg);
  color: var(--btn-color);

  /* 像素外边框 */
  box-shadow:
    inset 0 0 0 2px var(--btn-border),
    inset -2px -2px 0 var(--btn-shadow-inset),
    var(--btn-depth) var(--btn-depth) 0 var(--btn-shadow-drop);

  transition: transform 0.05s, box-shadow 0.05s, background 0.05s;
}

/* hover：右下位移 2px，阴影收缩 */
.gt-btn:hover:not(:disabled) {
  background: var(--btn-bg-hover);
  transform: translate(calc(2px * var(--ui-scale)), calc(2px * var(--ui-scale)));
  box-shadow:
    inset 0 0 0 2px var(--btn-border),
    inset -2px -2px 0 var(--btn-shadow-inset),
    calc(var(--btn-depth) - 2px * var(--ui-scale)) calc(var(--btn-depth) - 2px * var(--ui-scale)) 0 var(--btn-shadow-drop);
}

/* active：完全按下，阴影归零 */
.gt-btn:active:not(:disabled) {
  transform: translate(var(--btn-depth), var(--btn-depth));
  box-shadow:
    inset 0 0 0 2px var(--btn-border),
    inset -2px -2px 0 var(--btn-shadow-inset),
    0 0 0 var(--btn-shadow-drop);
}

/* focus-visible：无障碍轮廓 */
.gt-btn:focus-visible {
  outline: 2px solid var(--gold-400);
  outline-offset: 2px;
}

/* disabled */
.gt-btn--disabled,
.gt-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none !important;
  box-shadow:
    inset 0 0 0 2px var(--btn-border),
    inset -2px -2px 0 var(--btn-shadow-inset),
    var(--btn-depth) var(--btn-depth) 0 var(--btn-shadow-drop) !important;
}

/* ── Type 变体 ── */

/* base（默认棕褐） */
.gt-btn--base {
  --btn-bg: var(--bg-4);
  --btn-bg-hover: var(--bg-5);
  --btn-border: var(--line-2);
  --btn-color: var(--txt-main);
}

/* primary：金色 */
.gt-btn--primary {
  --btn-bg: var(--gold-600);
  --btn-bg-hover: var(--gold-500);
  --btn-border: var(--gold-500);
  --btn-color: var(--txt-on-gold);
  --btn-shadow-inset: rgba(0, 0, 0, 0.35);
}

/* success：绿 */
.gt-btn--success {
  --btn-bg: var(--pos-dark);
  --btn-bg-hover: var(--pos);
  --btn-border: var(--pos);
  --btn-color: #0c1408;
  --btn-shadow-inset: rgba(0, 0, 0, 0.35);
}

/* warning：同 primary */
.gt-btn--warning {
  --btn-bg: var(--gold-600);
  --btn-bg-hover: var(--gold-500);
  --btn-border: var(--gold-500);
  --btn-color: var(--txt-on-gold);
  --btn-shadow-inset: rgba(0, 0, 0, 0.35);
}

/* danger：红 */
.gt-btn--danger {
  --btn-bg: var(--neg-dark);
  --btn-bg-hover: var(--neg);
  --btn-border: var(--neg);
  --btn-color: #fff8f5;
  --btn-shadow-inset: rgba(0, 0, 0, 0.35);
}

/* ghost：透明底，金色边框 */
.gt-btn--ghost {
  --btn-bg: transparent;
  --btn-bg-hover: var(--gold-dim);
  --btn-border: var(--gold-500);
  --btn-color: var(--gold-400);
}

/* ── Size 变体 ── */
.gt-btn--small {
  --btn-h: calc(24px * var(--ui-scale));
  --btn-px: calc(10px * var(--ui-scale));
  --btn-fs: calc(12px * var(--ui-scale));
  --btn-depth: calc(3px * var(--ui-scale));
}

.gt-btn--default {
  --btn-h: calc(32px * var(--ui-scale));
  --btn-px: calc(14px * var(--ui-scale));
  --btn-fs: calc(14px * var(--ui-scale));
  --btn-depth: calc(4px * var(--ui-scale));
}

.gt-btn--large {
  --btn-h: calc(40px * var(--ui-scale));
  --btn-px: calc(18px * var(--ui-scale));
  --btn-fs: calc(16px * var(--ui-scale));
  --btn-depth: calc(4px * var(--ui-scale));
}
</style>
