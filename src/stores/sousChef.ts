import { ref } from 'vue'
import type { SousChefResponse } from '@/types/sousChef'

const lastResponse = ref<SousChefResponse | null>(null)

export function useSousChef() {
  function setLastResponse(response: SousChefResponse | null): void {
    lastResponse.value = response
  }

  return { lastResponse, setLastResponse }
}
