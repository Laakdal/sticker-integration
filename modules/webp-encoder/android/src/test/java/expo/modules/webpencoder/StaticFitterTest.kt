package expo.modules.webpencoder

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class StaticFitterTest {
  @Test fun keepsLosslessWhenItFits() {
    val r = StaticFitter.fit(lossless = { ByteArray(90_000) }, lossy = { fail("lossy not needed"); ByteArray(0) })
    assertEquals(true, r.lossless)
    assertEquals(100, r.quality)
  }

  @Test fun usesQuality95WhenLossyFitsImmediately() {
    val r = StaticFitter.fit(lossless = { ByteArray(300_000) }, lossy = { q -> ByteArray(q * 1_000) })
    assertEquals(false, r.lossless)
    assertEquals(95, r.quality)
  }

  @Test fun searchesLossyQualityToStayWithin100KB() {
    val r = StaticFitter.fit(lossless = { ByteArray(300_000) }, lossy = { q -> ByteArray(q * 2_000) }) // fits up to 51
    assertEquals(false, r.lossless)
    assertTrue("quality ${r.quality}", r.quality in 49..51)
    assertTrue(r.bytes.size <= Limits.STATIC_MAX_BYTES)
  }

  @Test fun failsWhenEvenTheLowestQualityIsTooLarge() {
    val e = assertThrows(EncoderException::class.java) {
      StaticFitter.fit(lossless = { ByteArray(300_000) }, lossy = { ByteArray(200_000) })
    }
    assertEquals(ErrorCode.TOO_LARGE, e.code)
  }
}
