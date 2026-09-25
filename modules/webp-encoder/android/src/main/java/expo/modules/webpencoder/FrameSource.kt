package expo.modules.webpencoder

import java.io.Closeable

/** A decoded animated source. Frames are full-canvas ARGB pixels (not premultiplied), width × height. */
interface FrameSource : Closeable {
  val width: Int
  val height: Int
  val durationMs: Int
  val frameCount: Int
  val fps: Double get() = Timeline.sourceFps(frameCount, durationMs)

  /** The frame shown at [timeMs]. Times must not decrease between calls. Callers must not modify the result. */
  fun frameAt(timeMs: Double): Pixels
}

/** Result of `probe()` (spec §7). */
data class ProbeResult(val width: Int, val height: Int, val durationMs: Int, val fps: Double, val frameCount: Int) {
  fun toMap(): Map<String, Any> =
    mapOf("width" to width, "height" to height, "durationMs" to durationMs, "fps" to fps, "frameCount" to frameCount)

  companion object {
    fun of(source: FrameSource) = ProbeResult(source.width, source.height, source.durationMs, source.fps, source.frameCount)
  }
}
