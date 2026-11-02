import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FoodEntry, COLORS } from '../lib/types';
import { supabase } from '../lib/supabase';

interface Props {
  entry: FoodEntry;
  onDelete: () => void;
}

export function FoodCard({ entry, onDelete }: Props) {
  const handleDelete = () => {
    Alert.alert('Eliminar', `¿Eliminar "${entry.food_name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('food_entries').delete().eq('id', entry.id);
          onDelete();
        },
      },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.leftBar} />
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{entry.food_name}</Text>
          {entry.ai_analyzed && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✨ IA</Text>
            </View>
          )}
        </View>
        <View style={styles.macros}>
          <MacroChip value={entry.calories} label="kcal" color={COLORS.primary} />
          <MacroChip value={entry.protein} label="P" color={COLORS.protein} />
          <MacroChip value={entry.carbs} label="C" color={COLORS.carbs} />
          <MacroChip value={entry.fat} label="G" color={COLORS.fat} />
        </View>
      </View>
      <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.deleteIcon}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

function MacroChip({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: color + '18' }]}>
      <Text style={[styles.chipText, { color }]}>{Math.round(value)}{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 12,
    marginVertical: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  leftBar: {
    width: 4,
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginRight: 12,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  info: { flex: 1, paddingLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  name: { fontSize: 14, fontWeight: '600', color: COLORS.gray900, flex: 1 },
  badge: { backgroundColor: COLORS.secondaryLight, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, color: COLORS.secondary, fontWeight: '700' },
  macros: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: '700' },
  deleteBtn: { padding: 8 },
  deleteIcon: { fontSize: 22, color: COLORS.gray400 },
});
