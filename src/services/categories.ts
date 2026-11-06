import { find, save } from '@/lib/storage'
import { CATEGORIES as DEFAULT_CATEGORIES } from '@/domain/items'

export function getCategories(): Record<string, string> {
  const stored = find('categories');
  
  if (Object.keys(stored).length === 0) {
    return { ...DEFAULT_CATEGORIES };
  }
  return stored;
}

export function createCategory(label: string): string {
  const key = label.toLowerCase().replace(/\s+/g, '_');
  const categories = getCategories();

  if (!categories[key]) {
    categories[key] = label;
    save('categories', categories); 
  }
  
  return key;
}