package expo.modules.webpencoder

/** libwebp's area-averaging WebPPictureRescale (spec §7 "Framing"). */
object NativeRescaler : Rescaler {
  override fun rescaleOnto(src: Pixels, plan: FramePlan): IntArray =
    WebpNative.rescaleOnto(
      src.argb, src.width, src.height, plan.dstWidth, plan.dstHeight, plan.canvas, plan.canvas, plan.offsetX, plan.offsetY,
    ) ?: throw EncoderException(ErrorCode.OUT_OF_MEMORY, "Could not scale a ${src.width}×${src.height} frame.")
}

/**
 * WebPAnimEncoder with the spec §7 settings: lossy with alpha, mixed lossy/lossless frames, method 6, loop forever.
 * Key-frame insertion is disabled (kmax = 0): stickers always play from frame 0, so key-frames would only cost
 * bytes and encode time.
 */
object NativeAnimBackend : AnimBackend {
  const val KMIN = 0
  const val KMAX = 0
  const val METHOD = 6

  override fun encode(
    cache: FrameCache,
    frames: List<OutputFrame>,
    quality: Int,
    token: CancelToken,
    onFrame: (done: Int) -> Unit,
  ): ByteArray {
    val handle = WebpNative.animEncoderNew(cache.width, cache.height, KMIN, KMAX, true)
    if (handle == 0L) throw EncoderException(ErrorCode.OUT_OF_MEMORY, "Could not start the WebP animation encoder.")
    try {
      var timestampMs = 0
      frames.forEachIndexed { i, frame ->
        token.throwIfCancelled()
        if (!WebpNative.animEncoderAdd(handle, cache.read(frame.cacheIndex), timestampMs, quality, METHOD)) {
          throw EncoderException(ErrorCode.OUT_OF_MEMORY, "The WebP encoder failed on frame $i.")
        }
        timestampMs += frame.durationMs
        onFrame(i + 1)
      }
      val bytes = WebpNative.animEncoderAssemble(handle, timestampMs)
        ?: throw EncoderException(ErrorCode.OUT_OF_MEMORY, "Could not assemble the animated WebP.")
      return keepTwoFrames(bytes, timestampMs)
    } finally {
      WebpNative.animEncoderDelete(handle)
    }
  }

  /**
   * libwebp drops frames identical to the previous one (extending its duration) and turns a one-frame animation
   * into a still, so a motionless clip comes out as a still, which WhatsApp rejects in an animated pack. Such output
   * is rebuilt as the same picture shown twice, splitting [totalMs] as [OutputSequence.twoFrameDurations].
   */
  private fun keepTwoFrames(bytes: ByteArray, totalMs: Int): ByteArray {
    val info = WebpNative.demuxInfo(bytes)
      ?: throw EncoderException(ErrorCode.OUT_OF_MEMORY, "Could not read back the assembled WebP.")
    val facts = WebpFacts.from(info)
    if (facts.animated && facts.frameCount >= 2) return bytes
    val (first, second) = OutputSequence.twoFrameDurations(totalMs)
    return WebpNative.animFromSingleFrame(bytes, first, second)
      ?: throw EncoderException(ErrorCode.OUT_OF_MEMORY, "Could not rebuild the one-frame WebP as an animation.")
  }
}
