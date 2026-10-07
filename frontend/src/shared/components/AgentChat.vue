<template>
  <DashboardPanel
    title="智能体问答"
    :icon="ChatDotRound"
    :class="['agent-chat-panel', { 'is-chat-collapsed': isCollapsed, 'is-chat-resizing': isResizing }]"
    :style="panelStyle"
  >
    <template #actions>
      <el-button
        link
        class="chat-panel-toggle"
        :aria-expanded="!isCollapsed"
        aria-controls="agent-chat-content"
        :aria-label="isCollapsed ? '展开智能体对话框' : '横向收起智能体对话框'"
        :title="isCollapsed ? '展开智能体对话框' : '横向收起智能体对话框'"
        @click="toggleCollapsed"
      >
        <el-icon><component :is="isCollapsed ? ArrowLeft : ArrowRight" /></el-icon>
        <span class="chat-toggle-label">{{ isCollapsed ? '展开' : '收起' }}</span>
      </el-button>
    </template>

    <div v-show="!isCollapsed" id="agent-chat-content" class="agent-chat-content">
      <div
        ref="resizeHandleRef"
        class="chat-horizontal-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-controls="agent-chat-content"
        aria-label="调整智能体对话框宽度"
        :aria-valuemin="MIN_CHAT_PANEL_WIDTH"
        :aria-valuemax="maxChatPanelWidth"
        :aria-valuenow="Math.round(chatPanelWidth)"
        :aria-valuetext="`智能体对话框宽度 ${Math.round(chatPanelWidth)} 像素`"
        tabindex="0"
        title="向左拖动以加宽，向右拖动以收窄；双击或按 Home 恢复默认宽度"
        @pointerdown="startResize"
        @pointermove="moveResize"
        @pointerup="finishResize"
        @pointercancel="cancelResize"
        @lostpointercapture="cancelResize"
        @dblclick="resetChatPanelWidth"
        @keydown="handleResizeKeydown"
      >
        <span aria-hidden="true"></span>
      </div>
      <div class="chat-body" aria-live="polite">
        <div v-if="messages.length === 0" class="chat-empty">
          <el-icon><Service /></el-icon>
          <span>基于当前业务上下文为你解答</span>
        </div>
        <article v-for="message in messages" :key="message.id" class="chat-message" :class="`message-${message.role}`">
          <div class="message-avatar"><el-icon><component :is="message.role === 'assistant' ? Service : UserFilled" /></el-icon></div>
          <div class="message-content">
            <p>{{ message.content }}</p>
            <time>{{ message.time }}</time>
          </div>
        </article>
        <div v-if="pending" class="chat-pending"><span></span><span></span><span></span> 正在结合当前数据分析…</div>
      </div>
      <form class="chat-compose" @submit.prevent="submit">
        <el-input v-model="draft" type="textarea" :rows="2" maxlength="240" resize="none" placeholder="输入与当前数据有关的问题…" />
        <el-button type="primary" native-type="submit" :disabled="!draft.trim() || pending" :loading="pending" aria-label="发送问题"><el-icon><Promotion /></el-icon></el-button>
      </form>
    </div>
  </DashboardPanel>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, ArrowRight, ChatDotRound, Promotion, Service, UserFilled } from '@element-plus/icons-vue'
import DashboardPanel from '@/components/dashboard/DashboardPanel.vue'
import type { AgentMessage } from '@/shared/types/agent'

defineProps<{ messages: AgentMessage[]; pending: boolean }>()
const emit = defineEmits<{ send: [question: string] }>()
const draft = ref('')
const DESKTOP_BREAKPOINT = 1280
const MIN_CHAT_PANEL_WIDTH = 265
const MIN_CENTER_COLUMN_WIDTH = 360
const COLLAPSED_CHAT_PANEL_WIDTH = 44
const isCollapsed = ref(false)
const isResizing = ref(false)
const chatPanelWidth = ref(MIN_CHAT_PANEL_WIDTH)
const maxChatPanelWidth = ref(900)
const resizeHandleRef = ref<HTMLElement | null>(null)
const panelStyle = computed(() => {
  if (!isCollapsed.value) return undefined
  return {
    width: `${COLLAPSED_CHAT_PANEL_WIDTH}px`,
    height: 'fit-content',
    justifySelf: 'end',
    alignSelf: 'start',
  }
})
const firstColumnRatio = ref<number | null>(null)
const chatWidthRatio = ref<number | null>(null)
const hasCustomGridLayout = ref(false)

interface ActiveChatResize {
  pointerId: number
  startX: number
  startChatWidth: number
  availablePairWidth: number
  previousChatRatio: number | null
  previousFirstRatio: number | null
  wasCustom: boolean
  didMove: boolean
  target: HTMLElement
}

let activeResize: ActiveChatResize | null = null
let gridResizeObserver: ResizeObserver | null = null
let parentGrid: HTMLElement | null = null
let originalGridTemplateColumns = ''

function toggleCollapsed() {
  if (isCollapsed.value) {
    isCollapsed.value = false
    if (hasCustomGridLayout.value) applyGridLayout()
    else restoreGridTemplateColumns()
    return
  }

  cancelActiveResize()
  ensureGridRatios()
  isCollapsed.value = true
  applyGridLayout()
}

function getGridTrackWidths(): number[] {
  if (!parentGrid) return []
  return getComputedStyle(parentGrid).gridTemplateColumns
    .trim()
    .split(/\s+/)
    .map((track) => Number.parseFloat(track))
    .filter(Number.isFinite)
}

function getAvailableGridWidth(): number {
  if (!parentGrid) return 0
  const style = getComputedStyle(parentGrid)
  const horizontalPadding = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0)
  const columnGap = Number.parseFloat(style.columnGap) || 12
  return Math.max(0, parentGrid.clientWidth - horizontalPadding - columnGap * 2)
}

function getMinimumFirstColumnWidth(): number {
  return parentGrid?.classList.contains('analysis-grid') ? 250 : 220
}

function ensureGridRatios(): void {
  if (!parentGrid || (firstColumnRatio.value !== null && chatWidthRatio.value !== null)) return
  const [first, center, chat] = getGridTrackWidths()
  const total = first + center + chat
  if (!total) return

  firstColumnRatio.value = first / total
  chatWidthRatio.value = chat / (center + chat)
}

function updateMeasuredWidths(): void {
  const [first, center, chat] = getGridTrackWidths()
  if (!first || !center || !chat) return
  chatPanelWidth.value = chat
  maxChatPanelWidth.value = Math.max(MIN_CHAT_PANEL_WIDTH, getAvailableGridWidth() - first - MIN_CENTER_COLUMN_WIDTH)
}

function restoreGridTemplateColumns(): void {
  if (parentGrid) parentGrid.style.gridTemplateColumns = originalGridTemplateColumns
  updateMeasuredWidths()
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function applyGridLayout(requestedChatWidth?: number): void {
  if (!parentGrid || window.innerWidth < DESKTOP_BREAKPOINT) return
  ensureGridRatios()

  const available = getAvailableGridWidth()
  if (!available || firstColumnRatio.value === null || chatWidthRatio.value === null) return

  const minimumFirst = getMinimumFirstColumnWidth()
  const minimumChat = isCollapsed.value ? COLLAPSED_CHAT_PANEL_WIDTH : MIN_CHAT_PANEL_WIDTH
  const maximumFirst = Math.max(minimumFirst, available - MIN_CENTER_COLUMN_WIDTH - minimumChat)
  const first = clamp(available * firstColumnRatio.value, minimumFirst, maximumFirst)
  const pairWidth = Math.max(0, available - first)
  const maximumChat = Math.max(minimumChat, pairWidth - MIN_CENTER_COLUMN_WIDTH)
  const desiredChat = isCollapsed.value
    ? COLLAPSED_CHAT_PANEL_WIDTH
    : requestedChatWidth ?? pairWidth * chatWidthRatio.value
  const chat = clamp(desiredChat, minimumChat, maximumChat)
  const center = Math.max(0, pairWidth - chat)

  if (!isCollapsed.value) chatWidthRatio.value = pairWidth > 0 ? chat / pairWidth : chatWidthRatio.value
  parentGrid.style.gridTemplateColumns = `${first}px ${center}px ${chat}px`
  chatPanelWidth.value = chat
  maxChatPanelWidth.value = maximumChat
}

function syncGridLayout(): void {
  if (!parentGrid) return
  if (window.innerWidth < DESKTOP_BREAKPOINT) {
    parentGrid.style.gridTemplateColumns = originalGridTemplateColumns
    return
  }
  if (hasCustomGridLayout.value || isCollapsed.value) applyGridLayout()
  else restoreGridTemplateColumns()
}

function startResize(event: PointerEvent): void {
  if (window.innerWidth < DESKTOP_BREAKPOINT || isCollapsed.value || activeResize || !parentGrid) return

  ensureGridRatios()
  const [, center, chat] = getGridTrackWidths()
  if (!center || !chat) return

  const target = event.currentTarget as HTMLElement
  activeResize = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startChatWidth: chat,
    availablePairWidth: center + chat,
    previousChatRatio: chatWidthRatio.value,
    previousFirstRatio: firstColumnRatio.value,
    wasCustom: hasCustomGridLayout.value,
    didMove: false,
    target,
  }
  isResizing.value = true
  target.focus({ preventScroll: true })
  target.setPointerCapture(event.pointerId)
  event.preventDefault()
}

function moveResize(event: PointerEvent): void {
  const active = activeResize
  if (!active || active.pointerId !== event.pointerId) return
  const delta = active.startX - event.clientX
  if (Math.abs(delta) < 0.5) return

  active.didMove = true
  const nextChatWidth = clamp(
    active.startChatWidth + delta,
    MIN_CHAT_PANEL_WIDTH,
    Math.max(MIN_CHAT_PANEL_WIDTH, active.availablePairWidth - MIN_CENTER_COLUMN_WIDTH),
  )
  chatWidthRatio.value = nextChatWidth / active.availablePairWidth
  hasCustomGridLayout.value = true
  applyGridLayout(nextChatWidth)
}

function finishResize(event: PointerEvent): void {
  const active = activeResize
  if (!active || active.pointerId !== event.pointerId) return
  activeResize = null
  isResizing.value = false
  if (active.target.hasPointerCapture(event.pointerId)) active.target.releasePointerCapture(event.pointerId)
}

function cancelActiveResize(): void {
  const active = activeResize
  if (!active) return
  chatWidthRatio.value = active.previousChatRatio
  firstColumnRatio.value = active.previousFirstRatio
  hasCustomGridLayout.value = active.wasCustom
  activeResize = null
  isResizing.value = false
  if (active.target.hasPointerCapture(active.pointerId)) active.target.releasePointerCapture(active.pointerId)
  if (active.wasCustom || isCollapsed.value) applyGridLayout()
  else restoreGridTemplateColumns()
}

function cancelResize(event: PointerEvent): void {
  if (activeResize?.pointerId !== event.pointerId) return
  cancelActiveResize()
}

function resetChatPanelWidth(): void {
  cancelActiveResize()
  isCollapsed.value = false
  hasCustomGridLayout.value = false
  firstColumnRatio.value = null
  chatWidthRatio.value = null
  restoreGridTemplateColumns()
}

function handleResizeKeydown(event: KeyboardEvent): void {
  if (window.innerWidth < DESKTOP_BREAKPOINT) return
  if (event.key === 'Home') {
    event.preventDefault()
    resetChatPanelWidth()
    return
  }
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

  event.preventDefault()
  ensureGridRatios()
  const [, center, chat] = getGridTrackWidths()
  const pairWidth = center + chat
  if (!pairWidth) return

  const direction = event.key === 'ArrowLeft' ? 1 : -1
  const step = event.shiftKey ? 48 : 16
  const nextChatWidth = clamp(
    chat + direction * step,
    MIN_CHAT_PANEL_WIDTH,
    Math.max(MIN_CHAT_PANEL_WIDTH, pairWidth - MIN_CENTER_COLUMN_WIDTH),
  )
  chatWidthRatio.value = nextChatWidth / pairWidth
  hasCustomGridLayout.value = true
  applyGridLayout(nextChatWidth)
}

onMounted(() => {
  const panel = resizeHandleRef.value?.closest<HTMLElement>('.agent-chat-panel')
  parentGrid = panel?.parentElement ?? null
  if (!parentGrid) return

  originalGridTemplateColumns = parentGrid.style.gridTemplateColumns
  updateMeasuredWidths()
  gridResizeObserver = new ResizeObserver(syncGridLayout)
  gridResizeObserver.observe(parentGrid)
  window.addEventListener('resize', syncGridLayout)
})

onBeforeUnmount(() => {
  gridResizeObserver?.disconnect()
  window.removeEventListener('resize', syncGridLayout)
  cancelActiveResize()
  if (parentGrid) parentGrid.style.gridTemplateColumns = originalGridTemplateColumns
})

function submit() {
  const question = draft.value.trim()
  if (!question) return
  emit('send', question)
  draft.value = ''
}
</script>

<style scoped lang="scss">
.agent-chat-panel { min-width: 0; }
.agent-chat-content { position: relative; display: flex; flex: 1 1 auto; flex-direction: column; min-height: 0; }
.agent-chat-panel.is-chat-collapsed { min-width: 0; min-height: 0; overflow: visible; border-color: transparent; background: transparent; box-shadow: none; }
.agent-chat-panel.is-chat-collapsed::before { display: none; }
.agent-chat-panel.is-chat-collapsed :deep(.panel-content) { display: none !important; }
.agent-chat-panel.is-chat-collapsed :deep(.panel-heading) { height: auto; min-height: 40px; justify-content: center; padding: 4px; border-bottom-color: transparent; }
.agent-chat-panel.is-chat-collapsed :deep(.panel-heading-title), .agent-chat-panel.is-chat-collapsed .chat-toggle-label { display: none; }
.chat-panel-toggle { display: inline-flex; align-items: center; gap: 3px; min-height: 24px; padding: 0 4px; color: #78cfe8; font-size: 11px; }
.chat-panel-toggle:hover { color: #d2f5ff; }
.chat-panel-toggle:focus-visible { outline: 2px solid var(--cyan); outline-offset: 1px; }
.agent-chat-panel.is-chat-collapsed .chat-panel-toggle { width: 32px; height: 32px; min-height: 32px; justify-content: center; padding: 0; border: 1px solid rgba(63, 160, 191, .42); border-radius: 50%; color: #91dff2; background: rgba(4, 35, 54, .88); transition: color .15s ease, background-color .15s ease, border-color .15s ease, box-shadow .15s ease; }
.agent-chat-panel.is-chat-collapsed .chat-panel-toggle:hover { border-color: rgba(24, 200, 255, .78); color: #e2faff; background: rgba(5, 69, 94, .96); box-shadow: 0 0 12px rgba(0, 205, 255, .24); }
.agent-chat-panel.is-chat-collapsed .chat-panel-toggle:focus-visible { outline-offset: 2px; }
.chat-horizontal-resizer { position: absolute; z-index: 3; top: 0; bottom: 0; left: 0; display: flex; align-items: center; justify-content: center; width: 8px; cursor: col-resize; touch-action: none; user-select: none; }
.chat-horizontal-resizer span { display: block; width: 2px; height: 38px; max-height: 40%; border-radius: 2px; background: rgba(63, 160, 191, .72); box-shadow: 0 0 8px rgba(0, 185, 232, .18); transition: width .15s ease, height .15s ease, background-color .15s ease, box-shadow .15s ease; }
.chat-horizontal-resizer:hover span, .chat-horizontal-resizer:focus-visible span, .agent-chat-panel.is-chat-resizing .chat-horizontal-resizer span { width: 3px; height: 48px; background: var(--cyan); box-shadow: 0 0 12px rgba(0, 205, 255, .72); }
.chat-horizontal-resizer:focus-visible { outline: 2px solid var(--cyan); outline-offset: -1px; border-radius: 3px; }
.agent-chat-panel.is-chat-resizing, .agent-chat-panel.is-chat-resizing * { cursor: col-resize !important; user-select: none !important; }
.chat-body { display: flex; flex-direction: column; gap: 10px; min-height: 180px; max-height: 380px; overflow: auto; padding: 12px; }
.chat-empty { display: grid; place-items: center; align-content: center; gap: 8px; min-height: 150px; color: #79aabe; font-size: 13px; text-align: center; }
.chat-empty .el-icon { color: var(--cyan); font-size: 30px; }
.chat-message { display: flex; align-items: flex-start; gap: 8px; min-width: 0; }
.message-user { flex-direction: row-reverse; }
.message-avatar { display: grid; place-items: center; width: 28px; height: 28px; flex: 0 0 28px; border: 1px solid rgba(24, 200, 255, .5); border-radius: 50%; color: var(--cyan); background: rgba(5, 54, 78, .65); }
.message-user .message-avatar { color: #b7d9e7; border-color: rgba(112, 160, 184, .5); }
.message-content { min-width: 0; max-width: 88%; padding: 8px 10px; border: 1px solid rgba(36, 129, 171, .36); background: rgba(5, 34, 55, .72); }
.message-content p { margin: 0; color: #c4e8f3; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
.message-content time { display: block; margin-top: 5px; color: #6f9bb1; font-size: 12px; }
.message-user .message-content { background: rgba(5, 67, 93, .62); }
.chat-pending { display: flex; align-items: center; gap: 5px; color: #83b1c2; font-size: 12px; }
.chat-pending span { width: 5px; height: 5px; border-radius: 50%; background: var(--cyan); animation: chat-pulse .85s infinite alternate; }
.chat-pending span:nth-child(2) { animation-delay: .2s; }.chat-pending span:nth-child(3) { animation-delay: .4s; }
.chat-compose { display: flex; align-items: stretch; gap: 8px; padding: 10px; border-top: 1px solid rgba(36, 129, 171, .28); }
.chat-compose :deep(.el-textarea__inner) { min-height: 54px; }
.chat-compose .el-button { width: 44px; min-height: 54px; margin: 0; }.chat-compose .el-icon { font-size: 18px; }
@keyframes chat-pulse { to { opacity: .3; transform: translateY(-2px); } }
@media (max-width: 480px) { .chat-body { min-height: 120px; max-height: 300px; padding: 9px; } .chat-compose { padding: 8px; } }
@media (max-width: 1279px) { .chat-horizontal-resizer { display: none; } }
</style>
