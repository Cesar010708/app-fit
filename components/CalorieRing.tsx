import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS } from '../lib/types';

interface Props {
  current: number;
  goal: number;
}

export function CalorieRing({ current, goal }: Props) {
  const size = 190;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal > 0 ? Math.min(current / goal, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const overGoal = current > goal;
  const remaining = Math.max(goal - current, 0);
  const pct = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={COLORS.primaryGradient} />
            <Stop offset="1" stopColor={COLORS.primary} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={COLORS.gray100} strokeWidth={strokeWidth} fill="none"
        />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={overGoal ? COLORS.fat : 'url(#grad)'}
          strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <View style={styles.textContainer}>
        <Text style={styles.pct}>{pct}%</Text>
        <Text style={styles.current}>{Math.round(current)}</Text>
        <Text style={styles.label}>de {goal} kcal</Text>
        <View style={[styles.badge, overGoal ? styles.badgeOver : styles.badgeOk]}>
          <Text style={[styles.badgeText, overGoal ? styles.badgeTextOver : styles.badgeTextOk]}>
            {overGoal ? `+${Math.round(current - goal)} extra` : `${Math.round(remaining)} restantes`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  textContainer: { position: 'absolute', alignItems: 'center' },
  pct: { fontSize: 14, fontWeight: '600', color: COLORS.gray400, marginBottom: -4 },
  current: { fontSize: 40, fontWeight: '800', color: COLORS.gray900, letterSpacing: -1 },
  label: { fontSize: 13, color: COLORS.gray400, marginTop: -2 },
  badge: { marginTop: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  badgeOk: { backgroundColor: COLORS.primaryLight },
  badgeOver: { backgroundColor: COLORS.fatLight },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextOk: { color: COLORS.primaryDark },
  badgeTextOver: { color: COLORS.fat },
});
