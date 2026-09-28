package expo.modules.webpencoder

/**
 * Thin JNI surface over libwebp (src/main/cpp/webp_jni.cpp). Pixel arrays are Android ARGB ints
 * (0xAARRGGBB, not premultiplied) holding exactly width × height pixels. Failures return null, 0 or -1.
 */
object WebpNative {
  init {
    System.loadLibrary("webpencoder")
  }

  /** Encodes one still image. [quality] is ignored when [lossless] (lossless preset 6 is used). */
  external fun encodeStatic(argb: IntArray, width: Int, height: Int, lossless: Boolean, quality: Int): ByteArray?

  /**
   * Rescales the image to dstWidth × dstHeight with libwebp's area-averaging rescaler and places it at
   * (offsetX, offsetY) on a transparent canvasWidth × canvasHeight canvas.
   */
  external fun rescaleOnto(
    argb: IntArray,
    width: Int,
    height: Int,
    dstWidth: Int,
    dstHeight: Int,
    canvasWidth: Int,
    canvasHeight: Int,
    offsetX: Int,
    offsetY: Int,
  ): IntArray?

  /** WebPAnimEncoder that loops forever over a transparent background. Returns 0 on failure. */
  external fun animEncoderNew(width: Int, height: Int, kmin: Int, kmax: Int, allowMixed: Boolean): Long

  /** Adds a frame starting at [timestampMs], encoded lossy (with alpha) at [quality] and [method]. */
  external fun animEncoderAdd(handle: Long, argb: IntArray, timestampMs: Int, quality: Int, method: Int): Boolean

  /** Ends the animation at [endTimestampMs] (end of the last frame) and returns the WebP file bytes. */
  external fun animEncoderAssemble(handle: Long, endTimestampMs: Int): ByteArray?

  external fun animEncoderDelete(handle: Long)

  /**
   * Rebuilds a WebP whose first frame is the whole picture (a still, or a one-frame animation) as an animation
   * that shows that frame twice, for [firstMs] then [secondMs]; loops forever over a transparent background.
   */
  external fun animFromSingleFrame(data: ByteArray, firstMs: Int, secondMs: Int): ByteArray?

  /** WebPAnimDecoder over a complete (animated or still) WebP file. Returns 0 if it cannot be parsed. */
  external fun animDecoderNew(data: ByteArray): Long

  /** Decodes the next full-canvas frame into [out]; returns the frame's end timestamp (ms), or -1 when done/failed. */
  external fun animDecoderNext(handle: Long, out: IntArray): Int

  external fun animDecoderDelete(handle: Long)

  /** `[canvasWidth, canvasHeight, animated 0/1, frameCount, duration0, duration1, …]` (durations only when animated), or null. */
  external fun demuxInfo(data: ByteArray): IntArray?
}
