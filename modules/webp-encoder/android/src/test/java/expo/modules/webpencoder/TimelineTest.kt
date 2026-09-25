package expo.modules.webpencoder

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class TimelineTest {
  @Test fun effectiveDurationAppliesSpeedAndBoomerang() {
    assertEquals(4000.0, Timeline.effectiveDurationMs(1000.0, 5000.0, 1.0, Playback.NORMAL), 0.0)
    assertEquals(2000.0, Timeline.effectiveDurationMs(1000.0, 5000.0, 2.0, Playback.NORMAL), 0.0)
    assertEquals(8000.0, Timeline.effectiveDurationMs(1000.0, 5000.0, 0.5, Playback.NORMAL), 0.0)
    assertEquals(4000.0, Timeline.effectiveDurationMs(0.0, 3000.0, 0.75, Playback.REVERSE), 0.0)
    assertEquals(8000.0, Timeline.effectiveDurationMs(1000.0, 5000.0, 1.0, Playback.BOOMERANG), 0.0)
  }

  @Test fun sourceFpsIsRoundedToTwoDecimals() {
    assertEquals(10.0, Timeline.sourceFps(12, 1200), 0.0)
    assertEquals(29.97, Timeline.sourceFps(2997, 100_000), 0.0)
    assertEquals(0.0, Timeline.sourceFps(0, 1000), 0.0)
    assertEquals(0.0, Timeline.sourceFps(5, 0), 0.0)
  }

  @Test fun autoFpsIsTheRoundedSourceRateCappedAt20() {
    assertEquals(20, Timeline.resolveAutoFps(30.0))
    assertEquals(10, Timeline.resolveAutoFps(10.0))
    assertEquals(13, Timeline.resolveAutoFps(12.5))
    assertEquals(12, Timeline.resolveAutoFps(12.49))
    assertEquals(1, Timeline.resolveAutoFps(0.4))
    assertEquals(20, Timeline.resolveAutoFps(0.0))
    assertEquals(20, Timeline.resolveAutoFps(Double.NaN))
  }

  @Test fun tinyDelaysAreShownAt100ms() {
    assertEquals(100, Timeline.normalizeDelayMs(0))
    assertEquals(100, Timeline.normalizeDelayMs(10))
    assertEquals(11, Timeline.normalizeDelayMs(11))
    assertEquals(40, Timeline.normalizeDelayMs(40))
  }

  @Test fun frameIndexAtFindsTheFrameShownAtATime() {
    val starts = intArrayOf(0, 100, 250)
    assertEquals(0, Timeline.frameIndexAt(starts, -5.0))
    assertEquals(0, Timeline.frameIndexAt(starts, 99.9))
    assertEquals(1, Timeline.frameIndexAt(starts, 100.0))
    assertEquals(1, Timeline.frameIndexAt(starts, 249.0))
    assertEquals(2, Timeline.frameIndexAt(starts, 250.0))
    assertEquals(2, Timeline.frameIndexAt(starts, 10_000.0))
  }

  @Test fun sampleGridAtNormalSpeed() {
    val grid = Timeline.sampleGrid(0.0, 1000.0, 1.0, 10)
    assertEquals(10, grid.size)
    assertEquals((0 until 10).map { it * 100 }, grid.outputTimesMs)
    assertEquals((0 until 10).map { it * 100.0 }, grid.sourceTimesMs)
    assertEquals(1000, grid.durationMs)
  }

  @Test fun sampleGridAppliesSpeed() {
    val fast = Timeline.sampleGrid(1000.0, 3000.0, 2.0, 10)
    assertEquals(10, fast.size)
    assertEquals((0 until 10).map { 1000.0 + it * 200.0 }, fast.sourceTimesMs)
    assertEquals((0 until 10).map { it * 100 }, fast.outputTimesMs)
    assertEquals(1000, fast.durationMs)

    val slow = Timeline.sampleGrid(0.0, 1000.0, 0.5, 10)
    assertEquals(20, slow.size)
    assertEquals(50.0, slow.sourceTimesMs[1], 1e-9)
    assertEquals(2000, slow.durationMs)

    val threeQuarter = Timeline.sampleGrid(0.0, 1500.0, 0.75, 10)
    assertEquals(20, threeQuarter.size)
    assertEquals(75.0, threeQuarter.sourceTimesMs[1], 1e-9)
  }

  @Test fun sampleGridCoversAPartialLastFrame() {
    val grid = Timeline.sampleGrid(0.0, 1001.0, 1.0, 10)
    assertEquals(11, grid.size)
    assertEquals(1000, grid.outputTimesMs.last())
    assertEquals(1001, grid.durationMs)
  }

  @Test fun sampleGridAllowsAtMost300Frames() {
    assertEquals(300, Timeline.sampleGrid(0.0, 10_000.0, 1.0, 30).size)
    val e = assertThrows(EncoderException::class.java) { Timeline.sampleGrid(0.0, 11_000.0, 1.0, 30) }
    assertEquals(ErrorCode.INVALID_OPTIONS, e.code)
  }
}
