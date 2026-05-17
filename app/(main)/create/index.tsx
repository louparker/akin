// Create tab — placeholder until Task 3.8 (Create Post feature) is implemented.
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/primitives/Text';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';

export default function CreateScreen() {
  return (
    <View style={styles.container}>
      <Text variant="title">{t('nav.tab.write')}</Text>
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
});
