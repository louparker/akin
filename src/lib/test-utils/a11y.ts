// a11yCheck — traverses a rendered React Native test instance tree and returns
// plain-English descriptions of accessibility violations found.
//
// Checks:
//   • Interactive elements (button, link, radio, checkbox, tab, etc.) must have
//     an accessible label — either an explicit `accessibilityLabel` prop, or
//     text content that VoiceOver would read from child Text nodes.
//
// Usage:
//   const { root } = renderWithProviders(<MyScreen />);
//   expect(a11yCheck(root)).toEqual([]);

import type { ReactTestInstance } from 'react-test-renderer';

const INTERACTIVE_ROLES = new Set([
  'button',
  'link',
  'imagebutton',
  'radio',
  'checkbox',
  'switch',
  'adjustable',
  'tab',
]);

function collectTextContent(node: ReactTestInstance): string {
  let text = '';
  for (const child of node.children) {
    if (typeof child === 'string') {
      text += child;
    } else {
      if (
        child.props.accessibilityElementsHidden === true ||
        child.props.importantForAccessibility === 'no-hide-descendants'
      ) {
        continue;
      }
      text += collectTextContent(child);
    }
  }
  return text.trim();
}

function getEffectiveLabel(node: ReactTestInstance): string | null {
  const explicit = node.props.accessibilityLabel as string | undefined;
  if (explicit) return explicit;
  return collectTextContent(node) || null;
}

function describeNode(node: ReactTestInstance): string {
  const testID = node.props.testID as string | undefined;
  const role = node.props.accessibilityRole as string | undefined;
  if (testID) return `testID="${testID}"`;
  if (role) return `role="${role}"`;
  return typeof node.type === 'string' ? node.type : '(component)';
}

export function a11yCheck(root: ReactTestInstance): string[] {
  const violations: string[] = [];

  function traverse(node: ReactTestInstance) {
    if (
      node.props.accessibilityElementsHidden === true ||
      node.props.importantForAccessibility === 'no-hide-descendants' ||
      node.props.accessible === false
    ) {
      return;
    }

    const role = node.props.accessibilityRole as string | undefined;
    if (role && INTERACTIVE_ROLES.has(role)) {
      const label = getEffectiveLabel(node);
      if (!label) {
        violations.push(`[a11y] ${role} element has no accessible label (${describeNode(node)})`);
      }
    }

    for (const child of node.children) {
      if (typeof child !== 'string') traverse(child);
    }
  }

  traverse(root);
  return violations;
}
