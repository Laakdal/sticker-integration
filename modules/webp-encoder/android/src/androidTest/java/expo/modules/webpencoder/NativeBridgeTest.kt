package expo.modules.webpencoder

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NativeBridgeTest {
  private val red = 0xFFFF0000.toInt()
  private val green = 0xFF00FF00.toInt()
  private val blue = 0xFF0000FF.toInt()

  private fun solid(width: Int, height: Int, color: Int) = IntArray(width * height) { color }

  @Test fun encodesAStillWebpLosslessAndLossy() {
    for (lossless in listOf(true, false)) {
      val bytes = WebpNative.encodeStatic(solid(64, 64, red), 64, 64, lossless, 80)
      assertNotNull(bytes)
      assertEquals("RIFF", String(bytes!!, 0, 4, Charsets.US_ASCII))
      assertEquals("WEBP", String(bytes, 8, 4, Charsets.US_ASCII))
      assertEquals(listOf(64, 64, 0, 1), WebpNative.demuxInfo(bytes)!!.toList())
    }
  }

  @Test fun rescalesOntoATransparentCanvas() {
    val out = WebpNative.rescaleOnto(solid(10, 5, green), 10, 5, 20, 10, 32, 32, 6, 11)!!
    assertEquals(32 * 32, out.size)
    assertEquals("outside the placed image", 0, out[0])
    assertEquals("inside the placed image", green, out[(11 + 5) * 32 + 16])
    assertEquals("first row below the image", 0, out[(11 + 10) * 32 + 16])
  }

  @Test fun rejectsAPlacementOutsideTheCanvas() {
    assertEquals(null, WebpNative.rescaleOnto(solid(10, 5, green), 10, 5, 20, 10, 16, 16, 0, 0))
  }

  @Test fun animatedRoundTripKeepsFramesAndTimings() {
    val colors = listOf(red, green, blue)
    val encoder = WebpNative.animEncoderNew(32, 32, 0, 0, true)
    assertNotEquals(0L, encoder)
    val bytes = try {
      colors.forEachIndexed { i, c ->
        assertEquals(true, WebpNative.animEncoderAdd(encoder, solid(32, 32, c), i * 100, 90, 4))
      }
      WebpNative.animEncoderAssemble(encoder, 300)!!
    } finally {
      WebpNative.animEncoderDelete(encoder)
    }
    assertEquals(listOf(32, 32, 1, 3, 100, 100, 100), WebpNative.demuxInfo(bytes)!!.toList())

    val decoder = WebpNative.animDecoderNew(bytes)
    assertNotEquals(0L, decoder)
    try {
      val frame = IntArray(32 * 32)
      val stamps = ArrayList<Int>()
      while (true) {
        val ts = WebpNative.animDecoderNext(decoder, frame)
        if (ts < 0) break
        TestPixels.assertColorNear(colors[stamps.size], frame[16 * 32 + 16], 24, "frame ${stamps.size}")
        stamps += ts
      }
      assertEquals(listOf(100, 200, 300), stamps)
    } finally {
      WebpNative.animDecoderDelete(decoder)
    }
  }

  @Test fun demuxRejectsNonWebpData() {
    assertEquals(null, WebpNative.demuxInfo("definitely not webp".toByteArray()))
    assertEquals(0L, WebpNative.animDecoderNew("definitely not webp".toByteArray()))
  }
}
