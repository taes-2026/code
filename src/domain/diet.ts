export const DIETS = {
  omnivore: 'Omnívoro',
  vegetarian: 'Vegetariano',
  vegan: 'Vegano',
  pescetarian: 'Pescetariano',
  
} as const

export const INTOLERANCES = {
  dairy: 'Lactose',
  gluten: 'Glúten',
  peanut: 'Amendoins',
  egg: 'Ovos',
  grain: 'Cereais',
  seafood: 'Frutos do mar',
  sesame: 'Sésamo',
  shellfish: 'Crustáceos',
  soy: 'Soja',
  sulfite: 'Sulfito',
  treenut: 'Frutos secos',
  wheat: 'Trigo',
} as const

export const RESTRICTIONS = {
  pork: 'Carne de Porco',
  sugar: 'Açúcar',
  beef: 'Carne de vaca',
  alcohol: 'Álcool',
} as const

export type Diet = keyof typeof DIETS
export type Intolerance = keyof typeof INTOLERANCES
export type Restriction = keyof typeof RESTRICTIONS
