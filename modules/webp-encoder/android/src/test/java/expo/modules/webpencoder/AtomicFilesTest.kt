package expo.modules.webpencoder

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class AtomicFilesTest {
  @get:Rule val tmp = TemporaryFolder()

  @Test fun createsMissingParentFoldersAndLeavesNoTempFile() {
    val target = File(tmp.root, "packs/p1/s1.webp")
    AtomicFiles.write(target, byteArrayOf(1, 2, 3))
    assertArrayEquals(byteArrayOf(1, 2, 3), target.readBytes())
    assertEquals(listOf("s1.webp"), target.parentFile!!.list()!!.toList())
  }

  @Test fun replacesAnExistingFile() {
    val target = File(tmp.root, "s1.webp").apply { writeBytes(byteArrayOf(9, 9, 9, 9)) }
    AtomicFiles.write(target, byteArrayOf(4, 5))
    assertArrayEquals(byteArrayOf(4, 5), target.readBytes())
    assertEquals(listOf("s1.webp"), tmp.root.list()!!.toList())
  }
}
