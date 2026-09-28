# Plan 1 — Manual QA (device: not yet run, Android —, WhatsApp —)

The app ships with no packs (bundled starter packs were removed on 2026-09-28), and it cannot create stickers until Plan 3. Checks that need a pack with stickers use a user-created pack and are blocked until then.

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 1 | Fresh install, open app | Home shows only "My packs" with the "No packs yet" empty state; no "Starter packs" section | Not run — pending device |
| 2 | New pack from FAB | Empty pack with "No stickers yet"; tray missing + too few issues listed; Add disabled | Not run — pending device |
| 3 | In a user pack: rename + change author, leave field | Values persist after killing and reopening the app | Not run — pending device |
| 4 | In a user pack: rename then press back | New name persists | Not run — pending device |
| 5 | Delete a user pack | Confirm dialog; pack disappears from Home | Not run — pending device |
| 6 | Dark mode | All screens readable | Not run — pending device |
| 7 | 3-button navigation | Add to WhatsApp and New pack fully visible above nav bar | Not run — pending device |
| 8 | Fresh install of release variant (`npx expo run:android --variant release`) | Home shows the "My packs" empty state; New pack creates and opens a pack | Not run — pending device |
| 9 | Add a valid user pack (≥ 3 stickers, tray icon) to WhatsApp | WhatsApp "Add sticker pack" dialog shows its stickers; confirm → snackbar "Sticker pack added to WhatsApp." | Blocked until Plan 3 (no sticker creation yet) |
| 10 | Back to Home | "Added" badge on that pack | Blocked until Plan 3 (no sticker creation yet) |
| 11 | In WhatsApp chat, open stickers | The pack's tray icon appears; stickers send correctly | Blocked until Plan 3 (no sticker creation yet) |
| 12 | Drag the last sticker to first place | Order persists after restart | Blocked until Plan 3 (no sticker creation yet) |
| 13 | Tap a sticker → remove all emojis | Tile shows error border; validation lists the issue; Add disabled | Blocked until Plan 3 (no sticker creation yet) |
| 14 | In a pack with 5 stickers, delete 3 (2 left) | "Add at least 3 stickers (2/3)"; Add disabled | Blocked until Plan 3 (no sticker creation yet) |
| 15 | Add a valid pack, then reorder in app and re-open WhatsApp sticker tray | New order appears in WhatsApp (imageDataVersion bump) | Blocked until Plan 3 (no sticker creation yet) |
| 16 | Double-tap Add to WhatsApp quickly on a valid pack | Only one WhatsApp dialog opens | Blocked until Plan 3 (no sticker creation yet) |
| 17 | Rename a valid pack then immediately tap Add to WhatsApp | WhatsApp dialog shows the new name | Blocked until Plan 3 (no sticker creation yet) |
