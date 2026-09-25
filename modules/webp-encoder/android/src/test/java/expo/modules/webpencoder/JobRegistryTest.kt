package expo.modules.webpencoder

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class JobRegistryTest {
  private val registry = JobRegistry()

  @Test fun cancelStopsARunningJob() {
    val token = registry.start("a")
    registry.cancel("a")
    val e = assertThrows(EncoderException::class.java) { token.throwIfCancelled() }
    assertEquals(ErrorCode.CANCELLED, e.code)
  }

  @Test fun aCancelThatArrivesBeforeTheJobStartsStillCancelsIt() {
    registry.cancel("b")
    assertTrue(registry.start("b").isCancelled)
  }

  @Test fun aLateCancelOfAFinishedJobDoesNotAffectTheNextJobWithThatId() {
    registry.start("c")
    registry.finish("c")
    registry.cancel("c")
    assertFalse(registry.start("c").isCancelled)
  }

  @Test fun rejectsADuplicateRunningJobId() {
    registry.start("d")
    val e = assertThrows(EncoderException::class.java) { registry.start("d") }
    assertEquals(ErrorCode.INVALID_OPTIONS, e.code)
  }

  @Test fun remembersOnlyRecentEarlyCancels() {
    for (i in 0 until 100) registry.cancel("x$i")
    assertTrue(registry.start("x99").isCancelled)
    assertFalse(registry.start("x0").isCancelled)
  }
}
