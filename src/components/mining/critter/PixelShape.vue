<script setup lang="ts">
/**
 * 把一个「逐行宽度表」形体渲染成三层 path：外描边 → 本体 → 顶部高光。
 * 三层共用同一份几何数据，所以改形状只需改 critterModel 里的那张表。
 */
import { computed } from 'vue'

import { outlineOf, shapeToPath, topRows, type Shape } from './critterModel'

const props = defineProps<{
  /** 形体几何。 */
  shape: Shape
  /** 本体填充（纯色或 url(#渐变)）。 */
  fill: string
  /** 描边色；不给则不描边。 */
  outline?: string
  /** 顶部高光的行数；不给则不画高光。 */
  highlight?: number
}>()

const outlinePath = computed(() => (props.outline ? shapeToPath(outlineOf(props.shape)) : ''))
const bodyPath = computed(() => shapeToPath(props.shape))
const highlightPath = computed(() =>
  props.highlight ? shapeToPath(topRows(props.shape, props.highlight)) : '',
)
</script>

<template>
  <g>
    <path v-if="outlinePath" :d="outlinePath" :fill="outline" />
    <path :d="bodyPath" :fill="fill" />
    <path v-if="highlightPath" :d="highlightPath" fill="#ffffff" fill-opacity="0.16" />
  </g>
</template>
