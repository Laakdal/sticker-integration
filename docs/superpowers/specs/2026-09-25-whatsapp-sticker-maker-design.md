# WhatsApp Sticker Maker — Design Spec

- **Date:** 2026-09-25
- **Status:** Approved design, pending spec review
- **Audience:** Personal project — installed via APK, English only, no Play Store release

## 1. Goal

An Android app for creating, importing, exporting and managing WhatsApp sticker packs (static and animated), with GIF search, a sticker editor, an in-app device gallery, bundled starter packs and direct "Add to WhatsApp" integration via the official sticker pack contract.

**Success criteria**

1. A user can build a static pack from their own photos (crop, rotate, resize, text, emoji) and add it to WhatsApp.
2. A user can build an animated pack from device GIFs/videos or from Klipy/Giphy search results and add it to WhatsApp.
3. Every pack sent to WhatsApp passes WhatsApp's validation (sizes, limits, formats) — invalid packs are blocked in-app with a clear reason.
4. Packs round-trip through `.wastickers` export/import without losing emojis, accessibility text or order.
5. Animated stickers use the highest quality that fits under 500 KB.

**Out of scope (explicit)**

- Background removal (automatic or manual).
- Per-frame text/emoji overlays on animated stickers.
- Tenor integration.
- Play Store release work (privacy policy, store listing, Play-policy permission declarations).
- Localization (English only).
- Camera capture.
- Opening `.wastickers` files from other apps via "Open with" intent filters (import is via in-app pickers).

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
| State | Zustand |
| Settings storage | `react-native-mmkv` |
| Pack storage | `pack.json` + files in app-private storage (`expo-file-system`) |
| Images (display) | `expo-image` (disk/memory cache, animated WebP playback) |
| Lists/grids | `@shopify/flash-list`; drag-reorder grid via `react-native-sortables` |
| Editor canvas | `@shopify/react-native-skia` + `react-native-gesture-handler` + `react-native-reanimated` |
| Crop | `react-native-image-crop-picker` (`openCropper`, 1:1) |
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
    components/  PackList, PackCard, PackDetailsForm, TrayIconPicker, StickerGrid,
                 StickerTile, StickerDetailsSheet, AddStickerMenu, ValidationBar,
                 AddToWhatsAppButton, WhatsAppBadge, DuplicatePackBanner
    hooks/       usePack, usePackValidation, useWhatsAppStatus, useAddToWhatsApp
  editor/
    shared/      EmojiTagger, EncodedResultPreview, EncodeProgressDialog
    static/      EditorCanvas, Checkerboard, ImageLayer, TextLayer, EmojiLayer,
                 TransformHandles, EditorToolbar, TextStyleSheet, EmojiPickerSheet,
                 UndoRedoControls
                 hooks: useLayerHistory, useCanvasGestures, useExportStatic
    animated/    AnimatedSourcePreview, FramingOverlay, FitFillToggle, TrimSlider
                 hooks: useEncodeJob
    batch/       BatchQueueList, BatchQueueItem
                 hooks: useBatchQueue
  gallery/
    components/  MediaGrid, MediaTile, MediaFilterChips, SelectionBar,
                 PermissionRationale, LimitedAccessBanner
    hooks/       useMediaPermission, useMediaLibrary
  gifs/
    components/  GifSearchBar, GifGrid, GifTile, GifPreviewSheet,
                 ProviderAttribution, ProviderSwitcher
    hooks/       useGifSearch (debounce + infinite pagination)
  transfer/
    components/  ExportOptionsSheet, ImportProgress, ImportSummary
    hooks/       useExportPack, useImportPack
  settings/
    components/  ProviderSettings, ApiKeyField, StorageUsage
src/components/  Screen, SectionHeader, StickerImage (expo-image + reduce-motion),
                 EmptyState, ErrorState, ConfirmDialog, LoadingOverlay
src/theme/       Material 3 light/dark theme tokens
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
  settings.tsx           Settings
src/
  features/              per-feature components + hooks (packs, editor, gifs, gallery, transfer)
  services/
    gif/                 GifProvider interface, klipy.ts, giphy.ts
    packStorage.ts       read/write pack folders, atomic writes, quarantine
    wastickers.ts        build/parse .wastickers and plain zips
    validation.ts        single WhatsApp rule set
    importer.ts          keep / fix / skip pipeline
    bundledPacks.ts      first-launch install of starter packs
  store/                 packs store, settings store
  components/            shared Material UI pieces
modules/
  webp-encoder/          Expo Module (Kotlin, JNI, libwebp, CMake)
  sticker-provider/      Expo Module (ContentProvider + intents)
assets/bundled-packs/    starter packs (original artwork, generated by a script)
scripts/                 generate-bundled-packs, generate-keystore
```

## 5. Data model and storage

### 5.1 On-disk layout

```
<documentDirectory>/packs/<packId>/pack.json     single source of truth for the pack
<documentDirectory>/packs/<packId>/tray.png      96×96 PNG, < 50 KB
<documentDirectory>/packs/<packId>/<stickerId>.webp
<documentDirectory>/packs/<packId>/.src/<stickerId>/   static editor sources (source image + layers.json); never exported
<documentDirectory>/quarantine/<packId>/         packs whose pack.json failed to parse
<cacheDirectory>/...                             downloads, temp unzip, encode scratch
```

`pack.json` (not MMKV) is canonical because the ContentProvider may be invoked by WhatsApp when only the native process is running; a plain JSON file is readable from Kotlin with no JS runtime. On startup the packs store scans `packs/*/pack.json`. All writes are atomic: write `pack.json.tmp`, then rename.

MMKV stores settings only: active GIF provider, API key overrides, content rating, reduce-motion flag, first-launch flags.

### 5.2 Types

```ts
type PackOrigin = 'user' | 'imported' | 'bundled';

interface Pack {
  id: string;                 // 1–128 chars, [A-Za-z0-9_.-]; also the WhatsApp identifier
  name: string;               // 1–128 chars
  publisher: string;          // 1–128 chars
  trayIcon: string;           // file name, 'tray.png'
  animated: boolean;          // fixed by first sticker; all stickers must match
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

### 5.3 Bundled starter packs

Shipped under `assets/bundled-packs/`, copied into `packs/` on first launch with `origin: 'bundled'` so the ContentProvider serves them like any other pack. Read-only in the UI; "Duplicate to edit" creates a `user` copy with a new id. Artwork is original, produced by `scripts/generate-bundled-packs` (at least one static and one animated pack, each ≥3 stickers).

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

- `addToWhatsApp(packId: string, name: string): Promise<{ status: 'added' | 'cancelled' | 'error'; message?: string }>` — fires `com.whatsapp.intent.action.ENABLE_STICKER_PACK` with extras `sticker_pack_id`, `sticker_pack_authority`, `sticker_pack_name`. Uses a chooser when both `com.whatsapp` and `com.whatsapp.w4b` are installed. Surfaces WhatsApp's `validation_error` extra.
- `getWhatsAppStatus(packId: string): Promise<{ consumer: { installed: boolean; added: boolean }; business: { installed: boolean; added: boolean } }>` — via the whitelist provider `content://com.whatsapp.provider.sticker_whitelist_check/is_whitelisted` (and the `.w4b` equivalent).
- Manifest `<queries>` for `com.whatsapp` and `com.whatsapp.w4b`.

## 7. Native module: `webp-encoder`

libwebp vendored and built with CMake/NDK; Kotlin orchestration; one pipeline:

```
decode frames → crop/fit to 512×512 → trim → encode → measure → retry
```

**Decoders by source**

- GIF — Glide standalone `gifdecoder` (transparency, disposal methods).
- Animated WebP — libwebp `WebPAnimDecoder` (exact timings).
- MP4 — `MediaMetadataRetriever.getFrameAtIndex`, sampled at source fps capped at 20 fps.
- Static inputs (PNG/JPG/WebP) — `ImageDecoder`.

**Framing:** normalized crop rect + mode `fill | fit`; `fit` pads onto a transparent 512×512 canvas. Scaling via libwebp's area-averaging rescaler (`WebPPictureRescale`).

**Size fitting (animated, limit 500 KB, target ≤ 490 KB)**

1. Binary-search quality 95 → 25 with `allow_mixed`, tuned `kmin`/`kmax`, `method = 6`.
2. If still too large at quality 25: reduce fps by merging adjacent frame durations; repeat step 1.
3. Enforce frame duration ≥ 8 ms and total duration ≤ 10 s (trim input).
4. If still too large at the floor (quality 25, ≥ 5 fps): fail with `TOO_LARGE`.

The search logic lives in a pure Kotlin class with an injectable "encode at quality/fps → size" function so it is unit-testable without libwebp.

**Memory:** frames are streamed into `WebPAnimEncoder`, never all held raw; each pass re-decodes the source. Runs on a background thread, emits progress events, cancellable by job id.

**JS API**

- `encodeAnimated(opts: { source: string; sourceType: 'gif' | 'webp' | 'mp4'; crop: { x: number; y: number; w: number; h: number }; mode: 'fill' | 'fit'; trimStartMs: number; trimEndMs: number; outPath: string; jobId: string }): Promise<{ sizeBytes: number; frames: number; durationMs: number; quality: number; fps: number }>`; event `onProgress { jobId, pass, fraction }`; `cancel(jobId)`.
- `encodeStatic(inputPath: string, outPath: string): Promise<{ sizeBytes: number; quality: number; lossless: boolean }>` — 512×512 input; lossless first, lossy quality search to stay < 100 KB.
- `makeTrayIcon(inputPath: string, outPath: string): Promise<{ sizeBytes: number }>` — 96×96 PNG < 50 KB.
- `inspect(path: string): Promise<{ width: number; height: number; animated: boolean; frameCount: number; frameDurationsMs: number[]; sizeBytes: number; format: string }>`.

Error codes: `DECODE_FAILED`, `OUT_OF_MEMORY`, `TOO_LARGE`, `CANCELLED`, `IO_ERROR`.

## 8. Screens and flows

### Home (`app/index`)
Sections "My packs" and "Starter packs". Card: tray icon, name, author, sticker count, static/animated chip, "Added to WhatsApp ✓" badge (from `getWhatsAppStatus`). FAB → new pack. Overflow → Import/Export, Settings.

### Create/Edit Pack (`app/pack/[id]`)
- Name, author, tray icon (auto from first sticker; changeable).
- Sticker grid with long-press drag-reorder. Tap → bottom sheet: emojis, accessibility text, re-edit (if `editable`), delete.
- Add menu: *Device* (in-app gallery), *Search GIFs*, *System picker*.
- Static/animated is fixed by the first sticker; adding a mismatched type offers "Create a new animated/static pack with this".
- Live validation bar (count x/30, issue list); "Add to WhatsApp" disabled until valid.
- Bundled packs: read-only with "Duplicate to edit".

### Media sources (`app/media`) — tabs
- **Device:** `expo-media-library` grid; filter chips *All / Images / GIFs / Videos*; multi-select. Permissions: `READ_MEDIA_IMAGES` + `READ_MEDIA_VIDEO` (Android 13+), `READ_EXTERNAL_STORAGE` (Android 9–12); handles Android 14 partial access (`READ_MEDIA_VISUAL_USER_SELECTED`) with a "Select more photos" action. If denied, shows a rationale and falls back to system Photo Picker / document picker.
- **GIF Search:** debounced search; trending when empty; infinite scroll; low-res preview renditions; tap → full preview → "Add to pack" downloads best MP4/WebP rendition → animated editor. Provider attribution shown; provider switch available.

Multi-select routing: multiple stills → batch queue (default 1:1 crop each, open any in the full editor, "Accept all"); multiple GIFs/videos → sequential animated editor sessions.

### Static editor (`app/editor/static`)
1. Source → `openCropper` 1:1.
2. Skia 512×512 canvas over checkerboard: base image pinch/pan (resize), rotate (90° steps + free).
3. Layers: text (font, colour, outline stroke) and emoji (`rn-emoji-keyboard`); select, drag, scale, rotate; undo/redo.
4. Save: Skia snapshot → PNG → `encodeStatic` → preview of the encoded result with its size → tag 1–3 emojis (+ optional accessibility text) → commit.
5. Source image + `layers.json` saved to `.src/<stickerId>/` for re-editing.

### Animated editor (`app/editor/animated`)
Playing preview with square framing overlay (pinch/pan), fill/fit toggle, range trim slider (max 10 s), encode with progress + cancel, result preview with size/quality/fps, emoji tagging, commit.

### Import/Export (`app/import-export`)
See §9.

### Settings (`app/settings`)
GIF provider (Klipy | Giphy); API key overrides (defaults from `.env`); content rating; reduce motion; storage used + clear cache; about.

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

One rule set, used by the validation bar, importer and pre-flight before "Add to WhatsApp"; the ContentProvider has its own minimal native check.

**Pack rules:** 3–30 stickers; name and publisher non-empty, ≤128 chars; id matches `^[A-Za-z0-9_.-]{1,128}$`; tray icon 96×96 PNG < 50 KB; all stickers match `pack.animated`; optional URLs/email well-formed.

**Sticker rules:** 512×512 WebP; static < 100 KB; animated < 500 KB; animated frame duration ≥ 8 ms; total duration ≤ 10 s; 1–3 emojis; accessibility text ≤ 125 (static) / ≤ 255 (animated).

Result shape: `{ code: string; message: string; stickerId?: string }[]`.

## 11. GIF providers

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
- **Kotlin JVM unit tests:** ContentProvider cursor contents vs WhatsApp column contract; `pack.json` → provider mapping; size-fitting search logic with a fake encoder.
- **Instrumented (device/emulator):** encoder fixtures (transparent GIF, long GIF, animated WebP, MP4, large PNG) → assert 512×512, size limits, frame timing rules.
- **Manual QA checklist:** add to WhatsApp and WhatsApp Business; permission flows on Android 13 and 14 (full, partial, denied); share and save-to-folder exports; import of third-party `.wastickers`.
- `tsc --noEmit` (strict) and ESLint in `npm test`.

## 16. Setup (README)

1. Install JDK 17; set `JAVA_HOME`.
2. Set `ANDROID_HOME` to the existing SDK (`%LOCALAPPDATA%\Android\Sdk`); NDK 27 and CMake 3.22 are already installed.
3. Copy `.env.example` → `.env`; add `EXPO_PUBLIC_KLIPY_API_KEY` and `EXPO_PUBLIC_GIPHY_API_KEY`.
4. `npm install`.
5. `npx expo run:android` (device/emulator).
6. `npm run build:apk` → signed release APK using a keystore from `scripts/generate-keystore` (git-ignored).
