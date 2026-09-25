package expo.modules.webpencoder

import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.IOException

class ErrorMappingTest {
  @Test fun encoderExceptionsKeepTheirCodeAndMessage() {
    assertEquals(
      ErrorMapping.Rejection("TOO_LARGE", "big"),
      ErrorMapping.toRejection(EncoderException(ErrorCode.TOO_LARGE, "big")),
    )
  }

  @Test fun outOfMemoryErrorsBecomeOutOfMemory() {
    assertEquals("OUT_OF_MEMORY", ErrorMapping.toRejection(OutOfMemoryError()).code)
  }

  @Test fun ioAndUnexpectedErrorsBecomeIoError() {
    assertEquals(ErrorMapping.Rejection("IO_ERROR", "disk"), ErrorMapping.toRejection(IOException("disk")))
    assertEquals(ErrorMapping.Rejection("IO_ERROR", "odd"), ErrorMapping.toRejection(IllegalStateException("odd")))
  }

  @Test fun formatsKilobytesWithOneDecimal() {
    assertEquals("490.0 KB", kb(501_760))
  }
}
