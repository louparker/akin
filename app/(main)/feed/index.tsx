// Feed tab — placeholder until Task 3.6 (Feed feature) is implemented.
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/primitives/Text';
import { colors } from '@/theme/colors';

export default function FeedScreen() {
  return (
    <View style={styles.container}>
      <Text variant="display" style={styles.wordmark}>
        akin
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: 'Source Serif 4',
    fontSize: 30,
    letterSpacing: -0.5,
    color: colors.fg.primary,
  },
});
