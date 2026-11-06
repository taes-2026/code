export const CATEGORIES: Record<string, string> = {
  fruits: 'Frutas',
  vegetables: 'Legumes',
  meat: 'Carnes',
  fish: 'Peixe',
  dairy: 'Laticínios',
  pantry: 'Mercearia',
  drinks: 'Bebidas',
  frozen: 'Congelados',
  other: 'Outros',
}

export const UNITS = {
  unit: 'Unidade(s)',
  kg: 'kg',
  g: 'g',
  l: 'L',
  ml: 'ml',
  pack: 'Embalagem',
} as const

export type ItemCategory = keyof typeof CATEGORIES | (string & {})
export type ItemUnit = keyof typeof UNITS
