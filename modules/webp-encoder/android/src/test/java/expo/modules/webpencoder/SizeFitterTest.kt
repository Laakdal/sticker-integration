package expo.modules.webpencoder

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class SizeFitterTest {
  /** Fake encoder: the output size is a pure function of (quality, fps). */
  private class FakeEncoder(private val size: (quality: Int, fps: Int) -> Int) {
    val calls = ArrayList<Pair<Int, Int>>()
    fun encode(quality: Int, fps: Int): ByteArray {
      calls += quality to fps
      return ByteArray(size(quality, fps))
    }
  }

  private val target = Limits.ANIMATED_TARGET_BYTES // 501 760
  private val fitter = SizeFitter()

  @Test fun fpsStepsOnlyGoDown() {
    assertEquals(listOf(20, 15, 12, 10, 8, 5), SizeFitter.fpsSteps(20))
    assertEquals(listOf(30, 15, 12, 10, 8, 5), SizeFitter.fpsSteps(30))
    assertEquals(listOf(15, 12, 10, 8, 5), SizeFitter.fpsSteps(15))
    assertEquals(listOf(12, 10, 8, 5), SizeFitter.fpsSteps(12))
    assertEquals(listOf(7, 5), SizeFitter.fpsSteps(7))
    assertEquals(listOf(5), SizeFitter.fpsSteps(5))
    assertEquals(listOf(3), SizeFitter.fpsSteps(3))
  }

  @Test fun quality95IsKeptWhenItFits() {
    val fake = FakeEncoder { _, _ -> 100_000 }
    val r = fitter.fit(Priority.SMOOTH, 20, fake::encode)
    assertEquals(95, r.quality)
    assertEquals(20, r.fps)
    assertEquals(listOf(95 to 20), fake.calls)
  }

  @Test fun smoothBinarySearchesQualityAtTheChosenFps() {
    val fake = FakeEncoder { q, _ -> q * 6_000 } // fits up to quality 83
    val r = fitter.fit(Priority.SMOOTH, 20, fake::encode)
    assertEquals(20, r.fps)
    assertTrue("quality ${r.quality}", r.quality in 80..83)
    assertTrue(r.bytes.size <= target)
    assertEquals(listOf(95 to 20, 25 to 20), fake.calls.take(2))
  }

  @Test fun smoothStepsFpsDownOnlyWhenQuality25IsTooLarge() {
    val fake = FakeEncoder { _, fps -> fps * 40_000 } // fits only at fps ≤ 12
    val r = fitter.fit(Priority.SMOOTH, 20, fake::encode)
    assertEquals(12, r.fps)
    assertEquals(95, r.quality)
    assertEquals(listOf(95 to 20, 25 to 20, 95 to 15, 25 to 15, 95 to 12), fake.calls)
  }

  @Test fun sharpDropsFpsBeforeGoingBelowQuality60() {
    val size = { q: Int, fps: Int -> q * fps * 420 }
    val smooth = fitter.fit(Priority.SMOOTH, 20, FakeEncoder(size)::encode)
    assertEquals(20, smooth.fps)
    assertTrue("smooth quality ${smooth.quality}", smooth.quality in 55..59)

    val sharpEncoder = FakeEncoder(size)
    val sharp = fitter.fit(Priority.SHARP, 20, sharpEncoder::encode)
    assertEquals(15, sharp.fps)
    assertTrue("sharp quality ${sharp.quality}", sharp.quality in 76..79)
    assertTrue(sharpEncoder.calls.all { it.first >= 60 })
  }

  @Test fun sharpLowersTheFloorTo25OnlyAt5Fps() {
    val fake = FakeEncoder { q, _ -> q * 12_000 } // fits up to quality 41 at any fps
    val r = fitter.fit(Priority.SHARP, 20, fake::encode)
    assertEquals(5, r.fps)
    assertTrue("quality ${r.quality}", r.quality in 37..41)
    assertTrue(fake.calls.filter { it.first < 60 }.all { it.second == 5 })
  }

  @Test fun failsWithTooLargeAtTheFloor() {
    for (priority in Priority.entries) {
      val fake = FakeEncoder { _, _ -> 600_000 }
      val e = assertThrows(EncoderException::class.java) { fitter.fit(priority, 20, fake::encode) }
      assertEquals(ErrorCode.TOO_LARGE, e.code)
      assertEquals(25 to 5, fake.calls.last())
    }
  }

  @Test fun theFloorResultIsAcceptedBetweenTargetAndLimit() {
    val r = fitter.fit(Priority.SMOOTH, 20) { _, _ -> ByteArray(505_000) }
    assertEquals(25, r.quality)
    assertEquals(5, r.fps)
    assertEquals(505_000, r.bytes.size)
  }

  @Test fun aChosenFpsBelow5IsTheOnlyStep() {
    val r = fitter.fit(Priority.SMOOTH, 3) { _, fps -> ByteArray(if (fps == 3) 100_000 else 900_000) }
    assertEquals(3, r.fps)
  }
}
