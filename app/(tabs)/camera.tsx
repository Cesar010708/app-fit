import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  Alert, ScrollView, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { analyzeFoodPhoto } from '../../lib/vision';
import { Ingredient, FoodEntry, COLORS, MEAL_LABELS } from '../../lib/types';

type MealType = FoodEntry['meal_type'];
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function todayDate() { return new Date().toISOString().split('T')[0]; }

interface EditIngredient extends Ingredient {
  qty: number;   // cantidad actual (empieza en lo que detecto la IA)
  step: number;  // cuanto sube/baja cada presion de +/-
}

function inferStep(unit: string): number {
  const u = unit.toLowerCase();
  if (u.includes('mitad') || u.includes('medio') || u.includes('cuarto') || u.includes('half')) return 0.5;
  if (u.includes('g') || u.includes('ml') || u.includes('gramo')) return 25;
  return 1;
}

function formatQty(qty: number, unit: string): string {
  const u = unit.toLowerCase();
  if (u.includes('mitad') || u.includes('medio')) {
    if (qty === 0.5) return '½';
    if (qty === 1) return '1';
    if (qty === 1.5) return '1½';
    return qty.toString();
  }
  return qty % 1 === 0 ? qty.toString() : qty.toFixed(1);
}

function calcTotals(ings: EditIngredient[]) {
  return ings.reduce(
    (acc, ing) => ({
      calories: acc.calories + ing.cal_per_unit * ing.qty,
      protein: acc.protein + ing.protein_per_unit * ing.qty,
      carbs: acc.carbs + ing.carbs_per_unit * ing.qty,
      fat: acc.fat + ing.fat_per_unit * ing.qty,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export default function CameraScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [dishName, setDishName] = useState('');
  const [ingredients, setIngredients] = useState<EditIngredient[]>([]);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [newIngName, setNewIngName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const router = useRouter();

  const pickImage = async (useCamera: boolean) => {
    let result;
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a la camara'); return; }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a la galeria'); return; }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    }
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setHasAnalysis(false);
      setIngredients([]);
    }
  };

  const handleAnalyze = async () => {
    if (!imageUri) return;
    setAnalyzing(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
      const result = await analyzeFoodPhoto(base64);
      setDishName(result.name);
      setIngredients(result.ingredients.map((ing) => ({
        ...ing,
        qty: ing.quantity,
        step: inferStep(ing.unit),
      })));
      setHasAnalysis(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo analizar la imagen');
    } finally {
      setAnalyzing(false);
    }
  };

  const changeQty = (index: number, delta: number) => {
    setIngredients((prev) => prev.map((ing, i) => {
      if (i !== index) return ing;
      const next = Math.max(0, parseFloat((ing.qty + delta).toFixed(2)));
      return { ...ing, qty: next };
    }));
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const addManualIngredient = () => {
    if (!newIngName.trim()) return;
    setIngredients((prev) => [...prev, {
      name: newIngName.trim(),
      unit: 'unidad',
      quantity: 1,
      qty: 1,
      step: 1,
      cal_per_unit: 0,
      protein_per_unit: 0,
      carbs_per_unit: 0,
      fat_per_unit: 0,
    }]);
    setNewIngName('');
    setShowAddForm(false);
  };

  const handleSave = async () => {
    const active = ingredients.filter((ing) => ing.qty > 0);
    if (!dishName.trim() || active.length === 0) {
      Alert.alert('Error', 'Agrega al menos un ingrediente con cantidad mayor a 0');
      return;
    }
    const totals = calcTotals(active);
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase.from('food_entries').insert({
      user_id: user.id,
      date: todayDate(),
      meal_type: mealType,
      food_name: dishName.trim(),
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
      ai_analyzed: true,
    });

    setSaving(false);
    if (error) { Alert.alert('Error', 'No se pudo guardar'); return; }
    Alert.alert('Guardado', `${dishName} agregado a ${MEAL_LABELS[mealType]}`, [
      { text: 'OK', onPress: () => { setImageUri(null); setHasAnalysis(false); router.replace('/(tabs)'); } },
    ]);
  };

  const totals = calcTotals(ingredients.filter((i) => i.qty > 0));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Analizar con IA</Text>
          <Text style={styles.subtitle}>La IA detecta cada ingrediente — tu ajustas las cantidades</Text>

          {!imageUri ? (
            <View style={styles.pickContainer}>
              <TouchableOpacity style={styles.pickBtn} onPress={() => pickImage(true)}>
                <Ionicons name="camera" size={40} color={COLORS.white} />
                <Text style={styles.pickText}>Tomar foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pickBtn, styles.pickBtnSecondary]} onPress={() => pickImage(false)}>
                <Ionicons name="images-outline" size={40} color={COLORS.primary} />
                <Text style={[styles.pickText, { color: COLORS.primary }]}>Elegir de galeria</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.imageContainer}>
                <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
                <TouchableOpacity style={styles.resetBtn} onPress={() => { setImageUri(null); setHasAnalysis(false); }}>
                  <Ionicons name="close" size={14} color={COLORS.white} />
                  <Text style={styles.resetBtnText}>Cambiar</Text>
                </TouchableOpacity>
              </View>

              {!hasAnalysis && !analyzing && (
                <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze}>
                  <Ionicons name="search" size={20} color={COLORS.white} />
                  <Text style={styles.analyzeBtnText}>Analizar ingredientes</Text>
                </TouchableOpacity>
              )}

              {analyzing && (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Identificando ingredientes...</Text>
                </View>
              )}

              {hasAnalysis && (
                <View style={styles.resultCard}>
                  <TextInput
                    style={styles.nameInput}
                    value={dishName}
                    onChangeText={setDishName}
                    placeholder="Nombre del plato"
                    placeholderTextColor={COLORS.gray400}
                  />

                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>Ingredientes</Text>
                    <TouchableOpacity onPress={handleAnalyze} style={styles.reanalyzeBtn}>
                      <Ionicons name="refresh" size={14} color={COLORS.secondary} />
                      <Text style={styles.reanalyzeBtnText}>Re-analizar</Text>
                    </TouchableOpacity>
                  </View>

                  {ingredients.map((ing, i) => {
                    const cal = Math.round(ing.cal_per_unit * ing.qty);
                    return (
                      <View key={i} style={[styles.ingRow, ing.qty === 0 && styles.ingRowDisabled]}>
                        <View style={styles.ingLeft}>
                          <Text style={[styles.ingName, ing.qty === 0 && styles.ingNameDisabled]} numberOfLines={1}>
                            {ing.name}
                          </Text>
                          <Text style={styles.ingUnit}>{ing.unit}</Text>
                        </View>

                        <View style={styles.ingControls}>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => changeQty(i, -ing.step)}
                            disabled={ing.qty === 0}
                          >
                            <Ionicons name="remove" size={18} color={ing.qty === 0 ? COLORS.gray200 : COLORS.gray700} />
                          </TouchableOpacity>

                          <Text style={styles.qtyText}>{formatQty(ing.qty, ing.unit)}</Text>

                          <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(i, ing.step)}>
                            <Ionicons name="add" size={18} color={COLORS.primary} />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.ingCalBox}>
                          <Text style={[styles.ingCal, { opacity: ing.qty === 0 ? 0.3 : 1 }]}>{cal}</Text>
                          <Text style={styles.ingCalLabel}>kcal</Text>
                        </View>

                        <TouchableOpacity onPress={() => removeIngredient(i)} style={styles.removeBtn} hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}>
                          <Ionicons name="trash-outline" size={16} color={COLORS.gray400} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  {/* Agregar ingrediente extra */}
                  {!showAddForm ? (
                    <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddForm(true)}>
                      <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.addBtnText}>Agregar ingrediente</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.addForm}>
                      <TextInput
                        style={styles.addInput}
                        placeholder="Nombre del ingrediente"
                        placeholderTextColor={COLORS.gray400}
                        value={newIngName}
                        onChangeText={setNewIngName}
                        autoFocus
                      />
                      <View style={styles.addFormBtns}>
                        <TouchableOpacity style={styles.addFormCancel} onPress={() => { setShowAddForm(false); setNewIngName(''); }}>
                          <Text style={styles.addFormCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.addFormConfirm} onPress={addManualIngredient}>
                          <Text style={styles.addFormConfirmText}>Agregar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Totales */}
                  <View style={styles.totalsBox}>
                    <View style={styles.totalItem}>
                      <Text style={[styles.totalVal, { color: COLORS.primary }]}>{Math.round(totals.calories)}</Text>
                      <Text style={styles.totalLbl}>kcal</Text>
                    </View>
                    <View style={styles.totalDivider} />
                    <View style={styles.totalItem}>
                      <Text style={[styles.totalVal, { color: COLORS.protein }]}>{Math.round(totals.protein)}g</Text>
                      <Text style={styles.totalLbl}>Proteina</Text>
                    </View>
                    <View style={styles.totalDivider} />
                    <View style={styles.totalItem}>
                      <Text style={[styles.totalVal, { color: COLORS.carbs }]}>{Math.round(totals.carbs)}g</Text>
                      <Text style={styles.totalLbl}>Carbos</Text>
                    </View>
                    <View style={styles.totalDivider} />
                    <View style={styles.totalItem}>
                      <Text style={[styles.totalVal, { color: COLORS.fat }]}>{Math.round(totals.fat)}g</Text>
                      <Text style={styles.totalLbl}>Grasas</Text>
                    </View>
                  </View>

                  {/* Tipo de comida */}
                  <Text style={styles.sectionLabel}>Agregar como</Text>
                  <View style={styles.mealTabs}>
                    {MEAL_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.mealTab, mealType === type && styles.mealTabActive]}
                        onPress={() => setMealType(type)}
                      >
                        <Text style={[styles.mealTabText, mealType === type && styles.mealTabTextActive]}>
                          {MEAL_LABELS[type]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity style={[styles.saveBtn, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving}>
                    <Ionicons name="checkmark" size={20} color={COLORS.white} />
                    <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Agregar al registro'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.gray900, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.gray400, paddingHorizontal: 20, marginBottom: 20 },
  pickContainer: { padding: 16, gap: 12 },
  pickBtn: { backgroundColor: COLORS.primary, borderRadius: 20, padding: 32, alignItems: 'center', gap: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  pickBtnSecondary: { backgroundColor: COLORS.primaryLight, shadowColor: 'transparent', elevation: 0 },
  pickText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  imageContainer: { margin: 16, borderRadius: 20, overflow: 'hidden' },
  image: { width: '100%', height: 220 },
  resetBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  resetBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  analyzeBtn: { backgroundColor: COLORS.primary, borderRadius: 14, margin: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  analyzeBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  loadingBox: { alignItems: 'center', padding: 32 },
  loadingText: { color: COLORS.gray500, fontSize: 14, marginTop: 12 },
  resultCard: { backgroundColor: COLORS.white, margin: 16, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, marginBottom: 32, gap: 4 },
  nameInput: { fontSize: 18, fontWeight: '800', color: COLORS.gray900, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: COLORS.primary, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.gray400, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 8 },
  reanalyzeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reanalyzeBtnText: { fontSize: 12, color: COLORS.secondary, fontWeight: '600' },
  ingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.gray100, gap: 8 },
  ingRowDisabled: { opacity: 0.4 },
  ingLeft: { flex: 1 },
  ingName: { fontSize: 14, fontWeight: '600', color: COLORS.gray900 },
  ingNameDisabled: { textDecorationLine: 'line-through' },
  ingUnit: { fontSize: 11, color: COLORS.gray400, marginTop: 1 },
  ingControls: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.gray100, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 16, fontWeight: '800', color: COLORS.gray900, minWidth: 32, textAlign: 'center' },
  ingCalBox: { alignItems: 'flex-end', minWidth: 48 },
  ingCal: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  ingCalLabel: { fontSize: 10, color: COLORS.gray400 },
  removeBtn: { padding: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.gray200, borderStyle: 'dashed', marginTop: 8 },
  addBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  addForm: { backgroundColor: COLORS.gray50, borderRadius: 12, padding: 12, marginTop: 8, gap: 10 },
  addInput: { backgroundColor: COLORS.white, borderRadius: 10, padding: 12, fontSize: 15, color: COLORS.gray900, borderWidth: 1, borderColor: COLORS.gray200 },
  addFormBtns: { flexDirection: 'row', gap: 8 },
  addFormCancel: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: COLORS.gray100, alignItems: 'center' },
  addFormCancelText: { color: COLORS.gray500, fontWeight: '600' },
  addFormConfirm: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  addFormConfirmText: { color: COLORS.white, fontWeight: '700' },
  totalsBox: { flexDirection: 'row', backgroundColor: COLORS.gray50, borderRadius: 14, padding: 14, marginTop: 12, alignItems: 'center' },
  totalItem: { flex: 1, alignItems: 'center' },
  totalVal: { fontSize: 18, fontWeight: '800' },
  totalLbl: { fontSize: 10, color: COLORS.gray400, marginTop: 2, fontWeight: '600' },
  totalDivider: { width: 1, height: 32, backgroundColor: COLORS.gray200 },
  mealTabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  mealTab: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.gray100 },
  mealTabActive: { backgroundColor: COLORS.primary },
  mealTabText: { fontSize: 13, fontWeight: '600', color: COLORS.gray500 },
  mealTabTextActive: { color: COLORS.white },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
