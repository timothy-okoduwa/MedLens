// app/(tabs)/_layout.tsx
import { Tabs, Redirect } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import CustomTabBar from '../../components/CustomTabBar';

export default function TabsLayout() {
  const { user, initialized } = useAuthStore();

  if (initialized && !user) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <SafeAreaProvider>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="insights" />
        <Tabs.Screen name="analytics" />
        <Tabs.Screen name="settings" />
      </Tabs>
    </SafeAreaProvider>
  );
}
