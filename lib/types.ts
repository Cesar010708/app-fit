export interface UserProfile {
  id: string;
  name: string;
  age: number;
  weight: number;
  height: number;
  sex: string;
  activity_level: string;
  gym_frequency: string;
  goal: string;
  goal_calories: number;
  goal_protein: number;
  goal_carbs: number;
  goal_fat: number;
  goal_water: number;
}

export interface FoodEntry {
  id: string;
  user_id: string;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  photo_url?: string;
  ai_analyzed: boolean;
  created_at: string;
}

export interface Ingredient {
  name: string;
  unit: string;
  quantity: number;
  cal_per_unit: number;
  protein_per_unit: number;
  carbs_per_unit: number;
  fat_per_unit: number;
}

export interface FoodAnalysis {
  name: string;
  description: string;
  ingredients: Ingredient[];
}

export interface QuickFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  emoji: string;
}

export const MEAL_LABELS: Record<FoodEntry['meal_type'], string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack',
};

export const MEAL_ICONS: Record<FoodEntry['meal_type'], string> = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  dinner: 'moon-outline',
  snack: 'leaf-outline',
};

export const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  primaryGradient: '#34D399',
  secondary: '#6366F1',
  secondaryLight: '#EEF2FF',
  background: '#F0FDF4',
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  gray900: '#111827',
  protein: '#F59E0B',
  proteinLight: '#FEF3C7',
  carbs: '#3B82F6',
  carbsLight: '#DBEAFE',
  fat: '#EF4444',
  fatLight: '#FEE2E2',
  calories: '#10B981',
  water: '#38BDF8',
  waterLight: '#E0F2FE',
  streak: '#F97316',
  streakLight: '#FFEDD5',
  card: '#FFFFFF',
  shadow: 'rgba(0, 0, 0, 0.06)',
};

export const QUICK_FOODS: QuickFood[] = [
  { name: 'Cafe con leche', calories: 120, protein: 4, carbs: 12, fat: 5, emoji: '☕' },
  { name: 'Huevo entero', calories: 78, protein: 6, carbs: 1, fat: 5, emoji: '🥚' },
  { name: 'Arroz blanco (1 taza)', calories: 206, protein: 4, carbs: 45, fat: 0, emoji: '🍚' },
  { name: 'Pechuga de pollo (100g)', calories: 165, protein: 31, carbs: 0, fat: 4, emoji: '🍗' },
  { name: 'Platano mediano', calories: 105, protein: 1, carbs: 27, fat: 0, emoji: '🍌' },
  { name: 'Manzana mediana', calories: 95, protein: 0, carbs: 25, fat: 0, emoji: '🍎' },
  { name: 'Avena (1 taza cocida)', calories: 158, protein: 6, carbs: 27, fat: 3, emoji: '🥣' },
  { name: 'Pan integral (1 rebanada)', calories: 69, protein: 4, carbs: 12, fat: 1, emoji: '🍞' },
  { name: 'Leche (1 vaso 250ml)', calories: 122, protein: 8, carbs: 12, fat: 5, emoji: '🥛' },
  { name: 'Yogur natural (150g)', calories: 88, protein: 5, carbs: 12, fat: 2, emoji: '🫙' },
  { name: 'Atun en lata (100g)', calories: 116, protein: 26, carbs: 0, fat: 1, emoji: '🐟' },
  { name: 'Aguacate (1/2)', calories: 120, protein: 1, carbs: 6, fat: 11, emoji: '🥑' },
];
