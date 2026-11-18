export interface RecipeReference {
  id: number
  title: string
  image: string
}

export interface RecipeBookmark extends RecipeReference {
  collectionIds: string[]
  createdAt: string
}

export interface RecipeCollection {
  id: string
  name: string
  createdAt: string
}
