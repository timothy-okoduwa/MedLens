// app/index.tsx
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors } from '../constants/theme';

export default function Index() {
  const { initialized, user, needsOnboarding } = useAuthStore();

  if (!initialized) {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.loader}>
        <View style={styles.logoMark}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      </Animated.View>
    );
  }

  if (!user) return <Redirect href="/(auth)/welcome" />;
  if (needsOnboarding) return <Redirect href="/(auth)/onboarding/step1" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

