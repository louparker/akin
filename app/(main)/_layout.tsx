// Authenticated tab navigator — Read · Write · You
// Tab bar design: 3 tabs, hairline top border, bone background.
// Active state: ink color + semibold (600) label.
// Inactive state: fg.faint color + regular label.
// Bottom padding accounts for home indicator on modern iPhones via useSafeAreaInsets.

import { Tabs } from 'expo-router';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import { IconSettings } from '@/components/composed/icons/IconSettings';

// Custom tab button — replaces React Navigation's default PlatformPressable.
//
// Root cause of iOS 26 / RN 0.83 New Architecture regression:
// BottomTabBar passes `href` (built from the route path) to PlatformPressable,
// which spreads it onto Animated.createAnimatedComponent(Pressable). On New
// Architecture, Pressable with `href` creates a native link element on iOS 26;
// iOS intercepts the tap at the system level and the JS `onPress` never fires.
// Stripping `href` here restores normal JS-side navigation.
function TabButton({
  onPress,
  onLongPress,
  testID,
  'aria-label': ariaLabel,
  style,
  children,
}: BottomTabBarButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      testID={testID}
      accessibilityLabel={ariaLabel}
      accessibilityRole="button"
      style={style}
    >
      {children}
    </Pressable>
  );
}

// Stroked SVG icons — hairline (1.5px) with rounded caps per the design language.
// Tint flips between fg.primary (active) and fg.faint (inactive).

const ICON_SIZE = 24;
const STROKE_WIDTH = 1.5;

function IconFeed({ active }: { active: boolean }) {
  const c = active ? colors.fg.primary : colors.fg.faint;
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6.5h16" stroke={c} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Path d="M4 12h16" stroke={c} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Path d="M4 17.5h10" stroke={c} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </Svg>
  );
}

function IconPencil({ active }: { active: boolean }) {
  const c = active ? colors.fg.primary : colors.fg.faint;
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      {/* Pencil outline: eraser end top-right, tip bottom-left */}
      <Path
        d="M15.5 4.5L19.5 8.5L8.5 19.5L4 20L4.5 15.5L15.5 4.5Z"
        stroke={c}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Crease between eraser block and body */}
      <Path d="M13.5 6.5L17.5 10.5" stroke={c} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </Svg>
  );
}

function IconUser({ active }: { active: boolean }) {
  const c = active ? colors.fg.primary : colors.fg.faint;
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      {/* Head */}
      <Circle cx="12" cy="8.5" r="3.75" stroke={c} strokeWidth={STROKE_WIDTH} />
      {/* Shoulders arc */}
      <Path
        d="M4.5 20c0-3.59 3.36-6.5 7.5-6.5s7.5 2.91 7.5 6.5"
        stroke={c}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      // Keep every tab label on a single line. Without these, "Settings" (and
      // the Swedish "Inställningar") wrap mid-word because each tab cell is
      // only ~25% of the screen wide. adjustsFontSizeToFit lets the longer
      // labels shrink the last 1–2pt rather than truncating with an ellipsis,
      // so the visual rhythm stays consistent across tabs.
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
      style={[tabStyles.labelBase, focused ? tabStyles.labelActive : tabStyles.labelInactive]}
    >
      {label}
    </Text>
  );
}

function TabItem({
  id,
  focused,
  label,
}: {
  id: 'read' | 'write' | 'you' | 'settings';
  focused: boolean;
  label: string;
}) {
  return (
    <View style={tabStyles.item}>
      {id === 'read' && <IconFeed active={focused} />}
      {id === 'write' && <IconPencil active={focused} />}
      {id === 'you' && <IconUser active={focused} />}
      {id === 'settings' && <IconSettings active={focused} />}
      <TabLabel label={label} focused={focused} />
    </View>
  );
}

export default function MainLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 20);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          tabBarStyles.bar,
          {
            height: 56 + bottomInset,
            paddingBottom: bottomInset,
          },
        ],
        tabBarShowLabel: false, // We render our own label inside tabBarIcon
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: t('nav.tab.read'),
          tabBarAccessibilityLabel: t('nav.tab.read'),
          tabBarButtonTestID: 'tab-read',
          tabBarButton: TabButton,
          tabBarIcon: ({ focused }) => (
            <TabItem id="read" focused={focused} label={t('nav.tab.read')} />
          ),
        }}
      />
      <Tabs.Screen
        name="create/index"
        options={{
          title: t('nav.tab.write'),
          tabBarAccessibilityLabel: t('nav.tab.write'),
          tabBarButtonTestID: 'tab-write',
          tabBarButton: TabButton,
          tabBarIcon: ({ focused }) => (
            <TabItem id="write" focused={focused} label={t('nav.tab.write')} />
          ),
        }}
      />
      <Tabs.Screen
        name="you/index"
        options={{
          title: t('nav.tab.you'),
          tabBarAccessibilityLabel: t('nav.tab.you'),
          tabBarButtonTestID: 'tab-you',
          tabBarButton: TabButton,
          tabBarIcon: ({ focused }) => (
            <TabItem id="you" focused={focused} label={t('nav.tab.you')} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: t('nav.tab.settings'),
          tabBarAccessibilityLabel: t('nav.tab.settings'),
          tabBarButtonTestID: 'tab-settings',
          tabBarButton: TabButton,
          tabBarIcon: ({ focused }) => (
            <TabItem id="settings" focused={focused} label={t('nav.tab.settings')} />
          ),
        }}
      />
      <Tabs.Screen
        name="post/[id]"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen name="banned" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="suspended" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen
        name="delete-account"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
    </Tabs>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const tabStyles = StyleSheet.create({
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  labelBase: {
    fontFamily: 'Inter',
    fontSize: 11,
    letterSpacing: 0.1,
    marginTop: 2,
  },
  labelActive: {
    fontWeight: '600',
    color: colors.fg.primary,
  },
  labelInactive: {
    fontWeight: '400',
    color: colors.fg.faint,
  },
});

const tabBarStyles = StyleSheet.create({
  bar: {
    backgroundColor: colors.bg.base,
    borderTopColor: colors.border.hairline,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
});
