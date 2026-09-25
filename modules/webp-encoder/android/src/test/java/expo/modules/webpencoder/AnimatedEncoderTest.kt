package expo.modules.webpencoder

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

/** 4×2 source whose frame i (100 ms each) is filled with the value i in its low byte. */
private class FakeSource(
  override val frameCount: Int = 10,
  override val durationMs: Int = 1000,
  private val onFrame: (Double) -> Unit = {},
) : FrameSource {
  override val width = 4
  override val height = 2
  val requested = ArrayList<Double>()

  override fun frameAt(timeMs: Double): Pixels {
    onFrame(timeMs)
    requested += timeMs
    val index = (timeMs / (durationMs / frameCount)).toInt().coerceIn(0, frameCount - 1)
    return Pixels(IntArray(width * height) { 0xFF000000.toInt() or index }, width, height)
  }

  override fun close() = Unit
}

/** Nearest-neighbour stand-in for libwebp's rescaler. */
private val nearest = Rescaler { src, plan ->
  val out = IntArray(plan.canvas * plan.canvas)
  for (y in 0 until plan.dstHeight) {
    for (x in 0 until plan.dstWidth) {
      val sx = x * src.width / plan.dstWidth
      val sy = y * src.height / plan.dstHeight
      out[(plan.offsetY + y) * plan.canvas + plan.offsetX + x] = src.argb[sy * src.width + sx]
    }
  }
  out
}

/** Records which source frame each pass shows (centre pixel of each cached frame) and returns [size] bytes. */
private class FakeBackend(private val size: (quality: Int, frames: List<OutputFrame>) -> Int = { _, _ -> 50_000 }) : AnimBackend {
  val passes = ArrayList<List<Int>>()

  override fun encode(cache: FrameCache, frames: List<OutputFrame>, quality: Int, token: CancelToken, onFrame: (Int) -> Unit): ByteArray {
    val shown = ArrayList<Int>()
    frames.forEachIndexed { i, frame ->
      token.throwIfCancelled()
      shown += cache.read(frame.cacheIndex)[256 * 512 + 256] and 0xFF
      onFrame(i + 1)
    }
    passes += shown
    return ByteArray(size(quality, frames))
  }
}

class AnimatedEncoderTest {
  @get:Rule val tmp = TemporaryFolder()

  private val output get() = File(tmp.root, "out/sticker.webp")
  private fun cacheFiles() = File(tmp.root, FrameCache.DIR_NAME).listFiles().orEmpty().map { it.name }

  private fun options(vararg overrides: Pair<String, Any?>) = AnimatedOptions.parse(
    mutableMapOf<String, Any?>(
      "source" to "file:///src.gif", "sourceType" to "gif",
      "crop" to mapOf("x" to 0.0, "y" to 0.0, "w" to 1.0, "h" to 1.0), "mode" to "fit",
      "trimStartMs" to 0.0, "trimEndMs" to 1000.0, "speed" to 1.0, "playback" to "normal",
      "rotation" to 0.0, "flipH" to false, "flipV" to false, "fps" to "auto", "priority" to "smooth",
      "outPath" to "/out.webp", "jobId" to "job",
    ).apply { putAll(overrides) },
  )

  private fun encoder(backend: AnimBackend, space: (File) -> Long = { Long.MAX_VALUE }) =
    AnimatedEncoder(tmp.root, nearest, backend, usableSpace = space)

  private fun assertFails(code: ErrorCode, block: () -> Unit) {
    val e = assertThrows(EncoderException::class.java) { block() }
    assertEquals(code, e.code)
    assertFalse("no output after a failure", output.exists())
    assertEquals("frame cache deleted", emptyList<String>(), cacheFiles())
  }

  @Test fun encodesWithAutoFpsAndReportsTheResult() {
    val backend = FakeBackend()
    val progress = ArrayList<Progress>()
    val result = encoder(backend).encode(options(), FakeSource(), output, CancelToken()) { progress += it }
    assertEquals(AnimatedResult(sizeBytes = 50_000, frames = 10, durationMs = 1000, quality = 95, fps = 10), result)
    assertEquals(50_000L, output.length())
    assertEquals(listOf((0 until 10).toList()), backend.passes)
    assertEquals(Progress("decode", 0, 0.1), progress.first())
    assertEquals(Progress("encode", 1, 1.0), progress.last())
    assertEquals(emptyList<String>(), cacheFiles())
  }

  @Test fun reverseAndBoomerangAreOrderingsOfTheCache() {
    val reverse = FakeBackend()
    encoder(reverse).encode(options("playback" to "reverse"), FakeSource(), output, CancelToken()) {}
    assertEquals(listOf((9 downTo 0).toList()), reverse.passes)

    val boomerang = FakeBackend()
    val result = encoder(boomerang).encode(options("playback" to "boomerang", "trimEndMs" to 500.0), FakeSource(), output, CancelToken()) {}
    assertEquals(listOf(listOf(0, 1, 2, 3, 4, 3, 2, 1)), boomerang.passes)
    assertEquals(800, result.durationMs)
  }

  @Test fun manualFpsAndSpeedSampleTheOutputTimeline() {
    val fiveFps = FakeBackend()
    val slow = encoder(fiveFps).encode(options("fps" to 5.0), FakeSource(), output, CancelToken()) {}
    assertEquals(listOf(listOf(0, 2, 4, 6, 8)), fiveFps.passes)
    assertEquals(1000, slow.durationMs)

    val doubleSpeed = FakeBackend()
    val fast = encoder(doubleSpeed).encode(options("fps" to 10.0, "speed" to 2.0), FakeSource(), output, CancelToken()) {}
    assertEquals(listOf(listOf(0, 2, 4, 6, 8)), doubleSpeed.passes)
    assertEquals(500, fast.durationMs)
  }

  @Test fun sizeFittingStepsFpsWithoutDecodingAgain() {
    val source = FakeSource()
    val backend = FakeBackend { _, frames -> frames.size * 60_000 } // 10 frames = 600 KB, 8 frames = 480 KB
    val result = encoder(backend).encode(options(), source, output, CancelToken()) {}
    assertEquals(8, result.fps)
    assertEquals(8, result.frames)
    assertEquals(95, result.quality)
    assertEquals("source decoded once", 10, source.requested.size)
  }

  @Test fun tooLargeFailsAndCleansUp() {
    assertFails(ErrorCode.TOO_LARGE) {
      encoder(FakeBackend { _, _ -> 600_000 }).encode(options(), FakeSource(), output, CancelToken()) {}
    }
  }

  @Test fun cancellingWhileDecodingCleansUp() {
    val token = CancelToken()
    var calls = 0
    val source = FakeSource(onFrame = { if (++calls == 3) token.cancel() })
    assertFails(ErrorCode.CANCELLED) { encoder(FakeBackend()).encode(options(), source, output, token) {} }
    assertEquals(3, source.requested.size)
  }

  @Test fun cancellingWhileEncodingCleansUp() {
    val token = CancelToken()
    assertFails(ErrorCode.CANCELLED) {
      encoder(FakeBackend()).encode(options(), FakeSource(), output, token) { if (it.stage == "encode") token.cancel() }
    }
  }

  @Test fun insufficientStorageFailsBeforeDecoding() {
    val source = FakeSource()
    assertFails(ErrorCode.INSUFFICIENT_STORAGE) {
      encoder(FakeBackend(), space = { 0L }).encode(options(), source, output, CancelToken()) {}
    }
    assertEquals(0, source.requested.size)
  }

  @Test fun trimEndBeyondTheSourceIsClamped() {
    val result = encoder(FakeBackend()).encode(options("trimEndMs" to 1500.0), FakeSource(), output, CancelToken()) {}
    assertEquals(1000, result.durationMs)
    output.delete()
    assertFails(ErrorCode.INVALID_OPTIONS) {
      encoder(FakeBackend()).encode(options("trimStartMs" to 1000.0, "trimEndMs" to 1500.0), FakeSource(), output, CancelToken()) {}
    }
  }
}
