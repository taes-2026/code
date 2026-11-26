/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPOONACULAR_API_KEY?: string
  readonly VITE_SOUS_CHEF_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
