import { contrastRatio } from '../color';
import { SUBJECT_HUES, darkPalette, font, lightPalette, subjectColors } from '../theme';
import type { ColorScheme, Palette } from '../theme';

const SCHEMES: { name: ColorScheme; palette: Palette }[] = [
  { name: 'light', palette: lightPalette },
  { name: 'dark', palette: darkPalette },
];

/** WCAG AA for normal text. */
const AA = 4.5;
/** WCAG AA for large text and for non-text boundaries. */
const AA_LARGE = 3;

describe.each(SCHEMES)('$name palette', ({ palette }) => {
  it('keeps body and muted text readable on every background', () => {
    for (const bg of [palette.bg, palette.surface, palette.surfaceHigh]) {
      expect(contrastRatio(palette.text, bg)).toBeGreaterThanOrEqual(AA);
      expect(contrastRatio(palette.textMuted, bg)).toBeGreaterThanOrEqual(AA);
    }
  });

  it('keeps the faintest text legible, not merely visible', () => {
    // Used for labels and hints, which are small: hold it to the normal-text bar.
    for (const bg of [palette.bg, palette.surface]) {
      expect(contrastRatio(palette.textFaint, bg)).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it('keeps label text readable on every tinted status background', () => {
    const pairs: [string, string][] = [
      [palette.onAccentSoft, palette.accentSoft],
      [palette.onSuccessSoft, palette.successSoft],
      [palette.onWarningSoft, palette.warningSoft],
      [palette.onDangerSoft, palette.dangerSoft],
    ];
    for (const [fg, bg] of pairs) expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA);
  });

  it('keeps button labels readable on solid fills', () => {
    expect(contrastRatio(palette.onAccent, palette.accent)).toBeGreaterThanOrEqual(AA);
    expect(contrastRatio(palette.onSuccess, palette.success)).toBeGreaterThanOrEqual(AA);
  });

  it('keeps status colours distinguishable from the surface behind them', () => {
    for (const tone of [palette.accent, palette.success, palette.warning, palette.danger]) {
      expect(contrastRatio(tone, palette.surface)).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it('draws borders that are actually visible', () => {
    expect(contrastRatio(palette.border, palette.surface)).toBeGreaterThan(1.1);
  });
});

describe.each(SCHEMES)('subject colours in $name', ({ name, palette }) => {
  it('gives every subject a readable chip, dot and tint', () => {
    for (const hue of SUBJECT_HUES) {
      const colors = subjectColors(hue, name, palette);
      expect(contrastRatio(colors.onFill, colors.fill)).toBeGreaterThanOrEqual(AA);
      expect(contrastRatio(colors.onSoft, colors.soft)).toBeGreaterThanOrEqual(AA);
      // The dot carries identity at 8pt; it has to separate from the card.
      expect(contrastRatio(colors.dot, palette.surface)).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it('handles a colour a student picked that we never shipped', () => {
    for (const odd of ['#000000', '#FFFFFF', '#FFFF00', '#808080']) {
      const colors = subjectColors(odd, name, palette);
      expect(contrastRatio(colors.onFill, colors.fill)).toBeGreaterThanOrEqual(AA);
      expect(contrastRatio(colors.onSoft, colors.soft)).toBeGreaterThanOrEqual(AA);
    }
  });
});

describe('subject hues', () => {
  it('ships eight distinct hues', () => {
    expect(new Set(SUBJECT_HUES).size).toBe(SUBJECT_HUES.length);
    expect(SUBJECT_HUES).toHaveLength(8);
  });
});

describe('type scale', () => {
  it('caps how far Dynamic Type may stretch each size', () => {
    for (const variant of Object.values(font)) {
      expect(variant.maxFontSizeMultiplier).toBeGreaterThan(1);
      expect(variant.maxFontSizeMultiplier).toBeLessThanOrEqual(2);
    }
  });

  it('lets small text grow further than display text', () => {
    expect(font.small.maxFontSizeMultiplier).toBeGreaterThan(font.display.maxFontSizeMultiplier);
  });
});
