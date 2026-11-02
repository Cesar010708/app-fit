import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { UserProfile, COLORS } from '../../lib/types';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) setProfile(data);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      name: profile.name || '',
      age: profile.age || null,
      weight: profile.weight || null,
      height: profile.height || null,
      goal_calories: profile.goal_calories || 2000,
      goal_protein: profile.goal_protein || 150,
      goal_carbs: profile.goal_carbs || 250,
      goal_fat: profile.goal_fat || 65,
    });
    setLoading(false);
    if (error) Alert.alert('Error', 'No se pudo guardar');
    else Alert.alert('¡Guardado!', 'Perfil actualizado correctamente');
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  const update = (key: keyof UserProfile, value: string) => {
    const numKeys: (keyof UserProfile)[] = ['age', 'weight', 'height', 'goal_calories', 'goal_protein', 'goal_carbs', 'goal_fat'];
    setProfile((prev) => ({
      ...prev,
      [key]: numKeys.includes(key) ? (value === '' ? undefined : parseFloat(value) || 0) : value,
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Mi perfil 👤</Text>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Información personal</Text>

            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={profile.name ?? ''}
              onChangeText={(v) => update('name', v)}
              placeholder="Tu nombre"
              placeholderTextColor={COLORS.gray500}
              autoCapitalize="words"
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Edad</Text>
                <TextInput
                  style={styles.input}
                  value={profile.age?.toString() ?? ''}
                  onChangeText={(v) => update('age', v)}
                  placeholder="0"
                  placeholderTextColor={COLORS.gray500}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>Peso (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={profile.weight?.toString() ?? ''}
                  onChangeText={(v) => update('weight', v)}
                  placeholder="0"
                  placeholderTextColor={COLORS.gray500}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Text style={styles.label}>Altura (cm)</Text>
            <TextInput
              style={styles.input}
              value={profile.height?.toString() ?? ''}
              onChangeText={(v) => update('height', v)}
              placeholder="0"
              placeholderTextColor={COLORS.gray500}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Metas diarias</Text>

            <Text style={styles.label}>Calorías (kcal)</Text>
            <TextInput
              style={styles.input}
              value={profile.goal_calories?.toString() ?? ''}
              onChangeText={(v) => update('goal_calories', v)}
              placeholder="2000"
              placeholderTextColor={COLORS.gray500}
              keyboardType="number-pad"
            />

            <View style={styles.row}>
              <View style={styles.triField}>
                <Text style={[styles.label, { color: COLORS.protein }]}>Proteína (g)</Text>
                <TextInput
                  style={styles.input}
                  value={profile.goal_protein?.toString() ?? ''}
                  onChangeText={(v) => update('goal_protein', v)}
                  placeholder="150"
                  placeholderTextColor={COLORS.gray500}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.triField}>
                <Text style={[styles.label, { color: COLORS.carbs }]}>Carbos (g)</Text>
                <TextInput
                  style={styles.input}
                  value={profile.goal_carbs?.toString() ?? ''}
                  onChangeText={(v) => update('goal_carbs', v)}
                  placeholder="250"
                  placeholderTextColor={COLORS.gray500}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.triField}>
                <Text style={[styles.label, { color: COLORS.fat }]}>Grasas (g)</Text>
                <TextInput
                  style={styles.input}
                  value={profile.goal_fat?.toString() ?? ''}
                  onChangeText={(v) => update('goal_fat', v)}
                  placeholder="65"
                  placeholderTextColor={COLORS.gray500}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.btnDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveBtnText}>{loading ? 'Guardando...' : 'Guardar cambios'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.gray900, padding: 20, paddingBottom: 12 },
  card: {
    backgroundColor: COLORS.white, margin: 16, marginTop: 0, borderRadius: 20, padding: 20, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.gray900, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.gray700, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: COLORS.gray100, borderRadius: 12, padding: 13, fontSize: 15, color: COLORS.gray900 },
  row: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },
  triField: { flex: 1 },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, margin: 16, marginTop: 4, padding: 16, alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  logoutBtn: { marginHorizontal: 16, marginBottom: 32, padding: 16, alignItems: 'center', borderRadius: 14, backgroundColor: COLORS.gray100 },
  logoutText: { color: COLORS.fat, fontSize: 15, fontWeight: '600' },
});
