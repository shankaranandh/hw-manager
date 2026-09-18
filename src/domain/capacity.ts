/**
 * How much homework time a day can be set to.
 *
 * Pure, and deliberately not in the settings screen: the screen imports native
 * modules, and this is the kind of rule that should be testable from plain Node.
 */

/** The choices a student will actually recognise as "how long I'll sit there". */
export const CAPACITY_STEPS = [0, 15, 30, 45, 60, 90, 120];

/**
 * The next capacity a day takes when tapped: upwards, wrapping at the top.
 *
 * Deliberately not an index lookup. A day sitting on a value that is not itself
 * a stop — the 20 minute default for Friday, or anything saved by an older
 * version — would otherwise jump straight to zero on the first tap.
 */
export const nextCapacity = (current: number): number =>
  CAPACITY_STEPS.find((step) => step > current) ?? CAPACITY_STEPS[0];
