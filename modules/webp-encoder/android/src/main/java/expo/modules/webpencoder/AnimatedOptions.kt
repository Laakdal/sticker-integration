package expo.modules.webpencoder

import java.util.Locale

/** An enum with the string the JS API uses for it. */
interface JsValue {
  val js: String
}

enum class SourceType(override val js: String) : JsValue { GIF("gif"), WEBP("webp"), MP4("mp4") }
enum class Playback(override val js: String) : JsValue { NORMAL("normal"), REVERSE("reverse"), BOOMERANG("boomerang") }
enum class FrameMode(override val js: String) : JsValue { FILL("fill"), FIT("fit") }
enum class Priority(override val js: String) : JsValue { SMOOTH("smooth"), SHARP("sharp") }

inline fun <reified T> parseJsEnum(key: String, value: Any?): T where T : Enum<T>, T : JsValue {
  val text = value as? String ?: invalidOptions("$key must be a string.")
  return enumValues<T>().firstOrNull { it.js == text }
    ?: invalidOptions("$key has unsupported value '$text' (expected ${enumValues<T>().joinToString { it.js }}).")
}

/** Normalized crop rectangle (0–1) in rotated/flipped source coordinates. */
data class CropRect(val x: Double, val y: Double, val w: Double, val h: Double)

/** Validated options of `encodeAnimated` (spec §7). `fps == null` means "auto". */
data class AnimatedOptions(
  val source: String,
  val sourceType: SourceType,
  val crop: CropRect,
  val mode: FrameMode,
  val trimStartMs: Double,
  val trimEndMs: Double,
  val speed: Double,
  val playback: Playback,
  val rotation: Int,
  val flipH: Boolean,
  val flipV: Boolean,
  val fps: Int?,
  val priority: Priority,
  val outPath: String,
  val jobId: String,
) {
  val effectiveDurationMs: Double
    get() = Timeline.effectiveDurationMs(trimStartMs, trimEndMs, speed, playback)

  fun validate() {
    if (SPEEDS.none { it == speed }) invalidOptions("speed must be one of 0.5, 0.75, 1, 1.25, 1.5 or 2 (got $speed).")
    if (trimStartMs < 0 || trimEndMs <= trimStartMs) {
      invalidOptions("trim must satisfy 0 ≤ trimStartMs < trimEndMs (got $trimStartMs–$trimEndMs).")
    }
    val c = crop
    if (c.x < 0 || c.y < 0 || c.w <= 0 || c.h <= 0 || c.x + c.w > 1 + EPSILON || c.y + c.h > 1 + EPSILON) {
      invalidOptions("crop must lie inside the source: x, y ≥ 0, w, h > 0, x + w ≤ 1 and y + h ≤ 1.")
    }
    if (effectiveDurationMs > Limits.MAX_EFFECTIVE_MS) {
      invalidOptions(String.format(Locale.US, "Effective duration is %.2f s; the limit is 10 s.", effectiveDurationMs / 1000))
    }
  }

  companion object {
    val SPEEDS = listOf(0.5, 0.75, 1.0, 1.25, 1.5, 2.0)
    val ROTATIONS = listOf(0, 90, 180, 270)
    private const val EPSILON = 1e-6

    /** Parses the JS options object; throws INVALID_OPTIONS on any missing or bad value. */
    fun parse(map: Map<String, Any?>): AnimatedOptions {
      val options = AnimatedOptions(
        source = map.requireString("source"),
        sourceType = parseJsEnum("sourceType", map["sourceType"]),
        crop = parseCrop(map["crop"]),
        mode = parseJsEnum("mode", map["mode"]),
        trimStartMs = map.requireNumber("trimStartMs"),
        trimEndMs = map.requireNumber("trimEndMs"),
        speed = map.requireNumber("speed"),
        playback = parseJsEnum("playback", map["playback"]),
        rotation = parseRotation(map["rotation"]),
        flipH = map.requireBoolean("flipH"),
        flipV = map.requireBoolean("flipV"),
        fps = parseFps(map["fps"]),
        priority = parseJsEnum("priority", map["priority"]),
        outPath = map.requireString("outPath"),
        jobId = map.requireString("jobId"),
      )
      options.validate()
      return options
    }

    private fun Map<*, *>.requireString(key: String): String =
      (this[key] as? String)?.takeIf { it.isNotEmpty() } ?: invalidOptions("$key must be a non-empty string.")

    private fun Map<*, *>.requireNumber(key: String, label: String = key): Double =
      (this[key] as? Number)?.toDouble()?.takeIf { it.isFinite() } ?: invalidOptions("$label must be a finite number.")

    private fun Map<*, *>.requireBoolean(key: String): Boolean =
      this[key] as? Boolean ?: invalidOptions("$key must be a boolean.")

    private fun parseCrop(value: Any?): CropRect {
      val m = value as? Map<*, *> ?: invalidOptions("crop must be an object { x, y, w, h }.")
      return CropRect(m.requireNumber("x", "crop.x"), m.requireNumber("y", "crop.y"), m.requireNumber("w", "crop.w"), m.requireNumber("h", "crop.h"))
    }

    private fun parseRotation(value: Any?): Int {
      val d = (value as? Number)?.toDouble() ?: invalidOptions("rotation must be 0, 90, 180 or 270.")
      val r = d.toInt()
      if (d != r.toDouble() || r !in ROTATIONS) invalidOptions("rotation must be 0, 90, 180 or 270 (got $value).")
      return r
    }

    private fun parseFps(value: Any?): Int? {
      if (value == "auto") return null
      val d = (value as? Number)?.toDouble() ?: invalidOptions("fps must be 'auto' or a whole number from 5 to 30 (got $value).")
      val f = d.toInt()
      if (d != f.toDouble() || f < Limits.MIN_MANUAL_FPS || f > Limits.MAX_MANUAL_FPS) {
        invalidOptions("fps must be 'auto' or a whole number from 5 to 30 (got $value).")
      }
      return f
    }
  }
}
