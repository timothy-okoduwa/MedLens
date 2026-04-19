// components/CustomTabBar.tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadow } from '../constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<string, { label: string; icon: IconName; iconActive: IconName }> = {
  index:       { label: 'Home',     icon: 'home-outline',        iconActive: 'home' },
  insights:    { label: 'Insights', icon: 'document-text-outline', iconActive: 'document-text' },
  analytics:   { label: 'Analytics',icon: 'bar-chart-outline',   iconActive: 'bar-chart' },
  settings:    { label: 'Settings', icon: 'settings-outline',    iconActive: 'settings' },
  // legacy tab names kept for compatibility
  scan:        { label: 'Scan',     icon: 'scan-outline',        iconActive: 'scan' },
  vitals:      { label: 'Vitals',   icon: 'heart-outline',       iconActive: 'heart' },
  medications: { label: 'Meds',     icon: 'medical-outline',     iconActive: 'medical' },
  profile:     { label: 'Profile',  icon: 'person-outline',      iconActive: 'person' },
};

function TabItem({
  route, isFocused, onPress, onLongPress,
}: {
  route: any; isFocused: boolean; onPress: () => void; onLongPress: () => void;
}) {
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(0);

  const config = TAB_CONFIG[route.name] ?? {
    label: route.name, icon: 'ellipse-outline' as IconName, iconActive: 'ellipse' as IconName,
  };

  if (isFocused && bgOpacity.value === 0) {
    bgOpacity.value = withTiming(1, { duration: 200 });
  } else if (!isFocused && bgOpacity.value !== 0) {
    bgOpacity.value = withTiming(0, { duration: 180 });
  }

  const handlePressIn = () => scale.value = withSpring(0.82, { damping: 10, stiffness: 300 });
  const handlePressOut = () => scale.value = withSpring(1, { damping: 10, stiffness: 300 });

  const itemStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pillStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));

  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={[styles.tabItemInner, itemStyle]}>
        <Animated.View style={[styles.activePill, pillStyle]} />
        <Ionicons
          name={isFocused ? config.iconActive : config.icon}
          size={22}
          color={isFocused ? Colors.accent : Colors.tabInactive}
        />
        <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
          {config.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          return (
            <TabItem
              key={route.key}
              route={route}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 8, backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: 28, paddingVertical: 8, paddingHorizontal: 4,
    ...Shadow.lg, borderWidth: 1, borderColor: Colors.borderLight,
  },
  tabItem: { flex: 1, alignItems: 'center' },
  tabItemInner: { alignItems: 'center', paddingVertical: 6, gap: 3, position: 'relative' },
  activePill: {
    position: 'absolute', top: -2, width: 40, height: 40,
    borderRadius: 20, backgroundColor: Colors.accentLight,
  },
  tabLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 0.3, color: Colors.tabInactive },
  tabLabelActive: { color: Colors.accent, fontWeight: '700' },
});
