package expo.modules.webpencoder

import kotlin.math.roundToInt

/** One frame of an encode pass: which frame-cache entry to show and for how long. */
data class OutputFrame(val cacheIndex: Int, val durationMs: Int)

/**
 * Builds the frame order and durations of one encode pass over the frame cache (spec §7):
 * fps subsampling on the forward output timeline, then reverse/boomerang as index orderings,
 * with every frame at least 8 ms long and at least two frames per pass.
 */
object OutputSequence {
  fun build(grid: SampleGrid, cacheFps: Int, targetFps: Int, playback: Playback): List<OutputFrame> {
    val forward = mergeShortFrames(select(grid, cacheFps, targetFps))
    if (forward.size == 1) {
      // A one-frame sticker would be a still; show the frame twice (NativeAnimBackend keeps both in the file).
      val (first, second) = twoFrameDurations(forward[0].durationMs)
      return listOf(forward[0].copy(durationMs = first), forward[0].copy(durationMs = second))
    }
    return when (playback) {
      Playback.NORMAL -> forward
      Playback.REVERSE -> forward.reversed()
      // forward then backward without repeating the last frame, and without the first (the loop restarts on it)
      Playback.BOOMERANG ->
        if (forward.size <= 2) forward else forward + forward.subList(1, forward.size - 1).reversed()
    }
  }

  /** Picks the cache frame shown at each tick of [targetFps]; consecutive picks of the same frame become one longer frame. */
  private fun select(grid: SampleGrid, cacheFps: Int, targetFps: Int): List<OutputFrame> {
    val times = grid.outputTimesMs
    val starts = ArrayList<Pair<Int, Int>>() // (cacheIndex, startMs)
    if (targetFps >= cacheFps) {
      times.forEachIndexed { i, t -> starts += i to t }
    } else {
      val stepMs = 1000.0 / targetFps
      var j = 0
      var k = 0
      while (true) {
        val t = (j * stepMs).roundToInt()
        if (j > 0 && t >= grid.durationMs) break
        while (k + 1 < times.size && times[k + 1] <= t) k++
        if (starts.isEmpty() || starts.last().first != k) starts += k to t
        j++
      }
    }
    return starts.mapIndexed { i, (index, start) ->
      val end = if (i + 1 < starts.size) starts[i + 1].second else grid.durationMs
      OutputFrame(index, end - start)
    }
  }

  /**
   * Splits [totalMs] over two frames, each at least [minMs] long: the total is kept unless it is under 2 × [minMs].
   * WhatsApp treats a sticker as animated only if it has more than one frame.
   */
  fun twoFrameDurations(totalMs: Int, minMs: Int = Limits.MIN_FRAME_MS): Pair<Int, Int> {
    val first = maxOf(minMs, totalMs / 2)
    return first to maxOf(minMs, totalMs - first)
  }

  /**
   * Frames shorter than [minMs] are merged into the previous frame; leading short frames are merged into the
   * first long-enough frame. If everything is short, a single [minMs] frame remains.
   */
  fun mergeShortFrames(frames: List<OutputFrame>, minMs: Int = Limits.MIN_FRAME_MS): List<OutputFrame> {
    val out = ArrayList<OutputFrame>(frames.size)
    var carry = 0
    for (frame in frames) {
      when {
        frame.durationMs >= minMs -> {
          out += frame.copy(durationMs = frame.durationMs + carry)
          carry = 0
        }
        out.isEmpty() -> carry += frame.durationMs
        else -> out[out.lastIndex] = out.last().copy(durationMs = out.last().durationMs + frame.durationMs)
      }
    }
    if (out.isEmpty() && frames.isNotEmpty()) out += frames.first().copy(durationMs = maxOf(minMs, carry))
    return out
  }
}
