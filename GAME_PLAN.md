# GAME_PLAN.md — test-drive racer: full screen + mobile (planned, not started)

Research notes from 2026-10-09. Nothing here is built. Current state of the game: `docs/features-reference.md` "Test-drive racer" and
`docs/plan-done.md` "Test-drive racer game". Other racer follow-ups (music, art-pass leftovers): `PLAN.md` "Test-drive racer game".

Order: **A (full screen) → B (virtual buttons + mobile layout) → C (optional tilt)**. A and B ≈ 1-2 days, C ≈ half a day; real-device
testing is the biggest part (tilt cannot be tested in a desktop browser).

## A. Full screen

- The engine draws to a fixed-size `<canvas>` (640×480 / 1024×768 / 1280×960 by Resolution) that CSS stretches, so full screen is a
  CSS-size change only — no engine change.
- `requestFullscreen()` on the wrapper that holds the canvas **and** the HUD (not the canvas alone). ⛶ button beside Restart in
  `RaceGameStage.tsx`, plus an `F` key.
- Escape: the browser exits full screen first; the modal's own Escape handler (`RaceGameModal.tsx`) must ignore that first press
  (check `document.fullscreenElement`) or it also closes the game.
- 4:3 canvas on a 16:9 screen = black bars. Either accept them (cheap) or let the engine size the canvas to the window ratio (the
  scene scales with `resolution = h / 480`; needs a test pass for sprites/backdrop).
- iPhone Safari has no element full screen (iPad does): use a pseudo-full-screen (`fixed inset-0`, `100dvh`) as the fallback.

## B. Mobile: virtual buttons and layout

- Input is four flags in the engine (`keyLeft/keyRight/keyFaster/keySlower`, `KEY_ACTIONS` in `engine.ts`). Expose
  `racer.setInput({ left, right, faster, slower })` so a touch layer drives the same physics.
- Buttons: ← → on the left, ↑ ↓ on the right. Pointer events + `setPointerCapture` (a finger sliding off must not leave a key stuck),
  `touch-action: none`, `user-select: none`. Shown only when `matchMedia('(pointer: coarse)')` matches. Test multi-touch (steer + gas
  at once). Alternative: automatic gas with left/right + brake only.
- Landscape is required: a "rotate your phone" hint in portrait. `screen.orientation.lock('landscape')` works only in full screen on
  Android, not on iOS.
- Layout: the 16 rem settings column does not fit — on touch use a bottom sheet or collapsible panel and let the canvas fill the screen.
- Performance: default Low/Medium resolution on touch devices; check a mid-range phone (canvas 2D at 1024×768 is probably fine).
- Entry points: the promo banner is hidden below `lg`; `/race` (sidebar 🎮) is the mobile entry. Reword "Desktop with a keyboard only"
  (`race.introNote`) and the controls hint (`race.controls`) for touch; the 470 KB download note matters more on mobile data.
- Sound already starts from a tap (the toggle), so autoplay rules are fine. Keep the game online-only / out of the PWA precache.

## C. Tilt steering (optional)

- `deviceorientation`: `gamma` in landscape (or `beta` adjusted by `screen.orientation.angle`). **iOS needs
  `DeviceOrientationEvent.requestPermission()` from a tap** ("Enable tilt" button); Android needs none; HTTPS only (localhost is OK).
- Dead zone ≈ 5°, smoothing, and a "calibrate" button (straight = how the phone is held when pressed).
- Steering becomes analog: the engine takes a left/right strength besides the key flags (small change in `update()`).
- Ship it as a toggle, buttons stay the default.

## Done when

- A: full screen works on desktop Chrome/Firefox and falls back on iPhone; Escape behaves.
- B: playable with two thumbs on a real Android phone and an iPhone in landscape; no page scroll/zoom while playing.
- C: tilt works on both after the permission tap, with calibration; buttons still usable.
