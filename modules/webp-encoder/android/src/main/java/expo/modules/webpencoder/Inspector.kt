package expo.modules.webpencoder

import android.graphics.BitmapFactory
import java.io.File

/** Result of `inspect()`; same shape as `InspectResult` in src/domain/types.ts (Plan 1). */
data class InspectFacts(
  val width: Int,
  val height: Int,
  val animated: Boolean,
  val frameCount: Int,
  val frameDurationsMs: List<Int>,
  val sizeBytes: Int,
  val format: String,
) {
  fun toMap(): Map<String, Any> = mapOf(
    "width" to width,
    "height" to height,
    "animated" to animated,
    "frameCount" to frameCount,
    "frameDurationsMs" to frameDurationsMs,
    "sizeBytes" to sizeBytes,
    "format" to format,
  )
}

object Inspector {
  /** Reads dimensions, animation facts and stored frame durations without decoding pixels (GIF delays as Glide shows them). */
  fun inspect(file: File): InspectFacts {
    if (!file.isFile) throw EncoderException(ErrorCode.IO_ERROR, "File not found: ${file.path}")
    val sizeBytes = file.length().toInt()
    if (FileSniffer.isWebp(FileSniffer.readHeader(file))) {
      val info = WebpNative.demuxInfo(file.readBytes())
        ?: throw EncoderException(ErrorCode.DECODE_FAILED, "${file.name} is not a readable WebP file.")
      val facts = WebpFacts.from(info)
      val durations = if (facts.animated) facts.durationsMs else emptyList()
      return InspectFacts(facts.width, facts.height, facts.animated, facts.frameCount, durations, sizeBytes, "webp")
    }
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(file.path, bounds)
    val format = when (bounds.outMimeType) {
      "image/png" -> "png"
      "image/jpeg" -> "jpeg"
      "image/gif" -> "gif"
      else -> null
    }
    if (format == null || bounds.outWidth <= 0 || bounds.outHeight <= 0) {
      throw EncoderException(ErrorCode.DECODE_FAILED, "${file.name} is not a supported image.")
    }
    if (format == "gif") {
      GifFrameSource.open(file).use { gif ->
        val animated = gif.frameCount > 1
        val durations = if (animated) gif.frameDurationsMs else emptyList()
        return InspectFacts(gif.width, gif.height, animated, gif.frameCount, durations, sizeBytes, format)
      }
    }
    return InspectFacts(bounds.outWidth, bounds.outHeight, false, 1, emptyList(), sizeBytes, format)
  }
}
