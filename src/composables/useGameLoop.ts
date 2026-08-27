import { onBeforeUnmount, onMounted } from 'vue'

import { useGameStore } from '../stores/gameStore'

/**
 * 生命周期组合函数：组件挂载时初始化游戏并启动主循环，
 * 卸载时保存一次（保证切页/刷新不丢进度）。
 */
export function useGameLoop(): void {
  const store = useGameStore()

  onMounted(() => {
    void store.init()
  })

  onBeforeUnmount(() => {
    void store.saveNow()
  })
}
