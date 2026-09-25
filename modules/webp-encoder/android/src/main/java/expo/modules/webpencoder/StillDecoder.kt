package expo.modules.webpencoder

import android.graphics.ImageDecoder
import java.io.File
import java.io.IOException
import kotlin.math.max
import kotlin.math.roundToInt

/** Still images (PNG/JPEG/WebP/first GIF frame) via ImageDecoder, downsampled so the long edge is ≤ [MAX_EDGE]. */
object StillDecoder {
  const val MAX_EDGE = 2048

  fun decode(file: File, maxEdge: Int = MAX_EDGE): Pixels {
    if (!file.isFile) throw EncoderException(ErrorCode.IO_ERROR, "File not found: ${file.path}")
    val bitmap = try {
      ImageDecoder.decodeBitmap(ImageDecoder.createSource(file)) { decoder, info, _ ->
        decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE // readable pixels, never a HARDWARE bitmap
        val w = info.size.width
        val h = info.size.height
        val longEdge = max(w, h)
        if (longEdge > maxEdge) {
          val scale = maxEdge.toDouble() / longEdge
          decoder.setTargetSize(max(1, (w * scale).roundToInt()), max(1, (h * scale).roundToInt()))
        }
      }
    } catch (e: IOException) {
      throw EncoderException(ErrorCode.DECODE_FAILED, "${file.name} could not be decoded: ${e.message}", e)
    }
    return try {
      bitmap.toPixels()
    } finally {
      bitmap.recycle()
    }
  }
}
