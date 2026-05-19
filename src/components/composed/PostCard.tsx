import { memo } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
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
  isLast?: boolean;
  onPress: () => void;
}

function PostCardImpl({
  category,
  timeAgo,
  title,
  excerpt,
  authorIdentifier,
  participantCount,
  spiceLevel,
  isLast = false,
  onPress,
}: PostCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        !isLast && styles.border,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Post: ${title}`}
    >
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
    </Pressable>
  );
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
    prev.isLast === next.isLast &&
    prev.onPress === next.onPress
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    paddingVertical: 20,
    backgroundColor: colors.bg.base,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.hairline,
  },
  pressed: {
    opacity: 0.85,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dot: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: colors.fg.tertiary,
  },
  timestamp: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: colors.fg.tertiary,
  },
  title: {
    fontFamily: 'Source Serif 4',
    fontSize: 19,
    color: colors.fg.primary,
    lineHeight: 19 * 1.3,
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  excerpt: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.fg.secondary,
    lineHeight: 14 * 1.5,
    marginBottom: 14,
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
    color: colors.fg.tertiary,
  },
});
