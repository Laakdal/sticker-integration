package expo.modules.webpencoder

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class SourcePathsTest {
  @Test fun acceptsAbsolutePaths() {
    assertEquals(File("/data/a.gif"), SourcePaths.toFile("/data/a.gif"))
  }

  @Test fun decodesPercentEncodedFileUris() {
    assertEquals(File("/data/my stickers/a.gif"), SourcePaths.toFile("file:///data/my%20stickers/a.gif"))
  }

  @Test fun toleratesUnencodedFileUris() {
    assertEquals(File("/data/my stickers/a.gif"), SourcePaths.toFile("file:///data/my stickers/a.gif"))
  }

  @Test fun rejectsRelativePathsAndOtherSchemes() {
    for (bad in listOf("a.gif", "https://example.com/a.gif", "content://media/external/images/1")) {
      val e = assertThrows(EncoderException::class.java) { SourcePaths.toFile(bad) }
      assertEquals(ErrorCode.INVALID_OPTIONS, e.code)
    }
  }

  @Test fun recognisesContentUris() {
    assertTrue(SourcePaths.isContentUri("content://media/external/images/1"))
    assertFalse(SourcePaths.isContentUri("file:///data/a.gif"))
  }
}
