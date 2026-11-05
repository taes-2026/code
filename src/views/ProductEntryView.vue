<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const scanMessage = ref('')

// A digitalização ainda não está implementada: câmara bloqueada ou produto fora do catálogo
// encaminham sempre para a entrada manual.
function scanBarcode() {
  const cameraAvailable =
    typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)

  scanMessage.value = cameraAvailable
    ? 'Produto não encontrado no catálogo. Introduz os dados manualmente.'
    : 'Câmara indisponível ou produto não encontrado. Introduz os dados manualmente.'
}

function goToManualEntry() {
  router.push({ name: 'manual-entry' })
}
</script>

<template>
  <main class="entry">
    <header>
      <h1>Adicionar produto</h1>
      <RouterLink :to="{ name: 'dashboard' }" class="back">Voltar</RouterLink>
    </header>

    <p class="intro">Como queres adicionar o produto?</p>

    <div class="actions">
      <button type="button" @click="scanBarcode">Digitalizar código de barras</button>
      <button type="button" class="secondary" @click="goToManualEntry">Introduzir manualmente</button>
    </div>

    <p v-if="scanMessage" class="notice" role="status">{{ scanMessage }}</p>
  </main>
</template>

<style scoped>
.entry {
  min-height: 100dvh;
  padding: 1.5rem;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

h1 {
  font-size: 1.25rem;
}

.back {
  font-size: 0.875rem;
}

.intro {
  margin-bottom: 1rem;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.notice {
  margin-top: 1rem;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.875rem;
}

@media (min-width: 768px) {
  .entry {
    max-width: 480px;
    margin: 0 auto;
  }
}
</style>
