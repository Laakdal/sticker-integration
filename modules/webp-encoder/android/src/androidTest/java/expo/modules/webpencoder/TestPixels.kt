package expo.modules.webpencoder

import org.junit.Assert.assertTrue
import kotlin.math.abs

/** Channel helpers for Android ARGB ints. */
object TestPixels {
  fun alpha(c: Int) = c ushr 24
  fun red(c: Int) = (c shr 16) and 0xFF
  fun green(c: Int) = (c shr 8) and 0xFF
  fun blue(c: Int) = c and 0xFF

  fun hex(c: Int): String = String.format("#%08X", c)

  fun assertColorNear(expected: Int, actual: Int, tolerance: Int, label: String = "") {
    val diffs = listOf(
      alpha(expected) - alpha(actual),
      red(expected) - red(actual),
      green(expected) - green(actual),
      blue(expected) - blue(actual),
    ).map { abs(it) }
    assertTrue("$label: expected ${hex(expected)} ±$tolerance, got ${hex(actual)}", diffs.all { it <= tolerance })
  }
}
