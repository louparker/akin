/**
 * ActiveConversationsPill — unit tests (TDD: written before implementation)
 *
 * The pill replaces the previous tab-bar dot-badge and lives in the create-post
 * footer. It is ALWAYS visible (including at 0) and changes background colour
 * based on count: 0 → ink (default), 1-2 → brand teal, 3 → semantic danger.
 */

import { renderWithProviders } from '@/lib/test-utils/render';
import { colors } from '@/theme/colors';
import { ActiveConversationsPill } from '../ActiveConversationsPill';

type StyleRecord = Record<string, unknown>;

function flattenStyle(style: unknown): StyleRecord {
  const list = Array.isArray(style) ? style : [style];
  return list.reduce<StyleRecord>(
    (acc, s) => (s && typeof s === 'object' ? { ...acc, ...(s as StyleRecord) } : acc),
    {},
  );
}

describe('ActiveConversationsPill', () => {
  it('renders "active in 0 of 3 conversations" at count 0', () => {
    const { getByTestId } = renderWithProviders(<ActiveConversationsPill count={0} />);
    expect(getByTestId('active-conversations-pill-text').props.children).toBe(
      'active in 0 of 3 conversations',
    );
  });

  it('renders "active in 1 of 3 conversations" at count 1', () => {
    const { getByTestId } = renderWithProviders(<ActiveConversationsPill count={1} />);
    expect(getByTestId('active-conversations-pill-text').props.children).toBe(
      'active in 1 of 3 conversations',
    );
  });

  it('renders "active in 2 of 3 conversations" at count 2', () => {
    const { getByTestId } = renderWithProviders(<ActiveConversationsPill count={2} />);
    expect(getByTestId('active-conversations-pill-text').props.children).toBe(
      'active in 2 of 3 conversations',
    );
  });

  it('renders "active in 3 of 3 conversations" at count 3', () => {
    const { getByTestId } = renderWithProviders(<ActiveConversationsPill count={3} />);
    expect(getByTestId('active-conversations-pill-text').props.children).toBe(
      'active in 3 of 3 conversations',
    );
  });

  it('uses ink (fg.primary) background at count 0', () => {
    const { getByTestId } = renderWithProviders(<ActiveConversationsPill count={0} />);
    const pill = getByTestId('active-conversations-pill');
    const styleProp: unknown = pill.props.style;
    const flat = flattenStyle(styleProp);
    expect(flat.backgroundColor).toBe(colors.fg.primary);
  });

  it('uses brand teal background at count 1', () => {
    const { getByTestId } = renderWithProviders(<ActiveConversationsPill count={1} />);
    const pill = getByTestId('active-conversations-pill');
    const styleProp: unknown = pill.props.style;
    const flat = flattenStyle(styleProp);
    expect(flat.backgroundColor).toBe(colors.brand.primary);
  });

  it('uses brand teal background at count 2', () => {
    const { getByTestId } = renderWithProviders(<ActiveConversationsPill count={2} />);
    const pill = getByTestId('active-conversations-pill');
    const styleProp: unknown = pill.props.style;
    const flat = flattenStyle(styleProp);
    expect(flat.backgroundColor).toBe(colors.brand.primary);
  });

  it('uses danger background at count 3 (at-limit)', () => {
    const { getByTestId } = renderWithProviders(<ActiveConversationsPill count={3} />);
    const pill = getByTestId('active-conversations-pill');
    const styleProp: unknown = pill.props.style;
    const flat = flattenStyle(styleProp);
    expect(flat.backgroundColor).toBe(colors.semantic.danger);
  });

  it('uses the toolbar surface colour for the inner text', () => {
    const { getByTestId } = renderWithProviders(<ActiveConversationsPill count={1} />);
    const text = getByTestId('active-conversations-pill-text');
    const styleProp: unknown = text.props.style;
    const flat = flattenStyle(styleProp);
    expect(flat.color).toBe(colors.bg.raised);
  });

  it('clamps caller-provided counts > 3 to the at-limit appearance', () => {
    const { getByTestId } = renderWithProviders(<ActiveConversationsPill count={5} />);
    const pill = getByTestId('active-conversations-pill');
    const styleProp: unknown = pill.props.style;
    const flat = flattenStyle(styleProp);
    expect(flat.backgroundColor).toBe(colors.semantic.danger);
  });

  it('exposes an at-limit accessibility hint when count is 3', () => {
    const { getByTestId } = renderWithProviders(<ActiveConversationsPill count={3} />);
    const pill = getByTestId('active-conversations-pill');
    expect(pill.props.accessibilityLabel).toMatch(/maximum/i);
  });

  it('does not announce the at-limit hint when count is below 3', () => {
    const { getByTestId } = renderWithProviders(<ActiveConversationsPill count={1} />);
    const pill = getByTestId('active-conversations-pill');
    expect(pill.props.accessibilityLabel).not.toMatch(/maximum/i);
  });
});
