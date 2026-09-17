import {
  alpha,
  contrastRatio,
  ensureContrast,
  hexToHsl,
  hexToRgb,
  hslToHex,
  mix,
  readableOn,
  relativeLuminance,
  withLightness,
} from '../color';

describe('colour maths', () => {
  it('parses both hex forms', () => {
    expect(hexToRgb('#4B45D1')).toEqual({ r: 75, g: 69, b: 209 });
    expect(hexToRgb('4B45D1')).toEqual({ r: 75, g: 69, b: 209 });
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('matches the known WCAG anchors', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 2);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('round-trips through HSL', () => {
    for (const hex of ['#4B45D1', '#15803D', '#D2601A', '#FFFFFF', '#000000', '#7F7F7F']) {
      expect(hslToHex(hexToHsl(hex)).toLowerCase()).toBe(hex.toLowerCase());
    }
  });

  it('sets lightness without losing the hue', () => {
    const lightened = withLightness('#3D6FD6', 0.7);
    expect(hexToHsl(lightened).l).toBeCloseTo(0.7, 1);
    expect(hexToHsl(lightened).h).toBeCloseTo(hexToHsl('#3D6FD6').h, 0);
  });

  it('mixes towards the second colour', () => {
    expect(mix('#000000', '#FFFFFF', 0).toLowerCase()).toBe('#000000');
    expect(mix('#000000', '#FFFFFF', 1).toLowerCase()).toBe('#ffffff');
    expect(mix('#000000', '#FFFFFF', 0.5).toLowerCase()).toBe('#808080');
  });

  it('picks the more readable of two candidates', () => {
    expect(readableOn('#FFFFFF', '#000000', '#FFFFFF')).toBe('#000000');
    expect(readableOn('#0F1118', '#000000', '#FFFFFF')).toBe('#FFFFFF');
  });

  it('writes a translucent colour', () => {
    expect(alpha('#4B45D1', 0.5)).toBe('rgba(75, 69, 209, 0.5)');
  });

  it('lifts a failing colour until it clears the bar', () => {
    // Mid grey on white fails; the result must pass and stay in the same hue family.
    const fixed = ensureContrast('#9A9A9A', '#FFFFFF', 4.5);
    expect(contrastRatio(fixed, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });

  it('leaves a colour alone when it already passes', () => {
    expect(ensureContrast('#161925', '#FFFFFF', 4.5)).toBe('#161925');
  });
});
