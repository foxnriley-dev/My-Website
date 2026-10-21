import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/tabs';
import { useTheme } from '@/lib/theme';

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.c.accent,
        tabBarInactiveTintColor: t.c.textMuted,
        tabBarStyle: { backgroundColor: t.c.surface, borderTopColor: t.c.border },
        headerStyle: { backgroundColor: t.c.surface },
        headerTintColor: t.c.text,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color as string} size={size} /> }} />
      <Tabs.Screen name="garage" options={{ title: 'Garage', tabBarIcon: ({ color, size }) => <Ionicons name="car-sport" color={color as string} size={size} /> }} />
      <Tabs.Screen name="cases" options={{ title: 'Repairs', tabBarIcon: ({ color, size }) => <Ionicons name="clipboard" color={color as string} size={size} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color as string} size={size} /> }} />
    </Tabs>
  );
}
