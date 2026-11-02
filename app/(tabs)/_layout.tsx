import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../lib/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <Ionicons
      name={focused ? name : `${name}-outline` as IconName}
      size={24}
      color={focused ? COLORS.primary : COLORS.gray400}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray400,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.gray200,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }}
      />
      <Tabs.Screen
        name="log"
        options={{ title: 'Registrar', tabBarIcon: ({ focused }) => <TabIcon name="create" focused={focused} /> }}
      />
      <Tabs.Screen
        name="camera"
        options={{ title: 'IA', tabBarIcon: ({ focused }) => <TabIcon name="camera" focused={focused} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'Historial', tabBarIcon: ({ focused }) => <TabIcon name="bar-chart" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Perfil', tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} /> }}
      />
    </Tabs>
  );
}
