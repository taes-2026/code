<script setup lang="ts">
import { computed } from 'vue'
import { UNITS } from '@/domain/items'
import { EXPIRING_WINDOW_HOURS, describeExpiration, getExpiringItems } from '@/domain/expiration'
import type { InventoryItem } from '@/types/item'

const props = defineProps<{
  items: InventoryItem[]
  now: Date
}>()

const expiring = computed(() => getExpiringItems(props.items, props.now))
</script>

<template>
  <section v-if="expiring.length > 0" class="expiring" aria-labelledby="expiring-title">
    <h2 id="expiring-title">A expirar nas próximas {{ EXPIRING_WINDOW_HOURS }} h</h2>
    <p class="hint">Consome estes produtos primeiro.</p>

    <ul>
      <li v-for="item in expiring" :key="item.id">
        <span class="name">{{ item.name }}</span>
        <span class="quantity">{{ item.quantity }} {{ UNITS[item.unit] ?? item.unit }}</span>
        <span class="time">{{ describeExpiration(item.expirationDate, now) }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.expiring {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border: 1px solid var(--color-warning);
  border-left-width: 4px;
  border-radius: 8px;
  background: var(--color-warning-bg);
}

h2 {
  font-size: 1.1rem;
  color: var(--color-warning-text);
}

.hint {
  font-size: 0.875rem;
}

ul {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0;
  list-style: none;
}

li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 1rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-warning);
}

.name {
  font-weight: 600;
}

.time {
  margin-left: auto;
  font-weight: 600;
  color: var(--color-warning-text);
}
</style>
