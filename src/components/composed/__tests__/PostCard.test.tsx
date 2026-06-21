import { render } from '@testing-library/react-native';
import { a11yCheck } from '@/lib/test-utils';
import { PostCard } from '../PostCard';

const DEFAULT_PROPS = {
  id: 'p1',
  category: 'Vent Space',
  timeAgo: '2h ago',
  title: 'Has anyone else had this happen?',
  excerpt: 'I was talking to someone I met online and suddenly...',
  authorIdentifier: 'BlueFox42',
  participantCount: 2,
  isFull: false,
  onPress: jest.fn(),
};

describe('PostCard — accessibility', () => {
  it('passes a11y checks', () => {
    const { root } = render(<PostCard {...DEFAULT_PROPS} />);
    expect(a11yCheck(root)).toEqual([]);
  });

  it('uses the post title as the accessible label', () => {
    const { getByRole } = render(<PostCard {...DEFAULT_PROPS} />);
    expect(getByRole('button', { name: 'Has anyone else had this happen?' })).toBeOnTheScreen();
  });

  it('passes a11y checks when post is full', () => {
    const { root } = render(<PostCard {...DEFAULT_PROPS} isFull participantCount={4} />);
    expect(a11yCheck(root)).toEqual([]);
  });

  it('passes a11y checks when spice level is present', () => {
    const { root } = render(<PostCard {...DEFAULT_PROPS} spiceLevel={3} />);
    expect(a11yCheck(root)).toEqual([]);
  });
});
