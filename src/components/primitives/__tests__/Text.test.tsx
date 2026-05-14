import { Text } from '@/components/primitives/Text';
import { renderWithProviders } from '@/lib/test-utils/render';

describe('Text primitive', () => {
  it('renders its children', () => {
    const { getByText } = renderWithProviders(<Text>hello akin</Text>);
    expect(getByText('hello akin')).toBeTruthy();
  });
});
