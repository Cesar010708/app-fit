import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { supabase } from '../../lib/supabase';
import { FoodEntry, COLORS } from '../../lib/types';

const SCREEN_WIDTH = Dimensions.get('window').width;

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return formatDate(d);
  });
}

function getLast30Days() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return formatDate(d);
  });
}

function shortLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');
}

export default function HistoryScreen() {
  const [range, setRange] = useState<'7' | '30'>('7');
  const [entriesByDate, setEntriesByDate] = useState<Record<string, FoodEntry[]>>({});

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const days = range === '7' ? getLast7Days() : getLast30Days();
    const from = days[0];
    const to = days[days.length - 1];

    const { data } = await supabase
      .from('food_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', from)
      .lte('date', to);

    const grouped: Record<string, FoodEntry[]> = {};
    for (const day of days) grouped[day] = [];
    for (const entry of data ?? []) {
      if (grouped[entry.date]) grouped[entry.date].push(entry);
    }
    setEntriesByDate(grouped);
  }, [range]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const days = range === '7' ? getLast7Days() : getLast30Days();

  const calorieData = days.map((d) =>
    (entriesByDate[d] ?? []).reduce((sum, e) => sum + e.calories, 0),
  );

  const proteinData = days.map((d) =>
    (entriesByDate[d] ?? []).reduce((sum, e) => sum + e.protein, 0),
  );

  const trackedDays = calorieData.filter((c) => c > 0).length;
  const avgCalories = trackedDays > 0 ? calorieData.filter((c) => c > 0).reduce((a, b) => a + b, 0) / trackedDays : 0;
  const maxCalories = Math.max(...calorieData);
  const totalProtein = proteinData.reduce((a, b) => a + b, 0);

  const chartLabels = range === '7'
    ? days.map((d) => shortLabel(d))
    : days.filter((_, i) => i % 5 === 0).map((d) => shortLabel(d));

  const labeledCalories = range === '7'
    ? calorieData
    : calorieData.filter((_, i) => i % 5 === 0);

  const chartConfig = {
    backgroundColor: COLORS.white,
    backgroundGradientFrom: COLORS.white,
    backgroundGradientTo: COLORS.white,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    labelColor: () => COLORS.gray500,
    style: { borderRadius: 16 },
    propsForDots: { r: '4', strokeWidth: '2', stroke: COLORS.primaryDark },
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Historial 📊</Text>

        <View style={styles.rangeToggle}>
          <TouchableOpacity
            style={[styles.rangeBtn, range === '7' && styles.rangeBtnActive]}
            onPress={() => setRange('7')}
          >
            <Text style={[styles.rangeBtnText, range === '7' && styles.rangeBtnTextActive]}>7 días</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rangeBtn, range === '30' && styles.rangeBtnActive]}
            onPress={() => setRange('30')}
          >
            <Text style={[styles.rangeBtnText, range === '30' && styles.rangeBtnTextActive]}>30 días</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{Math.round(avgCalories)}</Text>
            <Text style={styles.statLabel}>kcal promedio</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.protein }]}>{Math.round(totalProtein)}g</Text>
            <Text style={styles.statLabel}>proteína total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.carbs }]}>{trackedDays}</Text>
            <Text style={styles.statLabel}>días registrados</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Calorías por día</Text>
          {trackedDays > 0 ? (
            <LineChart
              data={{ labels: chartLabels, datasets: [{ data: labeledCalories.map((v) => Math.max(v, 0)) }] }}
              width={SCREEN_WIDTH - 48}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={false}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>Sin datos registrados aún</Text>
            </View>
          )}
        </View>

        <View style={styles.dayList}>
          <Text style={styles.sectionTitle}>Detalle por día</Text>
          {[...days].reverse().map((day) => {
            const dayEntries = entriesByDate[day] ?? [];
            const totalCal = dayEntries.reduce((s, e) => s + e.calories, 0);
            const totalP = dayEntries.reduce((s, e) => s + e.protein, 0);
            const isToday = day === formatDate(new Date());
            return (
              <View key={day} style={styles.dayRow}>
                <View style={styles.dayLeft}>
                  <Text style={styles.dayDate}>
                    {isToday ? 'Hoy' : new Date(day + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </Text>
                  <Text style={styles.dayEntries}>{dayEntries.length} registro{dayEntries.length !== 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.dayRight}>
                  {totalCal > 0 ? (
                    <>
                      <Text style={styles.dayCalories}>{Math.round(totalCal)} kcal</Text>
                      <Text style={styles.dayProtein}>{Math.round(totalP)}g P</Text>
                    </>
                  ) : (
                    <Text style={styles.dayEmpty}>Sin datos</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.gray900, padding: 20, paddingBottom: 12 },
  rangeToggle: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: COLORS.gray100, borderRadius: 12, padding: 4, marginBottom: 16 },
  rangeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  rangeBtnActive: { backgroundColor: COLORS.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  rangeBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.gray500 },
  rangeBtnTextActive: { color: COLORS.gray900 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 14, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: COLORS.gray500, marginTop: 2, textAlign: 'center' },
  chartCard: {
    backgroundColor: COLORS.white, margin: 16, marginTop: 0, borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  chartTitle: { fontSize: 16, fontWeight: '700', color: COLORS.gray900, marginBottom: 12 },
  chart: { borderRadius: 12 },
  emptyChart: { height: 200, justifyContent: 'center', alignItems: 'center' },
  emptyChartText: { color: COLORS.gray500, fontSize: 14 },
  dayList: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.gray900, marginBottom: 10 },
  dayRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  dayLeft: {},
  dayDate: { fontSize: 14, fontWeight: '600', color: COLORS.gray900, textTransform: 'capitalize' },
  dayEntries: { fontSize: 12, color: COLORS.gray500, marginTop: 2 },
  dayRight: { alignItems: 'flex-end' },
  dayCalories: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  dayProtein: { fontSize: 12, color: COLORS.protein, marginTop: 2 },
  dayEmpty: { fontSize: 13, color: COLORS.gray500 },
});
