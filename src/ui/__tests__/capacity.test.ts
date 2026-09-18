import { CAPACITY_STEPS, nextCapacity } from '../screens/SettingsScreen';

describe('nextCapacity', () => {
  it('steps up through the offered values', () => {
    expect(nextCapacity(0)).toBe(15);
    expect(nextCapacity(15)).toBe(30);
    expect(nextCapacity(60)).toBe(90);
  });

  it('wraps round to zero at the top', () => {
    expect(nextCapacity(120)).toBe(0);
  });

  it('steps up from a value that is not itself a stop', () => {
    // Friday defaults to 20 minutes, which is deliberately not a stop. Tapping
    // it has to go up, not collapse the day to zero.
    expect(nextCapacity(20)).toBe(30);
    expect(nextCapacity(1)).toBe(15);
    expect(nextCapacity(119)).toBe(120);
  });

  it('wraps a stored value larger than anything offered', () => {
    expect(nextCapacity(999)).toBe(0);
  });

  it('only ever returns an offered value', () => {
    for (let minutes = 0; minutes <= 200; minutes += 1) {
      expect(CAPACITY_STEPS).toContain(nextCapacity(minutes));
    }
  });
});
