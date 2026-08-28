<script setup lang="ts">
import GtCard from '../components/ui/GtCard.vue'
import MiningScene from '../components/mining/MiningScene.vue'
import MiningAssets from './tabs/MiningAssets.vue'
</script>

<template>
  <div class="game-view">
    <!-- ── 中央桌布（占满主区）：矿洞采矿展示窗口 ── -->
    <div class="table-wrap">
      <GtCard dark class="table-outer">
        <template #header>
          <p class="title table-title">⛏ 矿洞</p>
        </template>
        <div class="felt-table">
          <!-- 矿洞采矿场景（小动物军团自动刨土，纯展示） -->
          <MiningScene />
        </div>
      </GtCard>
    </div>

    <!-- ── 采矿资源资产面板：位于桌布正下方 ── -->
    <section class="table-assets">
      <MiningAssets />
    </section>
  </div>
</template>

<style scoped>
.game-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
}

/* ── 台面外层：矿场为装饰，占适中比例 ── */
.table-wrap {
  flex-shrink: 0;
  max-height: calc(340px * var(--ui-scale));
  min-height: calc(200px * var(--ui-scale));
  padding: var(--sp-4) var(--sp-4) var(--sp-3);
  overflow: hidden;
  display: flex;
}

/* ── 资产面板：可交互主体，占大比例、可滚动 ── */
.table-assets {
  flex: 1 1 0;
  min-height: 0;
  padding: 0 var(--sp-4) var(--sp-4);
  overflow-y: auto;
  overflow-x: hidden;
}

/* GtCard 撑满外层容器，body 区用 flex 填充 */
.table-outer {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 100%;
}

.table-outer :deep(.gt-card__body) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: var(--sp-2);
}

.table-title {
  color: var(--gold-400);
  font-size: var(--fs-md);
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin: 0;
}

/* ── 矿洞桌布（装饰，小占比） ── */
.felt-table {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: #140d05;
  border: 3px solid #0f0a04;
  box-shadow:
    inset 0 0 0 3px #2a1c0c,
    6px 6px 0 #0a0703;
  image-rendering: pixelated;
}
</style>
