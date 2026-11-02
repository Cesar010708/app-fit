import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '../lib/types';

interface Props {
  label: string;
  current: number;
  goal: number;
  color: string;
  bgColor: string;
}

export function MacroRing({ label, current, goal, color, bgColor }: Props) {
  const size = 76;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal > 0 ? Math.min(current / goal, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const pct = Math.round(progress * 100);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.ringContainer, { backgroundColor: bgColor }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={color} strokeWidth={strokeWidth}
            fill="none" opacity={0.15}
          />
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={color} strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90, ${size / 2}, ${size / 2})`}
          />
        </Svg>
        <View style={styles.center}>
          <Text style={[styles.pct, { color }]}>{pct}%</Text>
        </View>
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
      <Text style={styles.values}>
        <Text style={styles.current}>{Math.round(current)}</Text>
        <Text style={styles.goal}>/{goal}g</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', flex: 1 },
  ringContainer: {
    borderRadius: 50,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { position: 'absolute', alignItems: 'center' },
  pct: { fontSize: 13, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '700', marginTop: 8 },
  values: { marginTop: 2 },
  current: { fontSize: 12, fontWeight: '600', color: COLORS.gray700 },
  goal: { fontSize: 11, color: COLORS.gray400 },
});
