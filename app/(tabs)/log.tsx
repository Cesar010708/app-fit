import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { FoodEntry, COLORS, MEAL_LABELS, MEAL_EMOJIS, QUICK_FOODS, QuickFood } from '../../lib/types';

type MealType = FoodEntry['meal_type'];
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

export default function LogScreen() {
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  const fillFromQuick = (food: QuickFood) => {
    setFoodName(food.name);
    setCalories(food.calories.toString());
    setProtein(food.protein.toString());
    setCarbs(food.carbs.toString());
    setFat(food.fat.toString());
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!foodName.trim()) { Alert.alert('Error', 'Ingresa el nombre del alimento'); return; }
    if (!calories) { Alert.alert('Error', 'Ingresa las calorías'); return; }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { error } = await supabase.from('food_entries').insert({
      user_id: user.id,
      date: todayDate(),
      meal_type: mealType,
      food_name: foodName.trim(),
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      ai_analyzed: false,
    });

    setLoading(false);
    if (error) { Alert.alert('Error', 'No se pudo guardar el registro'); return; }

    Alert.alert('¡Listo! ✅', `"${foodName}" registrado en ${MEAL_LABELS[mealType]}`, [
      { text: 'OK', onPress: () => router.replace('/(tabs)') },
    ]);
  };

  const clear = () => { setFoodName(''); setCalories(''); setProtein(''); setCarbs(''); setFat(''); };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Registrar comida</Text>

          {/* Meal type selector */}
          <View style={styles.mealSelector}>
            {MEAL_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.mealTab, mealType === type && styles.mealTabActive]}
                onPress={() => setMealType(type)}
              >
                <Text style={styles.mealEmoji}>{MEAL_EMOJIS[type]}</Text>
                <Text style={[styles.mealTabText, mealType === type && styles.mealTabTextActive]}>
                  {MEAL_LABELS[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick foods */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Alimentos rápidos</Text>
            <Text style={styles.sectionSub}>Toca uno para agregar al formulario</Text>
            <View style={styles.quickGrid}>
              {QUICK_FOODS.map((food) => (
                <TouchableOpacity
                  key={food.name}
                  style={styles.quickCard}
                  onPress={() => fillFromQuick(food)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickEmoji}>{food.emoji}</Text>
                  <Text style={styles.quickName} numberOfLines={2}>{food.name}</Text>
                  <Text style={styles.quickCal}>{food.calories} kcal</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Manual entry */}
          <TouchableOpacity
            style={styles.manualToggle}
            onPress={() => setShowForm(!showForm)}
          >
            <Text style={styles.manualToggleText}>
              {showForm ? '▾ Ocultar formulario' : '✏️ Ingresar manualmente'}
            </Text>
          </TouchableOpacity>

          {showForm && (
            <View style={styles.formCard}>
              <Text style={styles.label}>Nombre del alimento *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Pechuga de pollo a la plancha"
                placeholderTextColor={COLORS.gray400}
                value={foodName}
                onChangeText={setFoodName}
              />

              <Text style={styles.label}>Calorías (kcal) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={COLORS.gray400}
                value={calories}
                onChangeText={setCalories}
                keyboardType="decimal-pad"
              />

              <Text style={styles.sectionTitle}>Macronutrientes (g)</Text>
              <View style={styles.macroRow}>
                {([
                  { label: 'Proteína', key: 'protein', color: COLORS.protein, val: protein, set: setProtein },
                  { label: 'Carbos', key: 'carbs', color: COLORS.carbs, val: carbs, set: setCarbs },
                  { label: 'Grasas', key: 'fat', color: COLORS.fat, val: fat, set: setFat },
                ] as const).map(({ label, color, val, set }) => (
                  <View key={label} style={styles.macroField}>
                    <Text style={[styles.macroLabel, { color }]}>{label}</Text>
                    <TextInput
                      style={[styles.macroInput, { borderColor: color + '40' }]}
                      placeholder="0"
                      placeholderTextColor={COLORS.gray400}
                      value={val}
                      onChangeText={set}
                      keyboardType="decimal-pad"
                    />
                  </View>
                ))}
              </View>

              <View style={styles.buttons}>
                <TouchableOpacity style={styles.clearBtn} onPress={clear}>
                  <Text style={styles.clearBtnText}>Limpiar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, loading && styles.btnDisabled]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  <Text style={styles.saveBtnText}>{loading ? 'Guardando...' : 'Guardar ✓'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!showForm && foodName ? (
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Listo para guardar:</Text>
              <Text style={styles.previewFood}>{MEAL_EMOJIS[mealType]} {foodName}</Text>
              <Text style={styles.previewMacros}>
                {calories} kcal · {protein}g P · {carbs}g C · {fat}g G
              </Text>
              <TouchableOpacity
                style={[styles.saveBtn, loading && styles.btnDisabled]}
                onPress={handleSave}
                disabled={loading}
              >
                <Text style={styles.saveBtnText}>{loading ? 'Guardando...' : `Guardar en ${MEAL_LABELS[mealType]} ✓`}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.gray900, padding: 20, paddingBottom: 12 },
  mealSelector: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 16,
    backgroundColor: COLORS.white, borderRadius: 18, padding: 6, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  mealTab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14 },
  mealTabActive: { backgroundColor: COLORS.primary },
  mealEmoji: { fontSize: 16, marginBottom: 2 },
  mealTabText: { fontSize: 10, fontWeight: '600', color: COLORS.gray400 },
  mealTabTextActive: { color: COLORS.white },
  section: { marginHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.gray900, marginBottom: 4 },
  sectionSub: { fontSize: 12, color: COLORS.gray400, marginBottom: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 12,
    width: '30%', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  quickEmoji: { fontSize: 26, marginBottom: 6 },
  quickName: { fontSize: 11, fontWeight: '600', color: COLORS.gray700, textAlign: 'center', marginBottom: 4 },
  quickCal: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  manualToggle: {
    marginHorizontal: 16, marginBottom: 12, padding: 14,
    backgroundColor: COLORS.white, borderRadius: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.gray200, borderStyle: 'dashed',
  },
  manualToggleText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  formCard: {
    backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: 20,
    padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.gray700, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORS.gray100, borderRadius: 12, padding: 14, fontSize: 15, color: COLORS.gray900 },
  macroRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  macroField: { flex: 1 },
  macroLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  macroInput: {
    backgroundColor: COLORS.gray100, borderRadius: 10, padding: 12,
    fontSize: 16, color: COLORS.gray900, textAlign: 'center', borderWidth: 1.5,
  },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 20 },
  clearBtn: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', backgroundColor: COLORS.gray100 },
  clearBtnText: { color: COLORS.gray500, fontSize: 14, fontWeight: '600' },
  saveBtn: { flex: 2, backgroundColor: COLORS.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  saveBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  previewCard: {
    backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  previewTitle: { fontSize: 13, color: COLORS.gray400, marginBottom: 6 },
  previewFood: { fontSize: 18, fontWeight: '700', color: COLORS.gray900, marginBottom: 4 },
  previewMacros: { fontSize: 13, color: COLORS.gray500, marginBottom: 16 },
});
