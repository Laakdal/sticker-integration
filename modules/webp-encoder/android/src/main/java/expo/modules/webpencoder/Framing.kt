package expo.modules.webpencoder

import kotlin.math.min
import kotlin.math.roundToInt

data class PixelRect(val left: Int, val top: Int, val width: Int, val height: Int)

/** Copy [src] of the oriented frame, scale it to dstWidth × dstHeight and place it at (offsetX, offsetY) on a canvas × canvas square. */
data class FramePlan(
  val src: PixelRect,
  val dstWidth: Int,
  val dstHeight: Int,
  val offsetX: Int,
  val offsetY: Int,
  val canvas: Int,
)

object Framing {
  val FULL_CROP = CropRect(0.0, 0.0, 1.0, 1.0)

  fun rotatedSize(width: Int, height: Int, rotation: Int): Pair<Int, Int> =
    if (rotation == 90 || rotation == 270) height to width else width to height

  /**
   * [width] × [height] is the oriented (rotated/flipped) frame. FILL centre-crops the crop rect to a square and
   * scales it to the whole canvas; FIT scales the crop rect to fit inside the canvas, centred on transparency.
   * The aspect ratio is always preserved.
   */
  fun plan(width: Int, height: Int, crop: CropRect, mode: FrameMode, canvas: Int = Limits.CANVAS): FramePlan {
    val left = (crop.x * width).roundToInt().coerceIn(0, width - 1)
    val top = (crop.y * height).roundToInt().coerceIn(0, height - 1)
    val right = ((crop.x + crop.w) * width).roundToInt().coerceIn(left + 1, width)
    val bottom = ((crop.y + crop.h) * height).roundToInt().coerceIn(top + 1, height)
    val src = PixelRect(left, top, right - left, bottom - top)
    return when (mode) {
      FrameMode.FILL -> {
        val side = min(src.width, src.height)
        val square = PixelRect(src.left + (src.width - side) / 2, src.top + (src.height - side) / 2, side, side)
        FramePlan(square, canvas, canvas, 0, 0, canvas)
      }
      FrameMode.FIT -> {
        val scale = min(canvas.toDouble() / src.width, canvas.toDouble() / src.height)
        val w = (src.width * scale).roundToInt().coerceIn(1, canvas)
        val h = (src.height * scale).roundToInt().coerceIn(1, canvas)
        FramePlan(src, w, h, (canvas - w) / 2, (canvas - h) / 2, canvas)
      }
    }
  }
}
