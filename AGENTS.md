# Chunks — notes for agents

Expo SDK 57 / React Native 0.86 / React 19. The versioned docs are at
https://docs.expo.dev/versions/v57.0.0/ — check them before using an Expo API,
since several changed in recent SDKs (notification handlers and trigger shapes in
particular).

## Ground rules

- `src/domain/**` must stay pure: no React, no `react-native`, no native modules.
  It is the part that is unit tested, and that only holds if it stays importable
  from plain Node.
- The plan is always rebuilt from scratch by `buildPlan`. Do not cache blocks or
  store them; progress belongs in `WorkLog` entries keyed by (date, assignment).
- `npm run typecheck && npm test` before committing. `npx expo export --platform
  android` is a fast check that everything still bundles.
- `expo install` cannot reach the Expo API in some sandboxes. If it fails, read
  the matching version out of `node_modules/expo/bundledNativeModules.json` and
  `npm install` that exact version instead.

## Design system

- Colour comes from `useTheme()`, never from a literal. Screens name the role a
  colour plays (`text`, `warningSoft`, `onAccent`), which is what makes a second
  scheme a data change rather than a rewrite.
- Build styles with `useMemo(() => makeStyles(theme), [theme])`. A module-level
  `StyleSheet.create` cannot see the active scheme.
- Text goes through the `Text` primitive so it picks up the type scale and the
  per-size Dynamic Type cap.
- New palette entries need a contrast test in `src/ui/__tests__/theme.test.ts`.
  If a hue fails, fix the derivation in `subjectColors`, not the test.
- Layout branches on `theme.sizeClass`, which is computed from the window, so
  iPad Split View behaves like the narrow surface it is. Do not branch on
  `Platform.isPad`.
