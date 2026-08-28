<script setup lang="ts">
/**
 * 像素挖矿小动物（沿用项目原有"精细像素小人"画风：内联 SVG crispEdges 像素网格）。
 * - 圆滚滚身体、大耳朵、大爪子、头灯，右爪握一把小镐子
 * - 埋头干活：躬身缩脖 + 小镐子持续"慢举起 → 猛砸下 → 磕进石头 → 拔起"
 * - 砸地瞬间：撞击星芒 + 尘土云翻涌 + 六块土石呈扇形迸出，走抛物线后落回地面
 * - 每隔若干次挥镐（宏周期末段）直起腰抬头擦汗：拄着镐子、左爪抬到额头来回擦、甩出汗珠
 * - 细节动作：耳朵抖动、鼻子抽动、眨眼、头灯闪烁、后脚小碎步
 * 纯展示，定位由父组件控制。
 */
import { computed } from 'vue'

import { MAT, furPaletteOf, shade, shadesOf } from './critter/critterPalette'

const props = defineProps<{
  /** 动作相位偏移（秒）：多个小动物交错作业；内部取负延迟，入场即处于动作中。 */
  delay?: number
  /** 是否镜像翻转（朝向）。 */
  flip?: boolean
  /** 是否处于挖矿状态（默认 true，可关停）。 */
  digging?: boolean
  /** 毛色变体索引：0 鼹鼠棕 / 1 仓鼠金 / 2 灰兔灰 / 3 狐狸橙。 */
  variant?: number
}>()

/** 当前毛色的一整套明暗 + 肚皮色（模板统一经 `colors.xxx` 读取）。 */
const colors = computed(() => {
  const palette = furPaletteOf(props.variant ?? 0)
  const fur = shadesOf(palette.fur)
  return {
    fur: fur.base,
    furLight: fur.light,
    furDark: fur.dark,
    belly: palette.belly,
    bellyDark: shade(palette.belly, 0.82),
  }
})

/** 材质固定色（不随毛色变化），供模板内联 SVG 直接引用。 */
const CLAW = MAT.claw
const EAR_INNER = MAT.earInner
const EYE = MAT.eye
const EYE_SHINE = MAT.eyeShine
const GRIP = MAT.grip
const LAMP_CASE = MAT.lampCase
const LAMP_CASE_LIGHT = MAT.lampCaseLight
const LAMP_GLASS = MAT.lampGlass
const LAMP_CORE = MAT.lampCore
const METAL = MAT.metal
const METAL_LIGHT = MAT.metalLight
const METAL_DARK = MAT.metalDark
const NOSE_COLOR = MAT.nose
const NOSE_LIGHT = MAT.noseLight
const STRAP = MAT.strap
const STRAP_LIGHT = MAT.strapLight
const WHISKER = MAT.whisker
const WOOD = MAT.wood
const WOOD_LIGHT = MAT.woodLight
const WOOD_DARK = MAT.woodDark

/** 相位变量（负延迟，入场即在动作中）。 */
const phaseStyle = computed(() => ({ '--phase': `-${props.delay ?? 0}s` }))
</script>

<template>
  <div
    class="critter"
    :class="{ 'critter--flip': flip, 'is-digging': digging !== false }"
    :style="phaseStyle"
  >
    <!-- 直起腰擦汗（宏周期） -->
    <div class="critter__wipe">
      <!-- 埋头躬身发力（短周期） -->
      <div class="critter__body">
        <svg
          class="critter__svg"
          viewBox="0 0 32 24"
          width="36"
          height="27"
          shape-rendering="crispEdges"
          :aria-hidden="true"
        >
          <!-- 后脚（小碎步） -->
          <g class="critter-foot critter-foot--l">
            <rect x="6" y="20" width="5" height="4" :fill="colors.fur" />
            <rect x="6" y="23" width="5" height="1" :fill="colors.furDark" />
          </g>
          <g class="critter-foot critter-foot--r">
            <rect x="11" y="20" width="5" height="4" :fill="colors.fur" />
            <rect x="11" y="23" width="5" height="1" :fill="colors.furDark" />
          </g>

          <!-- 躯干 -->
          <g class="critter-torso">
            <rect x="7" y="12" width="8" height="2" :fill="colors.fur" />
            <rect x="6" y="13" width="10" height="7" :fill="colors.fur" />
            <rect x="6" y="13" width="1" height="7" :fill="colors.furLight" />
            <rect x="15" y="13" width="1" height="7" :fill="colors.furDark" />
            <rect x="8" y="15" width="6" height="5" :fill="colors.belly" />
            <rect x="8" y="20" width="6" height="1" :fill="colors.bellyDark" />
          </g>

          <!-- 左爪（撑地扒土；擦汗时隐藏，换成抬起擦汗的那只） -->
          <g class="critter-paw critter-paw--l">
            <rect x="3" y="13" width="3" height="7" :fill="colors.fur" />
            <rect x="3" y="13" width="1" height="7" :fill="colors.furLight" />
            <rect x="3" y="20" width="1" height="1" :fill="CLAW" />
            <rect x="4" y="20" width="1" height="1" :fill="CLAW" />
            <rect x="5" y="20" width="1" height="1" :fill="CLAW" />
          </g>

          <!-- 头：外层负责擦汗时抬头，内层负责埋头点动 -->
          <g class="critter-head-lift">
            <g class="critter-head">
              <!-- 耳朵（抖动） -->
              <g class="critter-ear critter-ear--l">
                <rect x="3" y="2" width="3" height="5" :fill="colors.fur" />
                <rect x="3" y="2" width="1" height="5" :fill="colors.furDark" />
                <rect x="4" y="3" width="1" height="3" :fill="EAR_INNER" />
              </g>
              <g class="critter-ear critter-ear--r">
                <rect x="16" y="2" width="3" height="5" :fill="colors.fur" />
                <rect x="18" y="2" width="1" height="5" :fill="colors.furDark" />
                <rect x="17" y="3" width="1" height="3" :fill="EAR_INNER" />
              </g>

              <!-- 脑袋 -->
              <rect x="7" y="3" width="8" height="10" :fill="colors.fur" />
              <rect x="6" y="4" width="10" height="9" :fill="colors.fur" />
              <rect x="5" y="6" width="12" height="7" :fill="colors.fur" />
              <rect x="5" y="6" width="1" height="7" :fill="colors.furLight" />
              <rect x="16" y="6" width="1" height="7" :fill="colors.furDark" />

              <!-- 头灯带 -->
              <rect x="5" y="5" width="12" height="2" :fill="STRAP" />
              <rect x="5" y="5" width="12" height="1" :fill="STRAP_LIGHT" />
              <!-- 头灯（闪烁） -->
              <g class="critter-lamp">
                <rect x="9" y="3" width="4" height="4" :fill="LAMP_CASE" />
                <rect x="9" y="3" width="4" height="1" :fill="LAMP_CASE_LIGHT" />
                <rect x="10" y="4" width="2" height="2" :fill="LAMP_GLASS" />
                <rect x="10" y="4" width="1" height="1" :fill="LAMP_CORE" />
              </g>

              <!-- 眼睛（眨眼） -->
              <g class="critter-eyes">
                <rect x="7" y="8" width="2" height="2" :fill="EYE" />
                <rect x="13" y="8" width="2" height="2" :fill="EYE" />
                <rect x="7" y="8" width="1" height="1" :fill="EYE_SHINE" />
                <rect x="13" y="8" width="1" height="1" :fill="EYE_SHINE" />
              </g>

              <!-- 口鼻（鼻子抽动） -->
              <rect x="9" y="10" width="4" height="3" :fill="colors.belly" />
              <rect x="6" y="11" width="2" height="1" :fill="WHISKER" />
              <rect x="14" y="11" width="2" height="1" :fill="WHISKER" />
              <g class="critter-nose">
                <rect x="10" y="10" width="2" height="2" :fill="NOSE_COLOR" />
                <rect x="10" y="10" width="1" height="1" :fill="NOSE_LIGHT" />
              </g>
            </g>
          </g>

          <!-- 擦汗的左爪（只在擦汗窗口出现，横过额头来回擦） -->
          <g class="critter-wipe-arm">
            <rect x="3" y="9" width="2" height="5" :fill="colors.fur" />
            <rect x="3" y="9" width="1" height="5" :fill="colors.furLight" />
            <rect x="4" y="7" width="4" height="2" :fill="colors.fur" />
            <rect x="4" y="7" width="4" height="1" :fill="colors.furLight" />
            <rect x="6" y="5" width="2" height="3" :fill="colors.fur" />
            <rect x="6" y="5" width="2" height="1" :fill="CLAW" />
          </g>

          <!-- 右爪（握住镐柄，随挥镐小幅使力） -->
          <g class="critter-paw critter-paw--r">
            <rect x="16" y="13" width="3" height="7" :fill="colors.fur" />
            <rect x="18" y="13" width="1" height="7" :fill="colors.furDark" />
            <rect x="16" y="20" width="1" height="1" :fill="CLAW" />
            <rect x="17" y="20" width="1" height="1" :fill="CLAW" />
            <rect x="18" y="20" width="1" height="1" :fill="CLAW" />
          </g>

          <!-- 镐子·拄地（擦汗时才显示，静态姿态） -->
          <g class="critter-pick--rest" transform="rotate(150 19 13)">
            <rect x="18" y="4" width="2" height="10" :fill="WOOD" />
            <rect x="18" y="4" width="1" height="10" :fill="WOOD_LIGHT" />
            <rect x="19" y="4" width="1" height="10" :fill="WOOD_DARK" />
            <rect x="18" y="11" width="2" height="3" :fill="GRIP" />
            <rect x="16" y="1" width="6" height="1" :fill="METAL_LIGHT" />
            <rect x="16" y="2" width="6" height="1" :fill="METAL" />
            <rect x="16" y="3" width="1" height="1" :fill="METAL_DARK" />
            <rect x="21" y="3" width="1" height="1" :fill="METAL_DARK" />
            <rect x="18" y="1" width="2" height="3" :fill="LAMP_CASE" />
          </g>

          <!-- 镐子·挥动（埋头干活时显示） -->
          <g class="critter-pick--dig">
            <rect x="18" y="4" width="2" height="10" :fill="WOOD" />
            <rect x="18" y="4" width="1" height="10" :fill="WOOD_LIGHT" />
            <rect x="19" y="4" width="1" height="10" :fill="WOOD_DARK" />
            <rect x="18" y="11" width="2" height="3" :fill="GRIP" />
            <rect x="16" y="1" width="6" height="1" :fill="METAL_LIGHT" />
            <rect x="16" y="2" width="6" height="1" :fill="METAL" />
            <rect x="16" y="3" width="1" height="1" :fill="METAL_DARK" />
            <rect x="21" y="3" width="1" height="1" :fill="METAL_DARK" />
            <rect x="18" y="1" width="2" height="3" :fill="LAMP_CASE" />
          </g>
        </svg>
      </div>
    </div>

    <!-- 头灯暖光 -->
    <span class="critter__glow"></span>
    <!-- 镐头砸地的整套迸土特效（擦汗时整体隐藏） -->
    <span class="critter__debris">
      <span class="critter__puff"></span>
      <span class="critter__spark"></span>
      <span class="critter__dust critter__dust--1"></span>
      <span class="critter__dust critter__dust--2"></span>
      <span class="critter__dust critter__dust--3"></span>
      <span class="critter__dust critter__dust--4"></span>
      <span class="critter__dust critter__dust--5"></span>
      <span class="critter__dust critter__dust--6"></span>
    </span>
    <!-- 擦汗时甩出的汗珠 -->
    <span class="critter__sweat"></span>
  </div>
</template>

<style scoped>
.critter {
  /* 一次挥镐的时长 */
  --dig: 1.15s;
  /*
   * 宏周期 = 6 次挥镐后擦一次汗（= --dig × 6）。
   * 必须写成字面量：calc(var(--dig) * 6) 这种"嵌套 var 的 calc"用在 animation 简写里，
   * 浏览器在 computed-value time 替换失败时会丢弃整条 animation 声明，
   * 导致同一条声明里的所有动画（挥镐、擦汗、抬头…）全部失效。
   */
  --cycle: 6.9s;
  position: relative;
  width: 36px;
  height: 27px;
}
/* 镜像翻转：放在根元素，避免与各处 transform 冲突 */
.critter--flip {
  transform: scaleX(-1);
}
.critter__wipe,
.critter__body {
  position: absolute;
  inset: 0;
  transform-origin: 50% 100%;
}
.critter__svg g {
  transform-box: view-box;
}

/* ── 直起腰擦汗（宏周期末段） ── */
.critter.is-digging .critter__wipe {
  animation: c-wipe-up var(--cycle) ease-in-out infinite;
  animation-delay: var(--phase);
}
@keyframes c-wipe-up {
  0%, 83%, 100% { transform: translateY(0) rotate(0deg); }
  86% { transform: translateY(-3px) rotate(-3deg); }
  89% { transform: translateY(-3px) rotate(2deg); }
  92% { transform: translateY(-3px) rotate(-2deg); }
  96% { transform: translateY(-2px) rotate(0deg); }
}

/* ── 埋头躬身：全程保持低头含胸，砸下时压得更低 ── */
.critter.is-digging .critter__body {
  animation: c-body var(--dig) steps(4, end) infinite;
  animation-delay: var(--phase);
}
@keyframes c-body {
  0%, 30% { transform: translateY(2px) scaleY(0.94); }
  36% { transform: translateY(4px) scaleY(0.88); }
  40% { transform: translateY(3px) scaleY(0.91); }
  52% { transform: translateY(0) scaleY(0.98); }
  100% { transform: translateY(2px) scaleY(0.94); }
}

/* ── 后脚小碎步 ── */
.critter.is-digging .critter-foot--l {
  animation: c-foot-l var(--dig) steps(2, end) infinite;
  animation-delay: var(--phase);
}
.critter.is-digging .critter-foot--r {
  animation: c-foot-r var(--dig) steps(2, end) infinite;
  animation-delay: var(--phase);
}
/* 砸地那一下后脚蹬地踩实，拔镐时松开 */
@keyframes c-foot-l {
  0%, 30%, 100% { transform: translateX(0); }
  36% { transform: translateX(-1px); }
  60% { transform: translateX(0); }
}
@keyframes c-foot-r {
  0%, 30%, 100% { transform: translateX(0); }
  36% { transform: translateX(1px); }
  60% { transform: translateX(0); }
}

/* ── 左爪撑地扒土 ── */
.critter-paw--l {
  transform-origin: 4.5px 13px;
}
.critter.is-digging .critter-paw--l {
  animation-name: c-paw-l, c-hide-on-wipe;
  animation-duration: var(--dig), var(--cycle);
  animation-timing-function: steps(4, end), linear;
  animation-iteration-count: infinite;
  animation-delay: var(--phase);
}
@keyframes c-paw-l {
  0%, 30% { transform: rotate(-4deg) translateY(0); }
  36% { transform: rotate(6deg) translateY(2px); }
  40% { transform: rotate(4deg) translateY(1px); }
  52% { transform: rotate(-10deg) translateY(-1px); }
  100% { transform: rotate(-4deg) translateY(0); }
}

/* ── 右爪握镐柄，随挥镐小幅使力 ── */
.critter-paw--r {
  transform-origin: 17.5px 13px;
}
.critter.is-digging .critter-paw--r {
  animation: c-paw-r var(--dig) steps(4, end) infinite;
  animation-delay: var(--phase);
}
@keyframes c-paw-r {
  0%, 30% { transform: rotate(0deg) translateY(0); }
  36% { transform: rotate(7deg) translateY(2px); }
  40% { transform: rotate(5deg) translateY(1px); }
  52% { transform: rotate(-4deg) translateY(-1px); }
  100% { transform: rotate(0deg) translateY(0); }
}

/* ── 擦汗窗口：撑地的爪子收起，抬起的那只出现并来回擦 ── */
@keyframes c-hide-on-wipe {
  0%, 83% { opacity: 1; }
  84%, 96% { opacity: 0; }
  97%, 100% { opacity: 1; }
}
.critter-wipe-arm {
  transform-origin: 4px 14px;
  opacity: 0;
}
.critter.is-digging .critter-wipe-arm {
  animation: c-wipe-arm var(--cycle) linear infinite;
  animation-delay: var(--phase);
}
@keyframes c-wipe-arm {
  0%, 83% { opacity: 0; transform: translateX(0) rotate(0deg); }
  84% { opacity: 1; transform: translateX(0) rotate(0deg); }
  87% { opacity: 1; transform: translateX(-2px) rotate(-6deg); }
  90% { opacity: 1; transform: translateX(2px) rotate(6deg); }
  93% { opacity: 1; transform: translateX(-2px) rotate(-6deg); }
  96% { opacity: 1; transform: translateX(0) rotate(0deg); }
  97%, 100% { opacity: 0; transform: translateX(0) rotate(0deg); }
}

/* ── 小镐子：举起 → 砸下（绕握把旋转，全程在身体右侧） ── */
.critter-pick--dig {
  transform-origin: 19px 13px;
  opacity: 1;
}
.critter-pick--rest {
  opacity: 0;
}
.critter.is-digging .critter-pick--dig {
  animation-name: c-pick, c-hide-on-wipe;
  animation-duration: var(--dig), var(--cycle);
  animation-timing-function: steps(4, end), linear;
  animation-iteration-count: infinite;
  animation-delay: var(--phase);
}
.critter.is-digging .critter-pick--rest {
  animation: c-show-on-wipe var(--cycle) linear infinite;
  animation-delay: var(--phase);
}
/* 慢举起 → 猛砸下（30%~36% 只占 6% 时长，"唰"地砸下去）→ 磕进石头 → 拔起 */
@keyframes c-pick {
  0%, 100% { transform: rotate(38deg); }
  30% { transform: rotate(72deg); }
  36% { transform: rotate(135deg); }
  40% { transform: rotate(127deg); }
  52% { transform: rotate(95deg); }
}
@keyframes c-show-on-wipe {
  0%, 83% { opacity: 0; }
  84%, 96% { opacity: 1; }
  97%, 100% { opacity: 0; }
}

/* ── 头：内层埋头点动，外层擦汗时抬头 ── */
.critter-head {
  transform-origin: 11px 13px;
}
.critter.is-digging .critter-head {
  animation: c-head var(--dig) steps(4, end) infinite;
  animation-delay: var(--phase);
}
@keyframes c-head {
  0%, 30% { transform: translateY(2px); }
  36% { transform: translateY(4px); }
  40% { transform: translateY(3px); }
  52% { transform: translateY(1px); }
  100% { transform: translateY(2px); }
}
.critter-head-lift {
  transform-origin: 11px 13px;
}
.critter.is-digging .critter-head-lift {
  animation: c-head-lift var(--cycle) ease-in-out infinite;
  animation-delay: var(--phase);
}
@keyframes c-head-lift {
  0%, 83%, 100% { transform: rotate(0deg) translateY(0); }
  86% { transform: rotate(-8deg) translateY(-3px); }
  92% { transform: rotate(-6deg) translateY(-3px); }
  96% { transform: rotate(-2deg) translateY(-1px); }
}

/* ── 耳朵抖动（不作业时也会动） ── */
.critter-ear--l {
  transform-origin: 4.5px 7px;
  animation: c-ear-l 2.7s steps(3, end) infinite;
  animation-delay: var(--phase);
}
.critter-ear--r {
  transform-origin: 17.5px 7px;
  animation: c-ear-r 2.7s steps(3, end) infinite;
  animation-delay: calc(var(--phase) - 0.35s);
}
@keyframes c-ear-l {
  0%, 78%, 100% { transform: rotate(0deg); }
  84% { transform: rotate(-18deg); }
  90% { transform: rotate(12deg); }
  96% { transform: rotate(-6deg); }
}
@keyframes c-ear-r {
  0%, 78%, 100% { transform: rotate(0deg); }
  84% { transform: rotate(18deg); }
  90% { transform: rotate(-12deg); }
  96% { transform: rotate(6deg); }
}

/* ── 眨眼 ── */
.critter-eyes {
  transform-origin: 11px 9px;
  animation: c-blink 4.6s steps(2, end) infinite;
  animation-delay: var(--phase);
}
@keyframes c-blink {
  0%, 90%, 100% { transform: scaleY(1); }
  93%, 96% { transform: scaleY(0.12); }
}

/* ── 鼻子抽动 ── */
.critter-nose {
  transform-origin: 11px 11px;
}
.critter.is-digging .critter-nose {
  animation: c-nose var(--dig) steps(3, end) infinite;
  animation-delay: var(--phase);
}
@keyframes c-nose {
  0%, 40%, 100% { transform: scale(1, 1); }
  46% { transform: scale(1.25, 0.8); }
  56% { transform: scale(0.9, 1.1); }
}

/* ── 头灯闪烁 + 暖光呼吸 ── */
.critter-lamp {
  animation: c-lamp 1.7s ease-in-out infinite;
  animation-delay: var(--phase);
}
@keyframes c-lamp {
  0%, 100% { opacity: 0.72; }
  50% { opacity: 1; }
}
.critter__glow {
  position: absolute;
  left: 7px;
  top: 0;
  width: 16px;
  height: 14px;
  background: radial-gradient(
    circle,
    rgba(255, 217, 122, 0.35) 0%,
    rgba(255, 200, 90, 0.12) 45%,
    transparent 70%
  );
  animation: c-glow 1.7s ease-in-out infinite;
  animation-delay: var(--phase);
  pointer-events: none;
}
@keyframes c-glow {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

/* ── 镐头砸地：尘土云 + 撞击星芒 + 扇形迸出的土石（抛物线落回地面） ── */
.critter__debris {
  position: absolute;
  inset: 0;
}
.critter.is-digging .critter__debris {
  animation: c-hide-on-wipe var(--cycle) linear infinite;
  animation-delay: var(--phase);
}
/* 尘土云：砸地瞬间从落点翻涌扩散 */
.critter__puff {
  position: absolute;
  left: 25px;
  bottom: 0;
  width: 14px;
  height: 9px;
  background: radial-gradient(
    ellipse at 50% 65%,
    rgba(168, 134, 82, 0.8) 0%,
    rgba(122, 94, 54, 0.4) 55%,
    transparent 78%
  );
  border-radius: 50%;
  transform-origin: 50% 85%;
  opacity: 0;
}
.critter.is-digging .critter__puff {
  animation: c-puff var(--dig) ease-out infinite;
  animation-delay: var(--phase);
}
@keyframes c-puff {
  0%, 30% { opacity: 0; transform: scale(0.2); }
  36% { opacity: 0.9; transform: scale(0.55); }
  54% { opacity: 0.5; transform: scale(1.15); }
  78% { opacity: 0.18; transform: scale(1.75); }
  100% { opacity: 0; transform: scale(2.1); }
}
/* 撞击星芒：镐头磕到石头的那一下 */
.critter__spark {
  position: absolute;
  left: 26px;
  bottom: 1px;
  width: 11px;
  height: 11px;
  background:
    linear-gradient(90deg, transparent 42%, #fff3c4 42% 58%, transparent 58%),
    linear-gradient(0deg, transparent 42%, #fff3c4 42% 58%, transparent 58%);
  transform-origin: 50% 50%;
  opacity: 0;
}
.critter.is-digging .critter__spark {
  animation: c-spark var(--dig) steps(3, end) infinite;
  animation-delay: var(--phase);
}
@keyframes c-spark {
  0%, 32% { opacity: 0; transform: scale(0.2) rotate(0deg); }
  35% { opacity: 1; transform: scale(1.1) rotate(0deg); }
  40% { opacity: 0.7; transform: scale(1.5) rotate(45deg); }
  52%, 100% { opacity: 0; transform: scale(1.9) rotate(45deg); }
}
/* 迸出的土块/碎石/煤屑 */
.critter__dust {
  position: absolute;
  left: 30px;
  bottom: 3px;
  border-radius: 50%;
  opacity: 0;
}
.critter__dust--1 {
  width: 5px;
  height: 5px;
  background: #8a6a3a;
}
.critter__dust--2 {
  width: 4px;
  height: 4px;
  background: #6b5a3a;
}
.critter__dust--3 {
  width: 4px;
  height: 4px;
  background: #a08050;
}
.critter__dust--4 {
  width: 3px;
  height: 3px;
  background: #b0a88a;
}
.critter__dust--5 {
  width: 4px;
  height: 3px;
  background: #3a3a3a;
}
.critter__dust--6 {
  width: 3px;
  height: 3px;
  background: #7a6a52;
}
.critter.is-digging .critter__dust--1 {
  animation: c-dust-1 var(--dig) linear infinite;
  animation-delay: var(--phase);
}
.critter.is-digging .critter__dust--2 {
  animation: c-dust-2 var(--dig) linear infinite;
  animation-delay: calc(var(--phase) + 0.03s);
}
.critter.is-digging .critter__dust--3 {
  animation: c-dust-3 var(--dig) linear infinite;
  animation-delay: calc(var(--phase) + 0.05s);
}
.critter.is-digging .critter__dust--4 {
  animation: c-dust-4 var(--dig) linear infinite;
  animation-delay: calc(var(--phase) + 0.04s);
}
.critter.is-digging .critter__dust--5 {
  animation: c-dust-5 var(--dig) linear infinite;
  animation-delay: calc(var(--phase) + 0.07s);
}
.critter.is-digging .critter__dust--6 {
  animation: c-dust-6 var(--dig) linear infinite;
  animation-delay: calc(var(--phase) + 0.06s);
}
/* 每颗都是"冲上去 → 落回地面"的抛物线 */
@keyframes c-dust-1 {
  0%, 30% { opacity: 0; transform: translate(0, 0) scale(0.3); }
  34% { opacity: 1; transform: translate(2px, -4px) scale(1); }
  50% { opacity: 1; transform: translate(8px, -12px) scale(1); }
  72% { opacity: 0.9; transform: translate(13px, -6px) scale(0.9); }
  100% { opacity: 0; transform: translate(16px, 4px) scale(0.7); }
}
@keyframes c-dust-2 {
  0%, 30% { opacity: 0; transform: translate(0, 0) scale(0.3); }
  34% { opacity: 1; transform: translate(1px, -3px) scale(0.9); }
  50% { opacity: 1; transform: translate(6px, -10px) scale(0.9); }
  72% { opacity: 0.85; transform: translate(10px, -3px) scale(0.8); }
  100% { opacity: 0; transform: translate(13px, 4px) scale(0.6); }
}
@keyframes c-dust-3 {
  0%, 30% { opacity: 0; transform: translate(0, 0) scale(0.3); }
  34% { opacity: 1; transform: translate(0, -4px) scale(0.9); }
  50% { opacity: 1; transform: translate(3px, -11px) scale(0.9); }
  72% { opacity: 0.85; transform: translate(5px, -4px) scale(0.8); }
  100% { opacity: 0; transform: translate(7px, 4px) scale(0.6); }
}
@keyframes c-dust-4 {
  0%, 30% { opacity: 0; transform: translate(0, 0) scale(0.3); }
  34% { opacity: 1; transform: translate(-2px, -3px) scale(0.8); }
  50% { opacity: 1; transform: translate(-5px, -9px) scale(0.8); }
  72% { opacity: 0.8; transform: translate(-8px, -3px) scale(0.7); }
  100% { opacity: 0; transform: translate(-11px, 4px) scale(0.5); }
}
@keyframes c-dust-5 {
  0%, 30% { opacity: 0; transform: translate(0, 0) scale(0.3); }
  34% { opacity: 1; transform: translate(3px, -1px) scale(0.8); }
  52% { opacity: 0.9; transform: translate(9px, -3px) scale(0.8); }
  75% { opacity: 0.7; transform: translate(14px, 0) scale(0.7); }
  100% { opacity: 0; transform: translate(18px, 4px) scale(0.5); }
}
@keyframes c-dust-6 {
  0%, 30% { opacity: 0; transform: translate(0, 0) scale(0.3); }
  34% { opacity: 1; transform: translate(-2px, -1px) scale(0.7); }
  52% { opacity: 0.85; transform: translate(-6px, -2px) scale(0.7); }
  75% { opacity: 0.6; transform: translate(-10px, 1px) scale(0.6); }
  100% { opacity: 0; transform: translate(-13px, 4px) scale(0.5); }
}

/* ── 擦汗时甩出的汗珠 ── */
.critter__sweat {
  position: absolute;
  left: 10px;
  top: 4px;
  width: 3px;
  height: 4px;
  background: #9fd8ff;
  border-radius: 50% 50% 50% 0;
  opacity: 0;
}
.critter.is-digging .critter__sweat {
  animation: c-sweat var(--cycle) ease-out infinite;
  animation-delay: var(--phase);
}
@keyframes c-sweat {
  0%, 85% { opacity: 0; transform: translate(0, 0) rotate(45deg); }
  88% { opacity: 1; transform: translate(-1px, -2px) rotate(45deg); }
  94% { opacity: 1; transform: translate(-5px, -5px) rotate(45deg); }
  100% { opacity: 0; transform: translate(-8px, -7px) rotate(45deg); }
}
</style>
