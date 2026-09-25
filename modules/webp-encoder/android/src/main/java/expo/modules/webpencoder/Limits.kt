package expo.modules.webpencoder

/** WhatsApp sticker limits and encoder constants (spec §7, §10). KB = 1024 bytes; limits are inclusive. */
object Limits {
  const val KB = 1024
  const val CANVAS = 512
  const val TRAY = 96
  const val STATIC_MAX_BYTES = 100 * KB
  const val ANIMATED_MAX_BYTES = 500 * KB
  const val ANIMATED_TARGET_BYTES = 490 * KB
  const val TRAY_MAX_BYTES = 50 * KB
  const val MIN_FRAME_MS = 8
  const val MAX_EFFECTIVE_MS = 10_000.0
  const val AUTO_FPS_CAP = 20
  const val MIN_MANUAL_FPS = 5
  const val MAX_MANUAL_FPS = 30
  const val MAX_FRAMES = 300
}
