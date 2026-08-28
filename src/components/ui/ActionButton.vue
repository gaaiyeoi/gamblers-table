<script setup lang="ts">
/**
 * 可反馈按钮：所有玩家操作统一走它，保证「点了有反馈、点不了能说清原因」。
 * - 可用：先按 sound 播一声专属音效，再触发 click（成功/失败的结果音由业务层补）。
 * - 禁用：内层按钮不吃指针事件，点击落在外层容器上，
 *   于是即使按钮点不动，也能把「为什么不能点」写进事件流并弹出提示；悬停同样展示原因。
 * - 声音：通过 sound 属性声明语义名（见 useSound 的 ButtonSound），不同按钮不同音色。
 */
import { computed } from 'vue'

import { useSound, type ButtonSound } from '../../composables/useSound'
import { i18n } from '../../i18n'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore } from '../../stores/uiStore'
import GtButton from './GtButton.vue'
import Tooltip from './Tooltip.vue'

type ActionType = 'success' | 'primary' | 'warning' | 'danger' | 'base' | 'ghost'
type ActionSize = 'large' | 'default' | 'small'
type Placement = 'top' | 'bottom' | 'left' | 'right'

const props = withDefaults(
  defineProps<{
    /** 按钮主题色，透传给 GtButton。 */
    type?: ActionType
    /** 按钮尺寸。 */
    size?: ActionSize
    /** 是否禁用（外部状态，如资源不够）。 */
    disabled?: boolean
    /** 禁用原因；为空则静默拦截不提示。 */
    reason?: string
    /** 原因气泡的方位。 */
    placement?: Placement
    /** 无障碍标签。 */
    ariaLabel?: string
    /** 点击音效的语义名。 */
    sound?: ButtonSound
  }>(),
  {
    size: 'default',
    disabled: false,
    reason: '',
    placement: 'top',
    ariaLabel: undefined,
    sound: 'click',
  },
)

const emit = defineEmits<{ click: [] }>()

const game = useGameStore()
const ui = useUiStore()
const { play, playError } = useSound()

/** 禁用态气泡标题。 */
const blockedTitle = computed(() => (props.disabled ? i18n.global.t('ui.blockedTitle') : ''))

function onClick(): void {
  if (props.disabled) {
    if (props.reason === '') return
    playError()
    game.addEvent(props.reason, 'warn')
    ui.pushToast(props.reason, 'warn')
    return
  }
  play(props.sound)
  emit('click')
}
</script>

<template>
  <Tooltip
    :content="reason"
    :title="blockedTitle"
    :disabled="!disabled || reason === ''"
    :placement="placement"
  >
    <span class="action-btn" :class="{ 'action-btn--blocked': disabled }" @click="onClick">
      <GtButton
        :type="type"
        :size="size"
        :disabled="disabled"
        :aria-label="ariaLabel"
      >
        <slot />
      </GtButton>
    </span>
  </Tooltip>
</template>

<style scoped>
.action-btn {
  display: inline-flex;
}

.action-btn--blocked {
  cursor: not-allowed;
}

/* 禁用按钮不吃指针事件 → 点击落到外层容器，从而在禁用态也能解释原因 */
.action-btn:deep(button:disabled) {
  pointer-events: none;
}
</style>
