package expo.modules.webpencoder

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class DecodersTest {
  private val dir = Fixtures.workDir("decoders")
  private val red = 0xFFFF0000.toInt()
  private val blue = 0xFF0000FF.toInt()

  private fun assertOpenFails(file: File, type: SourceType, code: ErrorCode) {
    val e = assertThrows(EncoderException::class.java) { FrameSources.open(file, type).close() }
    assertEquals(code, e.code)
  }

  @Test fun gifProbeAndFramesKeepTransparency() {
    GifFrameSource.open(Fixtures.asset("transparent.gif", dir)).use { gif ->
      assertEquals(ProbeResult(320, 240, 1200, 10.0, 12), ProbeResult.of(gif))
      assertEquals(List(12) { 100 }, gif.frameDurationsMs)
      val first = gif.frameAt(0.0)
      assertEquals("background is transparent", 0, TestPixels.alpha(first.argb[5 * 320 + 5]))
      TestPixels.assertColorNear(red, first.argb[120 * 320 + 60], 8, "square in frame 0")
      val last = gif.frameAt(1150.0) // frame 11: square at x 240..320
      assertEquals("square has moved away", 0, TestPixels.alpha(last.argb[120 * 320 + 60]))
      TestPixels.assertColorNear(red, last.argb[120 * 320 + 280], 8, "square in frame 11")
    }
  }

  @Test fun longGifProbe() {
    FrameSources.open(Fixtures.asset("long.gif", dir), SourceType.GIF).use { gif ->
      assertEquals(ProbeResult(160, 120, 15_000, 10.0, 150), ProbeResult.of(gif))
    }
  }

  @Test fun animatedWebpFramesDecodeInOrder() {
    FrameSources.open(Fixtures.asset("sequence.webp", dir), SourceType.WEBP).use { webp ->
      assertEquals(ProbeResult(256, 256, 800, 10.0, 8), ProbeResult.of(webp))
      for (k in 0 until 8) {
        val v = 16 + 32 * k
        val expected = (0xFF shl 24) or (v shl 16) or (v shl 8) or v
        TestPixels.assertColorNear(expected, webp.frameAt(k * 100 + 50.0).argb[128 * 256 + 128], 2, "frame $k")
      }
    }
  }

  @Test fun zeroDelayWebpFramesLast100ms() {
    FrameSources.open(Fixtures.asset("zero-delay.webp", dir), SourceType.WEBP).use { webp ->
      assertEquals(300, webp.durationMs)
      assertEquals(3, webp.frameCount)
      assertEquals(10.0, webp.fps, 0.0)
    }
  }

  @Test fun unreadableSourcesAreDecodeFailures() {
    val still = File(dir, "still.webp").apply { writeBytes(WebpNative.encodeStatic(IntArray(16 * 16) { red }, 16, 16, true, 100)!!) }
    assertOpenFails(still, SourceType.WEBP, ErrorCode.DECODE_FAILED)
    val garbage = File(dir, "garbage.bin").apply { writeText("definitely not media") }
    for (type in SourceType.entries) assertOpenFails(garbage, type, ErrorCode.DECODE_FAILED)
    assertOpenFails(File(dir, "missing.gif"), SourceType.GIF, ErrorCode.IO_ERROR)
  }

  @Test fun mp4ProbeAndFramesFollowTheTimeline() {
    val file = Fixtures.colorsMp4(dir)
    FrameSources.open(file, SourceType.MP4).use { mp4 ->
      assertEquals(320, mp4.width)
      assertEquals(240, mp4.height)
      assertEquals(60, mp4.frameCount)
      assertTrue("duration ${mp4.durationMs}", mp4.durationMs in 1_900..2_100)
      assertTrue("fps ${mp4.fps}", mp4.fps in 28.0..32.0)
      TestPixels.assertColorNear(Fixtures.MP4_COLORS[0], mp4.frameAt(0.0).argb[120 * 320 + 160], 40, "frame 0")
      TestPixels.assertColorNear(Fixtures.MP4_COLORS[1], mp4.frameAt(340.0).argb[120 * 320 + 160], 40, "frame 10")
      TestPixels.assertColorNear(Fixtures.MP4_COLORS[5], mp4.frameAt(1_710.0).argb[120 * 320 + 160], 40, "frame 51")
    }
  }

  @Test fun mp4FramesAreInDisplayOrientation() {
    val file = Fixtures.rotatedMp4(dir)
    FrameSources.open(file, SourceType.MP4).use { mp4 ->
      assertEquals(240, mp4.width)
      assertEquals(320, mp4.height)
      val frame = mp4.frameAt(0.0).argb
      // rotated 90° clockwise for display: the encoded left half (red) is now on top
      TestPixels.assertColorNear(red, frame[40 * 240 + 120], 40, "top")
      TestPixels.assertColorNear(blue, frame[280 * 240 + 120], 40, "bottom")
    }
  }
}
