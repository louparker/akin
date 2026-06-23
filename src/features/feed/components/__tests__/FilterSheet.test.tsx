import { render } from '@testing-library/react-native';
import { a11yCheck } from '@/lib/test-utils';
import { FilterSheet } from '../FilterSheet';

const BASE_PROPS = {
  visible: true,
  sort: 'recent' as const,
  minSpice: 0,
  onSortChange: jest.fn(),
  onMinSpiceChange: jest.fn(),
  onApply: jest.fn(),
  onClose: jest.fn(),
};

describe('FilterSheet — accessibility', () => {
  it('passes a11y checks when visible', () => {
    const { root } = render(<FilterSheet {...BASE_PROPS} />);
    expect(a11yCheck(root)).toEqual([]);
  });

  it('passes a11y checks with spice filter active', () => {
    const { root } = render(<FilterSheet {...BASE_PROPS} minSpice={3} />);
    expect(a11yCheck(root)).toEqual([]);
  });

  it('passes a11y checks with comments sort active', () => {
    const { root } = render(<FilterSheet {...BASE_PROPS} sort="comments" />);
    expect(a11yCheck(root)).toEqual([]);
  });

  it('overlay dismiss has button role and close label', () => {
    const { getAllByRole } = render(<FilterSheet {...BASE_PROPS} />);
    const buttons = getAllByRole('button');
    const closeBtn = buttons.find((b) => b.props.accessibilityLabel === 'Close');
    expect(closeBtn).toBeDefined();
  });
});
