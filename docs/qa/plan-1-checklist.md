# Plan 1 — Manual QA (device: not yet run, Android —, WhatsApp —)

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 1 | Fresh install, open app | Starter Basics listed under Starter packs; tray and 5 previews render | Not run — pending device |
| 2 | Open Starter Basics | Read-only banner; inputs disabled; drag disabled; validation "Ready for WhatsApp" | Not run — pending device |
| 3 | Add to WhatsApp | WhatsApp "Add sticker pack" dialog shows 6 stickers; confirm → snackbar "Sticker pack added to WhatsApp." | Not run — pending device |
| 4 | Back to Home | "Added" badge on Starter Basics | Not run — pending device |
| 5 | In WhatsApp chat, open stickers | Starter Basics tray icon appears; stickers send correctly | Not run — pending device |
| 6 | Duplicate to edit | New "Starter Basics (copy)" opens, editable, not added | Not run — pending device |
| 7 | Rename + change author, leave field | Values persist after killing and reopening the app | Not run — pending device |
| 8 | Drag sticker 6 to first place | Order persists after restart | Not run — pending device |
| 9 | Tap a sticker → remove all emojis | Tile shows error border; validation lists the issue; Add disabled | Not run — pending device |
| 10 | Delete 4 stickers (2 left) | "Add at least 3 stickers (2/3)"; Add disabled | Not run — pending device |
| 11 | New pack from FAB | Empty pack with "No stickers yet"; tray missing + too few issues listed | Not run — pending device |
| 12 | Delete a user pack | Confirm dialog; pack disappears from Home | Not run — pending device |
| 13 | Add the (valid) copy pack, then reorder in app and re-open WhatsApp sticker tray | New order appears in WhatsApp (imageDataVersion bump) | Not run — pending device |
| 14 | Double-tap Add to WhatsApp quickly | Only one WhatsApp dialog opens | Not run — pending device |
| 15 | Dark mode | All screens readable | Not run — pending device |
| 16 | Fresh install of release variant (`npx expo run:android --variant release`) | Shows Starter Basics | Not run — pending device |
