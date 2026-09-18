# App Store listing copy

Paste-ready text for App Store Connect. Character limits are Apple's; the counts
in brackets are what the text below actually uses.

App Store Connect record: **Chunks: Homework Planner** (app id 6813281191).

---

## Name — 30 max [24]

```
Chunks: Homework Planner
```

Plain "Chunks" is taken. The name under the icon is a separate field and still
reads **Chunks**; it comes from `expo.name` in `app.json`.

## Subtitle — 30 max [27]

```
Homework, paced not crammed
```

## Promotional text — 170 max [139]

Editable any time without submitting a new build, so use it for whatever is
timely.

```
A due date tells you nothing useful on a Tuesday night. Chunks turns your assignments into tonight's list, sized to the time you actually have.
```

## Description — 4000 max

```
Every planner tells you when homework is due. None of them tell you what to do tonight.

Chunks does. Enter an assignment in about ten seconds — what it is, which class, when it's due, and roughly how big it feels — and it works out how to fit the work into the evenings you have before the deadline.

TONIGHT'S LIST, NOT A PILE OF DUE DATES
Open the app and you see three or four short blocks with a time on each, not a wall of deadlines. Tick them off as you go.

IT PACES THE WORK FOR YOU
Assignments are spread across the days before they're due, soonest deadline first, onto your least busy evenings. Anything substantial is scheduled to finish a day early, so a surprise on the due date isn't a disaster.

IT TELLS YOU WHEN THE WEEK IS TOO FULL
If a project genuinely won't fit in the time left, Chunks says so on the day you add it — not at 10pm the night before. You still have options then: start earlier, cut it down, or ask for an extension.

YOU DECIDE HOW MUCH TIME YOU HAVE
Set how long you're willing to work on each day of the week. Practice on Tuesdays? Set it to zero and the plan routes around it. Chunks never quietly schedules more than you said you had.

TWO REMINDERS A NIGHT, AT MOST
One with tonight's plan, one gentle check-in later, and nothing at all on a free evening. A reminder you ignore is worse than no reminder.

BUILT FOR A REAL SCHOOL WEEK
- Sizes, not minutes: Quick, Medium, Big or Huge, because nobody can estimate minutes
- A week view showing each day's load against the limit you set
- Colour-coded classes you can rename and add to
- Works on iPhone and iPad, in light and dark

COMPLETELY PRIVATE
No account. No sign-up. No network requests at all. No analytics, no ads, no tracking. Everything you type stays on your device and is never uploaded to anyone, including us. The app works entirely offline.
```

## Keywords — 100 max, comma separated, no spaces [74]

```
planner,study,school,assignment,due,reminder,student,agenda,organizer,teen
```

"homework" is deliberately absent: it is already in the subtitle, and Apple
ignores repeats, so including it again would waste characters.

## URLs

Live once GitHub Pages is on (**Settings → Pages → `main` / `/docs`**).

| Field | URL |
| --- | --- |
| Privacy Policy URL (required) | `https://shankaranandh.github.io/hw-manager/privacy.html` |
| Support URL (required) | `https://shankaranandh.github.io/hw-manager/support.html` |
| Marketing URL (optional) | `https://shankaranandh.github.io/hw-manager/` |

## What's New — first version

```
First release.
```

## Age rating

Every question answers **None**, which gives **4+**. Nothing in the app is
violent, suggestive, frightening or gambling-related, and there is no web view,
no user-generated content and no way to contact anyone.

## App Privacy

**Data Not Collected**, across the board. No data types to declare, because the
app makes no network requests at all. Verified against the source: no `fetch`,
socket or push-token call anywhere in `src/`, and no analytics, advertising or
crash-reporting dependency.

## Category

Primary **Education**. Secondary **Productivity**.

## Review notes

Worth including, because a single-purpose utility can draw a Guideline 4.2
"minimum functionality" look.

```
Chunks is a homework planner with a scheduling engine, not a to-do list. When a student enters an assignment with a due date and an estimated size, the app distributes that work across the days before the deadline: earliest deadline first across assignments, least-loaded day first within one, respecting a per-weekday time budget the student sets, and scheduling substantial work to finish a day early. When the work cannot fit before the due date it surfaces a warning rather than silently overbooking the schedule.

It also schedules local notifications (no push server) with the resulting plan.

No account is required and the app makes no network requests, so there are no test credentials to provide. To see the scheduling behaviour: add an assignment on the Add tab with size "Huge" and a due date about a week out, and the preview on that screen shows the day-by-day plan before you save it.
```
