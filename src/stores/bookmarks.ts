import { reactive } from 'vue'
import {
  addBookmark,
  createCollection as createStoredCollection,
  deleteCollection as deleteStoredCollection,
  findAllBookmarks,
  findAllCollections,
  removeBookmark,
  setBookmarkCollections,
} from '@/services/bookmarks'
import type { RecipeBookmark, RecipeCollection, RecipeReference } from '@/types/bookmark'

const state = reactive<{
  bookmarks: RecipeBookmark[]
  collections: RecipeCollection[]
}>({
  bookmarks: [],
  collections: [],
})

function refresh(): void {
  state.bookmarks = findAllBookmarks()
  state.collections = findAllCollections()
}

refresh()

export function useBookmarks() {
  function isBookmarked(recipeId: number): boolean {
    return state.bookmarks.some((bookmark) => bookmark.id === recipeId)
  }

  function toggle(reference: RecipeReference): void {
    if (isBookmarked(reference.id)) removeBookmark(reference.id)
    else addBookmark(reference)

    refresh()
  }

  function setCollections(recipeId: number, collectionIds: string[]): void {
    setBookmarkCollections(recipeId, collectionIds)
    refresh()
  }

  function createCollection(name: string): RecipeCollection {
    const collection = createStoredCollection(name)

    refresh()

    return collection
  }

  function deleteCollection(collectionId: string): void {
    deleteStoredCollection(collectionId)
    refresh()
  }

  function bookmarksOf(collectionId: string | null): RecipeBookmark[] {
    const bookmarks = [...state.bookmarks].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    if (collectionId === null) return bookmarks

    return bookmarks.filter((bookmark) => bookmark.collectionIds.includes(collectionId))
  }

  return {
    state,
    isBookmarked,
    toggle,
    setCollections,
    createCollection,
    deleteCollection,
    bookmarksOf,
  }
}
