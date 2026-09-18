# Chunks

**Homework, paced not crammed.**

A phone app for students who write their homework down in class and then have no
idea what to actually do about it tonight.

Kids have long days. They copy a due date into a planner, and that planner tells
them nothing until the night before, when it turns out the project was a week's
work. This app takes the due dates and turns them into **tonight's list**: a few
short blocks, sized to the time the student said they actually have.

Everything is stored on the device. No account, no server, no data collected.

## What it does

**Capture in seconds.** Adding an assignment is one line of text and three taps:
class, due day, and how big it feels (Quick / Medium / Big / Huge). Students
cannot estimate minutes, so the app asks a question they can answer and converts
it.

**Pace it automatically.** The planner spreads each assignment across the days
before it is due, earliest deadline first, filling the least busy evenings first.
Big assignments are scheduled to finish a day early. Nothing lands as a
five-minute fragment, and nothing quietly exceeds the time the student set aside.

**Say so when it will not fit.** If the week is genuinely too full, the app says
that, on the day it is added — rather than discovering it the night before. The
Add screen previews the resulting plan before anything is saved.

**Remind, twice at most.** One notification with tonight's plan, one check-in
later, and silence on a free evening. A student who gets pinged six times a night
stops reading the pings.

## Screens

| Tab | What it is for |
| --- | --- |
| **Today** | Tonight's blocks, progress, and anything that has gone wrong |
| **Week** | Load per day against the student's own limit, plus due-date markers |
| **Add** | Fast capture, with a live preview of the resulting plan |
| **You** | Time available per weekday, reminder times, classes, data |

## Design

**Light and dark, both first-class.** The app gets opened in a bright classroom
and under a desk lamp at 9pm. `Auto` follows the device; Light and Dark override
it. Light mode is a warm off-white rather than pure white, which glares.

**Colour is checked, not eyeballed.** `src/ui/color.ts` does the WCAG maths and
`src/ui/theme.tsx` derives every subject colour per scheme, pushing each role
(chip fill, dot, tinted background) until it clears its contrast bar. The
palette is covered by tests: text hits AA on every surface, and so does a colour
a student picked that we never shipped. A hue that fails is a failing test
rather than something a student discovers by squinting.

**Colour is never the only signal.** Every subject chip carries its name, every
status carries text. The eight subject hues are separated by lightness as well
as hue, so the pairs most often confused stay distinguishable, but nothing in
the interface depends on telling them apart.

**Type scales, within limits.** Every size declares how far Dynamic Type may
stretch it. A student who turns text size up still gets a readable plan instead
of a heading that shoves the rest of the row off screen.

## iPhone and iPad

One layout, three size classes, chosen on the window rather than the device so
that an iPad in Split View is treated as the narrow surface it actually is.

| Width | Navigation | Layout |
| --- | --- | --- |
| under 700 | bottom tabs | single column, full bleed |
| 700–999 | bottom tabs | single column, capped at a readable width |
| 1000+ | side rail | Today splits into two columns |

All four orientations are supported and `requireFullScreen` is off, so the app
is a proper multitasking citizen on iPad rather than a stretched phone app.

## Running it

```bash
npm install
npx expo start          # then scan the QR code with Expo Go
npm run web             # quick look in a browser (no notifications)
npm test                # unit tests
npm run typecheck       # TypeScript
```

### Notifications need a real device

Local scheduled notifications work on a phone or iPad, not in the web preview.
Expo Go is fine for trying the app out, but for reliable reminders build a
development build, which is also what you want before putting this on a
student's actual device.

## Shipping to the App Store

The project is configured for submission and stays on the managed workflow: the
native projects are generated at build time and never committed. `npm run
prebuild` regenerates them locally if you want to look.

What is already set up:

- **Bundle identifier** `io.github.shankaranandh.chunks`, version `1.0.0`, remote
  build numbers with `autoIncrement` on the production profile. Reverse-DNS of a
  domain you control, which costs nothing and cannot collide with anyone else's;
  Apple never verifies domain ownership for bundle ids. Free to change right up
  until the App Store Connect record exists, and permanent after that.
- **Icons** for iOS, Android adaptive (foreground / background / monochrome) and
  web, generated from one vector mark.
- **Splash screen** with separate light and dark variants.
- **Privacy manifest** (`NSPrivacyAccessedAPITypes`) declaring the UserDefaults
  access that local storage requires, reason `CA92.1`, with tracking set to
  false and no collected data types. Verified in the generated
  `PrivacyInfo.xcprivacy`.
- **Export compliance** pre-answered via `ITSAppUsesNonExemptEncryption`, so
  every submission skips that question.
- **EAS profiles** for development, preview and production.

```bash
npx eas build --platform ios --profile preview      # TestFlight-able build
npm run build:ios                                   # production build
npm run submit:ios                                  # upload to App Store Connect
```

### What still needs a human

These need your Apple account and cannot be done from a repository:

1. An **Apple Developer Program** membership, and the bundle identifier
   registered against it. Change `ios.bundleIdentifier` if you want your own.
2. `npx eas init` to link the project, then `npx eas credentials` (or let EAS
   generate them) for signing.
3. An App Store Connect listing. Suggested starting point:

   | Field | Value |
   | --- | --- |
   | Name (30 chars) | `Chunks` |
   | Subtitle (30 chars) | `Homework, paced not crammed` |
   | Keywords (100 chars) | `planner,study,school,assignment,due,reminder,student,agenda,organizer,teen` |

   Leave "homework" out of the keywords: it is already in the subtitle, and
   Apple ignores repeats. You also need screenshots for both iPhone and iPad,
   and an age rating.

   Create the App Store Connect record early even if the build is not ready. It
   reserves the name for 180 days, and losing a name you have built a listing
   around is miserable.
4. A **privacy policy URL**. App Store Connect requires one even though this app
   collects nothing; "this app stores everything on your device and transmits
   nothing" is the whole policy, but it has to be hosted somewhere.
5. A decision on the **Kids Category**. If you market this to under-13s, Apple
   applies stricter rules and COPPA is in scope. Collecting no data, having no
   accounts, no analytics, no ads and no outbound links puts the app in a good
   position for it, but it is a declaration you have to make deliberately — and
   if you add anything third-party later, revisit it.

## How the pacing works

The planner is a pure function in `src/domain/planner.ts`: assignments, work
logs, settings and today's date go in, a day-by-day plan comes out. It is
rebuilt from scratch on every change, which is what keeps the plan honest when an
assignment is added, finished, or moved.

1. Each assignment's **remaining** work is its estimate minus the minutes already
   logged against it.
2. Its **last working day** is the due date, minus one day for anything larger
   than a single sitting, so a surprise on the due date is survivable.
3. Assignments are placed **earliest deadline first**, so the work with the least
   slack claims the scarce evenings before anything else does.
4. Within an assignment, minutes go to the **least loaded days** first. This is
   the part that stops the plan from becoming "do all of it the night before".
5. Work that genuinely does not fit is still shown, deliberately pushing days
   over the limit, and raises a warning. Hiding it would be worse.

Progress is stored as `WorkLog` entries (date, assignment, minutes) rather than
on the blocks themselves. Blocks are derived, so they move when the plan is
rebuilt; logs do not, so ticking something off is never lost to a replan.

## Layout

```
src/
  domain/         planning, dates, types — pure, no React, no native calls
  storage/        AsyncStorage persistence, with repair for malformed data
  notifications/  reminder text (pure) and the Expo scheduling wrapper
  state/          reducer, persistence, plan memoisation, reminder syncing
  ui/             colour maths, theme, components, screens
```

The split is deliberate: everything that decides *what the student should do* is
pure TypeScript with no React or native dependencies, so it can be tested
directly. `npm test` covers the planner, the date maths, the reminder text, the
reducer, the storage repair logic, and the palette's contrast guarantees.
