// Settings — pulled forward from Phase 8 (2026-05-27) to unblock sign-out.
//
// Current scope (commit 4 of the 8.1 + 8.2a + 8.2b pull-forward):
//   * Account section: masked email, change password, delete account
//   * Sign Out (full-width destructive button at bottom)
//
// Section headers for Language / Appearance / Notifications / Blocked Users /
// Legal / Support / Moderator are rendered as "Coming next" placeholders so the
// shell is recognisable while later sub-tasks land.
import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';

import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';
import { TopBar } from '@/components/composed/TopBar';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useLogout } from '@/features/auth/api/useLogout';

function maskEmail(email: string | undefined): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, 1);
  return `${visible}${'*'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
}

interface PendingSection {
  titleKey: TranslationKey;
}

const PENDING_SECTIONS: PendingSection[] = [
  { titleKey: 'settings.section.language' },
  { titleKey: 'settings.section.appearance' },
  { titleKey: 'settings.section.notifications' },
  { titleKey: 'settings.section.blocked' },
  { titleKey: 'settings.legal.title' },
  { titleKey: 'settings.support.title' },
];

export default function SettingsScreen() {
  const session = useAuthStore((s) => s.session);
  const { logout } = useLogout();

  const maskedEmail = useMemo(() => maskEmail(session?.user.email), [session?.user.email]);

  function handleSignOut() {
    Alert.alert(t('settings.signOut.confirm.title'), t('settings.signOut.confirm.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOut.confirm.cta'),
        style: 'destructive',
        onPress: () => void logout(),
      },
    ]);
  }

  function navigateToResetPassword() {
    router.push('/(auth)/reset-password');
  }

  function navigateToDeleteAccount() {
    router.push('/(main)/delete-account');
  }

  return (
    <View style={styles.container}>
      <TopBar
        title={t('settings.title')}
        left={
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={8}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Account ─────────────────────────────────────────────────────────── */}
        <Section titleKey="settings.account.title">
          <Row
            label={t('settings.account.email')}
            value={maskedEmail}
            accessibilityLabel={`${t('settings.account.email')}: ${maskedEmail}`}
          />
          <Row
            label={t('settings.account.changePassword')}
            chevron
            onPress={navigateToResetPassword}
          />
          <Row
            label={t('settings.deleteAccount')}
            chevron
            destructive
            onPress={navigateToDeleteAccount}
            isLast
          />
        </Section>

        {/* Placeholder sections — landing in subsequent sub-tasks ─────────── */}
        {PENDING_SECTIONS.map((s) => (
          <Section key={s.titleKey} titleKey={s.titleKey}>
            <Row label={t('settings.placeholder.comingNext')} muted isLast />
          </Section>
        ))}

        {/* Sign Out ────────────────────────────────────────────────────────── */}
        <View style={styles.signOutBlock}>
          <Pressable
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel={t('settings.logout')}
            style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
          >
            <Text style={styles.signOutText}>{t('settings.logout')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

interface SectionProps {
  titleKey: TranslationKey;
  children: React.ReactNode;
}

function Section({ titleKey, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t(titleKey).toUpperCase()}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

interface RowProps {
  label: string;
  value?: string;
  chevron?: boolean;
  destructive?: boolean;
  muted?: boolean;
  isLast?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

function Row({
  label,
  value,
  chevron,
  destructive,
  muted,
  isLast,
  onPress,
  accessibilityLabel,
}: RowProps) {
  const content = (
    <View style={[styles.row, !isLast && styles.rowDivider]}>
      <Text
        style={[
          styles.rowLabel,
          destructive && styles.rowLabelDestructive,
          muted && styles.rowLabelMuted,
        ]}
      >
        {label}
      </Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {chevron ? <Text style={styles.chevron}>›</Text> : null}
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  backIcon: {
    fontFamily: 'Inter',
    fontSize: 28,
    color: colors.fg.primary,
    paddingHorizontal: 4,
  },
  scroll: {
    paddingTop: 12,
    paddingBottom: 48,
  },
  pressed: {
    opacity: 0.7,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter Medium',
    fontWeight: '500',
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.fg.tertiary,
    paddingHorizontal: 22,
    marginBottom: 8,
  },
  sectionBody: {
    backgroundColor: colors.bg.raised,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.hairline,
  },
  rowLabel: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.fg.primary,
    flex: 1,
  },
  rowLabelDestructive: {
    color: colors.semantic.danger,
  },
  rowLabelMuted: {
    color: colors.fg.tertiary,
    fontStyle: 'italic',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValue: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.fg.secondary,
  },
  chevron: {
    fontFamily: 'Inter',
    fontSize: 20,
    lineHeight: 20,
    color: colors.fg.tertiary,
    // ›  glyph drops slightly below baseline; nudge up to centre with row label.
    transform: [{ translateY: -1 }],
  },
  signOutBlock: {
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  signOutButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.semantic.danger,
    borderRadius: 8,
  },
  signOutText: {
    fontFamily: 'Inter Medium',
    fontWeight: '500',
    fontSize: 15,
    color: colors.semantic.danger,
  },
});
