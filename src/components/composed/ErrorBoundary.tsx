/**
 * ErrorBoundary — top-level error boundary for the app.
 *
 * Wraps any subtree. On error:
 * - Logs via logger.error (scrubbed, no PII)
 * - Shows a user-facing fallback with bilingual copy
 * - Provides a Retry button (resets the boundary)
 * - Provides a Send Feedback button (opens a mailto: with an opaque error code)
 *
 * Uses react-error-boundary so the FallbackComponent is a plain function
 * component, keeping React state/hooks available inside the fallback.
 *
 * CRITICAL-PATH: error recovery surface — review before production.
 */

import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { ErrorBoundary as RebErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { Button } from '@/components/primitives/Button';
import { Text } from '@/components/primitives/Text';
import { logger } from '@/lib/logger';
import { Sentry } from '@/lib/sentry';
import { t } from '@/lib/i18n';
import { colors } from '@/theme/colors';

// ── Error code (opaque, safe to show, not PII) ────────────────────────────────

function shortErrorCode(error: Error): string {
  const hash = (error.message + Date.now()).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `ERR-${Math.abs(hash % 99999)
    .toString(16)
    .toUpperCase()}`;
}

// ── Fallback screen ───────────────────────────────────────────────────────────

interface ErrorScreenProps extends FallbackProps {
  feedbackEmail: string;
  errorCode: string;
}

function ErrorScreen({ resetErrorBoundary, feedbackEmail, errorCode }: ErrorScreenProps) {
  function handleFeedback() {
    const subject = encodeURIComponent(`Akin app error — ${errorCode}`);
    const body = encodeURIComponent(
      `Hi,\n\nI encountered an error in the Akin app.\n\nError code: ${errorCode}\n\n(Please describe what you were doing when this happened.)\n`,
    );
    const url = `mailto:${feedbackEmail}?subject=${subject}&body=${body}`;
    void Linking.openURL(url);
  }

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text variant="title" style={styles.title}>
        {t('error.boundary.title')}
      </Text>
      <Text variant="bodyMuted" style={styles.body}>
        {t('error.boundary.body')}
      </Text>
      <Text variant="mono" style={styles.code}>
        {errorCode}
      </Text>
      <View style={styles.actions}>
        <Button
          kind="primary"
          size="md"
          full
          onPress={resetErrorBoundary}
          accessibilityLabel={t('error.boundary.retry')}
        >
          {t('error.boundary.retry')}
        </Button>
        <Button
          kind="ghost"
          size="md"
          full
          onPress={handleFeedback}
          accessibilityLabel={t('error.boundary.feedback')}
        >
          {t('error.boundary.feedback')}
        </Button>
      </View>
    </View>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  feedbackEmail?: string;
}

export function ErrorBoundary({
  children,
  feedbackEmail = 'hi@akin.app',
}: ErrorBoundaryProps): React.JSX.Element {
  function handleError(error: Error): void {
    const errorCode = shortErrorCode(error);
    Sentry?.captureException(error, { extra: { errorCode } });
    logger.error('error_boundary_caught', { errorCode });
  }

  function renderFallback(props: FallbackProps): React.JSX.Element {
    const errorCode = shortErrorCode(props.error as Error);
    return <ErrorScreen {...props} feedbackEmail={feedbackEmail} errorCode={errorCode} />;
  }

  return (
    <RebErrorBoundary onError={handleError} fallbackRender={renderFallback}>
      {children}
    </RebErrorBoundary>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.base,
    padding: 32,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    textAlign: 'center',
    marginBottom: 20,
  },
  code: {
    textAlign: 'center',
    marginBottom: 32,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
});
