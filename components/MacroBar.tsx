import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../lib/types';

interface Props {
  name: string;
  current: number;
  goal: number;
  color: string;
}

export function MacroBar({ name, current, goal, color }: Props) {
  const progress = goal > 0 ? Math.min(current / goal, 1) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.values}>
          <Text style={[styles.current, { color }]}>{Math.round(current)}g</Text>
          <Text style={styles.goal}> / {goal}g</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 13,
    color: COLORS.gray700,
    fontWeight: '500',
  },
  values: {
    fontSize: 13,
  },
  current: {
    fontWeight: '600',
  },
  goal: {
    color: COLORS.gray500,
  },
  track: {
    height: 8,
    backgroundColor: COLORS.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
});
