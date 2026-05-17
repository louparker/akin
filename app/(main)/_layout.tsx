// Authenticated tab navigator — Read · Write · You
// Tab bar design: 3 tabs, hairline top border, bone background.
// Active state: ink color + semibold (600) label.
// Inactive state: fg.faint color + regular label.
// Bottom padding accounts for home indicator on modern iPhones via useSafeAreaInsets.

import { Tabs } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';

// Icon components use StyleSheet.create throughout to satisfy react-native/no-inline-styles.

function IconFeed({ active }: { active: boolean }) {
  const lineColor = active ? colors.fg.primary : colors.fg.faint;
  return (
    <View style={iconStyles.feedContainer}>
      <View style={[iconStyles.feedLine, iconStyles.feedLong, { backgroundColor: lineColor }]} />
      <View style={[iconStyles.feedLine, iconStyles.feedShort, { backgroundColor: lineColor }]} />
      <View style={[iconStyles.feedLine, iconStyles.feedLong, { backgroundColor: lineColor }]} />
    </View>
  );
}

function IconPencil({ active }: { active: boolean }) {
  const c = active ? colors.fg.primary : colors.fg.faint;
  return (
    <View style={iconStyles.iconBox}>
      <View style={[iconStyles.pencilBody, { backgroundColor: c }]} />
      <View style={[iconStyles.pencilTip, { backgroundColor: c }]} />
    </View>
  );
}

function IconUser({ active }: { active: boolean }) {
  const c = active ? colors.fg.primary : colors.fg.faint;
  return (
    <View style={iconStyles.iconBox}>
      <View style={[iconStyles.userHead, { backgroundColor: c }]} />
      <View style={[iconStyles.userBody, { backgroundColor: c }]} />
    </View>
  );
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={[tabStyles.labelBase, focused ? tabStyles.labelActive : tabStyles.labelInactive]}>
      {label}
    </Text>
  );
}

function TabItem({
  id,
  focused,
  label,
}: {
  id: 'read' | 'write' | 'you';
  focused: boolean;
  label: string;
}) {
  return (
    <View style={tabStyles.item}>
      {id === 'read' && <IconFeed active={focused} />}
      {id === 'write' && <IconPencil active={focused} />}
      {id === 'you' && <IconUser active={focused} />}
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
          tabBarIcon: ({ focused }) => (
            <TabItem id="read" focused={focused} label={t('nav.tab.read')} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: t('nav.tab.write'),
          tabBarAccessibilityLabel: t('nav.tab.write'),
          tabBarIcon: ({ focused }) => (
            <TabItem id="write" focused={focused} label={t('nav.tab.write')} />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: t('nav.tab.you'),
          tabBarAccessibilityLabel: t('nav.tab.you'),
          tabBarIcon: ({ focused }) => (
            <TabItem id="you" focused={focused} label={t('nav.tab.you')} />
          ),
        }}
      />
    </Tabs>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const iconStyles = StyleSheet.create({
  feedContainer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  feedLine: {
    height: 2,
    borderRadius: 1,
  },
  feedLong: {
    width: 18,
  },
  feedShort: {
    width: 14,
  },
  iconBox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pencilBody: {
    width: 14,
    height: 3,
    borderRadius: 1.5,
    transform: [{ rotate: '-45deg' }],
    marginBottom: 4,
  },
  pencilTip: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    transform: [{ rotate: '-45deg' }],
  },
  userHead: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginBottom: 3,
  },
  userBody: {
    width: 16,
    height: 7,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
});

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
