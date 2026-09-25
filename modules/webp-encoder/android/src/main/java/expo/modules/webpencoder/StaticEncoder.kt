package expo.modules.webpencoder

import java.io.File

data class StaticResult(val sizeBytes: Int, val quality: Int, val lossless: Boolean) {
  fun toMap(): Map<String, Any> = mapOf("sizeBytes" to sizeBytes, "quality" to quality, "lossless" to lossless)
}

/** `encodeStatic`: any still image → 512×512 WebP ≤ 100 KB. Non-512 inputs are fit (aspect kept, transparent padding). */
class StaticEncoder(private val rescaler: Rescaler) {
  fun encode(input: File, output: File): StaticResult {
    val image = StillDecoder.decode(input)
    val size = Limits.CANVAS
    val argb = if (image.width == size && image.height == size) {
      image.argb
    } else {
      rescaler.rescaleOnto(image, Framing.plan(image.width, image.height, Framing.FULL_CROP, FrameMode.FIT))
    }
    val fit = StaticFitter.fit(
      lossless = { encodeOrFail(argb, true, 100) },
      lossy = { quality -> encodeOrFail(argb, false, quality) },
    )
    AtomicFiles.write(output, fit.bytes)
    return StaticResult(fit.bytes.size, fit.quality, fit.lossless)
  }

  private fun encodeOrFail(argb: IntArray, lossless: Boolean, quality: Int): ByteArray =
    WebpNative.encodeStatic(argb, Limits.CANVAS, Limits.CANVAS, lossless, quality)
      ?: throw EncoderException(ErrorCode.OUT_OF_MEMORY, "The WebP encoder failed.")
}
