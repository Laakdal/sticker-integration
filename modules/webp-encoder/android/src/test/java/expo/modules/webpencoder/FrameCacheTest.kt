package expo.modules.webpencoder

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class FrameCacheTest {
  @get:Rule val tmp = TemporaryFolder()

  private fun frame(seed: Int, width: Int, height: Int) = IntArray(width * height) { i -> (i * 31 + seed * 7919) or (0xFF shl 24) }
  private fun cacheDirFiles() = File(tmp.root, FrameCache.DIR_NAME).listFiles().orEmpty().toList()

  @Test fun roundTripsFramesInAnyOrder() {
    FrameCache.create(tmp.root, 3, 16, 8).use { cache ->
      val frames = (0 until 3).map { frame(it, 16, 8) }
      frames.forEach(cache::append)
      assertEquals(3, cache.size)
      assertArrayEquals(frames[2], cache.read(2))
      assertArrayEquals(frames[0], cache.read(0))
      assertArrayEquals(frames[1], cache.read(1))
      assertArrayEquals(frames[2], cache.read(2))
    }
  }

  @Test fun compressesFrames() {
    FrameCache.create(tmp.root, 3).use { cache ->
      repeat(3) { cache.append(IntArray(512 * 512) { 0xFF336699.toInt() }) }
      assertTrue("cache file is ${cache.file.length()} bytes", cache.file.length() < 100_000)
    }
  }

  @Test fun closingDeletesTheFile() {
    val cache = FrameCache.create(tmp.root, 1, 4, 4)
    cache.append(frame(1, 4, 4))
    val file = cache.file
    assertTrue(file.exists())
    cache.close()
    assertFalse(file.exists())
    assertEquals(emptyList<File>(), cacheDirFiles())
  }

  @Test fun refusesToStartWithoutEnoughFreeSpace() {
    val e = assertThrows(EncoderException::class.java) {
      FrameCache.create(tmp.root, 300, usableSpace = { 10L * 1024 * 1024 })
    }
    assertEquals(ErrorCode.INSUFFICIENT_STORAGE, e.code)
    assertEquals(emptyList<File>(), cacheDirFiles())
  }

  @Test fun budgetsOneRawFramePlusOverheadPerFrame() {
    assertEquals(300L * (512 * 512 * 4 + 1024) + 16L * 1024 * 1024, FrameCache.requiredBytes(300, 512, 512))
  }

  @Test fun rejectsFramesOfTheWrongSize() {
    FrameCache.create(tmp.root, 1, 4, 4).use { cache ->
      assertThrows(IllegalArgumentException::class.java) { cache.append(IntArray(15)) }
    }
  }

  @Test fun sweepStaleRemovesLeftoverFrameFilesButKeepsSourceCopies() {
    val dir = File(tmp.root, FrameCache.DIR_NAME).apply { mkdirs() }
    val stale = File(dir, "frames-old.bin").apply { writeText("leftover") }
    val source = File(dir, "source-x").apply { writeText("owned by a concurrent probe") }
    FrameCache.sweepStale(tmp.root)
    assertFalse(stale.exists())
    assertTrue(source.exists())
  }

  @Test fun sweepStaleToleratesAMissingDirectory() {
    FrameCache.sweepStale(File(tmp.root, "does-not-exist"))
  }

  @Test fun sweepAllRemovesEverythingInTheDirectory() {
    val dir = File(tmp.root, FrameCache.DIR_NAME).apply { mkdirs() }
    File(dir, "frames-old.bin").writeText("leftover")
    File(dir, "source-x").writeText("leftover copy")
    FrameCache.sweepAll(tmp.root)
    assertEquals(emptyList<File>(), cacheDirFiles())
  }

  @Test fun sweepAllToleratesAMissingDirectory() {
    FrameCache.sweepAll(File(tmp.root, "does-not-exist"))
  }
}
