package expo.modules.webpencoder

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class OutputSequenceTest {
  private fun grid(times: List<Int>, durationMs: Int) = SampleGrid(times.map { it.toDouble() }, times, durationMs)
  private fun indices(frames: List<OutputFrame>) = frames.map { it.cacheIndex }
  private fun durations(frames: List<OutputFrame>) = frames.map { it.durationMs }

  @Test fun normalPlaybackUsesEveryCacheFrame() {
    val frames = OutputSequence.build(Timeline.sampleGrid(0.0, 1000.0, 1.0, 10), 10, 10, Playback.NORMAL)
    assertEquals((0 until 10).toList(), indices(frames))
    assertEquals(List(10) { 100 }, durations(frames))
  }

  @Test fun reverseKeepsEachFramesDuration() {
    val frames = OutputSequence.build(grid(listOf(0, 100, 150), 180), 10, 10, Playback.REVERSE)
    assertEquals(listOf(OutputFrame(2, 30), OutputFrame(1, 50), OutputFrame(0, 100)), frames)
  }

  @Test fun boomerangDoesNotRepeatTheEndpoints() {
    val frames = OutputSequence.build(Timeline.sampleGrid(0.0, 500.0, 1.0, 10), 10, 10, Playback.BOOMERANG)
    assertEquals(listOf(0, 1, 2, 3, 4, 3, 2, 1), indices(frames))
    assertEquals(800, frames.sumOf { it.durationMs })
  }

  @Test fun boomerangOfOneOrTwoFramesIsJustForward() {
    assertEquals(listOf(0, 1), indices(OutputSequence.build(grid(listOf(0, 100), 200), 10, 10, Playback.BOOMERANG)))
    assertEquals(
      listOf(OutputFrame(0, 50), OutputFrame(0, 50)),
      OutputSequence.build(grid(listOf(0), 100), 10, 10, Playback.BOOMERANG),
    )
  }

  @Test fun lowerFpsSubsamplesTheCache() {
    val cache = Timeline.sampleGrid(0.0, 1000.0, 1.0, 20) // 20 frames, 50 ms apart
    val ten = OutputSequence.build(cache, 20, 10, Playback.NORMAL)
    assertEquals((0 until 20 step 2).toList(), indices(ten))
    assertEquals(List(10) { 100 }, durations(ten))

    val fifteen = OutputSequence.build(cache, 20, 15, Playback.NORMAL)
    assertEquals(listOf(0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18), indices(fifteen))
    assertEquals(1000, fifteen.sumOf { it.durationMs })
    assertTrue(fifteen.all { it.durationMs in 66..67 })
  }

  @Test fun subsamplingAppliesBeforeReversing() {
    val cache = Timeline.sampleGrid(0.0, 1000.0, 1.0, 20)
    assertEquals((18 downTo 0 step 2).toList(), indices(OutputSequence.build(cache, 20, 10, Playback.REVERSE)))
  }

  @Test fun speedChangesDurationsNotFrameSpacing() {
    // 2 s of source at 2× speed → 1 s of output at 10 fps
    val frames = OutputSequence.build(Timeline.sampleGrid(0.0, 2000.0, 2.0, 10), 10, 10, Playback.NORMAL)
    assertEquals(10, frames.size)
    assertEquals(1000, frames.sumOf { it.durationMs })
  }

  @Test fun framesShorterThan8msAreMergedIntoNeighbours() {
    // leading 5 + 5 ms frames merge into the next frame; the trailing 8 ms frame is kept
    assertEquals(
      listOf(OutputFrame(2, 100), OutputFrame(3, 8)),
      OutputSequence.build(grid(listOf(0, 5, 10, 100), 108), 10, 10, Playback.NORMAL),
    )
    // a trailing 5 ms frame merges into the previous one (the lone 105 ms frame is then shown twice)
    assertEquals(
      listOf(OutputFrame(2, 52), OutputFrame(2, 53)),
      OutputSequence.build(grid(listOf(0, 5, 10, 100), 105), 10, 10, Playback.NORMAL),
    )
  }

  @Test fun aPartialLastSampleIsMerged() {
    val frames = OutputSequence.build(Timeline.sampleGrid(0.0, 1001.0, 1.0, 10), 10, 10, Playback.NORMAL)
    assertEquals(10, frames.size)
    assertEquals(101, frames.last().durationMs)
    assertEquals(1001, frames.sumOf { it.durationMs })
  }

  @Test fun anAllShortSequenceBecomesOne8msFrame() {
    assertEquals(listOf(OutputFrame(0, 8)), OutputSequence.mergeShortFrames(listOf(OutputFrame(0, 3), OutputFrame(1, 3))))
  }

  @Test fun aSingleFrameIsShownTwiceSoTheStickerStaysAnimated() {
    // one 40 ms sample (a trim shorter than one frame step at 20 fps)
    assertEquals(
      listOf(OutputFrame(0, 20), OutputFrame(0, 20)),
      OutputSequence.build(Timeline.sampleGrid(0.0, 40.0, 1.0, 20), 20, 20, Playback.NORMAL),
    )
    // an all-short sequence collapses to one 8 ms frame, which becomes 8 + 8 ms
    assertEquals(
      listOf(OutputFrame(0, 8), OutputFrame(0, 8)),
      OutputSequence.build(grid(listOf(0, 3), 6), 10, 10, Playback.REVERSE),
    )
  }

  @Test fun twoFrameDurationsKeepTheTotalAndThe8msMinimum() {
    assertEquals(500 to 500, OutputSequence.twoFrameDurations(1000))
    assertEquals(50 to 51, OutputSequence.twoFrameDurations(101))
    assertEquals(8 to 9, OutputSequence.twoFrameDurations(17))
    assertEquals(8 to 8, OutputSequence.twoFrameDurations(16))
    assertEquals(8 to 8, OutputSequence.twoFrameDurations(15))
    assertEquals(8 to 8, OutputSequence.twoFrameDurations(8))
  }

  @Test fun everyPassHasAtLeastTwoFrames() {
    for (trimMs in listOf(1.0, 7.0, 16.0, 40.0, 99.0, 150.0)) {
      val cache = Timeline.sampleGrid(0.0, trimMs, 1.0, 30)
      for (fps in listOf(30, 20, 10, 5)) {
        for (playback in Playback.entries) {
          val frames = OutputSequence.build(cache, 30, fps, playback)
          assertTrue("trim=$trimMs fps=$fps $playback: $frames", frames.size >= 2)
          assertTrue("trim=$trimMs fps=$fps $playback: $frames", frames.all { it.durationMs >= Limits.MIN_FRAME_MS })
        }
      }
    }
  }

  @Test fun everyFrameLastsAtLeast8ms() {
    for (fps in listOf(30, 20, 15, 12, 10, 8, 5)) {
      for (speed in AnimatedOptions.SPEEDS) {
        val cache = Timeline.sampleGrid(0.0, 3337.0, speed, 30)
        for (playback in Playback.entries) {
          val frames = OutputSequence.build(cache, 30, fps, playback)
          assertTrue("fps=$fps speed=$speed $playback", frames.all { it.durationMs >= Limits.MIN_FRAME_MS })
        }
      }
    }
  }
}
