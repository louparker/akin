import { memo, useMemo } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColorTokens } from '@/theme/useColorTokens';
import { IdentChip } from './IdentChip';
import { CapacityDots } from './CapacityDots';
import { SpiceFlames } from './SpiceFlames';
import { CategoryTag } from './CategoryTag';

interface PostCardProps {
  id: string;
  category: string;
  timeAgo: string;
  title: string;
  excerpt: string;
  authorIdentifier: string;
  participantCount: number;
  isFull: boolean;
  spiceLevel?: number;
  /** When true, the card fades + slides in — used for a just-created post. */
  animateIn?: boolean;
  onPress: () => void;
}

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.bg.base,
    },
    pressed: {
      opacity: 0.85,
    },
    container: {
      paddingHorizontal: 22,
      paddingTop: 28,
      paddingBottom: 36,
    },
    divider: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: c.border.divider,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 16,
    },
    dot: {
      fontFamily: 'Inter',
      fontSize: 12,
      color: c.fg.tertiary,
    },
    timestamp: {
      fontFamily: 'Inter',
      fontSize: 12,
      color: c.fg.tertiary,
    },
    title: {
      fontFamily: 'Source Serif 4',
      fontSize: 19,
      color: c.fg.primary,
      lineHeight: 19 * 1.3,
      letterSpacing: -0.2,
      marginBottom: 10,
    },
    excerpt: {
      fontFamily: 'Inter',
      fontSize: 14,
      color: c.fg.secondary,
      lineHeight: 14 * 1.5,
      marginBottom: 18,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    footerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    capacityText: {
      fontFamily: 'Inter',
      fontSize: 12,
      color: c.fg.tertiary,
    },
  });
}

function PostCardImpl({
  category,
  timeAgo,
  title,
  excerpt,
  authorIdentifier,
  participantCount,
  spiceLevel,
  animateIn = false,
  onPress,
}: PostCardProps) {
  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);

  const card = (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {/* Padding lives on a child View, not the Pressable root.
          On Fabric (New Architecture), FlashList's CellContainer measures the
          item's intrinsic size before JS styles are applied. Padding on the
          Pressable root gets excluded from that measurement, so the container
          is sized to content-only and the padding has nowhere to expand into.
          A plain View child is not affected by this. */}
      <View style={styles.container}>
        {/* Row 1: Category + timestamp */}
        <View style={styles.metaRow}>
          <CategoryTag name={category} />
          <Text style={styles.dot}>·</Text>
          <Text style={styles.timestamp}>{timeAgo}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Excerpt */}
        <Text style={styles.excerpt} numberOfLines={2}>
          {excerpt}
        </Text>

        {/* Footer */}
        <View style={styles.footer}>
          <IdentChip name={authorIdentifier} />
          <View style={styles.footerRight}>
            <CapacityDots filled={participantCount} total={4} />
            <Text style={styles.capacityText}>{participantCount}/4</Text>
            {spiceLevel !== undefined && spiceLevel > 0 ? (
              <SpiceFlames level={spiceLevel} size={11} />
            ) : null}
          </View>
        </View>
      </View>

      {/* Divider on the Pressable (no padding) so left:0/right:0 = full width */}
      <View style={styles.divider} />
    </Pressable>
  );

  // The wrapper only exists for the highlighted post, so flipping animateIn
  // false→true on a recycled FlashList cell remounts this subtree and fires
  // the entrance animation.
  if (animateIn) {
    return <Animated.View entering={FadeInDown.duration(420)}>{card}</Animated.View>;
  }
  return card;
}

export const PostCard = memo(PostCardImpl, (prev, next) => {
  return (
    prev.id === next.id &&
    prev.category === next.category &&
    prev.timeAgo === next.timeAgo &&
    prev.title === next.title &&
    prev.excerpt === next.excerpt &&
    prev.authorIdentifier === next.authorIdentifier &&
    prev.participantCount === next.participantCount &&
    prev.isFull === next.isFull &&
    prev.spiceLevel === next.spiceLevel &&
    prev.animateIn === next.animateIn &&
    prev.onPress === next.onPress
  );
});
