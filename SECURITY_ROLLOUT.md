# Stinkrz privacy and security changes

## Saved implementation

- Protected entity operations use the authenticated secureEntities backend function.
- Direct reads and writes to protected entities require the admin role. Service-role
  functions perform their own caller, ownership, recipient and block checks.
- Blocking is checked in both directions for profiles, status posts, messages,
  Whiffs, profile views, typing, reactions and notifications.
- Public profiles always return coordinates rounded to two decimal places.
  New profiles default to coarse storage; owners can explicitly disable coarse
  storage, while other users still receive coarse coordinates.
- Show Online Status and Send Read Receipts persist on the profile. Backend writes
  honor these preferences. Hide Inactive Users now filters offline map profiles.
- Message and Whiff notifications validate the underlying interaction, derive the
  actor from authentication, and reject blocked pairs. Push delivery accepts an
  existing notification ID rather than a client-provided recipient or copy.
- Registration and onboarding state the self-reported 18+ policy. Profile age is
  constrained to adults, and reports include Underage user. There is no ID or
  facial age verification.
- Settings is accessible from navigation, Profile and Help. Account-deletion errors
  are shown instead of leaving the button indefinitely pending.

## Realtime behavior

Because direct reads cannot securely enforce cross-entity blocking, the frontend
uses shared, authenticated polling subscriptions. Messages/notifications refresh
every 3 seconds, typing every 2 seconds, profiles every 15 seconds while visible.
Mutations request an immediate refresh. Account/session changes discard in-flight
snapshots. This adds backend requests and needs monitoring as usage grows.

## Validation and rollout

- npm run lint: passed.
- base44 --app-id 69faa8a3ff7324c96aef6556 build: passed.
- node --test tests/security.test.mjs: 30 tests passed, using mocked entities/users.
- Production deployment and deployed-function listing both timed out in the CLI.
  Live rollout has NOT been confirmed. Do not treat local tests as proof that the
  deployed app enforces the new rules.
- Release frontend, secureEntities, notification functions and entity schemas
  together, then test with two ordinary app users. Existing open tabs may need a
  reload. Check blocked pairs in both directions, exact API coordinates, online
  privacy, disabled receipts and notification spoofing.
- Push replay prevention uses a stored delivery-attempt flag; strict simultaneous
  replay prevention and block/write atomicity are not guaranteed by these checks.

## Moderation review

Ten report records were inspected read-only. Nine were pending:
seven requested account-deletion help (five had identical wording), plus two older
content/harassment reports. No account was removed, and no report status was changed.
Account deletion itself was not exercised against a real user's account.
