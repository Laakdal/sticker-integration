package expo.modules.webpencoder

import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Test

class PixelOpsTest {
  private val image = Pixels(intArrayOf(1, 2, 3, 4, 5, 6), 3, 2)

  private fun check(expected: List<Int>, width: Int, height: Int, actual: Pixels) {
    assertEquals(expected, actual.argb.toList())
    assertEquals(width, actual.width)
    assertEquals(height, actual.height)
  }

  @Test fun identityReturnsTheSameImage() {
    assertSame(image, PixelOps.transform(image, 0, false, false))
  }

  @Test fun rotatesClockwise() {
    check(listOf(4, 1, 5, 2, 6, 3), 2, 3, PixelOps.transform(image, 90, false, false))
    check(listOf(6, 5, 4, 3, 2, 1), 3, 2, PixelOps.transform(image, 180, false, false))
    check(listOf(3, 6, 2, 5, 1, 4), 2, 3, PixelOps.transform(image, 270, false, false))
  }

  @Test fun flipsMirrorTheImage() {
    check(listOf(3, 2, 1, 6, 5, 4), 3, 2, PixelOps.transform(image, 0, true, false))
    check(listOf(4, 5, 6, 1, 2, 3), 3, 2, PixelOps.transform(image, 0, false, true))
  }

  @Test fun flipsApplyAfterRotation() {
    // rotate 90 → 4 1 / 5 2 / 6 3, then mirror left↔right
    check(listOf(1, 4, 2, 5, 3, 6), 2, 3, PixelOps.transform(image, 90, true, false))
  }

  @Test fun rejectsOtherAngles() {
    val e = assertThrows(EncoderException::class.java) { PixelOps.transform(image, 45, false, false) }
    assertEquals(ErrorCode.INVALID_OPTIONS, e.code)
  }

  @Test fun cropsARectangle() {
    check(listOf(2, 3, 5, 6), 2, 2, PixelOps.crop(image, PixelRect(1, 0, 2, 2)))
    assertSame(image, PixelOps.crop(image, PixelRect(0, 0, 3, 2)))
  }
}
