# Homework Pacer

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

## Running it

```bash
npm install
npx expo start          # then scan the QR code with Expo Go
npm run web             # quick look in a browser (no notifications)
npm test                # unit tests
npm run typecheck       # TypeScript
```

### Notifications need a real device

Local scheduled notifications work on a phone, not in the web preview. Expo Go is
fine for trying the app out, but for reliable reminders build a development build
(`npx expo run:ios` / `npx expo run:android`, or EAS), which is also what you
want before putting this on a student's actual phone.

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
  ui/             theme, components, screens
```

The split is deliberate: everything that decides *what the student should do* is
pure TypeScript with no React or native dependencies, so it can be tested
directly. `npm test` covers the planner, the date maths, the reminder text, the
reducer, and the storage repair logic.
