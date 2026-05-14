import { screen } from '@testing-library/react-native';
import { Text } from '@/components/primitives/Text';
import { renderWithProviders } from '@/lib/test-utils/render';

describe('Text', () => {
  it('renders its children', () => {
    renderWithProviders(<Text>Hello Akin</Text>);
    expect(screen.getByText('Hello Akin')).toBeOnTheScreen();
  });

  it('forwards a testID', () => {
    renderWithProviders(<Text testID="greeting">Hej</Text>);
    expect(screen.getByTestId('greeting')).toBeOnTheScreen();
  });
});
