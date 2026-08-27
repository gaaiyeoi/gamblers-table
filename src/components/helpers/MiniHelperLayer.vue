<script setup lang="ts">
/**
 * 桌台上的小助手群（纯 CSS 动画 · 无逐帧 JS）：
 * - 在固定精灵预算内渲染一小群像素小助手，营造"很多人在抛硬币"的错觉
 * - 每只助手用 CSS keyframes 独立行走/抛币，随机时长 + 负延时错开相位，
 *   全部由浏览器 GPU 合成，数量再多也几乎不占主线程
 * - 纯装饰层：真实产出由 tickHelpers 驱动，这里绝不调用 doFlip，
 *   避免视觉与生产耦合导致重复计数、加剧数值膨胀
 */

import { computed } from 'vue'

const props = defineProps<{
  /** 世界宽/高（px），用于按比例散布助手 */
  worldW: number
  worldH: number
  /** 本次渲染的小助手数量（父层已封顶） */
  count: number
}>()

/** 精灵预算上限（性能硬顶）。 */
const MAX = 48

/** 小助手配色（头/身体/肤色/靴子）。 */
const COLORS = [
  { head: '#f5c518', body: '#e8a800', skin: '#f6c98a', boot: '#7a4a12' },
  { head: '#f87171', body: '#ef4444', skin: '#f2b97f', boot: '#5a2410' },
  { head: '#a78bfa', body: '#7c3aed', skin: '#f0c18a', boot: '#2a1550' },
  { head: '#7dd3fc', body: '#0ea5e9', skin: '#f5d0a8', boot: '#0f4a5e' },
  { head: '#fca5a5', body: '#dc2626', skin: '#f6c98a', boot: '#45120f' },
  { head: '#fef08a', body: '#ffd700', skin: '#f6d3a0', boot: '#7a5200' },
  { head: '#f9a8d4', body: '#ec4899', skin: '#f7c9e0', boot: '#4a1140' },
]

interface Sprite {
  id: number
  /** 0..1 相对世界宽。 */
  x: number
  /** 0..1 相对世界高。 */
  y: number
  flip: boolean
  c: (typeof COLORS)[number]
  scale: string
  walkDur: string
  walkDelay: string
  walkRange: string
  throwDur: string
  throwDelay: string
}

/** 挂载时一次性生成固定池，count 变化只增删可见项，精灵不抖动、不重排。 */
const pool: Sprite[] = Array.from({ length: MAX }, (_, i) => {
  const rnd = (a: number, b: number): number => a + Math.random() * (b - a)
  return {
    id: i,
    x: rnd(0.05, 0.95),
    y: rnd(0.12, 0.9),
    flip: Math.random() > 0.5,
    c: COLORS[i % COLORS.length]!,
    scale: rnd(0.8, 1.25).toFixed(2),
    walkDur: `${rnd(3.2, 6.5).toFixed(2)}s`,
    walkDelay: `-${rnd(0, 6).toFixed(2)}s`,
    walkRange: `${Math.round(rnd(14, 34))}px`,
    throwDur: `${rnd(2, 3.8).toFixed(2)}s`,
    throwDelay: `-${rnd(0, 3.8).toFixed(2)}s`,
  }
})

const visible = computed(() => pool.slice(0, Math.max(0, Math.min(MAX, props.count))))
</script>

<template>
  <div
    class="mini-crowd"
    :style="{ width: worldW + 'px', height: worldH + 'px' }"
  >
    <div
      v-for="s in visible"
      :key="s.id"
      class="mini-helper"
      :style="{
        left: `${(s.x * 100).toFixed(1)}%`,
        top: `${(s.y * 100).toFixed(1)}%`,
        '--s': s.scale,
        '--flip': s.flip ? -1 : 1,
        '--hd': s.c.head,
        '--bd': s.c.body,
        '--sk': s.c.skin,
        '--bt': s.c.boot,
        '--walk-dur': s.walkDur,
        '--walk-delay': s.walkDelay,
        '--walk-range': s.walkRange,
        '--throw-dur': s.throwDur,
        '--throw-delay': s.throwDelay,
      }"
    >
      <!-- 地面椭圆阴影 -->
      <span class="m-shadow" />
      <!-- 抛出的硬币（像素方块 + 高光） -->
      <span class="m-coin" />
      <!-- 像素小人 -->
      <div class="m-body">
        <!-- 帽子（帽冠 + 帽檐） -->
        <div class="m-hat">
          <span class="m-hat-crown" />
          <span class="m-hat-brim" />
        </div>
        <!-- 头（眼睛 / 嘴由伪元素绘制） -->
        <div class="m-head" />
        <!-- 躯干（腰带 / 徽章由伪元素绘制） -->
        <div class="m-torso" />
        <!-- 抛币时举起的手臂 -->
        <span class="m-arm" />
        <!-- 腿（靴子由伪元素绘制） -->
        <div class="m-legs" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mini-crowd {
  position: absolute;
  left: 0;
  top: 0;
  overflow: visible;
  pointer-events: none;
}

.mini-helper {
  position: absolute;
  width: 14px;
  height: 24px;
  transform: scale(var(--s, 1)) scaleX(var(--flip, 1));
  will-change: transform;
}

/* ── 地面椭圆阴影 ── */
.m-shadow {
  position: absolute;
  left: 0;
  top: 21px;
  width: 14px;
  height: 3px;
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.42), rgba(0, 0, 0, 0) 70%);
}

/* ── 像素小人 ── */
.m-body {
  position: absolute;
  inset: 0;
  animation: mini-walk var(--walk-dur, 4s) steps(6, end) infinite;
  animation-delay: var(--walk-delay, 0s);
}

/* 帽子：帽冠 + 帽檐 */
.m-hat {
  position: absolute;
  left: 2px;
  top: 0;
  width: 10px;
  height: 5px;
}
.m-hat-crown {
  position: absolute;
  left: 1px;
  top: 0;
  width: 8px;
  height: 3px;
  background: var(--hd);
  box-shadow:
    inset 1px 0 0 rgba(255, 255, 255, 0.4),
    inset -1px 0 0 rgba(0, 0, 0, 0.35);
}
.m-hat-brim {
  position: absolute;
  left: 0;
  top: 3px;
  width: 10px;
  height: 2px;
  background: var(--hd);
  filter: brightness(0.55);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}

/* 头（肤色 + 眼睛/嘴） */
.m-head {
  position: absolute;
  left: 4px;
  top: 4px;
  width: 6px;
  height: 6px;
  background: var(--sk);
  box-shadow:
    inset 1px 0 0 rgba(0, 0, 0, 0.2),
    inset -1px 0 0 rgba(255, 255, 255, 0.18);
}
/* 眼睛（两格黑像素 + 高光） */
.m-head::before {
  content: '';
  position: absolute;
  left: 0;
  top: 2px;
  width: 6px;
  height: 2px;
  background:
    linear-gradient(90deg, #1c1008 0 2px, transparent 2px 4px, #1c1008 4px 6px);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.5),
    1px -1px 0 rgba(255, 255, 255, 0.5),
    5px -1px 0 rgba(255, 255, 255, 0.5);
}
/* 嘴 */
.m-head::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 5px;
  width: 2px;
  height: 1px;
  background: rgba(28, 16, 8, 0.7);
}

/* 躯干（衣服 + 腰带 + 徽章） */
.m-torso {
  position: absolute;
  left: 3px;
  top: 10px;
  width: 8px;
  height: 9px;
  background: var(--bd);
  box-shadow:
    inset -1px 0 0 rgba(0, 0, 0, 0.35),
    inset 1px 0 0 rgba(255, 255, 255, 0.3);
}
/* 腰带 */
.m-torso::before {
  content: '';
  position: absolute;
  left: 0;
  top: 5px;
  width: 8px;
  height: 2px;
  background: rgba(0, 0, 0, 0.45);
}
/* 胸前徽章（金色） */
.m-torso::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 2px;
  width: 2px;
  height: 2px;
  background: #ffd700;
  box-shadow: 0 1px 0 #8a5a00;
}

/* 抛币时举起的手臂 */
.m-arm {
  position: absolute;
  left: 1px;
  top: 11px;
  width: 3px;
  height: 4px;
  background: var(--bd);
  box-shadow: inset -1px 0 0 rgba(0, 0, 0, 0.3);
  animation: mini-arm var(--throw-dur, 3s) linear infinite;
  animation-delay: var(--throw-delay, 0s);
}

/* 双腿（靴子） */
.m-legs {
  position: absolute;
  left: 3px;
  top: 19px;
  width: 8px;
  height: 4px;
}
.m-legs::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 3px;
  height: 4px;
  background: var(--bt);
  box-shadow:
    inset 0 -1px 0 rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(0, 0, 0, 0.2);
}
.m-legs::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 0;
  width: 3px;
  height: 4px;
  background: var(--bt);
  box-shadow:
    inset 0 -1px 0 rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(0, 0, 0, 0.2);
}

/* ── 抛出的硬币（像素方块） ── */
.m-coin {
  position: absolute;
  /* 位于头顶右上方，像"手中举起"的位置 */
  left: 9px;
  top: 0;
  width: 4px;
  height: 4px;
  background: #f5c020;
  border-top: 1px solid #ffe680;
  border-left: 1px solid #ffe680;
  border-right: 1px solid #8a4008;
  border-bottom: 1px solid #8a4008;
  opacity: 0;
  will-change: transform, opacity;
  animation: mini-throw var(--throw-dur, 3s) linear infinite;
  animation-delay: var(--throw-delay, 0s);
}

/* 行走：横向平移 + 身体起伏（模拟脚步） */
@keyframes mini-walk {
  0%, 100% { transform: translateX(0) translateY(0); }
  15%      { transform: translateX(calc(var(--walk-range, 20px) * 0.15)) translateY(-1px); }
  30%      { transform: translateX(calc(var(--walk-range, 20px) * 0.4)) translateY(0); }
  45%      { transform: translateX(calc(var(--walk-range, 20px) * 0.6)) translateY(-1px); }
  55%      { transform: translateX(calc(var(--walk-range, 20px) * 0.7)) translateY(0); }
  70%      { transform: translateX(calc(var(--walk-range, 20px) * 0.45)) translateY(-1px); }
  80%      { transform: translateX(calc(var(--walk-range, 20px) * 0.2)) translateY(0); }
  90%      { transform: translateX(calc(var(--walk-range, 20px) * 0.05)) translateY(-1px); }
}

/* 抛币时手臂举起 */
@keyframes mini-arm {
  0%, 20%   { transform: translate(0, 0); }
  30%, 45%  { transform: translate(-2px, -4px); }
  50%, 100% { transform: translate(0, 0); }
}

/**
 * 抛币动作（弧线轨迹 + 旋转 + 翻转缩放）：
 *  0%–10%  隐身蓄力（手放下）
 *  10%–25% 举起（硬币在头顶显现，位置在手中）
 *  25%–40% 静止（手持硬币蓄势）
 *  40%–55% 抛起（沿弧线上升）
 *  55%–75% 下落（弧线落到右侧）
 *  75%–90% 落地翻滚（缩小淡出）
 *  90%–100% 消失
 */
@keyframes mini-throw {
  0%   { transform: translate(0, 0) scale(1)   rotate(0);    opacity: 0; }
  10%  { transform: translate(0, 0) scale(1)   rotate(0);    opacity: 0; }
  25%  { transform: translate(0, -3px) scale(1) rotate(60deg);  opacity: 1; }
  40%  { transform: translate(0, -3px) scale(1) rotate(180deg); opacity: 1; }
  55%  { transform: translate(4px, -10px) scale(1.15) rotate(280deg); opacity: 1; }
  75%  { transform: translate(10px, -4px) scale(1)   rotate(380deg); opacity: 1; }
  90%  { transform: translate(14px, 2px) scale(0.6) rotate(440deg); opacity: 0.4; }
  100% { transform: translate(16px, 4px) scale(0.4) rotate(500deg); opacity: 0; }
}
</style>
