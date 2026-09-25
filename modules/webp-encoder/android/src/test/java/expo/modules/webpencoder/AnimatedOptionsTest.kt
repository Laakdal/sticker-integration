package expo.modules.webpencoder

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class AnimatedOptionsTest {
  private fun valid(): MutableMap<String, Any?> = mutableMapOf(
    "source" to "file:///data/in.gif",
    "sourceType" to "gif",
    "crop" to mapOf("x" to 0.0, "y" to 0.0, "w" to 1.0, "h" to 1.0),
    "mode" to "fit",
    "trimStartMs" to 0.0,
    "trimEndMs" to 3000.0,
    "speed" to 1.0,
    "playback" to "normal",
    "rotation" to 90.0,
    "flipH" to true,
    "flipV" to false,
    "fps" to "auto",
    "priority" to "smooth",
    "outPath" to "file:///data/out.webp",
    "jobId" to "job-1",
  )

  private fun opts(vararg overrides: Pair<String, Any?>) = valid().apply { putAll(overrides) }

  private fun assertInvalid(map: Map<String, Any?>, messagePart: String) {
    val e = assertThrows(EncoderException::class.java) { AnimatedOptions.parse(map) }
    assertEquals(ErrorCode.INVALID_OPTIONS, e.code)
    assertTrue("'${e.message}' should mention '$messagePart'", e.message!!.contains(messagePart))
  }

  @Test fun parsesValidOptions() {
    val o = AnimatedOptions.parse(valid())
    assertEquals(SourceType.GIF, o.sourceType)
    assertEquals(CropRect(0.0, 0.0, 1.0, 1.0), o.crop)
    assertEquals(FrameMode.FIT, o.mode)
    assertEquals(90, o.rotation)
    assertEquals(true, o.flipH)
    assertNull("auto fps", o.fps)
    assertEquals(Priority.SMOOTH, o.priority)
    assertEquals(3000.0, o.effectiveDurationMs, 0.0)
  }

  @Test fun acceptsIntegersAndManualFps() {
    val o = AnimatedOptions.parse(opts("fps" to 12, "rotation" to 270, "speed" to 0.75, "trimEndMs" to 3000))
    assertEquals(12, o.fps)
    assertEquals(270, o.rotation)
    assertEquals(4000.0, o.effectiveDurationMs, 0.0)
  }

  @Test fun rejectsUnsupportedEnumValues() {
    assertInvalid(opts("sourceType" to "png"), "sourceType")
    assertInvalid(opts("mode" to "stretch"), "mode")
    assertInvalid(opts("playback" to "pingpong"), "playback")
    assertInvalid(opts("priority" to "fast"), "priority")
  }

  @Test fun rejectsOutOfRangeNumbers() {
    assertInvalid(opts("speed" to 3.0), "speed")
    assertInvalid(opts("rotation" to 45.0), "rotation")
    assertInvalid(opts("fps" to 4.0), "fps")
    assertInvalid(opts("fps" to 31.0), "fps")
    assertInvalid(opts("fps" to 12.5), "fps")
    assertInvalid(opts("fps" to "fast"), "fps")
  }

  @Test fun rejectsCropsOutsideTheSource() {
    assertInvalid(opts("crop" to null), "crop")
    assertInvalid(opts("crop" to mapOf("x" to 0.0, "y" to 0.0, "w" to 0.0, "h" to 1.0)), "crop")
    assertInvalid(opts("crop" to mapOf("x" to 0.5, "y" to 0.0, "w" to 0.6, "h" to 1.0)), "crop")
    assertInvalid(opts("crop" to mapOf("x" to -0.1, "y" to 0.0, "w" to 0.5, "h" to 0.5)), "crop")
  }

  @Test fun rejectsBadTrimWindows() {
    assertInvalid(opts("trimEndMs" to 0.0), "trim")
    assertInvalid(opts("trimStartMs" to -1.0), "trim")
  }

  @Test fun rejectsMissingStrings() {
    assertInvalid(opts("outPath" to ""), "outPath")
    assertInvalid(valid().apply { remove("jobId") }, "jobId")
    assertInvalid(opts("flipV" to "no"), "flipV")
  }

  @Test fun enforcesTheTenSecondEffectiveDuration() {
    AnimatedOptions.parse(opts("trimEndMs" to 10_000.0))
    assertInvalid(opts("trimEndMs" to 10_001.0), "10 s")
    assertInvalid(opts("trimEndMs" to 6_000.0, "playback" to "boomerang"), "10 s")
    AnimatedOptions.parse(opts("trimEndMs" to 12_000.0, "speed" to 2.0))
    assertInvalid(opts("trimEndMs" to 5_001.0, "speed" to 0.5), "10 s")
  }
}
