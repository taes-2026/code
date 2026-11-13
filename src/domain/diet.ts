export const DIETS = {
  omnivore: 'Omnívoro',
  vegetarian: 'Vegetariano',
  vegan: 'Vegano',
  pescatarian: 'Pescetariano',
} as const

export const ALLERGIES = {
  lactose: 'Lactose',
  peanuts: 'Amendoins',
} as const

export const RESTRICTIONS = {
  gluten: 'Glúten',
  pork: 'Porco',
  sugar: 'Açucar',
} as const

export type Diet = keyof typeof DIETS
export type Allergy = keyof typeof ALLERGIES
export type Restriction = keyof typeof RESTRICTIONS
