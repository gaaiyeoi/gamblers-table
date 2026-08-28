<script setup lang="ts">
/**
 * 桌布矿洞采矿场景（纯展示动画）：一群像素小动物在地下矿道持续往下挖。
 * - 多层视差岩层（远地层 / 中碎石 / 矿脉 / 近岩块）统一向下滚动
 * - 岩壁纹路、梯子横档、缆绳、深度标尺同步下移，支架从上方掠过
 * - 近景移动最快、远景最慢，营造"镜头跟着一直往下沉"的错觉
 * - 小动物军团交错刨土，矿石/碎屑/煤炭从掌子面迸出
 * - 顶部 HUD 展示当前层与本层挖掘进度（实时米数连续增长）
 * 采矿数据（深度/产矿/废料等）展示在下方面板，桌布保持纯净动画。
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useGameStore } from '../../stores/gameStore'
import { miningWallProgress } from '../../core'
import CritterSprite from './CritterSprite.vue'

const store = useGameStore()
const { state } = storeToRefs(store)

/** 当前层（从 1 开始）。 */
const layer = computed(() => state.value.mining.depth)

/** 本层已挖进度 0~1（矿壁剩余 HP 的反比）。 */
const layerProgress = computed(() => 1 - miningWallProgress(state.value))

/** 实时米数：随本层进度从 N 连续增长到 N+1，直观体现"一直在往下挖"。 */
const meters = computed(() => (layer.value + layerProgress.value).toFixed(1))

/** 小动物军团数量（随深度变多，纯展示）。 */
const critterCount = computed(() => Math.min(3 + Math.floor(layer.value / 4), 6))
const critters = computed(() => Array.from({ length: critterCount.value }, (_, i) => i))

/** 单个小动物的位置（前后两排错落，制造纵深）。 */
function critterStyle(i: number): { left: string; bottom: string; transform: string; zIndex: string } {
  const back = i % 2 === 1
  const step = 84 / Math.max(1, critterCount.value - 1)
  return {
    left: `${8 + i * step}%`,
    bottom: back ? '30px' : '22px',
    transform: `translateX(-50%) scale(${back ? 0.82 : 1})`,
    zIndex: back ? '1' : '2',
  }
}

/** 动作相位：每只错开一点，避免整齐划一。 */
function critterDelay(i: number): number {
  return Number((i * 0.23).toFixed(2))
}

/** 掌子面迸出的矿石：位置、相位、大小。 */
function chunkStyle(c: number): { left: string; animationDelay: string; width: string; height: string } {
  const size = 4 + (c % 3) * 2
  return {
    left: `${6 + c * 9}%`,
    animationDelay: `${-c * 0.34}s`,
    width: `${size}px`,
    height: `${size}px`,
  }
}
</script>

<template>
  <div class="mine-scene">
    <!-- ── 下潜中的岩层（多层视差，统一向下滚动） ── -->
    <div class="mine-cave">
      <div class="mine-layer mine-layer--far"></div>
      <div class="mine-layer mine-layer--mid"></div>
      <div class="mine-layer mine-layer--ore"></div>
      <div class="mine-layer mine-layer--near"></div>

      <!-- 近景支架：下移最快 -->
      <div class="mine-props">
        <span
          v-for="b in 4"
          :key="`beam-${b}`"
          class="mine-beam"
          :style="{ animationDelay: `${-b * 1.2}s` }"
        ></span>
      </div>

      <!-- 梯子 / 缆绳 / 深度标尺：纹路持续下移 -->
      <div class="mine-ladder"></div>
      <div class="mine-cable"></div>
      <div class="mine-ruler"></div>

      <!-- 岩壁（纹理同样下移） -->
      <div class="mine-wall mine-wall--l"></div>
      <div class="mine-wall mine-wall--r"></div>

      <!-- 煤灯（固定在掌子面附近照明） -->
      <div class="mine-lamp mine-lamp--l"></div>
      <div class="mine-lamp mine-lamp--r"></div>

      <!-- 顶部暗角：上方是已经挖穿的隧道 -->
      <div class="mine-vignette"></div>

      <!-- 飘尘（缓慢下落） -->
      <div class="mine-float">
        <span
          v-for="f in 6"
          :key="f"
          class="mine-float__dot"
          :style="{ left: `${8 + f * 15}%`, animationDelay: `${-f * 0.9}s` }"
        ></span>
      </div>
    </div>

    <!-- ── 深度 HUD：证明一直在往下挖 ── -->
    <div class="mine-hud">
      <span class="mine-hud__layer">第 {{ layer }} 层</span>
      <span class="mine-hud__meters">{{ meters }}<small>m</small></span>
      <span class="mine-hud__bar">
        <i :style="{ width: `${(layerProgress * 100).toFixed(1)}%` }"></i>
      </span>
      <span class="mine-hud__down">▼ 下潜中</span>
    </div>

    <!-- ── 小动物军团（站在掌子面上刨土） ── -->
    <div class="mine-crew">
      <div
        v-for="i in critters"
        :key="i"
        class="mine-crew__slot"
        :style="critterStyle(i)"
      >
        <CritterSprite :delay="critterDelay(i)" :flip="i % 3 === 1" :variant="i % 4" />
      </div>
    </div>

    <!-- ── 掌子面迸出的矿石/碎屑/煤炭 ── -->
    <div class="mine-chunks">
      <span
        v-for="c in 10"
        :key="c"
        class="mine-chunk"
        :class="`mine-chunk--${c % 4}`"
        :style="chunkStyle(c)"
      ></span>
    </div>
  </div>
</template>

<style scoped>
.mine-scene {
  position: absolute;
  inset: 0;
  z-index: 10;
  overflow: hidden;
  pointer-events: none;
  background: radial-gradient(ellipse 90% 70% at 50% 105%, #0f0a04 0%, #241a0e 55%, #140d05 100%);
}

/* ── 地下岩层 ── */
.mine-cave {
  position: absolute;
  inset: 0;
  z-index: 0;
}

/*
 * 视差滚动层：每层都是"整块可平铺背景向下平移一个瓦片高度"，
 * 时长不同 => 速度不同（远景慢、近景快），形成持续下潜的纵深感。
 */
.mine-layer {
  position: absolute;
  left: 0;
  right: 0;
  top: -120px;
  bottom: -120px;
  background-repeat: repeat;
  will-change: transform;
}
/* 远景地层（最慢） */
.mine-layer--far {
  background-image: repeating-linear-gradient(
    180deg,
    rgba(122, 94, 48, 0.16) 0 34px,
    rgba(56, 40, 16, 0.14) 34px 68px
  );
  background-size: 100% 68px;
  animation: m-scroll-68 9s linear infinite;
}
@keyframes m-scroll-68 {
  from { transform: translateY(0); }
  to { transform: translateY(68px); }
}
/* 中层碎石 */
.mine-layer--mid {
  background-image:
    radial-gradient(circle at 18% 18%, rgba(150, 120, 64, 0.5) 3px, transparent 4px),
    radial-gradient(circle at 62% 42%, rgba(120, 94, 48, 0.42) 2px, transparent 3px),
    radial-gradient(circle at 86% 70%, rgba(140, 110, 58, 0.4) 3px, transparent 4px),
    radial-gradient(circle at 34% 88%, rgba(104, 80, 40, 0.35) 2px, transparent 3px);
  background-size: 140px 72px, 110px 72px, 160px 72px, 120px 72px;
  animation: m-scroll-72 4.6s linear infinite;
}
@keyframes m-scroll-72 {
  from { transform: translateY(0); }
  to { transform: translateY(72px); }
}
/* 矿脉金点 */
.mine-layer--ore {
  background-image:
    radial-gradient(circle at 24% 20%, rgba(255, 208, 96, 0.5) 2px, transparent 3px),
    radial-gradient(circle at 68% 54%, rgba(255, 224, 130, 0.4) 2px, transparent 3px),
    radial-gradient(circle at 44% 82%, rgba(214, 176, 74, 0.45) 2px, transparent 3px);
  background-size: 170px 72px, 130px 72px, 200px 72px;
  animation: m-scroll-72 3.6s linear infinite;
}
/* 近景岩块（最快） */
.mine-layer--near {
  background-image:
    radial-gradient(ellipse 9px 5px at 22% 14%, rgba(96, 72, 34, 0.55) 60%, transparent 62%),
    radial-gradient(ellipse 6px 9px at 70% 38%, rgba(74, 56, 26, 0.5) 60%, transparent 62%),
    radial-gradient(ellipse 11px 4px at 40% 62%, rgba(110, 84, 40, 0.45) 60%, transparent 62%),
    radial-gradient(ellipse 7px 6px at 84% 86%, rgba(64, 48, 22, 0.5) 60%, transparent 62%);
  background-size: 190px 96px, 150px 96px, 210px 96px, 170px 96px;
  animation: m-scroll-96 2.8s linear infinite;
}
@keyframes m-scroll-96 {
  from { transform: translateY(0); }
  to { transform: translateY(96px); }
}

/* 近景木质支架：从上方掠过后从下方离开 */
.mine-props {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.mine-beam {
  position: absolute;
  left: 0;
  right: 0;
  top: -24px;
  height: 12px;
  background: linear-gradient(
    180deg,
    #6b4a20 0,
    #6b4a20 3px,
    #4a3416 3px,
    #4a3416 8px,
    #2a1c0a 8px,
    #2a1c0a 12px
  );
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5);
  opacity: 0.85;
  animation: m-beam 4.8s linear infinite;
}
.mine-beam::before,
.mine-beam::after {
  content: '';
  position: absolute;
  top: 0;
  width: 8px;
  height: 26px;
  background: linear-gradient(90deg, #3a2810, #5a3f1c 60%, #2a1c0a);
}
.mine-beam::before { left: 2px; }
.mine-beam::after { right: 2px; }
@keyframes m-beam {
  from { transform: translateY(0); }
  to { transform: translateY(420px); }
}

/* 梯子：横档持续下移 */
.mine-ladder {
  position: absolute;
  left: 84px;
  top: -28px;
  bottom: 44px;
  width: 14px;
  opacity: 0.55;
  background-image:
    repeating-linear-gradient(180deg, #5a3f1c 0 3px, transparent 3px 28px),
    linear-gradient(90deg, #5a3f1c 0 3px, transparent 3px 11px, #5a3f1c 11px 14px);
  background-repeat: repeat-y, repeat-y;
  will-change: transform;
  animation: m-rungs 2.8s linear infinite;
}
@keyframes m-rungs {
  from { transform: translateY(0); }
  to { transform: translateY(28px); }
}

/* 缆绳：接头持续下移 */
.mine-cable {
  position: absolute;
  right: 32px;
  top: -28px;
  bottom: 44px;
  width: 3px;
  opacity: 0.5;
  background-image: repeating-linear-gradient(180deg, #1a1a22 0 7px, #6a6a7a 7px 14px);
  will-change: transform;
  animation: m-cable 2.8s linear infinite;
}
@keyframes m-cable {
  from { transform: translateY(0); }
  to { transform: translateY(28px); }
}

/* 深度标尺：长刻度 28px、短刻度 7px，同速下移 */
.mine-ruler {
  position: absolute;
  right: 8px;
  top: -28px;
  bottom: 44px;
  width: 10px;
  opacity: 0.6;
  background-image:
    repeating-linear-gradient(180deg, rgba(255, 214, 120, 0.5) 0 2px, transparent 2px 28px),
    repeating-linear-gradient(180deg, rgba(255, 214, 120, 0.22) 0 2px, transparent 2px 7px);
  background-size: 10px 28px, 5px 7px;
  background-repeat: repeat-y, repeat-y;
  will-change: transform;
  animation: m-ruler 2.8s linear infinite;
}
@keyframes m-ruler {
  from { transform: translateY(0); }
  to { transform: translateY(28px); }
}

/* 岩壁（纹理同样下移） */
.mine-wall {
  position: absolute;
  top: -32px;
  bottom: 0;
  width: 28px;
  background-image:
    radial-gradient(circle at 30% 12%, rgba(90, 68, 30, 0.6) 3px, transparent 4px),
    radial-gradient(circle at 70% 46%, rgba(70, 52, 24, 0.5) 3px, transparent 4px),
    linear-gradient(90deg, #2a1c0c 0%, rgba(42, 28, 12, 0) 100%);
  background-size: 100% 64px, 100% 64px, 100% 100%;
  box-shadow: inset -6px 0 12px rgba(0, 0, 0, 0.5);
  will-change: transform;
  animation: m-wall 3.2s linear infinite;
}
.mine-wall--l { left: 0; }
.mine-wall--r { right: 0; animation: m-wall-flip 3.2s linear infinite; }
@keyframes m-wall {
  from { transform: translateY(0); }
  to { transform: translateY(32px); }
}
@keyframes m-wall-flip {
  from { transform: scaleX(-1) translateY(0); }
  to { transform: scaleX(-1) translateY(32px); }
}

/* 顶部暗角：上方是已挖穿的隧道 */
.mine-vignette {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 72px;
  background: linear-gradient(
    180deg,
    rgba(6, 4, 2, 0.95) 0%,
    rgba(10, 7, 3, 0.6) 55%,
    transparent 100%
  );
}

/* 煤灯（暖光） */
.mine-lamp {
  position: absolute;
  top: 46%;
  width: 10px;
  height: 12px;
  background: #6b4a1a;
  border: 1px solid #2a1c08;
  border-radius: 4px;
  box-shadow: 0 0 12px rgba(255, 200, 100, 0.7), 0 0 24px rgba(255, 180, 80, 0.4);
}
.mine-lamp--l { left: 8%; }
.mine-lamp--r { right: 8%; }
.mine-lamp::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 4px;
  height: 5px;
  background: #ffd97a;
  animation: m-lamp-flicker 2s ease-in-out infinite;
}
@keyframes m-lamp-flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* 飘尘（缓慢下落） */
.mine-float {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 44px;
}
.mine-float__dot {
  position: absolute;
  top: 20%;
  width: 3px;
  height: 3px;
  background: rgba(255, 216, 130, 0.4);
  border-radius: 50%;
  animation: m-float 6s ease-in-out infinite;
}
@keyframes m-float {
  0% { transform: translateY(-12px); opacity: 0; }
  25% { opacity: 0.5; }
  75% { opacity: 0.35; }
  100% { transform: translateY(40px); opacity: 0; }
}

/* 固定掌子面（前景层，绘制在滚动背景之上、小动物之下）：小动物站立处纹路静止不动 */
.mine-scene::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  height: 44px;
  background:
    radial-gradient(circle at 30% 60%, rgba(90, 70, 30, 0.5) 2px, transparent 3px),
    radial-gradient(circle at 65% 40%, rgba(60, 45, 20, 0.5) 2px, transparent 3px),
    radial-gradient(circle at 85% 70%, rgba(80, 60, 25, 0.4) 2px, transparent 3px),
    linear-gradient(180deg, transparent, #1a1206 60%, #0f0a04 100%);
  background-size: 28px 28px, 32px 32px, 30px 30px, 100% 100%;
  box-shadow: 0 -3px 8px rgba(0, 0, 0, 0.4);
}

/* ── 深度 HUD ── */
.mine-hud {
  position: absolute;
  left: calc(10px * var(--ui-scale));
  top: calc(8px * var(--ui-scale));
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: calc(3px * var(--ui-scale));
  padding: calc(5px * var(--ui-scale)) calc(8px * var(--ui-scale));
  background: rgba(10, 7, 3, 0.6);
  border: 1px solid rgba(255, 216, 130, 0.25);
  color: #f0d9a8;
  font-size: var(--fs-xs);
  letter-spacing: 1px;
  line-height: 1.2;
}
.mine-hud__layer {
  opacity: 0.85;
}
.mine-hud__meters {
  color: var(--gold-400, #ffd97a);
  font-size: var(--fs-sm);
  font-weight: 700;
}
.mine-hud__meters small {
  margin-left: 1px;
  font-size: var(--fs-xs);
  opacity: 0.8;
}
.mine-hud__bar {
  width: calc(86px * var(--ui-scale));
  height: calc(4px * var(--ui-scale));
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 216, 130, 0.25);
}
.mine-hud__bar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #b8860b, #ffd97a);
}
.mine-hud__down {
  color: #9fd8ff;
  font-size: var(--fs-xs);
  animation: m-down 1.4s ease-in-out infinite;
}
@keyframes m-down {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50% { transform: translateY(2px); opacity: 1; }
}

/* ── 小动物军团 ── */
.mine-crew {
  position: absolute;
  inset: 0;
  z-index: 3;
}
.mine-crew__slot {
  position: absolute;
  transform-origin: 50% 100%;
}

/* ── 掌子面迸出的矿石/碎屑/煤炭 ── */
.mine-chunks {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 46px;
  height: 70px;
  z-index: 2;
}
.mine-chunk {
  position: absolute;
  bottom: 0;
  width: 6px;
  height: 6px;
  opacity: 0;
  animation: m-chunk 1.7s ease-out infinite;
}
.mine-chunk--0 { background: #ffd700; border: 1px solid #8a6d00; }
.mine-chunk--1 { background: #b0a88a; border: 1px solid #6b6350; }
.mine-chunk--2 { background: #2a2a2a; border: 1px solid #555; }
.mine-chunk--3 { background: #8a6a3a; border: 1px solid #4a3416; }
@keyframes m-chunk {
  0% { opacity: 0; transform: translateY(0) rotate(0deg); }
  12% { opacity: 1; }
  60% { opacity: 1; transform: translateY(-38px) rotate(160deg); }
  100% { opacity: 0; transform: translateY(-62px) rotate(320deg); }
}
</style>
