<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createCategory } from '@/services/categories'

const router = useRouter()
const categoryName = ref('')

const handleSave = () => {
  if (categoryName.value.trim()) {
    createCategory(categoryName.value.trim())
    router.push('/') 
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
</style>