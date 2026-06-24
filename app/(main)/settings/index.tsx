// Settings — pulled forward from Phase 8 (2026-05-27) to unblock sign-out.
//
// Current scope (commit 4 of the 8.1 + 8.2a + 8.2b pull-forward):
//   * Account section: masked email, change password, delete account
//   * Sign Out (full-width destructive button at bottom)
//
// Section headers for Language / Appearance / Notifications / Blocked Users /
// Legal / Support / Moderator are rendered as "Coming next" placeholders so the
// shell is recognisable while later sub-tasks land.
import { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { legalConfig, supportConfig, appVersion } from '@/lib/appConfig';

import { useColorTokens } from '@/theme/useColorTokens';
import { t } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';
import { TopBar } from '@/components/composed/TopBar';
import { ToggleRowGroup } from '@/components/composed/ToggleRowGroup';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useLogout } from '@/features/auth/api/useLogout';
import { useIsModerator } from '@/features/moderation/api/useIsModerator';
import { useLanguagePreference } from '@/features/locale/api/useLanguagePreference';
import type { LocalePreference } from '@/features/locale/store/useLocaleStore';
import { useThemeStore } from '@/features/theme/store/useThemeStore';
import type { ThemePreference } from '@/features/theme/store/useThemeStore';
import { useMyBlocks } from '@/features/post/api/useMyBlocks';
import { useUnblock } from '@/features/post/api/useUnblock';

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

const PENDING_SECTIONS: PendingSection[] = [{ titleKey: 'settings.section.notifications' }];

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg.base,
    },
    backIcon: {
      fontFamily: 'Inter',
      fontSize: 28,
      color: c.fg.primary,
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
      color: c.fg.tertiary,
      paddingHorizontal: 22,
      marginBottom: 8,
    },
    sectionBody: {
      backgroundColor: c.bg.raised,
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
      borderBottomColor: c.border.hairline,
    },
    rowLabel: {
      fontFamily: 'Inter',
      fontSize: 15,
      color: c.fg.primary,
      flex: 1,
    },
    rowLabelDestructive: {
      color: c.semantic.danger,
    },
    rowLabelMuted: {
      color: c.fg.tertiary,
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
      color: c.fg.secondary,
    },
    chevron: {
      fontFamily: 'Inter',
      fontSize: 20,
      lineHeight: 20,
      color: c.fg.tertiary,
      // ›  glyph drops slightly below baseline; nudge up to centre with row label.
      transform: [{ translateY: -1 }],
    },
    unblockText: {
      fontFamily: 'Inter Medium',
      fontWeight: '500',
      fontSize: 13,
      color: c.semantic.danger,
    },
    signOutBlock: {
      paddingHorizontal: 22,
      paddingTop: 8,
    },
    signOutButton: {
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.semantic.danger,
      borderRadius: 8,
    },
    signOutText: {
      fontFamily: 'Inter Medium',
      fontWeight: '500',
      fontSize: 15,
      color: c.semantic.danger,
    },
    switchOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.bg.base,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      zIndex: 10,
    },
    switchOverlayText: {
      fontFamily: 'Inter',
      fontSize: 14,
      color: c.fg.secondary,
    },
  });
}

export default function SettingsScreen() {
  const session = useAuthStore((s) => s.session);
  const { logout } = useLogout();
  const { data: isMod } = useIsModerator();
  const { preference: languagePref, setPreference: setLanguagePref } = useLanguagePreference();
  const themePref = useThemeStore((s) => s.preference);
  const setThemePref = useThemeStore((s) => s.setPreference);
  const { data: blocks } = useMyBlocks();
  const { mutate: unblock } = useUnblock();
  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);

  const maskedEmail = useMemo(() => maskEmail(session?.user.email), [session?.user.email]);

  // Language change shows a brief loading overlay (~1s) as a deliberate
  // "something happened" separator before the UI settles into the new language.
  const [switchingLanguage, setSwitchingLanguage] = useState(false);
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (switchTimer.current) clearTimeout(switchTimer.current);
    },
    [],
  );

  function handleLanguageChange(next: LocalePreference) {
    if (next === languagePref) return;
    setSwitchingLanguage(true);
    void setLanguagePref(next);
    if (switchTimer.current) clearTimeout(switchTimer.current);
    switchTimer.current = setTimeout(() => setSwitchingLanguage(false), 1000);
  }

  const languageOptions: { value: LocalePreference; label: string }[] = [
    { value: 'system', label: t('settings.language.system') },
    { value: 'sv', label: t('settings.language.sv') },
    { value: 'en', label: t('settings.language.en') },
  ];

  const appearanceOptions: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: t('settings.appearance.system') },
    { value: 'light', label: t('settings.appearance.light') },
    { value: 'dark', label: t('settings.appearance.dark') },
  ];

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
        <Section titleKey="settings.account.title" styles={styles}>
          <Row
            label={t('settings.account.email')}
            value={maskedEmail}
            accessibilityLabel={`${t('settings.account.email')}: ${maskedEmail}`}
            styles={styles}
          />
          <Row
            label={t('settings.account.changePassword')}
            chevron
            onPress={navigateToResetPassword}
            styles={styles}
          />
          <Row
            label={t('settings.deleteAccount')}
            chevron
            destructive
            onPress={navigateToDeleteAccount}
            isLast
            styles={styles}
          />
        </Section>

        {/* Language ────────────────────────────────────────────────────────── */}
        <Section titleKey="settings.section.language" styles={styles}>
          <ToggleRowGroup<LocalePreference>
            testIDPrefix="settings-language"
            options={languageOptions}
            value={languagePref}
            onChange={handleLanguageChange}
          />
        </Section>

        {/* Appearance ──────────────────────────────────────────────────────── */}
        <Section titleKey="settings.section.appearance" styles={styles}>
          <ToggleRowGroup<ThemePreference>
            testIDPrefix="settings-appearance"
            options={appearanceOptions}
            value={themePref}
            onChange={setThemePref}
          />
        </Section>

        {/* Blocked users ───────────────────────────────────────────────────── */}
        <Section titleKey="settings.section.blocked" styles={styles}>
          {blocks && blocks.length > 0 ? (
            blocks.map((block) => (
              <View key={block.blocked_id} style={[styles.row, styles.rowDivider]}>
                <Text style={styles.rowLabel}>{block.blocked_identifier}</Text>
                <Pressable
                  testID={`unblock-${block.blocked_id}`}
                  onPress={() => unblock(block.blocked_id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('blocked.unblock')}
                  hitSlop={8}
                >
                  <Text style={styles.unblockText}>{t('blocked.unblock')}</Text>
                </Pressable>
              </View>
            ))
          ) : (
            <View style={styles.row}>
              <Text style={styles.rowLabelMuted}>{t('blocked.empty')}</Text>
            </View>
          )}
        </Section>

        {/* Moderation — visible only to moderators ─────────────────────────── */}
        {isMod ? (
          <Section titleKey="settings.section.moderation" styles={styles}>
            <Row
              label={t('settings.mod.queue')}
              chevron
              onPress={() => router.push('/(moderator)/queue')}
              isLast
              styles={styles}
            />
          </Section>
        ) : null}

        {/* Placeholder sections — remaining sub-tasks ─────────────────────── */}
        {PENDING_SECTIONS.map((s) => (
          <Section key={s.titleKey} titleKey={s.titleKey} styles={styles}>
            <Row label={t('settings.placeholder.comingNext')} muted isLast styles={styles} />
          </Section>
        ))}

        {/* Legal ───────────────────────────────────────────────────────────── */}
        <Section titleKey="settings.legal.title" styles={styles}>
          <Row
            testID="settings-legal-privacy"
            label={t('settings.legal.privacy')}
            chevron
            onPress={() => void Linking.openURL(legalConfig.privacyUrl)}
            styles={styles}
          />
          <Row
            testID="settings-legal-terms"
            label={t('settings.legal.terms')}
            chevron
            onPress={() => void Linking.openURL(legalConfig.termsUrl)}
            styles={styles}
          />
          <Row
            testID="settings-legal-guidelines"
            label={t('settings.legal.guidelines')}
            chevron
            onPress={() => void Linking.openURL(legalConfig.guidelinesUrl)}
            isLast
            styles={styles}
          />
        </Section>

        {/* Support ─────────────────────────────────────────────────────────── */}
        <Section titleKey="settings.support.title" styles={styles}>
          <Row
            testID="settings-support-feedback"
            label={t('settings.support.feedback')}
            chevron
            onPress={() => void Linking.openURL(`mailto:${supportConfig.feedbackEmail}`)}
            styles={styles}
          />
          <Row label={t('settings.support.version')} value={appVersion} isLast styles={styles} />
        </Section>

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

      {switchingLanguage ? (
        <View
          style={styles.switchOverlay}
          accessibilityRole="progressbar"
          accessibilityLabel={t('settings.language.switching')}
        >
          <ActivityIndicator size="large" color={c.brand.primary} />
          <Text style={styles.switchOverlayText}>{t('settings.language.switching')}</Text>
        </View>
      ) : null}
    </View>
  );
}

interface SectionProps {
  titleKey: TranslationKey;
  children: React.ReactNode;
  styles: ReturnType<typeof makeStyles>;
}

function Section({ titleKey, children, styles }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {t(titleKey).toUpperCase()}
      </Text>
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
  testID?: string;
  styles: ReturnType<typeof makeStyles>;
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
  testID,
  styles,
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
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}
