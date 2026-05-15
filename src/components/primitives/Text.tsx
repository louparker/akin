import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

export type TextProps = RNTextProps;

// Stub primitive. Will be replaced in the UI task with a NativeWind/themed
// version that reads typography tokens from src/theme.
export const Text = (props: TextProps): React.ReactElement => <RNText {...props} />;
