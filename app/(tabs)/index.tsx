import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, StatusBar } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { FoodEntry, UserProfile, COLORS, MEAL_LABELS } from '../../lib/types';
import { CalorieRing } from '../../components/CalorieRing';
import { MacroRing } from '../../components/MacroRing';
import { WaterTracker } from '../../components/WaterTracker';
import { FoodCard } from '../../components/FoodCard';

const DEFAULT_GOALS = { goal_calories: 2000, goal_protein: 150, goal_carbs: 250, goal_fat: 65, goal_water: 8 };

const MEAL_ICONS: Record<FoodEntry['meal_type'], React.ComponentProps<typeof Ionicons>['name']> = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  dinner: 'moon-outline',
  snack: 'leaf-outline',
};

function todayDate() { return new Date().toISOString().split('T')[0]; }
function waterKey() { return `water_${todayDate()}`; }

function groupByMeal(entries: FoodEntry[]) {
  const order: FoodEntry['meal_type'][] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const groups: Record<string, FoodEntry[]> = {};
  for (const m of order) groups[m] = [];
  for (const e of entries) groups[e.meal_type]?.push(e);
  return order.filter((m) => groups[m].length > 0).map((m) => ({ type: m, entries: groups[m] }));
}

async function calculateStreak(userId: string): Promise<number> {
  const { data } = await supabase.from('food_entries').select('date').eq('user_id', userId).order('date', { ascending: false });
  if (!data || data.length === 0) return 0;
  const uniqueDates = [...new Set(data.map((e) => e.date))].sort().reverse();
  let streak = 0;
  let ref = new Date(); ref.setHours(0, 0, 0, 0);
  for (const dateStr of uniqueDates) {
    const d = new Date(dateStr + 'T00:00:00');
    if (Math.round((ref.getTime() - d.getTime()) / 86400000) <= 1) { streak++; ref = d; }
    else break;
  }
  return streak;
}

export default function DashboardScreen() {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [profile, setProfile] = useState<Partial<UserProfile>>(DEFAULT_GOALS);
  const [water, setWater] = useState(0);
  const [streak, setStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: profileData }, { data: entriesData }, waterVal, streakVal] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('food_entries').select('*').eq('user_id', user.id).eq('date', todayDate()).order('created_at'),
      AsyncStorage.getItem(waterKey()),
      calculateStreak(user.id),
    ]);
    if (profileData) setProfile(profileData);
    if (entriesData) setEntries(entriesData);
    setWater(waterVal ? parseInt(waterVal) : 0);
    setStreak(streakVal);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const updateWater = async (next: number) => {
    const v = Math.max(0, next); setWater(v);
    await AsyncStorage.setItem(waterKey(), v.toString());
  };

  const totals = entries.reduce(
    (acc, e) => ({ calories: acc.calories + e.calories, protein: acc.protein + e.protein, carbs: acc.carbs + e.carbs, fat: acc.fat + e.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const goals = { ...DEFAULT_GOALS, ...profile };
  const mealGroups = groupByMeal(entries);
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola{profile.name ? `, ${profile.name}` : ''}</Text>
            <Text style={styles.date}>{today.charAt(0).toUpperCase() + today.slice(1)}</Text>
          </View>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={18} color={COLORS.streak} />
              <Text style={styles.streakText}>{streak}</Text>
              <Text style={styles.streakLabel}>racha</Text>
            </View>
          )}
        </View>

        <View style={styles.calorieCard}>
          <CalorieRing current={totals.calories} goal={goals.goal_calories} />
        </View>

        <View style={styles.macroCard}>
          <MacroRing label="Proteina" current={totals.protein} goal={goals.goal_protein} color={COLORS.protein} bgColor={COLORS.proteinLight} />
          <View style={styles.divider} />
          <MacroRing label="Carbos" current={totals.carbs} goal={goals.goal_carbs} color={COLORS.carbs} bgColor={COLORS.carbsLight} />
          <View style={styles.divider} />
          <MacroRing label="Grasas" current={totals.fat} goal={goals.goal_fat} color={COLORS.fat} bgColor={COLORS.fatLight} />
        </View>

        <View style={styles.section}>
          <WaterTracker cups={water} goal={goals.goal_water} onAdd={() => updateWater(water + 1)} onRemove={() => updateWater(water - 1)} />
        </View>

        <View style={styles.section}>
          <View style={styles.mealsHeader}>
            <Text style={styles.sectionTitle}>Comidas de hoy</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => router.push('/(tabs)/camera')} style={styles.iaBtn}>
                <Ionicons name="camera-outline" size={16} color={COLORS.secondary} />
                <Text style={styles.iaBtnText}>Analizar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/(tabs)/log')} style={styles.addBtn}>
                <Ionicons name="add" size={16} color={COLORS.primaryDark} />
                <Text style={styles.addBtnText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {mealGroups.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={52} color={COLORS.gray200} />
              <Text style={styles.emptyTitle}>Sin registros hoy</Text>
              <Text style={styles.emptyText}>Registra tus comidas para llevar el control de tus macros</Text>
              <View style={styles.emptyActions}>
                <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/(tabs)/log')}>
                  <Ionicons name="create-outline" size={16} color={COLORS.white} />
                  <Text style={styles.ctaBtnText}>Manual</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.ctaBtn, styles.ctaBtnSecondary]} onPress={() => router.push('/(tabs)/camera')}>
                  <Ionicons name="camera-outline" size={16} color={COLORS.secondary} />
                  <Text style={[styles.ctaBtnText, styles.ctaBtnTextSecondary]}>Con foto</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            mealGroups.map(({ type, entries: mealEntries }) => {
              const mealCal = mealEntries.reduce((s, e) => s + e.calories, 0);
              return (
                <View key={type} style={styles.mealGroup}>
                  <View style={styles.mealGroupHeader}>
                    <Ionicons name={MEAL_ICONS[type]} size={16} color={COLORS.gray500} />
                    <Text style={styles.mealTitle}>{MEAL_LABELS[type]}</Text>
                    <Text style={styles.mealCal}>{Math.round(mealCal)} kcal</Text>
                  </View>
                  {mealEntries.map((entry) => (
                    <FoodCard key={entry.id} entry={entry} onDelete={load} />
                  ))}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.gray900 },
  date: { fontSize: 13, color: COLORS.gray400, marginTop: 2 },
  streakBadge: { backgroundColor: COLORS.streakLight, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  streakText: { fontSize: 20, fontWeight: '800', color: COLORS.streak, lineHeight: 22 },
  streakLabel: { fontSize: 10, color: COLORS.streak, fontWeight: '600' },
  calorieCard: { backgroundColor: COLORS.white, marginHorizontal: 16, marginVertical: 8, borderRadius: 24, paddingVertical: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  macroCard: { backgroundColor: COLORS.white, marginHorizontal: 16, marginBottom: 8, borderRadius: 24, padding: 20, flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  divider: { width: 1, backgroundColor: COLORS.gray100, marginHorizontal: 4 },
  section: { marginHorizontal: 16, marginBottom: 8 },
  mealsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.gray900 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iaBtn: { backgroundColor: COLORS.secondaryLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  iaBtnText: { color: COLORS.secondary, fontWeight: '700', fontSize: 13 },
  addBtn: { backgroundColor: COLORS.primaryLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: 13 },
  mealGroup: { marginBottom: 16 },
  mealGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  mealTitle: { fontSize: 15, fontWeight: '700', color: COLORS.gray700, flex: 1 },
  mealCal: { fontSize: 13, fontWeight: '600', color: COLORS.gray400 },
  emptyState: { alignItems: 'center', paddingVertical: 28, backgroundColor: COLORS.white, borderRadius: 20, padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.gray900, marginTop: 12, marginBottom: 6 },
  emptyText: { fontSize: 13, color: COLORS.gray400, textAlign: 'center', marginBottom: 20 },
  emptyActions: { flexDirection: 'row', gap: 12, width: '100%' },
  ctaBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 14, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  ctaBtnSecondary: { backgroundColor: COLORS.secondaryLight },
  ctaBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  ctaBtnTextSecondary: { color: COLORS.secondary },
});
