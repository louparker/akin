import { t } from '@/lib/i18n';
import type { ModerationAction } from '../api/useModerateReport';

export interface ActionConfig {
  action: ModerationAction;
  label: string;
  destructive?: boolean;
}

export function buildActions(
  reportedIdentifier: string | null,
  strikeCount: number,
): ActionConfig[] {
  const u = reportedIdentifier ?? '…';

  const warnEffect =
    strikeCount >= 2
      ? t('mod.action.warnEffect.strike3')
      : strikeCount === 1
        ? t('mod.action.warnEffect.strike2')
        : t('mod.action.warnEffect.strike1');

  return [
    { action: 'dismiss', label: t('mod.action.dismiss') },
    { action: 'hide', label: t('mod.action.hide'), destructive: true },
    {
      action: 'warn',
      label: `${t('mod.action.warn')} (${u}) — ${warnEffect}`,
      destructive: true,
    },
    { action: 'suspend', label: `${t('mod.action.suspend')} (${u})`, destructive: true },
    { action: 'ban', label: `${t('mod.action.ban')} (${u})`, destructive: true },
    { action: 'csam', label: `${t('mod.action.csam')} (${u})`, destructive: true },
  ];
}
