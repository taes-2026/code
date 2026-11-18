import { find, save } from '@/lib/storage'
import type { RecipeBookmark, RecipeCollection, RecipeReference } from '@/types/bookmark'

export function findAllBookmarks(): RecipeBookmark[] {
  return find('bookmarks')
}

export function findBookmark(recipeId: number): RecipeBookmark | null {
  return findAllBookmarks().find((bookmark) => bookmark.id === recipeId) ?? null
}

export function isBookmarked(recipeId: number): boolean {
  return findBookmark(recipeId) !== null
}

export function addBookmark(reference: RecipeReference): RecipeBookmark {
  const existing = findBookmark(reference.id)

  if (existing) return existing

  const bookmark: RecipeBookmark = {
    id: reference.id,
    title: reference.title,
    image: reference.image,
    collectionIds: [],
    createdAt: new Date().toISOString(),
  }

  save('bookmarks', [...findAllBookmarks(), bookmark])

  return bookmark
}

export function removeBookmark(recipeId: number): void {
  save(
    'bookmarks',
    findAllBookmarks().filter((bookmark) => bookmark.id !== recipeId),
  )
}

export function setBookmarkCollections(recipeId: number, collectionIds: string[]): void {
  const validIds = new Set(findAllCollections().map((collection) => collection.id))
  const uniqueIds = [...new Set(collectionIds)].filter((id) => validIds.has(id))

  save(
    'bookmarks',
    findAllBookmarks().map((bookmark) =>
      bookmark.id === recipeId ? { ...bookmark, collectionIds: uniqueIds } : bookmark,
    ),
  )
}

export function findAllCollections(): RecipeCollection[] {
  return find('collections')
}

export function createCollection(name: string): RecipeCollection {
  const cleanName = name.trim()

  if (!cleanName) throw new Error('Indica o nome da coleção.')

  if (
    findAllCollections().some(
      (collection) => collection.name.toLowerCase() === cleanName.toLowerCase(),
    )
  ) {
    throw new Error('Já existe uma coleção com esse nome.')
  }

  const collection: RecipeCollection = {
    id: crypto.randomUUID(),
    name: cleanName,
    createdAt: new Date().toISOString(),
  }

  save('collections', [...findAllCollections(), collection])

  return collection
}

export function deleteCollection(collectionId: string): void {
  save(
    'collections',
    findAllCollections().filter((collection) => collection.id !== collectionId),
  )

  save(
    'bookmarks',
    findAllBookmarks().map((bookmark) => ({
      ...bookmark,
      collectionIds: bookmark.collectionIds.filter((id) => id !== collectionId),
    })),
  )
}
