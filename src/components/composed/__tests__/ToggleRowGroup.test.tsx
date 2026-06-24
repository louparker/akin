// ToggleRowGroup — a list of labelled rows, each with an on/off switch, that
// behaves as a single-select (radio) group: exactly one option is on at a time,
// and the selected option cannot be switched off (you switch a different one on
// instead).

import { render, fireEvent } from '@testing-library/react-native';
import { a11yCheck } from '@/lib/test-utils';
import { ToggleRowGroup } from '../ToggleRowGroup';

const OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'sv', label: 'Svenska' },
  { value: 'en', label: 'English' },
] as const;

function renderGroup(value: 'system' | 'sv' | 'en', onChange = jest.fn()) {
  const utils = render(
    <ToggleRowGroup
      testIDPrefix="lang"
      options={OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
      value={value}
      onChange={onChange}
    />,
  );
  return { ...utils, onChange };
}

describe('ToggleRowGroup', () => {
  it('renders one labelled row per option', () => {
    const { getByText, getByTestId } = renderGroup('system');
    expect(getByText('System')).toBeOnTheScreen();
    expect(getByText('Svenska')).toBeOnTheScreen();
    expect(getByText('English')).toBeOnTheScreen();
    expect(getByTestId('lang-system')).toBeOnTheScreen();
    expect(getByTestId('lang-sv')).toBeOnTheScreen();
    expect(getByTestId('lang-en')).toBeOnTheScreen();
  });

  it('switches the selected option on and the others off', () => {
    const { getByTestId } = renderGroup('en');
    expect(getByTestId('lang-en').props.value).toBe(true);
    expect(getByTestId('lang-sv').props.value).toBe(false);
    expect(getByTestId('lang-system').props.value).toBe(false);
  });

  it('calls onChange with the option when an off switch is turned on', () => {
    const { getByTestId, onChange } = renderGroup('system');
    fireEvent(getByTestId('lang-sv'), 'valueChange', true);
    expect(onChange).toHaveBeenCalledWith('sv');
  });

  it('does not call onChange when the already-selected switch is toggled off', () => {
    const { getByTestId, onChange } = renderGroup('sv');
    fireEvent(getByTestId('lang-sv'), 'valueChange', false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('passes a11y checks (every switch is labelled)', () => {
    const { root } = renderGroup('system');
    expect(a11yCheck(root)).toEqual([]);
  });
});
