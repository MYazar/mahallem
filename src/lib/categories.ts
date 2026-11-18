import {
  Car,
  CircleHelp,
  Construction,
  Droplets,
  Lightbulb,
  Trash2,
  TreePine,
  Volume2,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryId } from './types'

export interface CategoryDef {
  id: CategoryId
  label: string
  shortLabel: string
  emoji: string
  color: string
  soft: string
  icon: LucideIcon
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'road',
    label: 'Yol & Kaldırım',
    shortLabel: 'Yol',
    emoji: '🚧',
    color: '#d97706',
    soft: '#fef3c7',
    icon: Construction,
  },
  {
    id: 'lighting',
    label: 'Aydınlatma',
    shortLabel: 'Aydınlatma',
    emoji: '💡',
    color: '#ca8a04',
    soft: '#fef9c3',
    icon: Lightbulb,
  },
  {
    id: 'waste',
    label: 'Çöp & Temizlik',
    shortLabel: 'Çöp',
    emoji: '🗑️',
    color: '#16a34a',
    soft: '#dcfce7',
    icon: Trash2,
  },
  {
    id: 'water',
    label: 'Su & Kanalizasyon',
    shortLabel: 'Su',
    emoji: '💧',
    color: '#0284c7',
    soft: '#e0f2fe',
    icon: Droplets,
  },
  {
    id: 'green',
    label: 'Park & Yeşil Alan',
    shortLabel: 'Park',
    emoji: '🌳',
    color: '#059669',
    soft: '#d1fae5',
    icon: TreePine,
  },
  {
    id: 'traffic',
    label: 'Trafik & Otopark',
    shortLabel: 'Trafik',
    emoji: '🚗',
    color: '#e11d48',
    soft: '#ffe4e6',
    icon: Car,
  },
  {
    id: 'noise',
    label: 'Gürültü & Çevre',
    shortLabel: 'Gürültü',
    emoji: '🔊',
    color: '#7c3aed',
    soft: '#ede9fe',
    icon: Volume2,
  },
  {
    id: 'other',
    label: 'Diğer',
    shortLabel: 'Diğer',
    emoji: '❓',
    color: '#64748b',
    soft: '#f1f5f9',
    icon: CircleHelp,
  },
]

const byId = new Map(CATEGORIES.map((category) => [category.id, category]))

export function getCategory(id: CategoryId): CategoryDef {
  return byId.get(id) ?? CATEGORIES[CATEGORIES.length - 1]
}
