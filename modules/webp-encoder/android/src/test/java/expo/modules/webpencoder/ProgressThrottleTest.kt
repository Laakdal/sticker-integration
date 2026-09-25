package expo.modules.webpencoder

import org.junit.Assert.assertEquals
import org.junit.Test

class ProgressThrottleTest {
  @Test fun emitsStageChangesEndsAndStepsOfAtLeastTwoPercent() {
    val seen = ArrayList<Progress>()
    val throttle = ProgressThrottle { seen += it }
    throttle.report("decode", 0, 0.001)
    throttle.report("decode", 0, 0.01)
    throttle.report("decode", 0, 0.03)
    throttle.report("decode", 0, 1.0)
    throttle.report("encode", 1, 0.0)
    throttle.report("encode", 1, 0.5)
    throttle.report("encode", 2, 0.0)
    throttle.report("encode", 2, 1.7)
    assertEquals(
      listOf(
        Progress("decode", 0, 0.001),
        Progress("decode", 0, 0.03),
        Progress("decode", 0, 1.0),
        Progress("encode", 1, 0.0),
        Progress("encode", 1, 0.5),
        Progress("encode", 2, 0.0),
        Progress("encode", 2, 1.0),
      ),
      seen,
    )
  }
}
