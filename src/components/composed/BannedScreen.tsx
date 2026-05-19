import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '@/lib/i18n';
import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { colors } from '@/theme/colors';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export function BannedScreen(): React.JSX.Element {
  function handleLogOut(): void {
    void useAuthStore.getState().signOut();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container} accessibilityRole="none" testID="banned-screen">
        <Text variant="title" style={styles.title}>
          {t('banned.title')}
        </Text>
        <Text variant="bodyMuted" style={styles.body}>
          {t('banned.body')}
        </Text>
        <View style={styles.buttonWrapper}>
          <Button
            kind="secondary"
            size="lg"
            full
            onPress={handleLogOut}
            accessibilityLabel={t('banned.logout')}
            accessibilityRole="button"
          >
            {t('banned.logout')}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: colors.bg.base,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    color: colors.brand.primary,
  },
  body: {
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  buttonWrapper: {
    width: '100%',
  },
});
