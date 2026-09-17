/**
 * Colour maths.
 *
 * Subject colours are picked by students, and every one of them has to stay
 * legible as a chip fill, a dot and a bar, in both light and dark mode. Rather
 * than hand-tuning a hex for each combination, derive them and check the
 * contrast, so a colour that fails is a test failure and not something a student
 * discovers by squinting at their homework.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const pad2 = (n: number) => n.toString(16).padStart(2, '0');

export function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace('#', '').trim();
  const full =
    normalized.length === 3
      ? normalized.split('').map((c) => c + c).join('')
      : normalized.padEnd(6, '0').slice(0, 6);
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${pad2(Math.round(clamp(r, 0, 255)))}${pad2(Math.round(clamp(g, 0, 255)))}${pad2(
    Math.round(clamp(b, 0, 255)),
  )}`;
}

/** WCAG relative luminance. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1 (identical) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const lumA = relativeLuminance(a);
  const lumB = relativeLuminance(b);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function hexToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) return { h: 0, s: 0, l };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;
  h *= 60;
  if (h < 0) h += 360;

  return { h, s, l };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const sat = clamp(s, 0, 1);
  const lum = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * lum - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0]
    : hp < 2 ? [x, c, 0]
    : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c]
    : hp < 5 ? [x, 0, c]
    : [c, 0, x];
  const m = lum - c / 2;
  return rgbToHex({ r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 });
}

/** Rewrites a colour to an exact lightness, keeping its hue and saturation. */
export function withLightness(hex: string, lightness: number): string {
  const { h, s } = hexToHsl(hex);
  return hslToHex({ h, s, l: clamp(lightness, 0, 1) });
}

export function withSaturation(hex: string, saturation: number): string {
  const { h, l } = hexToHsl(hex);
  return hslToHex({ h, s: clamp(saturation, 0, 1), l });
}

/** Blends two colours; `t` of 0 returns `a`, 1 returns `b`. */
export function mix(a: string, b: string, t: number): string {
  const ratio = clamp(t, 0, 1);
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  return rgbToHex({
    r: rgbA.r + (rgbB.r - rgbA.r) * ratio,
    g: rgbA.g + (rgbB.g - rgbA.g) * ratio,
    b: rgbA.b + (rgbB.b - rgbA.b) * ratio,
  });
}

/** `rgba()` string for translucent fills. */
export function alpha(hex: string, opacity: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(opacity, 0, 1)})`;
}

/** Whichever of the two candidates is more readable on `background`. */
export function readableOn(background: string, dark: string, light: string): string {
  return contrastRatio(background, dark) >= contrastRatio(background, light) ? dark : light;
}

/**
 * Darkens or lightens `foreground` until it clears `minimum` contrast against
 * `background`, moving away from the background's own lightness.
 */
export function ensureContrast(
  foreground: string,
  background: string,
  minimum = 4.5,
): string {
  if (contrastRatio(foreground, background) >= minimum) return foreground;

  const { h, s } = hexToHsl(foreground);
  const backgroundIsDark = relativeLuminance(background) < 0.18;
  // Walk lightness towards white on a dark background, towards black on a light
  // one, and stop at the first step that clears the bar.
  for (let step = 1; step <= 100; step += 1) {
    const l = backgroundIsDark ? clamp(0.5 + step / 100, 0, 1) : clamp(0.5 - step / 100, 0, 1);
    const candidate = hslToHex({ h, s, l });
    if (contrastRatio(candidate, background) >= minimum) return candidate;
  }
  return backgroundIsDark ? '#FFFFFF' : '#000000';
}
