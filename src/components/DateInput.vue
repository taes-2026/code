<script setup lang="ts">
import { ref } from 'vue'
import { parseTypedDate } from '@/domain/expiration'

defineOptions({ inheritAttrs: false })

const model = defineModel<string>({ required: true })

/** Texto escrito no teclado até formar uma data completa. */
const typed = ref('')

const MAX_TYPED_LENGTH = 10

// O <input type="date"> nativo segue a ordem do idioma do browser (dd/mm/aaaa em
// pt-PT), por isso escrever "2026-11-19" dava datas trocadas. O teclado é
// intercetado e a data só é aplicada quando estiver completa.
function onKeydown(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey) return

  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault()
    typed.value = ''
    model.value = ''

    return
  }

  if (!/^[\d./-]$/.test(event.key)) return

  event.preventDefault()
  typed.value += event.key

  const date = parseTypedDate(typed.value)

  if (date || typed.value.length >= MAX_TYPED_LENGTH) {
    // Uma data impossível fica no modelo tal como foi escrita, para a validação do formulário a rejeitar.
    model.value = date ?? typed.value
    typed.value = ''
  }
}

function onInput(event: Event) {
  model.value = (event.target as HTMLInputElement).value
  typed.value = ''
}
</script>

<template>
  <input
    v-bind="$attrs"
    type="date"
    :value="model"
    @input="onInput"
    @change="onInput"
    @keydown="onKeydown"
    @blur="typed = ''"
  />
  <small v-if="typed" class="typed" aria-live="polite">A escrever: {{ typed }}</small>
</template>

<style scoped>
.typed {
  font-size: 0.75rem;
  opacity: 0.7;
}
</style>
