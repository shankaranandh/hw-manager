import { Platform } from 'react-native';

/**
 * A dark, high-contrast palette. The app is mostly opened in the evening, and a
 * bright white screen at 9pm is its own small act of hostility.
 */
export const color = {
  bg: '#12131A',
  surface: '#1B1D27',
  surfaceHigh: '#242735',
  surfaceSunken: '#0E0F15',
  border: '#2E3243',
  borderStrong: '#3C4157',

  text: '#F3F5F9',
  textMuted: '#A0A7BB',
  textFaint: '#6E7590',

  accent: '#5B8DEF',
  accentSoft: 'rgba(91, 141, 239, 0.16)',
  success: '#2FBF71',
  successSoft: 'rgba(47, 191, 113, 0.16)',
  warning: '#F2A93B',
  warningSoft: 'rgba(242, 169, 59, 0.16)',
  danger: '#F2635F',
  dangerSoft: 'rgba(242, 99, 95, 0.16)',
} as const;

/** 4pt grid. */
export const space = (steps: number): number => steps * 4;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const font = {
  display: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  small: { fontSize: 13, fontWeight: '500' as const },
  tiny: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.4 },
};

export const shadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 4 },
  default: {},
});

/** Minimum comfortable tap target; thumbs in a hallway are not precise. */
export const TAP_TARGET = 44;
