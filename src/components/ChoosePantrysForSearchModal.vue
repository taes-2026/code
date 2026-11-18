<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { findAll } from '@/services/items'
import { compareByExpiration, formatExpirationDate, getExpirationState } from '@/domain/expiration'
import type { InventoryItem } from '@/types/item'

const props = defineProps<{ initialSelected?: string[] }>()
const emit = defineEmits<{
    close: []
    confirm: [ingredients: string[]]
}>()

const items = ref<InventoryItem[]>(findAll())
const selectedIds = ref<Set<string>>(
    new Set(
        items.value
            .filter((i) => props.initialSelected?.some((n) => n.toLowerCase() === i.name.toLowerCase()))
            .map((i) => i.id),
    ),
)

const now = new Date()
const sortedItems = computed(() => [...items.value].sort(compareByExpiration))
const allSelected = computed(() => items.value.length > 0 && selectedIds.value.size === items.value.length)

function toggle(id: string) {
    const s = selectedIds.value
    if (!s.delete(id)) s.add(id)
}


function toggleAll() {
    selectedIds.value = allSelected.value ? new Set() : new Set(items.value.map((i) => i.id))
}

function confirm() {
    const names = items.value
        .filter((i) => selectedIds.value.has(i.id))
        .map((i) => i.name.trim().toLowerCase())
    emit('confirm', [...new Set(names)])
}


function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') emit('close')
}


onMounted(() => {
    document.addEventListener('keydown', onKeydown)
    document.body.style.overflow = 'hidden'
})
onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
})
</script>

<template>
    <div class="overlay" @click.self="emit('close')">
        <div class="modal" role="dialog" aria-modal="true" aria-label="Choose pantry ingredients">
            <header class="header">
                <h2>Choose ingredients</h2>
                <button class="close-btn" aria-label="Close" @click="emit('close')">×</button>
            </header>

            <p v-if="!items.length" class="status">Your pantry is empty.</p>

            <template v-else>
                <label class="select-all">
                    <input type="checkbox" :checked="allSelected" @change="toggleAll" />
                    Select all ({{ selectedIds.size }}/{{ items.length }})
                </label>

                <ul class="item-list">
                    <li v-for="item in sortedItems" :key="item.id">
                        <label :class="['item', { selected: selectedIds.has(item.id) }]">
                            <input type="checkbox" :checked="selectedIds.has(item.id)" @change="toggle(item.id)" />
                            <span class="name">{{ item.name }}</span>
                            <span :class="['date', getExpirationState(item.expirationDate, now)]">{{
                                formatExpirationDate(item.expirationDate) }}</span>
                        </label>
                    </li>
                </ul>
            </template>

            <footer class="footer">
                <button class="btn btn-secondary" @click="emit('close')">Cancel</button>
                <button class="btn btn-primary" :disabled="selectedIds.size === 0" @click="confirm">
                    Use {{ selectedIds.size }} ingredient{{ selectedIds.size === 1 ? '' : 's' }}
                </button>
            </footer>
        </div>
    </div>
</template>

<style scoped>
.overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 1000;
}

.modal {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    background: var(--color-background, #fff);
    color: var(--color-text, #222);
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-border, #ddd);
}

.header h2 {
    margin: 0;
    font-size: 1.25rem;
}

.close-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: inherit;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
}

.close-btn:hover {
    background: rgba(0, 0, 0, 0.08);
}

.select-all {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    font-size: 0.9rem;
    color: #666;
    cursor: pointer;
}

.item-list {
    list-style: none;
    margin: 0;
    padding: 0 12px;
    overflow-y: auto;
    flex: 1;
}

.item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 8px;
    border-radius: 8px;
    cursor: pointer;
}

.item:hover {
    background: rgba(0, 0, 0, 0.04);
}

.item.selected {
    background: rgba(25, 135, 84, 0.1);
}

.item input,
.select-all input {
    accent-color: #198754;
    width: 18px;
    height: 18px;
}

.name {
    flex: 1;
}

.date {
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
    color: #666;
}

.date.expiring {
    color: #b45309;
    font-weight: 600;
}

.date.expired {
    color: #dc3545;
    font-weight: 600;
}

.footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid var(--color-border, #ddd);
}

.btn {
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    font-size: 0.95rem;
    cursor: pointer;
}

.btn-primary {
    background: #198754;
    color: #fff;
}

.btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-secondary {
    background: #e9ecef;
    color: #333;
}

.status {
    text-align: center;
    padding: 40px 16px;
    color: #666;
}
</style>
