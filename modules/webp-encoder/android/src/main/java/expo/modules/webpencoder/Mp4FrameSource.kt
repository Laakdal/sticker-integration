package expo.modules.webpencoder

import android.graphics.Bitmap
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import java.io.File
import java.io.IOException

/**
 * MP4 via MediaMetadataRetriever.getFrameAtIndex (API 28). Frame start times come from MediaExtractor sample
 * timestamps, so variable frame rates map correctly. Frames arrive already rotated for display.
 */
class Mp4FrameSource private constructor(
  private val retriever: MediaMetadataRetriever,
  private val startsMs: IntArray,
  override val durationMs: Int,
  firstFrame: Pixels,
) : FrameSource {
  override val width: Int = firstFrame.width
  override val height: Int = firstFrame.height
  override val frameCount: Int get() = startsMs.size
  private var current: Pixels = firstFrame
  private var currentIndex = 0

  override fun frameAt(timeMs: Double): Pixels {
    val index = Timeline.frameIndexAt(startsMs, timeMs)
    if (index != currentIndex) {
      current = decodeFrame(retriever, index)
      currentIndex = index
    }
    return current
  }

  override fun close() = retriever.release()

  companion object {
    fun open(file: File): Mp4FrameSource {
      val starts = readFrameStarts(file)
      val retriever = MediaMetadataRetriever()
      try {
        retriever.setDataSource(file.absolutePath)
        val durationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toIntOrNull() ?: 0
        val frameCount = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_FRAME_COUNT)?.toIntOrNull()
          ?.takeIf { it > 0 } ?: starts.size
        val usable = starts.copyOf(minOf(starts.size, frameCount))
        if (durationMs <= 0 || usable.isEmpty()) {
          throw EncoderException(ErrorCode.DECODE_FAILED, "${file.name} has no decodable video frames.")
        }
        return Mp4FrameSource(retriever, usable, durationMs, decodeFrame(retriever, 0))
      } catch (e: EncoderException) {
        retriever.release()
        throw e
      } catch (e: RuntimeException) {
        retriever.release()
        throw EncoderException(ErrorCode.DECODE_FAILED, "${file.name} could not be read as video: ${e.message}", e)
      }
    }

    private fun decodeFrame(retriever: MediaMetadataRetriever, index: Int): Pixels {
      val params = MediaMetadataRetriever.BitmapParams().apply { preferredConfig = Bitmap.Config.ARGB_8888 }
      val bitmap = try {
        retriever.getFrameAtIndex(index, params)
      } catch (e: RuntimeException) {
        throw EncoderException(ErrorCode.DECODE_FAILED, "Video frame $index could not be decoded: ${e.message}", e)
      } ?: throw EncoderException(ErrorCode.DECODE_FAILED, "Video frame $index could not be decoded.")
      return try {
        bitmap.toPixels()
      } finally {
        bitmap.recycle()
      }
    }

    /** Presentation times (ms, relative to the first frame, ascending) of every video sample. */
    private fun readFrameStarts(file: File): IntArray {
      val extractor = MediaExtractor()
      try {
        extractor.setDataSource(file.absolutePath)
        val track = (0 until extractor.trackCount).firstOrNull {
          extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("video/") == true
        } ?: throw EncoderException(ErrorCode.DECODE_FAILED, "${file.name} has no video track.")
        extractor.selectTrack(track)
        val times = ArrayList<Long>()
        while (true) {
          val t = extractor.sampleTime
          if (t < 0) break
          times += t
          if (!extractor.advance()) break
        }
        if (times.isEmpty()) throw EncoderException(ErrorCode.DECODE_FAILED, "${file.name} has no video frames.")
        times.sort()
        val first = times[0]
        return IntArray(times.size) { ((times[it] - first) / 1000).toInt() }
      } catch (e: IOException) {
        throw EncoderException(ErrorCode.DECODE_FAILED, "${file.name} could not be read as video: ${e.message}", e)
      } finally {
        extractor.release()
      }
    }
  }
}
