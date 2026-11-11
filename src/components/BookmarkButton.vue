<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import bookmarkIcon from '@/assets/icons/bookmark.svg?raw'
import { useBookmarks } from '@/stores/bookmarks'
import type { RecipeReference } from '@/types/bookmark'

const LONG_PRESS_MS = 500

const props = defineProps<{ recipe: RecipeReference }>()
const emit = defineEmits<{ longpress: [] }>()

const { isBookmarked, toggle } = useBookmarks()
const saved = computed(() => isBookmarked(props.recipe.id))
const pressing = ref(false)

let pressTimer: ReturnType<typeof setTimeout> | undefined
let suppressClickUntil = 0

function cancelPress() {
  pressing.value = false

  if (pressTimer === undefined) return

  clearTimeout(pressTimer)
  pressTimer = undefined
}

function startPress(event: PointerEvent) {
  if (event.button !== 0) return

  event.stopPropagation()
  cancelPress()
  pressing.value = true

  pressTimer = setTimeout(() => {
    pressTimer = undefined
    pressing.value = false
    suppressClickUntil = Date.now() + 1000

    if (!saved.value) toggle(props.recipe)

    emit('longpress')
  }, LONG_PRESS_MS)
}

function onClick(event: MouseEvent) {
  event.stopPropagation()
  cancelPress()

  if (Date.now() < suppressClickUntil) return

  toggle(props.recipe)
}

function onPointerUp(event: PointerEvent) {
  event.stopPropagation()
  cancelPress()
}

onBeforeUnmount(cancelPress)
</script>

<template>
  <button
    type="button"
    class="bookmark-button"
    :class="{ saved, pressing }"
    :style="{ '--long-press-duration': `${LONG_PRESS_MS}ms` }"
    :aria-pressed="saved"
    :aria-label="saved ? 'Remover receita dos guardados' : 'Guardar receita'"
    :title="`${saved ? 'Remover dos guardados' : 'Guardar receita'} — manter premido para adicionar a coleções`"
    @pointerdown="startPress"
    @pointerup="onPointerUp"
    @pointerleave="cancelPress"
    @pointercancel="cancelPress"
    @click="onClick"
    @keydown.stop
    @contextmenu.prevent
  >
    <svg class="progress-ring" viewBox="0 0 44 44" aria-hidden="true">
      <circle class="track" cx="22" cy="22" r="20" />
      <circle class="progress" cx="22" cy="22" r="20" />
    </svg>
    <span class="icon" aria-hidden="true" v-html="bookmarkIcon" />
  </button>
</template>

<style scoped>
.bookmark-button {
  position: relative;
  overflow: visible;
  width: 36px;
  height: 36px;
  min-height: 0;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  color: #198754;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-touch-callout: none;
  transition:
    transform 0.15s,
    background-color 0.15s,
    color 0.15s;
}

.bookmark-button:hover {
  transform: scale(1.08);
}

.bookmark-button.saved {
  background: #198754;
  border-color: #198754;
  color: #fff;
}

.bookmark-button.saved:hover {
  background: #157347;
}

.icon {
  display: flex;
  width: 20px;
  height: 20px;
}

.icon :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.bookmark-button.saved .icon :deep(path) {
  fill: currentColor;
}

.progress-ring {
  position: absolute;
  inset: -4px;
  opacity: 0;
  transform: rotate(-90deg);
  pointer-events: none;
  transition: opacity 0.1s;
}

.progress-ring circle {
  fill: none;
  stroke-width: 3;
}

.progress-ring .track {
  stroke: rgba(25, 135, 84, 0.25);
}

.progress-ring .progress {
  stroke: #198754;
  stroke-linecap: round;
  stroke-dasharray: 125.66;
  stroke-dashoffset: 125.66;
}

.bookmark-button.pressing .progress-ring {
  opacity: 1;
}

.bookmark-button.pressing .progress-ring .progress {
  animation: bookmark-progress var(--long-press-duration, 500ms) linear forwards;
}

@keyframes bookmark-progress {
  from {
    stroke-dashoffset: 125.66;
  }

  to {
    stroke-dashoffset: 0;
  }
}
</style>
