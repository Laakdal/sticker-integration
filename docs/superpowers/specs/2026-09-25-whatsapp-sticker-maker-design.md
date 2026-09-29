# WhatsApp Sticker Maker — Design Spec

- **Date:** 2026-09-25
- **Status:** Approved design, pending spec review
- **Audience:** Personal project — installed via APK, English only, no Play Store release

## 1. Goal

An Android app for creating, importing, exporting and managing WhatsApp sticker packs (static and animated), with GIF search, a sticker editor, an in-app device gallery and direct "Add to WhatsApp" integration via the official sticker pack contract.

**Success criteria**

1. A user can build a static pack from their own photos (crop, rotate, resize, text, emoji) and add it to WhatsApp.
2. A user can build an animated pack from device GIFs/videos or from Klipy/Giphy search results and add it to WhatsApp.
3. Every pack sent to WhatsApp passes WhatsApp's validation (sizes, limits, formats) — invalid packs are blocked in-app with a clear reason.
4. Packs round-trip through `.wastickers` export/import without losing emojis, accessibility text or order.
5. Animated stickers use the highest quality that fits under 500 KB.

**Out of scope (explicit)**

- Background removal (automatic or manual).
- Any text/emoji overlay on animated stickers (animated or fixed captions).
- ezgif-style options that WhatsApp fixes anyway: output size, aspect ratio, sound, loop count, encoder method, colour filters, per-frame frame editing.
- Tenor integration.
- Play Store release work (privacy policy, store listing, Play-policy permission declarations).
- Localization (English only).
- Camera capture.
- Opening `.wastickers` files from other apps via "Open with" intent filters (import is via in-app pickers).
- Bundled starter packs (removed 2026-09-28): the app ships with no packs; every pack is created or imported by the user (see §5.3).

## 2. Chosen approach

**Expo (latest stable SDK, New Architecture) + two local Kotlin Expo Modules**, built locally.

Rejected alternatives:

- **Bare React Native CLI** — same native work with more manual linking/Gradle maintenance, no benefit for this project.
- **Expo + FFmpeg** — `ffmpeg-kit` was retired in early 2025 (binaries withdrawn); adds 30 MB+ to the APK; its `libwebp_anim` wrapper exposes fewer encoder controls than calling libwebp directly, so size-fitting quality is worse.

Quality rationale: both routes end in libwebp, so quality is decided by (a) source fidelity — we fetch MP4/WebP renditions from GIF APIs instead of 256-colour GIFs — and (b) size-fitting control — direct `WebPAnimEncoder` access allows mixed lossy/lossless frames, keyframe tuning and quality binary search.

## 3. Stack

| Concern | Choice |
|---|---|
| Framework | Expo (latest stable SDK at scaffold time), React Native New Architecture, TypeScript (strict) |
| Navigation | `expo-router` |
| UI | `react-native-paper` (Material 3), light/dark following system |
| Colour scheme | Material You: `@pchmn/expo-material3-theme` reads the Android 12+ wallpaper scheme (setting *Use wallpaper colours*, default on); otherwise a scheme generated from `#1B7F5A`. One scheme feeds Paper, the navigation theme (headers, drawer) and the status bar |
| State | Zustand |
| Settings storage | `react-native-mmkv` |
| Pack storage | `pack.json` + files in app-private storage (`expo-file-system`) |
| Images (display) | `expo-image` (disk/memory cache, animated WebP playback) |
| Lists/grids | `@shopify/flash-list`; drag-reorder grid via `react-native-sortables` |
| Editor canvas | `@shopify/react-native-skia` + `react-native-gesture-handler` + `react-native-reanimated` |
| Crop (optional tool) | `react-native-image-crop-picker` (`openCropper`, free-form or preset ratios) |
| Emoji picker | `rn-emoji-keyboard` |
| Pickers | `expo-media-library` (in-app gallery), `expo-image-picker` (system Photo Picker fallback), `expo-document-picker` |
| Zip | `react-native-zip-archive` (native) |
| Share / save | `expo-sharing`; Storage Access Framework via `expo-file-system` |
| Native | `modules/webp-encoder` (Kotlin + JNI + vendored libwebp via CMake/NDK), `modules/sticker-provider` (Kotlin) |
| Min / target SDK | minSdk 28 (Android 9) — required for `ImageDecoder`/`MediaMetadataRetriever.getFrameAtIndex`; target latest |
| Build | `npx expo run:android` (dev), `gradlew assembleRelease` via `npm run build:apk` (release) |

### 4.1 Structure rules

1. **Screens are thin.** Files in `app/` read route params, compose feature components and wire navigation. No business logic, no direct storage or native calls.
2. **Small, focused components, grouped by feature.** One component per file. Split when a piece has its own state, is reused, is independently testable, or the file passes ~200 lines. Do not split trivial one-off markup.
3. **Logic lives in hooks and services, not components.** Components render and forward events; hooks own UI state and side effects; `services/` are plain TypeScript with no React imports (unit-testable).
4. **Feature boundaries.** Each feature exposes a public `index.ts`; other features import only from it, never from another feature's internals. Shared building blocks live in `src/components/`.

### 4.2 Component inventory

```
src/features/
  packs/
    components/  PackList, PackCard, PackDetailsDialog (New pack / Rename pack), TrayIconPicker,
                 StickerGrid, StickerTile, StickerDetailsSheet, AddStickerMenu,
                 PackOverflowMenu (header ⋮: Rename pack / Delete pack),
                 PackSpeedDial ("+" FAB.Group: Add sticker, Add/Update in WhatsApp + issues dialog),
                 WhatsAppBadge
    hooks/       usePack, usePackValidation, useWhatsAppStatus, useAddToWhatsApp
  editor/
    shared/      EmojiTagger, EncodedResultPreview, EncodeProgressDialog, FitFillToggle
    static/      EditorCanvas, Checkerboard, ImageLayer, TextLayer, EmojiLayer, CropToolButton,
                 TransformHandles, EditorToolbar, TextStyleSheet, EmojiPickerSheet,
                 UndoRedoControls
                 hooks: useLayerHistory, useCanvasGestures, useExportStatic
    animated/    AnimatedSourcePreview, FramingOverlay, TrimControls
                 (TrimSlider + TimeInputs), SpeedSelector, PlaybackModeSelector,
                 RotateFlipControls, FpsControl, QualityPrioritySelector,
                 EffectiveDurationLabel
                 hooks: useEncodeJob, useAnimatedEditState
    batch/       BatchQueueList, BatchQueueItem
                 hooks: useBatchQueue
  gallery/
    components/  MediaGrid, MediaTile, MediaFilterChips, SelectionBar,
                 PermissionRationale, LimitedAccessBanner
    hooks/       useMediaPermission, useMediaLibrary
  gifs/
    components/  GifSearchBar, GifGrid, GifTile, GifPreviewSheet,
                 ProviderAttribution, ProviderTabs
    hooks/       useGifSearch (debounce + infinite pagination)
  transfer/
    components/  ExportOptionsSheet, ImportProgress, ImportSummary
    hooks/       useExportPack, useImportPack
  settings/
    components/  SettingsCategoryList, AboutSection, ApiKeyField,
                 ContentRatingPicker, DisplaySettings, StorageUsage
    hooks/       useSettingsSummaries (over the pure settingsSummaries), useTextDraft
src/components/  Screen, SectionHeader, StickerImage (expo-image + reduce-motion),
                 EmptyState, ErrorState, ConfirmDialog, LoadingOverlay
src/theme/       Material 3 theme: resolveAppTheme (pure: colour scheme + setting + wallpaper
                 scheme → Paper theme), navigationThemeFor, useAppTheme
```

`android/` is generated by `expo prebuild` (Continuous Native Generation) and is not hand-edited; all native configuration lives in `app.json`/`app.config.ts`, config plugins and the local modules.

## 4. Project structure

```
app/                     expo-router screens
  index.tsx              Home
  pack/[id].tsx          Create/Edit Pack
  editor/static.tsx      Static sticker editor
  editor/animated.tsx    Animated sticker editor (framing + trim)
  editor/batch.tsx       Batch queue for multi-selected stills
  media.tsx              Media sources: tabs "Device" (gallery) and "GIF Search"
  import-export.tsx      Import/Export
  settings.tsx           Settings (category list; a drawer screen)
  settings/gif.tsx       Settings → GIF search & API   (settings/* are pushed on the root Stack)
  settings/display.tsx   Settings → Display
  settings/new-packs.tsx Settings → New packs
src/
  features/              per-feature components + hooks (packs, editor, gifs, gallery, transfer)
  services/
    gif/                 GifProvider interface, klipy.ts, giphy.ts
    packStorage.ts       read/write pack folders, atomic writes, quarantine
    wastickers.ts        build/parse .wastickers and plain zips
    validation.ts        single WhatsApp rule set
    importer.ts          keep / fix / skip pipeline
  store/                 packs store, settings store
  components/            shared Material UI pieces
modules/
  webp-encoder/          Expo Module (Kotlin, JNI, libwebp, CMake)
  sticker-provider/      Expo Module (ContentProvider + intents)
scripts/                 generate-encoder-fixtures, generate-keystore
```

## 5. Data model and storage

### 5.1 On-disk layout

```
<documentDirectory>/packs/<packId>/pack.json     single source of truth for the pack
<documentDirectory>/packs/<packId>/tray.png      96×96 PNG, < 50 KB
<documentDirectory>/packs/<packId>/<stickerId>.webp
<documentDirectory>/packs/<packId>/<stickerId>.anim.webp   2-frame animated copy of a still sticker, mixed packs only (§5.3)
<documentDirectory>/packs/<packId>/.src/<stickerId>/   static editor sources (source image + layers.json); never exported
<documentDirectory>/quarantine/<packId>/         packs whose pack.json failed to parse
<cacheDirectory>/...                             downloads, temp unzip, encode scratch
```

`pack.json` (not MMKV) is canonical because the ContentProvider may be invoked by WhatsApp when only the native process is running; a plain JSON file is readable from Kotlin with no JS runtime. On startup the packs store scans `packs/*/pack.json`. All writes are atomic: write `pack.json.tmp`, then rename.

MMKV stores settings only: active GIF provider, API key overrides, content rating, reduce-motion flag, last-used pack author.

### 5.2 Types

```ts
type PackOrigin = 'user' | 'imported';

interface Pack {
  id: string;                 // 1–128 chars, [A-Za-z0-9_.-]; also the WhatsApp identifier
  name: string;               // 1–128 chars
  publisher: string;          // 1–128 chars
  trayIcon: string;           // file name, 'tray.png'
  animated: boolean;          // what WhatsApp receives: true when the pack holds ≥1 animated sticker (§5.3)
  stickers: Sticker[];        // ordered
  imageDataVersion: number;   // incremented on every content change
  avoidCache: boolean;        // default false
  publisherEmail?: string;
  publisherWebsite?: string;
  privacyPolicyWebsite?: string;
  licenseAgreementWebsite?: string;
  origin: PackOrigin;
  createdAt: string;          // ISO
  updatedAt: string;          // ISO
}

interface Sticker {
  id: string;
  file: string;               // '<id>.webp'
  emojis: string[];           // 1–3
  accessibilityText?: string; // ≤125 static, ≤255 animated
  animated: boolean;
  sizeBytes: number;
  editable: boolean;          // true when .src/<id>/ exists (static editor output)
}
```

### 5.3 Pack types (Separate / Mixed)

WhatsApp packs are either all still or all animated. Settings → Advanced → *Pack type* (§8 Settings) decides what happens when a sticker of the other kind is added to a pack:

- **Separate (default)** — each pack is all still or all animated. Adding a mismatched sticker prompts: *Pick a still frame* (a GIF/video becomes one frame as a still sticker), *Put it in a new pack* (creates a pack of the other type, name pre-filled) or *Cancel*.
- **Mixed** — a pack may contain both. When it contains ≥1 animated sticker, WhatsApp receives an animated pack in which each still sticker is served as a 2-frame animated copy, generated and cached next to the original as `<stickerId>.anim.webp`, regenerated when the sticker changes, ≤ 500 KB.

The setting only governs what happens when adding a mismatched sticker: existing mixed packs keep working after switching back to Separate. The still-frame picker (Plan 4 animated editor, §8: *Animated* vs *Still frame* with a frame scrubber, same crop/rotate/flip/fit) is available in both modes.

Unverified (check on device): whether WhatsApp accepts a previously-added still pack switching to animated on update.

The setting UI and behaviour are implemented in Plans 3–4.

### 5.4 Starter packs (removed)

Removed on 2026-09-28. The app no longer ships packs, so there is no `origin: 'bundled'`, no read-only pack mode and no "Duplicate to edit". Every pack is editable.

Installs that ran an older version still hold the copied starter packs. On every launch, before packs are loaded, the app deletes `packs/bundled.starter-basics`, `packs/bundled.starter-moves` and any `packs/.staging-bundled.*` folders (`services/legacyStarterPacks.ts`). It touches no other folder, and it is a no-op once they are gone. It must run before loading because their `origin: 'bundled'` no longer parses and they would otherwise be quarantined. A cleanup failure never blocks loading.

## 6. Native module: `sticker-provider`

**ContentProvider**

- Authority: `<applicationId>.stickercontentprovider`; `android:exported="true"`, `android:readPermission="com.whatsapp.sticker.READ"`.
- URIs (WhatsApp sample contract):
  - `metadata` — all packs
  - `metadata/<id>` — one pack
  - `stickers/<id>` — stickers of a pack
  - `stickers_asset/<id>/<file>` — sticker/tray file, via `openAssetFile` backed by `ParcelFileDescriptor` over `filesDir/packs/...`
- Pack columns: `sticker_pack_identifier`, `sticker_pack_name`, `sticker_pack_publisher`, `sticker_pack_icon`, `android_play_store_link`, `ios_app_download_link`, `sticker_pack_publisher_email`, `sticker_pack_publisher_website`, `sticker_pack_privacy_policy_website`, `sticker_pack_license_agreement_website`, `image_data_version`, `whatsapp_will_not_cache_stickers`, `animated_sticker_pack`.
- Sticker columns: `sticker_file_name`, `sticker_emoji` (comma-joined), `sticker_accessibility_text`.
- Reads `pack.json` directly. Packs failing a native safety check (parse, 3–30 stickers, files present) are omitted.
- Path traversal guard: requested file names must match a sticker/tray entry of that pack.

**JS API**

- `addToWhatsApp(packId: string, name: string, options?: { force?: boolean }): Promise<{ status: 'added' | 'cancelled' | 'error'; message?: string }>` — fires `com.whatsapp.intent.action.ENABLE_STICKER_PACK` with extras `sticker_pack_id`, `sticker_pack_authority`, `sticker_pack_name` at the installed WhatsApp app(s) that lack the pack, and resolves `added` without launching when every installed app already has it. With `force: true` (Update) it targets every installed app even if already added, so the pack is sent again. Uses a chooser when both `com.whatsapp` and `com.whatsapp.w4b` are targeted, else `setPackage`. Surfaces WhatsApp's `validation_error` extra.
- `getWhatsAppStatus(packId: string): Promise<{ consumer: { installed: boolean; added: boolean }; business: { installed: boolean; added: boolean } }>` — via the whitelist provider `content://com.whatsapp.provider.sticker_whitelist_check/is_whitelisted` (and the `.w4b` equivalent).
- Manifest `<queries>` for `com.whatsapp` and `com.whatsapp.w4b`.

## 7. Native module: `webp-encoder`

libwebp vendored and built with CMake/NDK; Kotlin orchestration; one pipeline:

```
decode (trim window, sampled on the output timeline) → rotate/flip → crop/fit to 512×512
  → frame cache → build output sequence (speed, reverse/boomerang, fps) → encode → measure → retry
```

**Decoders by source**

- GIF — Glide standalone `gifdecoder` (transparency, disposal methods).
- Animated WebP — libwebp `WebPAnimDecoder` (exact timings).
- MP4 — `MediaMetadataRetriever.getFrameAtIndex`.
- Static inputs (PNG/JPG/WebP) — `ImageDecoder`.

**Transform options (animated)**

| Option | Values | Effect |
|---|---|---|
| Trim | `trimStartMs`, `trimEndMs` | source window to use |
| Speed | 0.5×, 0.75×, 1×, 1.25×, 1.5×, 2× | output duration = window ÷ speed |
| Playback | `normal`, `reverse`, `boomerang` | boomerang = forward then backward, endpoints not duplicated (≈ 2× duration) |
| Rotate | 0°, 90°, 180°, 270° | applied before framing |
| Flip | horizontal, vertical (independent) | applied before framing |
| FPS | `auto` (source rate, capped at 20) or manual 5–30 | output sampling rate |
| Priority | `smooth` (default) or `sharp` | what size fitting sacrifices first |

**Effective duration** = (trimEnd − trimStart) ÷ speed × (boomerang ? 2 : 1) must be ≤ 10 s. The editor computes it live and blocks encoding until it fits; the native side re-checks and fails with `INVALID_OPTIONS`.

**Framing:** normalized crop rect (in rotated/flipped coordinates) + mode `fill | fit`; `fit` pads onto a transparent 512×512 canvas. Scaling via libwebp's area-averaging rescaler (`WebPPictureRescale`).

**Frame cache:** the source is decoded **once per job**: frames within the trim window are sampled on the output timeline at the chosen fps, transformed and framed to 512×512 RGBA, and written in forward order to a temp file in `cacheDirectory` (each frame compressed with `Deflater` BEST_SPEED). Reverse and boomerang are index orderings over the cache; fps reduction during size fitting subsamples the cache. No size-fitting pass re-decodes the source. Bounded by effective duration × fps ≤ 10 s × 30 = 300 frames. Free space is checked before starting (`INSUFFICIENT_STORAGE`); the cache is deleted when the job ends (success, failure or cancel).

**Size fitting (animated, limit 500 KB, target ≤ 490 KB)**

Encoder settings on every pass: lossy with alpha, `allow_mixed`, tuned `kmin`/`kmax`, `method = 6`, loop forever. Frame duration ≥ 8 ms enforced.

- `smooth` (keep motion):
  1. Binary-search quality 95 → 25 at the chosen fps.
  2. If too large at quality 25, step fps down (merging durations) and repeat step 1.
- `sharp` (keep detail):
  1. Binary-search quality 95 → 60 at the chosen fps.
  2. If too large at quality 60, step fps down and repeat step 1.
  3. If too large at 5 fps and quality 60, lower the quality floor to 25 and search again at 5 fps.
- FPS steps: chosen fps → 15 → 12 → 10 → 8 → 5 (skipping steps above the chosen fps).
- Floor: quality 25 at 5 fps still too large → fail with `TOO_LARGE`.
- Output is always an animated WebP with **at least 2 frames** (WhatsApp treats a sticker as animated only when frameCount > 1). If libwebp collapses identical frames into one, the frame is emitted twice with the duration split (each ≥ 8 ms; 8 + 8 when the total is under 16 ms), before size measurement.

The search logic lives in a pure Kotlin class with an injectable "encode at quality/fps → size" function so it is unit-testable without libwebp.

**Memory:** frames are read from the cache one at a time and streamed into `WebPAnimEncoder`, never all held raw. Runs on a background thread, emits progress events, cancellable by job id.

**JS API**

- `encodeAnimated(opts: { source: string; sourceType: 'gif' | 'webp' | 'mp4'; crop: { x: number; y: number; w: number; h: number }; mode: 'fill' | 'fit'; trimStartMs: number; trimEndMs: number; speed: 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2; playback: 'normal' | 'reverse' | 'boomerang'; rotation: 0 | 90 | 180 | 270; flipH: boolean; flipV: boolean; fps: 'auto' | number; priority: 'smooth' | 'sharp'; outPath: string; jobId: string }): Promise<{ sizeBytes: number; frames: number; durationMs: number; quality: number; fps: number }>`; event `onProgress { jobId, stage: 'decode' | 'encode', pass, fraction }`; `cancel(jobId)`.
- `probe(source: string, sourceType: 'gif' | 'webp' | 'mp4'): Promise<{ width: number; height: number; durationMs: number; fps: number; frameCount: number }>` — feeds the editor's trim bounds and "auto" fps display.
- `encodeStatic(inputPath: string, outPath: string): Promise<{ sizeBytes: number; quality: number; lossless: boolean }>` — 512×512 input; lossless first, lossy quality search to stay < 100 KB.
- `makeTrayIcon(inputPath: string, outPath: string): Promise<{ sizeBytes: number }>` — 96×96 PNG < 50 KB.
- `inspect(path: string): Promise<{ width: number; height: number; animated: boolean; frameCount: number; frameDurationsMs: number[]; sizeBytes: number; format: string }>`.

Error codes: `DECODE_FAILED`, `OUT_OF_MEMORY`, `TOO_LARGE`, `CANCELLED`, `IO_ERROR`, `INSUFFICIENT_STORAGE`, `INVALID_OPTIONS`.

## 8. Screens and flows

### Home (`app/index`)
A single "My packs" section, with an empty state ("No packs yet") when there are none. Card: tray icon, name, author, sticker count, "Added to WhatsApp ✓" badge (from `getWhatsAppStatus`). FAB → new pack. Overflow → Import/Export, Settings.

### Create/Edit Pack (`app/pack/[id]`)
- Header: back arrow on the left, the pack name as the title, and a ⋮ "More options" button on the right that opens a menu:
  - *Rename pack* → dialog with "Pack name" and "Author" pre-filled with the current values (max 128 characters each, with counters). Save stays disabled while either trimmed field is empty or nothing changed; Save stores the trimmed values, Cancel changes nothing.
  - *Delete pack* → always asks first ("Delete this pack?"; WhatsApp keeps any copy it already has). Only the confirm button deletes the pack and goes back; Cancel or dismissing keeps it.
- Name and author are edited only through *Rename pack* (no inline form). Tray icon: auto from first sticker; changeable.
- Sticker grid with long-press drag-reorder. Tap → bottom sheet: emojis, accessibility text, re-edit (if `editable`), delete.
- Add menu: *Device* (in-app gallery), *Search GIFs*, *System picker*.
- The tray row and the full sticker grid scroll together; the scroll content has bottom padding so the FAB never covers the last row of stickers.
- Adding a sticker of the other kind follows the *Pack type* setting (§5.3).
- "+" speed dial (FAB.Group) at the bottom right, above the safe-area inset; its icon becomes a close icon while open and its backdrop follows the theme. Labelled actions:
  - *Add sticker* → the Add menu above (until sticker creation lands it shows a "Sticker creation is coming in the next update" snackbar).
  - *Add to WhatsApp* when no installed WhatsApp has the pack, *Update in WhatsApp* when one does (re-sends it with `force: true`); WhatsApp icon; presses are ignored while a request is pending. When the pack has validation issues it opens a "Not ready for WhatsApp yet" dialog listing the issue messages with an OK button, and nothing is sent to WhatsApp. After a successful add/update the WhatsApp status is refreshed.
- Every pack is editable (there are no read-only packs).

### Media sources (`app/media`) — tabs
- **Device:** `expo-media-library` grid; filter chips *All / Images / GIFs / Videos*; multi-select. Permissions: `READ_MEDIA_IMAGES` + `READ_MEDIA_VIDEO` (Android 13+), `READ_EXTERNAL_STORAGE` (Android 9–12); handles Android 14 partial access (`READ_MEDIA_VISUAL_USER_SELECTED`) with a "Select more photos" action. If denied, shows a rationale and falls back to system Photo Picker / document picker.
- **GIF Search:** one tab per provider (Klipy, Giphy) — both are always available, there is no single active provider; each tab searches/paginates independently (debounced search; trending when empty; infinite scroll; low-res preview renditions) with its own attribution. A provider with no key (saved or `.env`) shows "Add a key in Settings" with a button to `/settings/gif` instead of results. Content rating applies to both tabs. Tap a result → full preview → "Add to pack" downloads best MP4/WebP rendition → animated editor.

Multi-select routing: multiple stills → batch queue (each framed with **Fit** by default, open any in the full editor, "Accept all"); multiple GIFs/videos → sequential animated editor sessions.

### Framing rule (static and animated)
Output is always a 512×512 canvas, and the source aspect ratio is **always preserved — never stretched**.
- **Fit (default):** the whole source is scaled to fit inside 512×512 and centred; leftover space is transparent (e.g. 270×200 → 512×379 with 66 px transparent bands above and below). Nothing is cut off.
- **Fill:** the source is scaled to cover 512×512; overflowing edges are cropped, and the user pans/zooms to choose the visible area.
- Users can also pinch/pan freely anywhere between the two; the toggle snaps back to exact Fit or Fill.
- Sources smaller than 512 px are upscaled (unavoidable given WhatsApp's fixed size); GIF Search downloads the highest-resolution rendition to minimise this.

### Static editor (`app/editor/static`)
1. Source opens directly on a Skia 512×512 canvas over a checkerboard, framed with **Fit** by default. Large sources are decoded downsampled to ≤2048 px on the long edge to bound memory.
2. Framing: Fit/Fill toggle, base image pinch/pan (resize), rotate (90° steps + free). **Optional Crop tool** (`openCropper`, free-form or preset ratios) cuts out part of the source photo; the cropped result returns to the canvas with Fit/Fill framing as usual.
3. Layers: text (font, colour, outline stroke) and emoji (`rn-emoji-keyboard`); select, drag, scale, rotate; undo/redo.
4. Save: Skia snapshot → PNG → `encodeStatic` → preview of the encoded result with its size → optional emoji tagging (+ optional accessibility text) → commit. New stickers get the default emoji 😀 automatically, so tagging is never required (WhatsApp needs at least one emoji per sticker).
5. Source image + `layers.json` saved to `.src/<stickerId>/` for re-editing.

### Animated editor (`app/editor/animated`)
- Playing source preview with square framing overlay (pinch/pan) and Fit/Fill toggle (**Fit** by default).
- **Trim:** range slider plus start/end time inputs (0.01 s precision) with "Use current position" buttons.
- **Timing:** speed selector (0.5×–2×); playback mode (normal / reverse / boomerang).
- **Transform:** rotate 90° steps; flip horizontal / vertical. The preview reflects rotate/flip immediately.
- **Output:** FPS (Auto shows the resolved value, or manual 5–30); priority Smooth / Sharp with one-line explanations.
- **Effective duration label** (e.g. "7.2 s of 10 s") updates live and turns red with an "Encode" block when over 10 s.
- Speed and reverse/boomerang are visible only in the encoded result preview (the source preview plays at 1× forward).
- Encode with staged progress (decoding → encoding pass n) + cancel; result preview with size/quality/fps; "Adjust" returns to the settings with them intact; optional emoji tagging (default 😀 applied automatically); commit.

### Import/Export (`app/import-export`)
See §9.

### Settings (`app/settings`)
An M3 list (a drawer screen) with four `List.Section`s — **API**, **Display**, **Advanced**, **About** — each holding one row with a leading icon, a title and a one-line summary of its current values (from the pure `settingsSummaries`); the API and Display rows open a sub-screen pushed on the root Stack (header with back arrow, no drawer):
- **API keys** (`/settings/gif`) — three `List.Section`s: **Klipy** and **Giphy**, each with that provider's API key override (default from `.env`), and **Content rating**. Summary e.g. "Klipy: key set · Giphy: no key · PG-13" (a provider counts as "key set" when it has a saved key or an `.env` key).
- **Appearance** (`/settings/display`) — *Theme* (a dropdown `List.Item` + `Menu`: Light / Dark / Auto (same as system); persisted as `themeMode`, default Auto; applies to the Paper and navigation themes, drawer, headers and status bar), *Use wallpaper colours* (Material You; disabled with "Needs Android 12 or newer" on older devices), *Reduce motion*. Summary e.g. "Auto theme · Wallpaper colours on · Reduce motion off".
- **Advanced** — *Pack type*: *Separate* (default) or *Mixed*, see §5.3. Implemented in Plans 3–4.
- **About** — app name and version; does not navigate.

The author used to create a pack is not a Settings category: the "New pack" dialog (§8 Home) pre-fills its author field with `lastPublisher` (the author last used) and saves it there on Create.

Planned: storage used + clear cache.

## 9. Import / Export

**Export**
- `.wastickers`: zip of `title.txt`, `author.txt`, `tray.png`, `*.webp`, plus `pack.json` (lossless round trip). `.src/` excluded.
- Plain `.zip` of WebP files.
- Destinations: share sheet (`expo-sharing`) or save to a user-chosen folder via SAF.
- Zipping via `react-native-zip-archive`.

**Import**
- Sources: `.wastickers` / `.zip` via document picker; loose `.webp` files from Device tab or document picker (become a new pack).
- Unzip to a temp dir; run `inspect()` on each file:
  - compliant → keep byte-for-byte;
  - wrong dimensions or oversize → re-encode through the pipeline (fit 512×512, size-fit);
  - undecodable → skip.
- Summary shows kept / fixed / skipped.
- No `pack.json` → default emoji 😀 on each sticker, flagged for review.
- More than 30 stickers → split into multiple packs (with confirmation). Mixed static/animated → split into two packs.
- Missing tray → generated from first sticker.
- Id collision → new id; imports never overwrite existing packs.

## 10. Validation (`services/validation.ts`)

One rule set, used by the pack screen's issues dialog, importer and pre-flight before "Add to WhatsApp"; the ContentProvider has its own minimal native check.

**Pack rules:** 3–30 stickers; name and publisher non-empty, ≤128 chars; id matches `^[A-Za-z0-9_.-]{1,128}$`; tray icon 96×96 PNG < 50 KB; all stickers match `pack.animated` (except in mixed packs, §5.3); optional URLs/email well-formed.

**Sticker rules:** 512×512 WebP; static < 100 KB; animated < 500 KB; animated frame duration ≥ 8 ms; total duration ≤ 10 s; 1–3 emojis; accessibility text ≤ 125 (static) / ≤ 255 (animated).

Result shape: `{ code: string; message: string; stickerId?: string }[]`.

## 11. GIF providers

Both providers run at once — there is no single active provider or provider switch. GIF Search (§8) shows one tab per provider, each backed by this interface.

```ts
interface GifProvider {
  id: 'klipy' | 'giphy';
  attribution: { label: string; logo?: ImageSourcePropType };
  trending(page: PageCursor): Promise<GifPage>;
  search(query: string, page: PageCursor): Promise<GifPage>;
}
interface GifItem {
  id: string;
  title: string;
  preview: { url: string; width: number; height: number };             // small, for grid
  best: { url: string; type: 'mp4' | 'webp' | 'gif'; width: number; height: number }; // for conversion
}
```

Rendition preference for `best`: MP4 → WebP → GIF. Content rating passed through. API keys from `.env` (`EXPO_PUBLIC_KLIPY_API_KEY`, `EXPO_PUBLIC_GIPHY_API_KEY`), overridable in Settings.

## 12. Permissions

- `INTERNET`
- `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_VISUAL_USER_SELECTED` (Android 13+/14+)
- `READ_EXTERNAL_STORAGE` with `maxSdkVersion="32"`
- Blocked via config: `CAMERA`, `WRITE_EXTERNAL_STORAGE`, `RECORD_AUDIO`, and any other library-added permissions not listed above.

Runtime requests happen only when the Device tab is opened, with a rationale screen and a picker fallback on denial.

## 13. Error handling

- Encoding: `DECODE_FAILED`, `OUT_OF_MEMORY`, `TOO_LARGE` → message plus actionable hint ("trim shorter", "use fit mode"); `CANCELLED` is silent.
- Network / GIF API: retry action; 401/403 → "check your API key in Settings".
- WhatsApp: not installed → message; user cancelled → no-op; `validation_error` → shown verbatim.
- Storage: atomic writes; a failed edit removes its partial files; unreadable `pack.json` → folder moved to `quarantine/` and reported on Home.

## 14. Performance

- All encoding on native background threads.
- Low-res preview renditions for browsing; full rendition downloaded only on selection.
- `expo-image` disk/memory caching with display-size decoding.
- FlashList cell recycling for all grids.
- "Reduce motion" setting pauses animated stickers in grids.

## 15. Testing

- **JS (Jest + React Native Testing Library, test-first):** validation rules; `.wastickers` build/parse; Klipy/Giphy adapters against recorded fixtures; packs store and atomic storage; importer keep/fix/skip logic.
- **Kotlin JVM unit tests:** ContentProvider cursor contents vs WhatsApp column contract; `pack.json` → provider mapping; size-fitting search logic with a fake encoder (both `smooth` and `sharp` paths, floor failure); output-sequence builder (speed, reverse, boomerang endpoint handling, fps subsampling, 8 ms minimum); effective-duration check.
- **JS:** effective-duration calculation shared by the editor.
- **Instrumented (device/emulator):** encoder fixtures (transparent GIF, long GIF, animated WebP, MP4, large PNG) → assert 512×512, size limits, frame timing rules; rotate/flip orientation on an asymmetric fixture; boomerang/reverse frame order; frame cache deleted after success, failure and cancel.
- **Manual QA checklist:** add to WhatsApp and WhatsApp Business; permission flows on Android 13 and 14 (full, partial, denied); share and save-to-folder exports; import of third-party `.wastickers`.
- `tsc --noEmit` (strict) and ESLint in `npm test`.

## 16. Setup (README)

1. Install JDK 17; set `JAVA_HOME`.
2. Set `ANDROID_HOME` to the existing SDK (`%LOCALAPPDATA%\Android\Sdk`); NDK 27 and CMake 3.22 are already installed.
3. Copy `.env.example` → `.env`; add `EXPO_PUBLIC_KLIPY_API_KEY` and `EXPO_PUBLIC_GIPHY_API_KEY`.
4. `npm install`.
5. `npx expo run:android` (device/emulator).
6. `npm run build:apk` → signed release APK using a keystore from `scripts/generate-keystore` (git-ignored).
