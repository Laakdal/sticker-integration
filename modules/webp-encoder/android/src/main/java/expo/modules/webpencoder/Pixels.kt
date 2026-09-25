package expo.modules.webpencoder

/** ARGB pixels (Android ints, not premultiplied), row-major, width × height. */
class Pixels(val argb: IntArray, val width: Int, val height: Int) {
  init {
    require(width > 0 && height > 0 && argb.size >= width * height) { "Bad pixel buffer ${width}×$height" }
  }
}

object PixelOps {
  /** Rotates clockwise by [rotation], then mirrors the rotated image (flipH: left↔right, flipV: top↔bottom). */
  fun transform(p: Pixels, rotation: Int, flipH: Boolean, flipV: Boolean): Pixels {
    if (rotation !in AnimatedOptions.ROTATIONS) invalidOptions("rotation must be 0, 90, 180 or 270 (got $rotation).")
    if (rotation == 0 && !flipH && !flipV) return p
    val sw = p.width
    val sh = p.height
    val (w, h) = Framing.rotatedSize(sw, sh, rotation)
    val out = IntArray(w * h)
    for (y in 0 until h) {
      val ry = if (flipV) h - 1 - y else y
      for (x in 0 until w) {
        val rx = if (flipH) w - 1 - x else x
        // (rx, ry) is a pixel of the rotated image; find it in the source.
        val sourceIndex = when (rotation) {
          0 -> ry * sw + rx
          90 -> (sh - 1 - rx) * sw + ry
          180 -> (sh - 1 - ry) * sw + (sw - 1 - rx)
          else -> rx * sw + (sw - 1 - ry)
        }
        out[y * w + x] = p.argb[sourceIndex]
      }
    }
    return Pixels(out, w, h)
  }

  fun crop(p: Pixels, rect: PixelRect): Pixels {
    if (rect.left == 0 && rect.top == 0 && rect.width == p.width && rect.height == p.height) return p
    val out = IntArray(rect.width * rect.height)
    for (y in 0 until rect.height) {
      System.arraycopy(p.argb, (rect.top + y) * p.width + rect.left, out, y * rect.width, rect.width)
    }
    return Pixels(out, rect.width, rect.height)
  }
}
