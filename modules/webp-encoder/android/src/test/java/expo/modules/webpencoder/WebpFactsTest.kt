package expo.modules.webpencoder

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class WebpFactsTest {
  @Test fun parsesStillInfo() {
    assertEquals(WebpFacts(512, 512, false, 1, emptyList()), WebpFacts.from(intArrayOf(512, 512, 0, 1)))
  }

  @Test fun parsesAnimatedInfo() {
    assertEquals(WebpFacts(256, 256, true, 3, listOf(100, 80, 40)), WebpFacts.from(intArrayOf(256, 256, 1, 3, 100, 80, 40)))
  }

  @Test fun rejectsTruncatedInfo() {
    assertEquals(ErrorCode.DECODE_FAILED, assertThrows(EncoderException::class.java) { WebpFacts.from(intArrayOf(1, 2)) }.code)
  }

  @Test fun sniffsWebpHeaders() {
    assertTrue(FileSniffer.isWebp("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ".toByteArray(Charsets.ISO_8859_1)))
    assertFalse(FileSniffer.isWebp(byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0)))
    assertFalse(FileSniffer.isWebp("RIFF".toByteArray()))
  }
}
