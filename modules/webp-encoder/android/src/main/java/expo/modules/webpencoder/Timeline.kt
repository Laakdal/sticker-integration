package expo.modules.webpencoder

import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.roundToInt

/** Frame-cache sampling plan: frame k samples the source at sourceTimesMs[k] and starts at outputTimesMs[k]. */
data class SampleGrid(
  val sourceTimesMs: List<Double>,
  /** Start of each cache frame on the forward output timeline (ms). */
  val outputTimesMs: List<Int>,
  /** Forward output duration: trim window ÷ speed, rounded (ms). */
  val durationMs: Int,
) {
  val size: Int get() = outputTimesMs.size
}

object Timeline {
  /** (trimEnd − trimStart) ÷ speed × (boomerang ? 2 : 1) — must be ≤ 10 s (spec §7). */
  fun effectiveDurationMs(trimStartMs: Double, trimEndMs: Double, speed: Double, playback: Playback): Double =
    (trimEndMs - trimStartMs) / speed * (if (playback == Playback.BOOMERANG) 2 else 1)

  /** Source frame rate as reported by probe(): frames per second, rounded to 2 decimals. */
  fun sourceFps(frameCount: Int, durationMs: Int): Double =
    if (frameCount <= 0 || durationMs <= 0) 0.0 else Math.round(frameCount * 1000.0 / durationMs * 100) / 100.0

  /** "auto" fps: the source rate rounded, capped at 20 (at least 1); unknown rates use the cap. Mirrors src/timing.ts. */
  fun resolveAutoFps(sourceFps: Double): Int =
    if (!sourceFps.isFinite() || sourceFps <= 0) Limits.AUTO_FPS_CAP
    else Math.round(sourceFps).toInt().coerceIn(1, Limits.AUTO_FPS_CAP)

  /** Browsers show GIF/WebP frames with delays ≤ 10 ms at 100 ms; so do we. */
  fun normalizeDelayMs(delayMs: Int): Int = if (delayMs <= 10) 100 else delayMs

  /** Index of the frame shown at [timeMs], given ascending frame start times (clamped to the first/last frame). */
  fun frameIndexAt(startsMs: IntArray, timeMs: Double): Int {
    var lo = 0
    var hi = startsMs.size - 1
    while (lo < hi) {
      val mid = (lo + hi + 1) / 2
      if (startsMs[mid] <= timeMs) lo = mid else hi = mid - 1
    }
    return lo
  }

  /** Samples the trim window on the output timeline at [fps]: output time t shows source time trimStart + t × speed. */
  fun sampleGrid(trimStartMs: Double, trimEndMs: Double, speed: Double, fps: Int): SampleGrid {
    require(fps > 0 && speed > 0 && trimEndMs > trimStartMs) { "Invalid timeline" }
    val forwardMs = (trimEndMs - trimStartMs) / speed
    val stepMs = 1000.0 / fps
    val count = max(1, ceil(forwardMs / stepMs - 1e-9).toInt())
    if (count > Limits.MAX_FRAMES) invalidOptions("$count frames exceed the limit of ${Limits.MAX_FRAMES}.")
    val sourceTimes = ArrayList<Double>(count)
    val outputTimes = ArrayList<Int>(count)
    for (k in 0 until count) {
      val t = k * stepMs
      outputTimes += t.roundToInt()
      sourceTimes += trimStartMs + t * speed
    }
    return SampleGrid(sourceTimes, outputTimes, forwardMs.roundToInt())
  }
}
