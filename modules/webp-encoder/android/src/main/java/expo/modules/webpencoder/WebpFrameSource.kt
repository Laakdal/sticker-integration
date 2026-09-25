package expo.modules.webpencoder

import java.io.File

/** Animated WebP via libwebp's WebPAnimDecoder (exact timings; delays ≤ 10 ms are shown at 100 ms). */
class WebpFrameSource private constructor(
  private val handle: Long,
  override val width: Int,
  override val height: Int,
  private val startsMs: IntArray,
  override val durationMs: Int,
) : FrameSource {
  override val frameCount: Int get() = startsMs.size
  private val buffer = IntArray(width * height)
  private var currentIndex = -1
  private var current: Pixels? = null

  override fun frameAt(timeMs: Double): Pixels {
    val target = Timeline.frameIndexAt(startsMs, timeMs)
    check(target >= currentIndex) { "WebP frames must be requested in time order" }
    if (target != currentIndex) {
      while (currentIndex < target) {
        if (WebpNative.animDecoderNext(handle, buffer) < 0) {
          throw EncoderException(ErrorCode.DECODE_FAILED, "WebP frame ${currentIndex + 1} could not be decoded.")
        }
        currentIndex++
      }
      current = Pixels(buffer.copyOf(), width, height)
    }
    return current!!
  }

  override fun close() = WebpNative.animDecoderDelete(handle)

  companion object {
    fun open(file: File): WebpFrameSource {
      val bytes = file.readBytes()
      val info = WebpNative.demuxInfo(bytes)
        ?: throw EncoderException(ErrorCode.DECODE_FAILED, "${file.name} is not a readable WebP file.")
      val facts = WebpFacts.from(info)
      if (!facts.animated) {
        throw EncoderException(ErrorCode.DECODE_FAILED, "${file.name} is a still WebP; use encodeStatic for still images.")
      }
      val handle = WebpNative.animDecoderNew(bytes)
      if (handle == 0L) throw EncoderException(ErrorCode.DECODE_FAILED, "${file.name} could not be decoded.")
      val starts = IntArray(facts.durationsMs.size)
      var t = 0
      facts.durationsMs.forEachIndexed { i, d ->
        starts[i] = t
        t += Timeline.normalizeDelayMs(d)
      }
      return WebpFrameSource(handle, facts.width, facts.height, starts, t)
    }
  }
}
