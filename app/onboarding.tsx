import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { COLORS } from '../lib/types';

type Sex = 'male' | 'female';
type DailyActivity = 'desk' | 'light' | 'active';
type GymFrequency = 'never' | 'one_two' | 'three_four' | 'five_plus';
type Goal = 'lose' | 'maintain' | 'gain';

const DAILY_OPTIONS: { key: DailyActivity; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'desk', label: 'Trabajo de escritorio', desc: 'Paso la mayoria del dia sentado', icon: 'laptop-outline' },
  { key: 'light', label: 'Actividad ligera', desc: 'Camino bastante, trabajo de pie ocasional', icon: 'walk-outline' },
  { key: 'active', label: 'Trabajo fisico', desc: 'Estoy en movimiento la mayor parte del dia', icon: 'construct-outline' },
];

const GYM_OPTIONS: { key: GymFrequency; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'never', label: 'No voy al gym', desc: 'No hago ejercicio estructurado', icon: 'close-circle-outline' },
  { key: 'one_two', label: '1 - 2 veces por semana', desc: 'Entreno de vez en cuando', icon: 'barbell-outline' },
  { key: 'three_four', label: '3 - 4 veces por semana', desc: 'Entreno con regularidad', icon: 'barbell-outline' },
  { key: 'five_plus', label: '5 o mas veces por semana', desc: 'Entreno casi todos los dias', icon: 'flash-outline' },
];

const GOAL_OPTIONS: { key: Goal; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'lose', label: 'Perder peso', desc: 'Deficit de 500 kcal/dia (~0.5 kg menos por semana)', icon: 'trending-down-outline', color: COLORS.carbs },
  { key: 'maintain', label: 'Mantener mi peso', desc: 'Comer exactamente lo que gasto', icon: 'remove-outline', color: COLORS.primary },
  { key: 'gain', label: 'Ganar musculo', desc: 'Supravit de 300 kcal/dia para crecer', icon: 'trending-up-outline', color: COLORS.protein },
];

const DAILY_FACTOR: Record<DailyActivity, number> = { desk: 1.2, light: 1.35, active: 1.5 };
const GYM_BONUS: Record<GymFrequency, number> = { never: 0, one_two: 0.1, three_four: 0.2, five_plus: 0.3 };

function calculateGoals(data: { sex: Sex; age: number; weight: number; height: number; daily: DailyActivity; gym: GymFrequency; goal: Goal }) {
  let bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age;
  bmr += data.sex === 'male' ? 5 : -161;

  const factor = Math.min(DAILY_FACTOR[data.daily] + GYM_BONUS[data.gym], 1.9);
  let tdee = bmr * factor;

  if (data.goal === 'lose') tdee -= 500;
  else if (data.goal === 'gain') tdee += 300;

  const calories = Math.round(tdee);
  const protein = Math.round(data.weight * (data.goal === 'maintain' ? 1.8 : 2.0));
  const fat = Math.round((calories * (data.goal === 'gain' ? 0.25 : 0.28)) / 9);
  const carbs = Math.max(Math.round((calories - protein * 4 - fat * 9) / 4), 50);
  return { goal_calories: calories, goal_protein: protein, goal_carbs: carbs, goal_fat: fat };
}

const TOTAL_STEPS = 5;

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [daily, setDaily] = useState<DailyActivity>('desk');
  const [gym, setGym] = useState<GymFrequency>('three_four');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const next = () => {
    if (step === 0 && !name.trim()) { Alert.alert('Ingresa tu nombre'); return; }
    if (step === 1 && (!age || !weight || !height)) { Alert.alert('Completa todos los campos'); return; }
    setStep((s) => s + 1);
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const calculated = age && weight && height
    ? calculateGoals({ sex, age: +age, weight: +weight, height: +height, daily, gym, goal })
    : null;

  const handleFinish = async () => {
    if (!calculated) { Alert.alert('Completa todos los pasos'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      name: name.trim(),
      age: +age,
      weight: +weight,
      height: +height,
      sex,
      activity_level: daily,
      gym_frequency: gym,
      goal,
      goal_calories: calculated.goal_calories,
      goal_protein: calculated.goal_protein,
      goal_carbs: calculated.goal_carbs,
      goal_fat: calculated.goal_fat,
      goal_water: 8,
    });

    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Barra de progreso */}
        <View style={styles.progressBar}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* PASO 0: Nombre y sexo */}
          {step === 0 && (
            <View style={styles.step}>
              <Text style={styles.stepTitle}>Hola, bienvenido</Text>
              <Text style={styles.stepSub}>Cuéntame sobre ti para personalizar tu plan nutricional</Text>

              <Text style={styles.label}>Tu nombre</Text>
              <TextInput style={styles.input} placeholder="Escribe tu nombre" placeholderTextColor={COLORS.gray400} value={name} onChangeText={setName} autoCapitalize="words" autoFocus />

              <Text style={styles.label}>Sexo biologico</Text>
              <View style={styles.sexRow}>
                <TouchableOpacity style={[styles.sexBtn, sex === 'male' && styles.sexBtnActive]} onPress={() => setSex('male')}>
                  <Ionicons name="man-outline" size={28} color={sex === 'male' ? COLORS.white : COLORS.gray500} />
                  <Text style={[styles.sexBtnText, sex === 'male' && styles.sexBtnTextActive]}>Hombre</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.sexBtn, sex === 'female' && styles.sexBtnActive]} onPress={() => setSex('female')}>
                  <Ionicons name="woman-outline" size={28} color={sex === 'female' ? COLORS.white : COLORS.gray500} />
                  <Text style={[styles.sexBtnText, sex === 'female' && styles.sexBtnTextActive]}>Mujer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* PASO 1: Medidas */}
          {step === 1 && (
            <View style={styles.step}>
              <Text style={styles.stepTitle}>Tus medidas</Text>
              <Text style={styles.stepSub}>Con esto calculamos tu metabolismo basal con la formula Mifflin-St Jeor</Text>

              <Text style={styles.label}>Edad</Text>
              <View style={styles.inputRow}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="25" placeholderTextColor={COLORS.gray400} value={age} onChangeText={setAge} keyboardType="number-pad" />
                <Text style={styles.unit}>anos</Text>
              </View>

              <Text style={styles.label}>Peso</Text>
              <View style={styles.inputRow}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="70" placeholderTextColor={COLORS.gray400} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
                <Text style={styles.unit}>kg</Text>
              </View>

              <Text style={styles.label}>Altura</Text>
              <View style={styles.inputRow}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="175" placeholderTextColor={COLORS.gray400} value={height} onChangeText={setHeight} keyboardType="decimal-pad" />
                <Text style={styles.unit}>cm</Text>
              </View>
            </View>
          )}

          {/* PASO 2: Actividad diaria */}
          {step === 2 && (
            <View style={styles.step}>
              <Text style={styles.stepTitle}>Actividad diaria</Text>
              <Text style={styles.stepSub}>Sin contar el gym — solo tu rutina normal de trabajo o vida</Text>
              {DAILY_OPTIONS.map((opt) => (
                <OptionCard key={opt.key} icon={opt.icon} label={opt.label} desc={opt.desc} active={daily === opt.key} color={COLORS.primary} onPress={() => setDaily(opt.key)} />
              ))}
            </View>
          )}

          {/* PASO 3: Frecuencia gym */}
          {step === 3 && (
            <View style={styles.step}>
              <Text style={styles.stepTitle}>Frecuencia en el gym</Text>
              <Text style={styles.stepSub}>Con que frecuencia entrenas o haces ejercicio estructurado</Text>
              {GYM_OPTIONS.map((opt) => (
                <OptionCard key={opt.key} icon={opt.icon} label={opt.label} desc={opt.desc} active={gym === opt.key} color={COLORS.secondary} onPress={() => setGym(opt.key)} />
              ))}
            </View>
          )}

          {/* PASO 4: Objetivo + resultados */}
          {step === 4 && (
            <View style={styles.step}>
              <Text style={styles.stepTitle}>Tu objetivo</Text>
              <Text style={styles.stepSub}>Esto ajusta tus calorias diarias</Text>

              {GOAL_OPTIONS.map((opt) => (
                <OptionCard key={opt.key} icon={opt.icon} label={opt.label} desc={opt.desc} active={goal === opt.key} color={opt.color} onPress={() => setGoal(opt.key)} />
              ))}

              {calculated && (
                <View style={styles.resultsCard}>
                  <Text style={styles.resultsTitle}>Tu plan personalizado</Text>
                  <View style={styles.resultsGrid}>
                    <ResultItem label="Calorias" value={calculated.goal_calories} unit="kcal" color={COLORS.primary} />
                    <ResultItem label="Proteina" value={calculated.goal_protein} unit="g" color={COLORS.protein} />
                    <ResultItem label="Carbos" value={calculated.goal_carbs} unit="g" color={COLORS.carbs} />
                    <ResultItem label="Grasas" value={calculated.goal_fat} unit="g" color={COLORS.fat} />
                  </View>
                  <Text style={styles.resultsNote}>
                    Actividad diaria + gym combinados. Ajusta estos valores en tu perfil cuando quieras.
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Navegacion */}
        <View style={styles.nav}>
          {step > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={back}>
              <Ionicons name="arrow-back" size={20} color={COLORS.gray500} />
              <Text style={styles.backBtnText}>Atras</Text>
            </TouchableOpacity>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <TouchableOpacity style={styles.nextBtn} onPress={next}>
              <Text style={styles.nextBtnText}>Continuar</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.nextBtn, saving && styles.btnDisabled]} onPress={handleFinish} disabled={saving}>
              <Text style={styles.nextBtnText}>{saving ? 'Guardando...' : 'Empezar'}</Text>
              <Ionicons name="checkmark" size={20} color={COLORS.white} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function OptionCard({ icon, label, desc, active, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; desc: string; active: boolean; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.optCard, active && { borderColor: color, backgroundColor: color + '12' }]} onPress={onPress}>
      <View style={[styles.optIcon, active && { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color={active ? COLORS.white : COLORS.gray500} />
      </View>
      <View style={styles.optText}>
        <Text style={[styles.optLabel, active && { color }]}>{label}</Text>
        <Text style={styles.optDesc}>{desc}</Text>
      </View>
      {active && <Ionicons name="checkmark-circle" size={20} color={color} />}
    </TouchableOpacity>
  );
}

function ResultItem({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={[styles.resultItem, { borderTopColor: color }]}>
      <Text style={[styles.resultValue, { color }]}>{value}</Text>
      <Text style={styles.resultUnit}>{unit}</Text>
      <Text style={styles.resultLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  progressBar: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.gray200 },
  progressDotActive: { backgroundColor: COLORS.primary },
  scroll: { padding: 20, paddingBottom: 8 },
  step: { gap: 6 },
  stepTitle: { fontSize: 26, fontWeight: '800', color: COLORS.gray900, marginBottom: 4 },
  stepSub: { fontSize: 14, color: COLORS.gray400, marginBottom: 12, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.gray700, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, fontSize: 16, color: COLORS.gray900, borderWidth: 1.5, borderColor: COLORS.gray200 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  unit: { fontSize: 14, fontWeight: '600', color: COLORS.gray400, width: 36 },
  sexRow: { flexDirection: 'row', gap: 12 },
  sexBtn: { flex: 1, backgroundColor: COLORS.white, borderRadius: 14, padding: 20, alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: COLORS.gray200 },
  sexBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sexBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.gray500 },
  sexBtnTextActive: { color: COLORS.white },
  optCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: COLORS.white, borderRadius: 14, marginTop: 10, borderWidth: 1.5, borderColor: COLORS.gray200 },
  optIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.gray100, alignItems: 'center', justifyContent: 'center' },
  optText: { flex: 1 },
  optLabel: { fontSize: 14, fontWeight: '700', color: COLORS.gray900 },
  optDesc: { fontSize: 12, color: COLORS.gray400, marginTop: 2 },
  resultsCard: { backgroundColor: COLORS.white, borderRadius: 18, padding: 20, marginTop: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  resultsTitle: { fontSize: 16, fontWeight: '800', color: COLORS.gray900, marginBottom: 16, textAlign: 'center' },
  resultsGrid: { flexDirection: 'row', gap: 10 },
  resultItem: { flex: 1, alignItems: 'center', paddingTop: 10, borderTopWidth: 3 },
  resultValue: { fontSize: 22, fontWeight: '800' },
  resultUnit: { fontSize: 11, color: COLORS.gray400, marginTop: -2 },
  resultLabel: { fontSize: 11, color: COLORS.gray500, marginTop: 4, fontWeight: '600' },
  resultsNote: { fontSize: 11, color: COLORS.gray400, textAlign: 'center', marginTop: 14, lineHeight: 16 },
  nav: { flexDirection: 'row', padding: 16, paddingBottom: 24, gap: 10 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, backgroundColor: COLORS.gray100 },
  backBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.gray500 },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14 },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  btnDisabled: { opacity: 0.6 },
});
