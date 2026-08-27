<script setup lang="ts">
import { PxButton } from '@mmt817/pixel-ui'
</script>

<template>
  <div class="topbar-wrap">
    <header class="topbar">
      <!-- LOGO -->
      <div class="topbar__logo">
        <span class="logo-px">■</span>
        <span class="logo-text pixel-number">像素赌桌</span>
        <span class="logo-sub pixel-number">GAMBLERS TABLE</span>
      </div>

      <!-- 右侧操作 -->
      <div class="topbar__right">
        <PxButton>▣</PxButton>
        <PxButton type="primary">≡ 菜单</PxButton>
      </div>
    </header>
  </div>
</template>

<style scoped>
.topbar-wrap {
  flex-shrink: 0;
  background: var(--app-bg);
  border-bottom: 4px solid #212121;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  min-height: 56px;
}

.topbar__logo {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-right: 8px;
}

.logo-px {
  color: #c03000;
  font-size: 16px;
  line-height: 1;
}

.logo-text {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
}

.logo-sub {
  color: var(--text-dim);
  font-size: 16px;
  letter-spacing: 1px;
  white-space: nowrap;
}

/* 右侧按钮 */
.topbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
}
</style>
