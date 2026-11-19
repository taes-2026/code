<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useShoppingList } from '@/stores/shoppingList'
import { create as createPantryItem } from '@/services/items'
import type { ShoppingListItem } from '@/types/shoppingList'

const router = useRouter()
const { state, addItem, toggle, remove, clearChecked, clearAll } = useShoppingList()

const newItemName = ref('')
const newItemAmount = ref<number | undefined>(undefined)
const newItemUnit = ref('unit')
const pantryMessage = ref('')
let messageTimeout: ReturnType<typeof setTimeout> | undefined

const uncompletedItems = computed(() => state.items.filter((item) => !item.checked))
const completedItems = computed(() => state.items.filter((item) => item.checked))

function onAddItem() {
  const name = newItemName.value.trim()
  if (!name) return

  addItem({
    name,
    amount: newItemAmount.value,
    unit: newItemUnit.value,
  })

  newItemName.value = ''
  newItemAmount.value = undefined
  newItemUnit.value = 'unit'
}

function moveToPantry(item: ShoppingListItem) {
  const today = new Date()
  const expDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  createPantryItem({
    name: item.name,
    category: 'other',
    quantity: item.amount && item.amount > 0 ? item.amount : 1,
    unit: 'unit',
    expirationDate: expDate,
  })

  remove(item.id)

  pantryMessage.value = `${item.name} foi adicionado à despensa com sucesso.`
  clearTimeout(messageTimeout)
  messageTimeout = setTimeout(() => {
    pantryMessage.value = ''
  }, 4000)
}

function goBack() {
  router.push({ name: 'dashboard' })
}
</script>

<template>
  <main class="page-container">
    <header class="page-header">
      <h2>Lista de compras</h2>
      <div class="header-links">
        <router-link to="/recipes" class="back-link">Receitas</router-link>
        <button type="button" class="back-link btn-link" @click="goBack">Voltar</button>
      </div>
    </header>

    <div v-if="pantryMessage" class="alert-success" role="status">
      {{ pantryMessage }}
    </div>

    <form class="add-form" @submit.prevent="onAddItem">
      <input
        v-model="newItemName"
        type="text"
        placeholder="Adicionar item à lista (ex: Leite, Farinha...)"
        class="input-name"
        required
      />
      <input
        v-model.number="newItemAmount"
        type="number"
        min="1"
        placeholder="Qtd"
        class="input-amount"
      />
      <button type="submit" class="btn-submit" :disabled="!newItemName.trim()">
        Adicionar
      </button>
    </form>

    <div v-if="state.items.length > 0" class="toolbar">
      <span class="items-count">
        {{ uncompletedItems.length }} por comprar de {{ state.items.length }} no total
      </span>
      <div class="toolbar-actions">
        <button
          v-if="completedItems.length > 0"
          type="button"
          class="btn-secondary"
          @click="clearChecked"
        >
          Limpar comprados
        </button>
        <button type="button" class="btn-danger" @click="clearAll">
          Limpar tudo
        </button>
      </div>
    </div>

    <p v-if="state.items.length === 0" class="empty-text">
      A sua lista de compras está vazia. Adicione itens acima ou use o botão nas receitas com ingredientes em falta.
    </p>

    <ul v-else class="shopping-list">
      <li
        v-for="item in state.items"
        :key="item.id"
        :class="['shopping-item', { 'is-checked': item.checked }]"
      >
        <label class="item-checkbox-label">
          <input
            type="checkbox"
            :checked="item.checked"
            class="checkbox"
            @change="toggle(item.id)"
          />
        </label>

        <div class="item-body">
          <div class="item-main">
            <span class="item-name">{{ item.name }}</span>
            <span v-if="item.amount" class="item-qty">
              ({{ item.amount }} {{ item.unit || '' }})
            </span>
          </div>

          <p v-if="item.original && item.original !== item.name" class="item-original">
            {{ item.original }}
          </p>

          <span v-if="item.recipeTitle" class="item-recipe-badge">
            Receita: {{ item.recipeTitle }}
          </span>
        </div>

        <div class="item-actions">
          <button
            v-if="item.checked"
            type="button"
            class="btn-pantry"
            title="Mover item para a despensa"
            @click="moveToPantry(item)"
          >
            Mover para despensa
          </button>
          <button
            type="button"
            class="btn-delete"
            aria-label="Remover item"
            @click="remove(item.id)"
          >
            Remover
          </button>
        </div>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.page-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-links {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-link {
  color: #198754;
  text-decoration: underline;
  cursor: pointer;
  background: none;
  border: none;
  font-size: 0.95rem;
  padding: 0;
}

.btn-link {
  font-family: inherit;
}

.alert-success {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
  font-size: 0.9rem;
}

.add-form {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.input-name {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 0.95rem;
}

.input-amount {
  width: 80px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 0.95rem;
}

.btn-submit {
  padding: 10px 18px;
  background: #198754;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
  flex-wrap: wrap;
  gap: 10px;
}

.items-count {
  font-size: 0.9rem;
  color: #64748b;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.btn-secondary {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #94a3b8;
  color: #475569;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
}

.btn-danger {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #f87171;
  color: #dc2626;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
}

.empty-text {
  text-align: center;
  padding: 40px 16px;
  color: #64748b;
  font-size: 1rem;
}

.shopping-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.shopping-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  transition: background-color 0.15s;
}

.shopping-item.is-checked {
  background: #f8fafc;
  opacity: 0.7;
}

.checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.item-body {
  flex: 1;
}

.item-main {
  display: flex;
  align-items: center;
  gap: 6px;
}

.item-name {
  font-size: 1rem;
  font-weight: 500;
}

.is-checked .item-name {
  text-decoration: line-through;
  color: #94a3b8;
}

.item-qty {
  font-size: 0.9rem;
  color: #64748b;
}

.item-original {
  margin: 2px 0 0;
  font-size: 0.8rem;
  color: #64748b;
}

.item-recipe-badge {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 8px;
  background: #f1f5f9;
  color: #475569;
  border-radius: 4px;
  font-size: 0.75rem;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-pantry {
  padding: 4px 10px;
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-delete {
  padding: 4px 8px;
  background: transparent;
  color: #dc2626;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-delete:hover {
  background: #fee2e2;
}
</style>
