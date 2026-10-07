<template>
  <div ref="viewport" class="detection-box-editor" :aria-busy="!imageReady">
    <div
      v-if="imageReady"
      class="detection-box-editor__canvas"
      :style="canvasStyle"
    >
      <img
        :src="imageUrl"
        class="detection-box-editor__image"
        alt="检测框校对图片"
        draggable="false"
      />
      <Vue3DraggableResizable
        :key="`${Math.round(canvasWidth)}x${Math.round(canvasHeight)}`"
        v-if="canvasWidth && canvasHeight"
        :x="position.x"
        :y="position.y"
        :w="position.width"
        :h="position.height"
        :init-w="position.width"
        :init-h="position.height"
        :active="true"
        :parent="true"
        :draggable="!disabled"
        :resizable="!disabled"
        :min-w="minimumWidth"
        :min-h="minimumHeight"
        :handles="handles"
        class-name-active="is-active"
        class-name-dragging="is-dragging"
        class-name-resizing="is-resizing"
        class-name-handle="detection-box-editor__handle"
        @update:w="livePosition.width = $event"
        @update:h="livePosition.height = $event"
        @dragging="onDragging"
        @resizing="onResizing"
        @drag-end="onDragEnd"
        @resize-end="onResizeEnd"
      />
    </div>
    <p v-else-if="imageError" class="detection-box-editor__message" role="alert">
      图片加载失败，请检查图片地址后重试。
    </p>
    <p v-else class="detection-box-editor__message" role="status">正在加载校对图片…</p>
    <img
      v-if="!imageReady && !imageError"
      class="detection-box-editor__preload"
      :src="imageUrl"
      alt=""
      @load="onImageLoad"
      @error="onImageError"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import Vue3DraggableResizable from 'vue3-draggable-resizable'
import type { NormalizedBox } from '@/features/visual-monitor/types'

const props = defineProps<{
  imageUrl: string
  box: NormalizedBox
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:box': [box: NormalizedBox]
  ready: [ready: boolean]
}>()

const handles = ['tl', 'tm', 'tr', 'ml', 'mr', 'bl', 'bm', 'br']
const viewport = ref<HTMLElement | null>(null)
const imageReady = ref(false)
const imageError = ref(false)
const naturalWidth = ref(0)
const naturalHeight = ref(0)
const canvasWidth = ref(0)
const canvasHeight = ref(0)
// These props seed the library; movement is handled by its own internal state.
const position = reactive({ x: 0, y: 0, width: 0, height: 0 })
const livePosition = { x: 0, y: 0, width: 0, height: 0 }
let liveBox: NormalizedBox = { ...props.box }
let pendingBox: NormalizedBox | null = null
let lastEmittedBox: NormalizedBox | null = null
let frameId: number | null = null
let observer: ResizeObserver | undefined

type DragPosition = { x: number; y: number }
type ResizePosition = DragPosition & { w: number; h: number }

const canvasStyle = computed(() => ({
  width: `${canvasWidth.value}px`,
  height: `${canvasHeight.value}px`,
}))
const minimumWidth = computed(() => Math.max(1, Math.ceil(canvasWidth.value * 0.05)))
const minimumHeight = computed(() => Math.max(1, Math.ceil(canvasHeight.value * 0.05)))

function setReady(ready: boolean) {
  if (imageReady.value === ready) return
  imageReady.value = ready
  emit('ready', ready)
}

function onImageLoad(event: Event) {
  const image = event.currentTarget as HTMLImageElement
  if (!image.naturalWidth || !image.naturalHeight) {
    onImageError()
    return
  }

  naturalWidth.value = image.naturalWidth
  naturalHeight.value = image.naturalHeight
  imageError.value = false
  setReady(true)
  void nextTick(() => {
    if (viewport.value) observer?.observe(viewport.value)
    updateCanvasSize()
  })
}

function onImageError() {
  imageError.value = true
  setReady(false)
}

function updateCanvasSize() {
  const element = viewport.value
  if (!element || !naturalWidth.value || !naturalHeight.value) return

  const maxWidth = element.clientWidth
  const maxHeight = element.clientHeight
  if (!maxWidth || !maxHeight) return

  const scale = Math.min(maxWidth / naturalWidth.value, maxHeight / naturalHeight.value)
  const width = naturalWidth.value * scale
  const height = naturalHeight.value * scale
  if (width === canvasWidth.value && height === canvasHeight.value) return

  flushBox()
  canvasWidth.value = width
  canvasHeight.value = height
  resetPosition()
}

function resetPosition() {
  const width = canvasWidth.value
  const height = canvasHeight.value
  position.x = Math.min(width * 0.95, Math.max(0, liveBox.x * width))
  position.y = Math.min(height * 0.95, Math.max(0, liveBox.y * height))
  position.width = Math.min(width - position.x, Math.max(width * 0.05, liveBox.width * width))
  position.height = Math.min(height - position.y, Math.max(height * 0.05, liveBox.height * height))
  Object.assign(livePosition, position)
}

function onDragging(event: DragPosition) {
  livePosition.x = event.x
  livePosition.y = event.y
  queueBox()
}

function onResizing(event: ResizePosition) {
  Object.assign(livePosition, { x: event.x, y: event.y, width: event.w, height: event.h })
  queueBox()
}

function onDragEnd(event: DragPosition) {
  onDragging(event)
  flushBox()
}

function onResizeEnd(event: ResizePosition) {
  onResizing(event)
  flushBox()
}

function queueBox() {
  if (props.disabled || !canvasWidth.value || !canvasHeight.value) return
  const width = Math.min(canvasWidth.value, Math.max(minimumWidth.value, livePosition.width))
  const height = Math.min(canvasHeight.value, Math.max(minimumHeight.value, livePosition.height))
  const x = Math.max(0, Math.min(livePosition.x, canvasWidth.value - width))
  const y = Math.max(0, Math.min(livePosition.y, canvasHeight.value - height))
  liveBox = {
    x: x / canvasWidth.value,
    y: y / canvasHeight.value,
    width: width / canvasWidth.value,
    height: height / canvasHeight.value,
  }
  pendingBox = liveBox
  if (frameId === null) frameId = requestAnimationFrame(flushBox)
}

function cancelFrame() {
  if (frameId !== null) cancelAnimationFrame(frameId)
  frameId = null
}

function boxesEqual(a: NormalizedBox, b: NormalizedBox) {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}

function flushBox() {
  cancelFrame()
  if (!pendingBox) return
  const box = pendingBox
  pendingBox = null
  if (lastEmittedBox && boxesEqual(box, lastEmittedBox)) return
  lastEmittedBox = box
  emit('update:box', box)
}

watch(() => props.imageUrl, () => {
  cancelFrame()
  pendingBox = null
  lastEmittedBox = null
  liveBox = { ...props.box }
  naturalWidth.value = 0
  naturalHeight.value = 0
  canvasWidth.value = 0
  canvasHeight.value = 0
  imageError.value = false
  setReady(false)
})

watch(() => [props.box.x, props.box.y, props.box.width, props.box.height], () => {
  // Our own emitted model updates must not reposition an active drag.
  if (lastEmittedBox && boxesEqual(props.box, lastEmittedBox)) return
  cancelFrame()
  pendingBox = null
  lastEmittedBox = null
  liveBox = { ...props.box }
  if (imageReady.value && canvasWidth.value && canvasHeight.value) resetPosition()
})

watch(viewport, (element) => {
  observer?.disconnect()
  if (element && imageReady.value) observer?.observe(element)
})

if (typeof ResizeObserver !== 'undefined') {
  observer = new ResizeObserver(updateCanvasSize)
}

onBeforeUnmount(() => {
  cancelFrame()
  observer?.disconnect()
  setReady(false)
})
</script>

<style scoped lang="scss">
.detection-box-editor {
  position: relative;
  display: grid;
  width: 100%;
  height: min(62vh, 520px);
  min-height: 180px;
  overflow: hidden;
  place-items: center;
  background: #081821;
  touch-action: none;
}

.detection-box-editor__canvas {
  position: relative;
  flex: none;
}

.detection-box-editor__image {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
}

.detection-box-editor__canvas :deep(.vdr-container) {
  border: 2px solid #15e3ff;
  box-shadow: inset 0 0 8px rgb(14 218 250 / 12%);
  box-sizing: border-box;
  touch-action: none;
}

.detection-box-editor__canvas :deep(.vdr-container.draggable) {
  cursor: move;
}

.detection-box-editor__canvas :deep(.vdr-container.is-active),
.detection-box-editor__canvas :deep(.vdr-container.is-dragging),
.detection-box-editor__canvas :deep(.vdr-container.is-resizing) {
  border-color: #15e3ff;
  border-style: solid;
}

.detection-box-editor__canvas :deep(.detection-box-editor__handle) {
  width: 10px;
  height: 10px;
  border: 1px solid #04212b;
  border-radius: 2px;
  background: #8af4ff;
}

.detection-box-editor__message {
  margin: 0;
  padding: 16px;
  color: #9ab7c3;
  font-size: 13px;
}

.detection-box-editor__preload {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}
</style>
