package expo.modules.webpencoder

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class FrameRendererTest {
  @Test fun transformsThenCropsThenRescalesWithThePlan() {
    var seen: Pixels? = null
    var seenPlan: FramePlan? = null
    val rescaler = Rescaler { src, plan ->
      seen = src
      seenPlan = plan
      IntArray(plan.canvas * plan.canvas)
    }
    val renderer = FrameRenderer(3, 2, 90, false, false, Framing.FULL_CROP, FrameMode.FILL, rescaler, canvas = 4)
    val out = renderer.render(Pixels(intArrayOf(1, 2, 3, 4, 5, 6), 3, 2))
    // rotated 2×3 = 4 1 / 5 2 / 6 3; fill centre-crops the top 2×2 square ((3 − 2) / 2 = 0)
    assertEquals(listOf(4, 1, 5, 2), seen!!.argb.toList())
    assertEquals(FramePlan(PixelRect(0, 0, 2, 2), 4, 4, 0, 0, 4), seenPlan)
    assertEquals(16, out.size)
  }

  @Test fun rejectsFramesOfAnotherSize() {
    val renderer = FrameRenderer(3, 2, 0, false, false, Framing.FULL_CROP, FrameMode.FIT, { _, p -> IntArray(p.canvas * p.canvas) })
    val e = assertThrows(EncoderException::class.java) { renderer.render(Pixels(IntArray(4), 2, 2)) }
    assertEquals(ErrorCode.DECODE_FAILED, e.code)
  }
}
