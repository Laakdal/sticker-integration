package expo.modules.webpencoder

/** Outcome of animated size fitting. */
class FitResult(val bytes: ByteArray, val quality: Int, val fps: Int)

/**
 * Animated size fitting (spec §7). Pure: the encoder is passed in as "encode at quality/fps → bytes",
 * so the search runs in JVM tests without libwebp.
 *
 * - smooth: binary-search quality 95 → 25 at each fps step.
 * - sharp: binary-search quality 95 → 60 at each fps step, then 60 → 25 at the last step.
 * - fps steps: chosen → 15 → 12 → 10 → 8 → 5 (only below the chosen fps).
 * A pass fits at ≤ [targetBytes]; the final floor attempt is accepted at ≤ [limitBytes], else TOO_LARGE.
 */
class SizeFitter(
  private val targetBytes: Int = Limits.ANIMATED_TARGET_BYTES,
  private val limitBytes: Int = Limits.ANIMATED_MAX_BYTES,
  private val tolerance: Int = QUALITY_TOLERANCE,
) {
  fun fit(priority: Priority, chosenFps: Int, encode: (quality: Int, fps: Int) -> ByteArray): FitResult {
    val steps = fpsSteps(chosenFps)
    val floor = if (priority == Priority.SMOOTH) SMOOTH_FLOOR else SHARP_FLOOR
    var lastFloor: FitResult? = null
    for (fps in steps) {
      search(fps, MAX_QUALITY, floor, true, encode) { lastFloor = it }?.let { return it }
    }
    if (priority == Priority.SHARP) {
      search(steps.last(), SHARP_FLOOR, SMOOTH_FLOOR, false, encode) { lastFloor = it }?.let { return it }
    }
    val floorResult = lastFloor
    if (floorResult != null && floorResult.bytes.size <= limitBytes) return floorResult
    val size = floorResult?.bytes?.size?.toLong() ?: 0L
    throw EncoderException(
      ErrorCode.TOO_LARGE,
      "Still ${kb(size)} at quality $SMOOTH_FLOOR and ${steps.last()} fps; the limit is 500 KB. Trim it shorter or use Fit.",
    )
  }

  /** Returns the best fitting result at [fps] between [minQuality] and [maxQuality], or null if [minQuality] is too large. */
  private fun search(
    fps: Int,
    maxQuality: Int,
    minQuality: Int,
    probeTop: Boolean,
    encode: (Int, Int) -> ByteArray,
    onFloor: (FitResult) -> Unit,
  ): FitResult? {
    if (probeTop) {
      val top = encode(maxQuality, fps)
      if (top.size <= targetBytes) return FitResult(top, maxQuality, fps)
    }
    val bottom = encode(minQuality, fps)
    onFloor(FitResult(bottom, minQuality, fps))
    if (bottom.size > targetBytes) return null
    val (quality, bytes) = bisectQuality(minQuality, bottom, maxQuality, tolerance, targetBytes) { q -> encode(q, fps) }
    return FitResult(bytes, quality, fps)
  }

  companion object {
    const val MAX_QUALITY = 95
    const val SMOOTH_FLOOR = 25
    const val SHARP_FLOOR = 60
    const val QUALITY_TOLERANCE = 4
    private val FPS_LADDER = listOf(15, 12, 10, 8, 5)

    fun fpsSteps(chosenFps: Int): List<Int> = listOf(chosenFps) + FPS_LADDER.filter { it < chosenFps }
  }
}

/**
 * Binary search between a quality known to fit ([fits], [fitsBytes]) and one known not to ([fails]),
 * until they are at most [tolerance] apart. Returns the highest fitting quality found and its bytes.
 */
fun bisectQuality(
  fits: Int,
  fitsBytes: ByteArray,
  fails: Int,
  tolerance: Int,
  maxBytes: Int,
  encode: (Int) -> ByteArray,
): Pair<Int, ByteArray> {
  var lo = fits
  var hi = fails
  var best = fitsBytes
  while (hi - lo > tolerance) {
    val mid = (lo + hi) / 2
    val bytes = encode(mid)
    if (bytes.size <= maxBytes) {
      lo = mid
      best = bytes
    } else {
      hi = mid
    }
  }
  return lo to best
}

class StaticFitResult(val bytes: ByteArray, val quality: Int, val lossless: Boolean)

/** Static stickers: lossless first, then a lossy quality search to stay within 100 KB (spec §7). */
object StaticFitter {
  const val MAX_QUALITY = 95
  const val MIN_QUALITY = 10
  const val TOLERANCE = 2

  fun fit(
    maxBytes: Int = Limits.STATIC_MAX_BYTES,
    lossless: () -> ByteArray,
    lossy: (quality: Int) -> ByteArray,
  ): StaticFitResult {
    val losslessBytes = lossless()
    if (losslessBytes.size <= maxBytes) return StaticFitResult(losslessBytes, 100, true)
    val top = lossy(MAX_QUALITY)
    if (top.size <= maxBytes) return StaticFitResult(top, MAX_QUALITY, false)
    val bottom = lossy(MIN_QUALITY)
    if (bottom.size > maxBytes) {
      throw EncoderException(ErrorCode.TOO_LARGE, "Still ${kb(bottom.size.toLong())} at quality $MIN_QUALITY; the limit is 100 KB.")
    }
    val (quality, bytes) = bisectQuality(MIN_QUALITY, bottom, MAX_QUALITY, TOLERANCE, maxBytes, lossy)
    return StaticFitResult(bytes, quality, false)
  }
}
