import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '@/theme/colors';

interface IconSettingsProps {
  /** Active tint when true, faint tint when false. Defaults to fg.primary. */
  active?: boolean;
  /** Pixel size (defaults to 24). */
  size?: number;
}

/**
 * Settings icon — 8-tooth gear in the project's hairline-stroke design language.
 *
 * Visual rules match the bottom-tab icons in `app/(main)/_layout.tsx`:
 *   • 24×24 viewBox
 *   • 1.5pt stroke
 *   • rounded caps + joins
 *   • tint flips between fg.primary (active) and fg.faint (inactive)
 *
 * Used in two places:
 *   1. Bottom-tab "Settings" entry (see (main)/_layout.tsx)
 *   2. Top-right affordance on the You screen header (see (main)/you/index.tsx)
 */
export function IconSettings({ active = true, size = 24 }: IconSettingsProps) {
  const c = active ? colors.fg.primary : colors.fg.faint;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* 8-tooth gear silhouette: based on the Lucide "settings" mark, adapted to
          the project's stroke weight + cap style. */}
      <Path
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Hollow centre — the "axle" hole. */}
      <Circle cx="12" cy="12" r="3" stroke={c} strokeWidth={1.5} />
    </Svg>
  );
}
