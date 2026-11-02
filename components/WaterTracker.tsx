import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../lib/types';

interface Props {
  cups: number;
  goal: number;
  onAdd: () => void;
  onRemove: () => void;
}

export function WaterTracker({ cups, goal, onAdd, onRemove }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💧 Hidratación</Text>
        <Text style={styles.count}>
          <Text style={styles.current}>{cups}</Text>
          <Text style={styles.goal}>/{goal} vasos</Text>
        </Text>
      </View>

      <View style={styles.drops}>
        {Array.from({ length: goal }).map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => (i < cups ? onRemove() : onAdd())}
            style={[styles.drop, i < cups && styles.dropFilled]}
            activeOpacity={0.7}
          >
            <Text style={[styles.dropIcon, i < cups && styles.dropIconFilled]}>
              {i < cups ? '💧' : '○'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.progress}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min((cups / goal) * 100, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>
          {cups >= goal ? '¡Meta alcanzada! 🎉' : `${goal - cups} vasos más para tu meta`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.waterLight,
    borderRadius: 18,
    padding: 16,
    marginVertical: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.gray900 },
  count: {},
  current: { fontSize: 18, fontWeight: '800', color: COLORS.water },
  goal: { fontSize: 14, color: COLORS.gray500 },
  drops: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  drop: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(56,189,248,0.1)',
  },
  dropFilled: {
    backgroundColor: 'rgba(56,189,248,0.2)',
  },
  dropIcon: { fontSize: 16, color: COLORS.gray400 },
  dropIconFilled: { fontSize: 18 },
  progress: { gap: 6 },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(56,189,248,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: COLORS.water,
    borderRadius: 3,
  },
  progressLabel: { fontSize: 12, color: COLORS.gray500 },
});
