package expo.modules.webpencoder

import android.graphics.Bitmap
import com.bumptech.glide.gifdecoder.GifDecoder
import com.bumptech.glide.gifdecoder.StandardGifDecoder
import java.io.File

/**
 * GIF via Glide's standalone decoder (transparency and disposal methods). Glide shows delays under 20 ms at
 * 100 ms, matching browsers. Frames are decoded sequentially, as disposal requires.
 */
class GifFrameSource private constructor(
  private val decoder: StandardGifDecoder,
  private val startsMs: IntArray,
  override val durationMs: Int,
) : FrameSource {
  override val width: Int get() = decoder.width
  override val height: Int get() = decoder.height
  override val frameCount: Int get() = startsMs.size
  val frameDurationsMs: List<Int> get() = startsMs.indices.map { decoder.getDelay(it) }

  private var currentIndex = -1
  private var current: Pixels? = null

  override fun frameAt(timeMs: Double): Pixels {
    val target = Timeline.frameIndexAt(startsMs, timeMs)
    check(target >= currentIndex) { "GIF frames must be requested in time order" }
    while (currentIndex < target) {
      decoder.advance()
      val bitmap = decoder.nextFrame
        ?: throw EncoderException(ErrorCode.DECODE_FAILED, "GIF frame ${currentIndex + 1} could not be decoded.")
      currentIndex = decoder.currentFrameIndex
      if (currentIndex == target) current = bitmap.toPixels()
      bitmap.recycle()
    }
    return current ?: throw EncoderException(ErrorCode.DECODE_FAILED, "GIF has no decodable frames.")
  }

  override fun close() = decoder.clear()

  companion object {
    fun open(file: File): GifFrameSource {
      val bytes = file.readBytes()
      val decoder = StandardGifDecoder(SimpleBitmapProvider())
      decoder.setDefaultBitmapConfig(Bitmap.Config.ARGB_8888)
      val status = decoder.read(bytes)
      val readable = status == GifDecoder.STATUS_OK || status == GifDecoder.STATUS_PARTIAL_DECODE
      if (!readable || decoder.frameCount <= 0 || decoder.width <= 0 || decoder.height <= 0) {
        decoder.clear()
        throw EncoderException(ErrorCode.DECODE_FAILED, "${file.name} is not a readable GIF (status $status).")
      }
      val starts = IntArray(decoder.frameCount)
      var t = 0
      for (i in starts.indices) {
        starts[i] = t
        t += decoder.getDelay(i)
      }
      return GifFrameSource(decoder, starts, t)
    }
  }
}
