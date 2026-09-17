# Homework Pacer — notes for agents

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
