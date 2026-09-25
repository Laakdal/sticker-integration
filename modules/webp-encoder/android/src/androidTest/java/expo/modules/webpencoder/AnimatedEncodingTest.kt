package expo.modules.webpencoder

import android.net.Uri
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.Random
import java.util.UUID
import kotlin.math.roundToInt

@RunWith(AndroidJUnit4::class)
class AnimatedEncodingTest {
  private val engine = WebpEncoderEngine(Fixtures.context)
  private val dir = Fixtures.workDir("animated")
  private val red = 0xFFFF0000.toInt()
  private val green = 0xFF00FF00.toInt()
  private val blue = 0xFF0000FF.toInt()
  private val yellow = 0xFFFFFF00.toInt()

  @Before fun clearEncoderCache() {
    File(Fixtures.context.cacheDir, FrameCache.DIR_NAME).deleteRecursively()
  }

  private fun options(source: File, type: String, vararg overrides: Pair<String, Any?>): AnimatedOptions =
    AnimatedOptions.parse(
      mutableMapOf<String, Any?>(
        "source" to Uri.fromFile(source).toString(), "sourceType" to type,
        "crop" to mapOf("x" to 0.0, "y" to 0.0, "w" to 1.0, "h" to 1.0), "mode" to "fit",
        "trimStartMs" to 0.0, "trimEndMs" to 1200.0, "speed" to 1.0, "playback" to "normal",
        "rotation" to 0.0, "flipH" to false, "flipV" to false, "fps" to "auto", "priority" to "smooth",
        "outPath" to File(dir, "out-${UUID.randomUUID()}.webp").path, "jobId" to UUID.randomUUID().toString(),
      ).apply { putAll(overrides) },
    )

  private fun encode(
    o: AnimatedOptions,
    token: CancelToken = CancelToken(),
    backend: AnimBackend = NativeAnimBackend,
    onProgress: (Progress) -> Unit = {},
  ): AnimatedResult = engine.encodeAnimated(o, token, onProgress, backend)

  /** 512×512 animated WebP within 500 KB, every frame ≥ 8 ms, total ≤ 10 s, frame cache gone. */
  private fun assertValidSticker(o: AnimatedOptions, result: AnimatedResult): InspectFacts {
    val facts = engine.inspect(o.outPath)
    assertEquals("webp", facts.format)
    assertEquals(512, facts.width)
    assertEquals(512, facts.height)
    assertTrue(facts.animated)
    assertEquals(result.sizeBytes, facts.sizeBytes)
    assertTrue("size ${facts.sizeBytes}", facts.sizeBytes <= Limits.ANIMATED_MAX_BYTES)
    assertTrue("durations ${facts.frameDurationsMs}", facts.frameDurationsMs.all { it >= Limits.MIN_FRAME_MS })
    assertEquals(result.durationMs, facts.frameDurationsMs.sum())
    assertTrue(result.durationMs <= 10_000)
    assertTrue(facts.frameCount <= result.frames)
    assertEquals(emptyList<String>(), Fixtures.encoderCacheFiles())
    return facts
  }

  private fun assertFails(code: ErrorCode, block: () -> Unit) {
    val e = assertThrows(EncoderException::class.java) { block() }
    assertEquals(code, e.code)
  }

  private fun firstFrame(o: AnimatedOptions): IntArray = Fixtures.decodeFrames(File(o.outPath)).second.first().argb

  @Test fun transparentGifBecomesAValidTransparentSticker() {
    val o = options(Fixtures.asset("transparent.gif", dir), "gif")
    val result = encode(o)
    assertEquals(10, result.fps)
    assertEquals(1200, result.durationMs)
    assertEquals(12, result.frames)
    assertValidSticker(o, result)
    val frame = firstFrame(o)
    assertEquals("letterbox band is transparent", 0, TestPixels.alpha(frame[5 * 512 + 5]))
    TestPixels.assertColorNear(red, frame[256 * 512 + 96], 40, "red square") // source (60, 120) × 1.6, +64 px band
  }

  @Test fun effectiveDurationIsLimitedTo10Seconds() {
    val long = Fixtures.asset("long.gif", dir)
    assertFails(ErrorCode.INVALID_OPTIONS) { encode(options(long, "gif", "trimEndMs" to 15_000.0)) }
    assertFails(ErrorCode.INVALID_OPTIONS) { encode(options(long, "gif", "trimEndMs" to 6_000.0, "playback" to "boomerang")) }
    val o = options(long, "gif", "trimEndMs" to 15_000.0, "speed" to 2.0)
    val result = encode(o)
    assertEquals(7_500, result.durationMs)
    assertValidSticker(o, result)
  }

  @Test fun reverseAndBoomerangPlayFramesInTheRightOrder() {
    val sequence = Fixtures.asset("sequence.webp", dir)
    fun order(playback: String): List<Int> {
      val o = options(sequence, "webp", "trimEndMs" to 800.0, "fps" to 10.0, "playback" to playback)
      assertValidSticker(o, encode(o))
      return Fixtures.decodeFrames(File(o.outPath)).second.map { frame ->
        ((TestPixels.red(frame.argb[256 * 512 + 256]) - 16) / 32.0).roundToInt()
      }
    }
    assertEquals((0..7).toList(), order("normal"))
    assertEquals((7 downTo 0).toList(), order("reverse"))
    assertEquals(listOf(0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1), order("boomerang"))
  }

  @Test fun rotationAndFlipsAreAppliedBeforeFraming() {
    val source = Fixtures.asset("asymmetric.webp", dir)
    fun corners(vararg overrides: Pair<String, Any?>): List<Int> {
      val o = options(source, "webp", "mode" to "fill", "trimEndMs" to 1000.0, *overrides)
      assertValidSticker(o, encode(o))
      val f = firstFrame(o)
      return listOf(f[128 * 512 + 128], f[128 * 512 + 384], f[384 * 512 + 128], f[384 * 512 + 384]) // TL, TR, BL, BR
    }
    fun assertCorners(expected: List<Int>, actual: List<Int>, label: String) =
      expected.zip(actual).forEachIndexed { i, (e, a) -> TestPixels.assertColorNear(e, a, 40, "$label corner $i") }

    assertCorners(listOf(red, green, blue, yellow), corners(), "as is")
    assertCorners(listOf(blue, red, yellow, green), corners("rotation" to 90.0), "rotate 90")
    assertCorners(listOf(green, red, yellow, blue), corners("flipH" to true), "flip H")
    assertCorners(listOf(yellow, green, blue, red), corners("rotation" to 90.0, "flipV" to true), "rotate 90 + flip V")
  }

  @Test fun mp4IsEncodedAtAutoFps() {
    val file = Fixtures.colorsMp4(dir)
    val o = options(file, "mp4", "trimEndMs" to 2_000.0)
    val result = encode(o)
    assertEquals(20, result.fps)
    assertTrue("duration ${result.durationMs}", result.durationMs in 1_900..2_000)
    assertValidSticker(o, result)
  }

  @Test fun rotatedMp4IsFramedInDisplayOrientation() {
    val file = Fixtures.rotatedMp4(dir)
    val o = options(file, "mp4", "trimEndMs" to 300.0)
    assertValidSticker(o, encode(o))
    val frame = firstFrame(o) // displayed 240×320 → fit 384×512 at x = 64
    TestPixels.assertColorNear(Fixtures.MP4_COLORS[0], frame[60 * 512 + 256], 60, "top")
    TestPixels.assertColorNear(Fixtures.MP4_COLORS[2], frame[450 * 512 + 256], 60, "bottom")
    assertEquals("left band is transparent", 0, TestPixels.alpha(frame[256 * 512 + 10]))
  }

  @Test fun noisyMp4IsSizeFittedUnder500KBInBothPriorities() {
    val random = Random(3)
    val file = File(dir, "noise.mp4")
    Mp4Writer.write(file, 320, 240, fps = 30, frameCount = 30) { _, argb ->
      for (i in argb.indices) argb[i] = random.nextInt() or (0xFF shl 24)
    }
    val smooth = options(file, "mp4", "trimEndMs" to 1_000.0)
    val smoothResult = encode(smooth)
    assertValidSticker(smooth, smoothResult)
    val sharp = options(file, "mp4", "trimEndMs" to 1_000.0, "priority" to "sharp")
    val sharpResult = encode(sharp)
    assertValidSticker(sharp, sharpResult)
    assertTrue("sharp keeps quality ≥ 60 unless at 5 fps: $sharpResult", sharpResult.quality >= 60 || sharpResult.fps == 5)
    assertTrue("smooth keeps at least sharp's fps: $smoothResult vs $sharpResult", smoothResult.fps >= sharpResult.fps)
  }

  @Test fun fileUriWithSpacesIsAccepted() {
    val spaced = File(dir, "my stickers").apply { mkdirs() }
    val out = File(spaced, "out sticker.webp")
    val o = options(Fixtures.asset("transparent.gif", spaced), "gif", "outPath" to Uri.fromFile(out).toString())
    assertTrue(o.source.contains("%20"))
    assertValidSticker(o, encode(o))
    assertTrue(out.isFile)
  }

  @Test fun frameCacheIsDeletedAfterSuccessFailureAndCancel() {
    val gif = Fixtures.asset("transparent.gif", dir)

    encode(options(gif, "gif"))
    assertEquals("after success", emptyList<String>(), Fixtures.encoderCacheFiles())

    val tooLarge = options(gif, "gif")
    assertFails(ErrorCode.TOO_LARGE) { encode(tooLarge, backend = AnimBackend { _, _, _, _, _ -> ByteArray(600_000) }) }
    assertFalse(File(tooLarge.outPath).exists())
    assertEquals("after failure", emptyList<String>(), Fixtures.encoderCacheFiles())

    val cancelled = options(gif, "gif")
    val token = CancelToken()
    assertFails(ErrorCode.CANCELLED) { encode(cancelled, token) { if (it.stage == "encode") token.cancel() } }
    assertFalse(File(cancelled.outPath).exists())
    assertEquals("after cancel", emptyList<String>(), Fixtures.encoderCacheFiles())
  }
}
