package expo.modules.webpencoder

/** Scales [src] to the plan's destination size and places it on a transparent canvas × canvas ARGB array. */
fun interface Rescaler {
  fun rescaleOnto(src: Pixels, plan: FramePlan): IntArray
}

/** Turns one decoded source frame into a framed canvas: rotate/flip → crop → rescale (spec §7 pipeline). */
class FrameRenderer(
  private val sourceWidth: Int,
  private val sourceHeight: Int,
  private val rotation: Int,
  private val flipH: Boolean,
  private val flipV: Boolean,
  crop: CropRect,
  mode: FrameMode,
  private val rescaler: Rescaler,
  canvas: Int = Limits.CANVAS,
) {
  val plan: FramePlan = Framing.rotatedSize(sourceWidth, sourceHeight, rotation).let { (w, h) ->
    Framing.plan(w, h, crop, mode, canvas)
  }

  fun render(frame: Pixels): IntArray {
    if (frame.width != sourceWidth || frame.height != sourceHeight) {
      throw EncoderException(
        ErrorCode.DECODE_FAILED,
        "Frame is ${frame.width}×${frame.height}, expected ${sourceWidth}×$sourceHeight.",
      )
    }
    val oriented = PixelOps.transform(frame, rotation, flipH, flipV)
    return rescaler.rescaleOnto(PixelOps.crop(oriented, plan.src), plan)
  }
}
