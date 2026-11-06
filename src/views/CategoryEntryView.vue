<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createCategory, getCategories } from '@/services/categories'
const router = useRouter()
const categoryName = ref('')
const categoriesList = ref(getCategories())

const handleSave = () => {
  if (categoryName.value.trim()) {
    createCategory(categoryName.value.trim())
    
    categoriesList.value = getCategories()
    
    categoryName.value = '' 
  }
}
</script>

<template>
  <main class="page-container">
    <header class="page-header">
      <h2>Introduzir categoria</h2>
      <router-link to="/" class="back-link">Voltar</router-link>
    </header>

    <form @submit.prevent="handleSave" class="entry-form">
      <div class="form-group">
        <label for="category-name">Nome da categoria</label>
        <input 
          id="category-name" 
          type="text" 
          v-model="categoryName" 
          required 
        />
      </div>

      <button type="submit" class="btn-submit">
        Guardar categoria
      </button>
    </form>

    <div class="categories-list">
      <h2>Categorias Existentes</h2>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(label, key) in categoriesList" :key="key">
            <td>{{ label }}</td>
          </tr>
        </tbody>
      </table>
    </div>

  </main>
</template>

<style scoped>
    .page-container { max-width: 400px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .back-link { color: #198754; text-decoration: underline; }
    .form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
    input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
    .btn-submit { 
    width: 100%; 
    padding: 12px; 
    background-color: #198754; 
    color: white; 
    border: none; 
    border-radius: 6px; 
    cursor: pointer; 
    }
table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  text-align: left;
  padding: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

</style>