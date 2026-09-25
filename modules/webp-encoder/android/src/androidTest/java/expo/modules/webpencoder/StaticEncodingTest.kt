package expo.modules.webpencoder

import android.graphics.BitmapFactory
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class StaticEncodingTest {
  private val engine = WebpEncoderEngine(Fixtures.context)
  private val dir = Fixtures.workDir("static")
  private val red = 0xFFFF0000.toInt()

  @Test fun largeNoisyPngIsDownscaledAndFitUnder100KB() {
    val png = Fixtures.noisePng(dir, "large.png", 2400, 1600)
    val out = File(dir, "large.webp")
    val result = engine.encodeStatic(png.path, out.path)
    assertEquals(InspectFacts(512, 512, false, 1, emptyList(), result.sizeBytes, "webp"), engine.inspect(out.path))
    assertTrue("size ${result.sizeBytes}", result.sizeBytes <= Limits.STATIC_MAX_BYTES)
    assertFalse("noise cannot be lossless under 100 KB", result.lossless)
    assertTrue(result.quality in StaticFitter.MIN_QUALITY..StaticFitter.MAX_QUALITY)
  }

  @Test fun simpleArtworkStaysLossless() {
    val png = Fixtures.png(dir, "simple.png", 512, 512) { x, _ -> if (x < 256) red else 0 }
    val result = engine.encodeStatic(png.path, File(dir, "simple.webp").path)
    assertEquals(StaticResult(result.sizeBytes, 100, true), result)
  }

  @Test fun nonSquareInputIsFitNotStretched() {
    val png = Fixtures.png(dir, "wide.png", 400, 200) { _, _ -> red }
    val out = File(dir, "wide.webp")
    engine.encodeStatic(png.path, out.path)
    val bitmap = BitmapFactory.decodeFile(out.path)
    assertEquals(512, bitmap.width)
    assertEquals(512, bitmap.height)
    assertEquals("transparent band above the image", 0, TestPixels.alpha(bitmap.getPixel(256, 10)))
    TestPixels.assertColorNear(red, bitmap.getPixel(256, 256), 8, "centre")
  }

  @Test fun trayIconIsA96PngUnder50KB() {
    val png = Fixtures.noisePng(dir, "tray-source.png", 800, 600)
    val out = File(dir, "tray.png")
    val size = engine.makeTrayIcon(png.path, out.path)
    assertEquals(InspectFacts(96, 96, false, 1, emptyList(), size, "png"), engine.inspect(out.path))
    assertTrue("size $size", size <= Limits.TRAY_MAX_BYTES)
  }

  @Test fun inspectReportsFormatsAndTimings() {
    val sequence = engine.inspect(Fixtures.asset("sequence.webp", dir).path)
    assertEquals(InspectFacts(256, 256, true, 8, List(8) { 100 }, sequence.sizeBytes, "webp"), sequence)
    val gif = engine.inspect(Fixtures.asset("transparent.gif", dir).path)
    assertEquals(InspectFacts(320, 240, true, 12, List(12) { 100 }, gif.sizeBytes, "gif"), gif)
    val garbage = File(dir, "garbage.bin").apply { writeText("not an image") }
    assertEquals(ErrorCode.DECODE_FAILED, assertThrows(EncoderException::class.java) { engine.inspect(garbage.path) }.code)
    assertEquals(ErrorCode.IO_ERROR, assertThrows(EncoderException::class.java) { engine.inspect(File(dir, "missing.webp").path) }.code)
  }
}
