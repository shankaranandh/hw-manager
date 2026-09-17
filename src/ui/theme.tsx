import React, { createContext, useContext, useMemo } from 'react';
import { Platform, useColorScheme, useWindowDimensions } from 'react-native';

import { alpha, ensureContrast, mix, withLightness } from './color';

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';

/**
 * Semantic colour roles. Screens name the job a colour does, never the colour
 * itself, which is what makes a second scheme a data change rather than a
 * rewrite.
 */
export interface Palette {
  bg: string;
  surface: string;
  surfaceHigh: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;

  text: string;
  textMuted: string;
  textFaint: string;

  accent: string;
  onAccent: string;
  accentSoft: string;
  onAccentSoft: string;

  success: string;
  onSuccess: string;
  successSoft: string;
  onSuccessSoft: string;

  warning: string;
  warningSoft: string;
  onWarningSoft: string;

  danger: string;
  dangerSoft: string;
  onDangerSoft: string;

  overlay: string;
  shadowColor: string;
}

/**
 * Light mode is a warm off-white rather than pure white: this gets read in a
 * bright classroom and under a desk lamp at 9pm, and #FFF glares in both.
 */
const LIGHT: Palette = {
  bg: '#F5F6FB',
  surface: '#FFFFFF',
  surfaceHigh: '#EDEFF7',
  surfaceSunken: '#E6E9F3',
  border: '#DEE2ED',
  borderStrong: '#BFC6D8',

  text: '#161925',
  textMuted: '#555C73',
  textFaint: '#7A8299',

  accent: '#4B45D1',
  onAccent: '#FFFFFF',
  accentSoft: '#E6E5FA',
  onAccentSoft: '#332EA0',

  success: '#15803D',
  onSuccess: '#FFFFFF',
  successSoft: '#DCF5E5',
  onSuccessSoft: '#106235',

  warning: '#A45B06',
  warningSoft: '#FCEFD7',
  onWarningSoft: '#8A4B05',

  danger: '#C02626',
  dangerSoft: '#FBE3E3',
  onDangerSoft: '#A01F1F',

  overlay: 'rgba(16, 19, 30, 0.45)',
  shadowColor: '#2A3045',
};

const DARK: Palette = {
  bg: '#0F1118',
  surface: '#191C26',
  surfaceHigh: '#232735',
  surfaceSunken: '#0A0C12',
  border: '#2C3142',
  borderStrong: '#404659',

  text: '#F2F4FA',
  textMuted: '#A7AEC4',
  textFaint: '#79819A',

  accent: '#9A95FF',
  onAccent: '#14122E',
  accentSoft: '#272743',
  onAccentSoft: '#BFBBFF',

  success: '#54D98C',
  onSuccess: '#06301A',
  successSoft: '#17351F',
  onSuccessSoft: '#7BE5A8',

  warning: '#F5B544',
  warningSoft: '#3A2D14',
  onWarningSoft: '#F8CB7A',

  danger: '#FF8A85',
  dangerSoft: '#3D1F1F',
  onDangerSoft: '#FFAFAB',

  overlay: 'rgba(0, 0, 0, 0.62)',
  shadowColor: '#000000',
};

/**
 * Subject hues.
 *
 * Eight well-separated hues, each also separated by lightness, so that the pairs
 * most often confused (the red and the green especially) stay distinguishable to
 * students with colour vision deficiency. Colour is never the only signal in the
 * interface: every subject chip carries its name, and every status carries text.
 */
export const SUBJECT_HUES = [
  '#3D6FD6', // blue
  '#D2601A', // orange
  '#178E7A', // teal
  '#8046C8', // violet
  '#C42D57', // raspberry
  '#0E7FA8', // cyan
  '#9A7B10', // ochre
  '#3F8F38', // green
];

export interface SubjectColors {
  /** Solid fill for a selected chip. */
  fill: string;
  /** Text or icon drawn on top of `fill`. */
  onFill: string;
  /** The small identifying dot. */
  dot: string;
  /** Tinted background for an unselected chip or a bar. */
  soft: string;
  /** Text drawn on top of `soft`. */
  onSoft: string;
}

/** Derives a subject's full colour set for the active scheme. */
export function subjectColors(base: string, scheme: ColorScheme, palette: Palette): SubjectColors {
  // Each role is pushed until it clears its own contrast bar, so a hue that is
  // awkward at one lightness (yellows against white, blues against near-black)
  // is corrected here rather than by hand-tuning the hue list.
  if (scheme === 'dark') {
    const fill = withLightness(base, 0.64);
    const soft = mix(base, palette.surface, 0.84);
    return {
      fill,
      onFill: ensureContrast('#10121A', fill, 4.5),
      dot: ensureContrast(withLightness(base, 0.68), palette.surface, 3),
      soft,
      onSoft: ensureContrast(withLightness(base, 0.74), soft, 4.5),
    };
  }
  const fill = withLightness(base, 0.42);
  const soft = mix(base, palette.surface, 0.9);
  return {
    fill,
    onFill: ensureContrast('#FFFFFF', fill, 4.5),
    dot: ensureContrast(withLightness(base, 0.45), palette.surface, 3),
    soft,
    onSoft: ensureContrast(withLightness(base, 0.32), soft, 4.5),
  };
}

/** 4pt grid. */
export const space = (steps: number): number => steps * 4;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/**
 * Type scale. Every size caps how far Dynamic Type may push it: students who
 * turn text size up must still be able to read a plan, but a display heading at
 * 3x breaks every row it sits in.
 */
export const font = {
  display: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.5, maxFontSizeMultiplier: 1.6 },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3, maxFontSizeMultiplier: 1.7 },
  heading: { fontSize: 17, fontWeight: '600' as const, maxFontSizeMultiplier: 1.8 },
  body: { fontSize: 15, fontWeight: '500' as const, maxFontSizeMultiplier: 2 },
  small: { fontSize: 13, fontWeight: '500' as const, maxFontSizeMultiplier: 2 },
  tiny: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.4, maxFontSizeMultiplier: 1.8 },
};

/** Style props only; `maxFontSizeMultiplier` is a Text prop, not a style. */
export type FontVariant = keyof typeof font;
export const fontStyle = (variant: FontVariant) => {
  const { maxFontSizeMultiplier, ...style } = font[variant];
  return style;
};
export const fontCap = (variant: FontVariant) => font[variant].maxFontSizeMultiplier;

/** Apple's minimum comfortable target; thumbs in a hallway are not precise. */
export const TAP_TARGET = 44;

export type SizeClass = 'compact' | 'regular' | 'wide';

export interface Theme {
  scheme: ColorScheme;
  color: Palette;
  /** compact: phone. regular: small tablet / split view. wide: full iPad. */
  sizeClass: SizeClass;
  /** True where a permanent side rail beats a bottom tab bar. */
  railNavigation: boolean;
  /** Caps line length on large screens so a single column stays readable. */
  contentMaxWidth: number;
  /** Wider cap for screens that split into columns, which need the room. */
  wideMaxWidth: number;
  gutter: number;
  elevation: (level: 1 | 2) => object;
  subject: (base: string) => SubjectColors;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({
  preference = 'system',
  children,
}: {
  preference?: ThemePreference;
  children: React.ReactNode;
}) {
  const systemScheme = useColorScheme();
  const { width } = useWindowDimensions();

  const theme = useMemo<Theme>(() => {
    const scheme: ColorScheme =
      preference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : preference;
    const palette = scheme === 'light' ? LIGHT : DARK;

    // Breakpoints are on the window, not the device, so an iPad in Split View is
    // treated as the narrow surface it actually is.
    const sizeClass: SizeClass = width >= 1000 ? 'wide' : width >= 700 ? 'regular' : 'compact';

    return {
      scheme,
      color: palette,
      sizeClass,
      railNavigation: sizeClass === 'wide',
      contentMaxWidth: sizeClass === 'compact' ? Infinity : 680,
      wideMaxWidth: sizeClass === 'compact' ? Infinity : sizeClass === 'regular' ? 680 : 1120,
      gutter: sizeClass === 'compact' ? space(5) : space(7),
      elevation: (level) =>
        Platform.select({
          ios: {
            shadowColor: palette.shadowColor,
            shadowOpacity: scheme === 'dark' ? 0.4 : level === 1 ? 0.07 : 0.12,
            shadowRadius: level === 1 ? 10 : 20,
            shadowOffset: { width: 0, height: level === 1 ? 3 : 8 },
          },
          android: { elevation: level === 1 ? 2 : 6 },
          default: {
            boxShadow: `0 ${level === 1 ? 3 : 8}px ${level === 1 ? 10 : 20}px ${alpha(
              palette.shadowColor,
              scheme === 'dark' ? 0.4 : 0.1,
            )}`,
          },
        }) as object,
      subject: (base: string) => subjectColors(base, scheme, palette),
    };
  }, [preference, systemScheme, width]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside <ThemeProvider>');
  return theme;
}

export { LIGHT as lightPalette, DARK as darkPalette };
