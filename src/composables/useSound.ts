import { ref } from 'vue'

const SOUND_KEY = 'gamblers_sound'
const VOLUME_KEY = 'gamblers_volume'

/** 是否静音（模块级共享，所有 useSound() 实例响应式联动）。 */
const muted = ref(false)
/** 音量 0..1。 */
const volume = ref(1)

function readPrefs(): void {
  try {
    muted.value = localStorage.getItem(SOUND_KEY) === '1'
    const v = Number.parseFloat(localStorage.getItem(VOLUME_KEY) ?? '1')
    volume.value = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1
  } catch {
    // 忽略 localStorage 不可用
  }
}
readPrefs()

function persistMuted(): void {
  try {
    localStorage.setItem(SOUND_KEY, muted.value ? '1' : '0')
  } catch {
    // 忽略
  }
}

function persistVolume(): void {
  try {
    localStorage.setItem(VOLUME_KEY, String(volume.value))
  } catch {
    // 忽略
  }
}

/**
 * 轻量像素风音效引擎（Web Audio API 合成，无需音频资源）。
 *
 * 采用「单例 AudioContext + master 增益」：context 仅在首次播放时创建并长期复用，
 * 避免浏览器对频繁创建/销毁 context 的节流与 suspended 状态导致的"没声音"问题；
 * 播放前统一 resume，兼容自动播放策略。
 *
 * 合成元素：方波/三角波/锯齿波音色、频率滑音（pitch bend）、噪声打击、低音铺垫，
 * 提供更有"爽感"的操作反馈。
 */

/** 单个音符的参数。 */
interface ToneOpts {
  /** 起始频率（Hz）。 */
  freq: number
  /** 持续时间（秒）。 */
  dur: number
  /** 波形类型。 */
  type?: OscillatorType
  /** 相对音量增益。 */
  gain?: number
  /** 相对当前时刻的延迟（秒），用于制造琶音/连击的先后感。 */
  when?: number
  /** 滑音目标频率；不同则产生上滑/下滑效果。 */
  slideTo?: number
  /** 低通滤波截止频率（可选，让音色更柔和）。 */
  filterFreq?: number
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext
  if (!Ctx) return null
  if (ctx === null) {
    ctx = new Ctx()
    master = ctx.createGain()
    master.gain.value = 1
    master.connect(ctx.destination)
  }
  applyMaster()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** 将静音状态同步到 master 增益，提供「硬件级」静音兜底，避免遗漏任何播放路径。 */
function applyMaster(): void {
  if (master !== null) {
    master.gain.value = muted.value ? 0 : 1
  }
}

/** 复用的白噪声 buffer（用于打击感）。 */
function ensureNoise(c: AudioContext): AudioBuffer {
  if (noiseBuffer !== null) return noiseBuffer
  const length = Math.floor(c.sampleRate * 0.5)
  const buffer = c.createBuffer(1, length, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1
  }
  noiseBuffer = buffer
  return buffer
}

/** 播放一个带包络（快起音 + 指数衰减）与可选滑音的音符。 */
function tone(opts: ToneOpts): void {
  if (muted.value || volume.value <= 0) return
  const c = ensureCtx()
  if (!c || master === null) return
  const {
    freq,
    dur,
    type = 'square',
    gain = 0.06,
    when = 0,
    slideTo,
    filterFreq,
  } = opts
  const t0 = c.currentTime + when

  const osc = c.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo !== undefined && slideTo !== freq) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  }

  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain * volume.value, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

  if (filterFreq !== undefined) {
    const filt = c.createBiquadFilter()
    filt.type = 'lowpass'
    filt.frequency.setValueAtTime(filterFreq, t0)
    osc.connect(filt)
    filt.connect(g)
  } else {
    osc.connect(g)
  }
  g.connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

/** 播放一段短促噪声，模拟"咔/嗒"的打击感。 */
function noiseShot(when = 0, gain = 0.03, dur = 0.03, filterFreq = 6000): void {
  if (muted.value || volume.value <= 0) return
  const c = ensureCtx()
  if (!c || master === null) return
  const t0 = c.currentTime + when
  const src = c.createBufferSource()
  src.buffer = ensureNoise(c)

  const filt = c.createBiquadFilter()
  filt.type = 'lowpass'
  filt.frequency.value = filterFreq

  const g = c.createGain()
  g.gain.setValueAtTime(gain * volume.value, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

  src.connect(filt)
  filt.connect(g)
  g.connect(master)
  src.start(t0)
  src.stop(t0 + dur + 0.02)
}

/**
 * 按钮音效名：一个语义一个音色。
 * 按钮只需声明 `sound="buy"`，由 useSound().play() 统一分发，避免组件里堆 if/switch。
 */
export type ButtonSound =
  | 'click'
  | 'tab'
  | 'open'
  | 'close'
  | 'navUp'
  | 'navDown'
  | 'select'
  | 'place'
  | 'remove'
  | 'craft'
  | 'buy'
  | 'upgrade'
  | 'enhance'
  | 'prestige'
  | 'toggleOn'
  | 'toggleOff'
  | 'danger'
  | 'tick'
  | 'error'

/** useSound() 暴露的 API。 */
export interface SoundApi {
  /** 静音状态（模块级共享，所有实例联动）。 */
  muted: typeof muted
  /** 音量 0..1。 */
  volume: typeof volume
  /** 切换静音，返回切换后的状态。 */
  toggleMuted: () => boolean
  /** 直接设置静音状态。 */
  setMuted: (m: boolean) => void
  /** 设置音量，自动夹到 0..1。 */
  setVolume: (v: number) => void
  /** 按语义名播放音效（按钮统一入口）。 */
  play: (name: ButtonSound) => void
  playClick: () => void
  playFlip: () => void
  playBuy: () => void
  playError: () => void
  playPrestige: () => void
  playUpgrade: () => void
  playToggle: (on: boolean) => void
}

export function useSound(): SoundApi {
  function toggleMuted(): boolean {
    muted.value = !muted.value
    persistMuted()
    applyMaster()
    return muted.value
  }

  function setMuted(m: boolean): void {
    muted.value = m
    persistMuted()
    applyMaster()
  }

  function setVolume(v: number): void {
    volume.value = Math.min(1, Math.max(0, v))
    persistVolume()
  }

  /** 菜单/设置点击：极短促的"嗒"。 */
  function playClick(): void {
    tone({ freq: 720, dur: 0.04, type: 'square', gain: 0.03 })
    noiseShot(0, 0.02, 0.02, 5000)
  }

  /** 硬币翻转：清脆双"叮" + 清脆打击。 */
  function playFlip(): void {
    noiseShot(0, 0.025, 0.025, 9000)
    tone({ freq: 987, dur: 0.09, type: 'square', gain: 0.045, slideTo: 1245 })
    tone({ freq: 1319, dur: 0.13, type: 'square', gain: 0.04, when: 0.05, slideTo: 1568 })
  }

  /** 购买/雇佣：上升滑音"叮~"。 */
  function playBuy(): void {
    tone({ freq: 659, dur: 0.12, type: 'triangle', gain: 0.06, slideTo: 988 })
    tone({ freq: 1320, dur: 0.1, type: 'sine', gain: 0.03, when: 0.04 })
    noiseShot(0, 0.02, 0.02, 4000)
  }

  /** 错误：下行滑音蜂鸣。 */
  function playError(): void {
    tone({ freq: 340, dur: 0.18, type: 'sawtooth', gain: 0.055, slideTo: 150, filterFreq: 1600 })
  }

  /** 转生：号角式上行分解和弦 + 低音铺垫。 */
  function playPrestige(): void {
    tone({ freq: 262, dur: 0.42, type: 'triangle', gain: 0.07, filterFreq: 800 })
    tone({ freq: 523, dur: 0.14, type: 'square', gain: 0.045 })
    tone({ freq: 659, dur: 0.14, type: 'square', gain: 0.045, when: 0.1 })
    tone({ freq: 784, dur: 0.16, type: 'square', gain: 0.045, when: 0.2 })
    tone({ freq: 1047, dur: 0.3, type: 'square', gain: 0.055, when: 0.3, slideTo: 1568 })
  }

  /** 强化/升级：上扬"嗖~叮"。 */
  function playUpgrade(): void {
    noiseShot(0, 0.02, 0.02, 6000)
    tone({ freq: 440, dur: 0.12, type: 'square', gain: 0.05, slideTo: 880 })
    tone({ freq: 1760, dur: 0.12, type: 'sine', gain: 0.035, when: 0.08 })
  }

  /** 开关切换：开启上扬 / 关闭下扬。 */
  function playToggle(on: boolean): void {
    if (on) {
      tone({ freq: 520, dur: 0.09, type: 'square', gain: 0.045, slideTo: 780 })
    } else {
      tone({ freq: 780, dur: 0.09, type: 'square', gain: 0.045, slideTo: 520 })
    }
    noiseShot(0, 0.015, 0.02, 4000)
  }

  /** 面板 Tab 切换：两声短促上行。 */
  function playTab(): void {
    tone({ freq: 520, dur: 0.05, type: 'square', gain: 0.03 })
    tone({ freq: 784, dur: 0.06, type: 'square', gain: 0.032, when: 0.045 })
  }

  /** 打开面板/弹窗：柔和上行两音。 */
  function playOpen(): void {
    tone({ freq: 523, dur: 0.09, type: 'triangle', gain: 0.045 })
    tone({ freq: 784, dur: 0.12, type: 'triangle', gain: 0.04, when: 0.06 })
  }

  /** 关闭面板/弹窗：柔和下行两音。 */
  function playClose(): void {
    tone({ freq: 784, dur: 0.09, type: 'triangle', gain: 0.045 })
    tone({ freq: 523, dur: 0.12, type: 'triangle', gain: 0.04, when: 0.06 })
  }

  /** 向上/回退：上滑音。 */
  function playNavUp(): void {
    tone({ freq: 440, dur: 0.12, type: 'square', gain: 0.045, slideTo: 880 })
    noiseShot(0, 0.015, 0.02, 4000)
  }

  /** 向下/深入：下滑音。 */
  function playNavDown(): void {
    tone({ freq: 880, dur: 0.12, type: 'square', gain: 0.045, slideTo: 440 })
    noiseShot(0, 0.015, 0.02, 4000)
  }

  /** 选中（锭型 / 信标类型）：清脆单音。 */
  function playSelect(): void {
    tone({ freq: 1046, dur: 0.07, type: 'sine', gain: 0.045 })
    tone({ freq: 1568, dur: 0.05, type: 'sine', gain: 0.02, when: 0.03 })
  }

  /** 放入槽位 / 投料：闷"咚" + 咔。 */
  function playPlace(): void {
    tone({ freq: 196, dur: 0.1, type: 'triangle', gain: 0.06, filterFreq: 900 })
    noiseShot(0, 0.03, 0.04, 1600)
  }

  /** 移除槽位：短促下行。 */
  function playRemove(): void {
    tone({ freq: 520, dur: 0.09, type: 'sawtooth', gain: 0.04, slideTo: 300, filterFreq: 2200 })
    noiseShot(0, 0.02, 0.02, 3000)
  }

  /** 锻造：两记锤击 + 金属余音（结果音由业务层再补一声成功/失败）。 */
  function playCraft(): void {
    noiseShot(0, 0.05, 0.05, 2200)
    tone({ freq: 1200, dur: 0.1, type: 'triangle', gain: 0.045, when: 0.01 })
    noiseShot(0.09, 0.035, 0.04, 1800)
    tone({ freq: 900, dur: 0.12, type: 'triangle', gain: 0.035, when: 0.1 })
  }

  /** 锭增强：闪亮分解和弦 + 高频火花。 */
  function playEnhance(): void {
    tone({ freq: 784, dur: 0.1, type: 'triangle', gain: 0.045 })
    tone({ freq: 1046, dur: 0.1, type: 'triangle', gain: 0.04, when: 0.06 })
    tone({ freq: 1318, dur: 0.12, type: 'triangle', gain: 0.04, when: 0.12 })
    tone({ freq: 2093, dur: 0.14, type: 'sine', gain: 0.025, when: 0.18 })
  }

  /** 危险操作（重置存档）：低沉双击警告。 */
  function playDanger(): void {
    tone({ freq: 180, dur: 0.12, type: 'sawtooth', gain: 0.06, filterFreq: 800 })
    tone({ freq: 180, dur: 0.14, type: 'sawtooth', gain: 0.06, when: 0.16, filterFreq: 800 })
  }

  /** 滑杆 / 微调：极轻的一声"嘀"。 */
  function playTick(): void {
    tone({ freq: 1200, dur: 0.025, type: 'square', gain: 0.022 })
  }

  /** 音效分发表：语义名 → 播放函数。 */
  const table: Record<ButtonSound, () => void> = {
    click: playClick,
    tab: playTab,
    open: playOpen,
    close: playClose,
    navUp: playNavUp,
    navDown: playNavDown,
    select: playSelect,
    place: playPlace,
    remove: playRemove,
    craft: playCraft,
    buy: playBuy,
    upgrade: playUpgrade,
    enhance: playEnhance,
    prestige: playPrestige,
    toggleOn: () => playToggle(true),
    toggleOff: () => playToggle(false),
    danger: playDanger,
    tick: playTick,
    error: playError,
  }

  /** 按语义名播放音效。 */
  function play(name: ButtonSound): void {
    try {
      table[name]()
    } catch (err) {
      // 音效失败（如 AudioContext 受限/异常）不应影响业务逻辑
      console.warn('[useSound] play failed:', name, err)
    }
  }

  return {
    play,
    muted,
    volume,
    toggleMuted,
    setMuted,
    setVolume,
    playClick,
    playFlip,
    playBuy,
    playError,
    playPrestige,
    playUpgrade,
    playToggle,
  }
}
