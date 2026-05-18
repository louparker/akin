import React from 'react';
import { View as RNView, type ViewProps } from 'react-native';

export function View({ children, ...props }: ViewProps) {
  return <RNView {...props}>{children}</RNView>;
}
