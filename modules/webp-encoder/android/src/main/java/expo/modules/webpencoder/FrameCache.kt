package expo.modules.webpencoder

import java.io.Closeable
import java.io.File
import java.io.IOException
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.util.UUID
import java.util.zip.Deflater
import java.util.zip.Inflater

/**
 * Per-job temp file holding framed ARGB frames in forward order, each compressed with Deflater(BEST_SPEED)
 * (spec §7 "Frame cache"). Frames are read back one at a time. Always close it (`use {}`): closing deletes the file.
 */
class FrameCache private constructor(val file: File, val width: Int, val height: Int) : Closeable {
  private val raf = RandomAccessFile(file, "rw")
  private val offsets = ArrayList<Long>()
  private val lengths = ArrayList<Int>()
  private val deflater = Deflater(Deflater.BEST_SPEED)
  private val inflater = Inflater()
  private val raw = ByteArray(width * height * 4)
  private var packed = ByteArray(raw.size / 4 + 1024)
  private var end = 0L

  val size: Int get() = offsets.size

  fun append(argb: IntArray) {
    require(argb.size == width * height) { "Frame has ${argb.size} pixels, expected ${width * height}" }
    ByteBuffer.wrap(raw).asIntBuffer().put(argb)
    deflater.reset()
    deflater.setInput(raw)
    deflater.finish()
    var length = 0
    while (!deflater.finished()) {
      if (length == packed.size) packed = packed.copyOf(packed.size * 2)
      length += deflater.deflate(packed, length, packed.size - length)
    }
    raf.seek(end)
    raf.write(packed, 0, length)
    offsets += end
    lengths += length
    end += length
  }

  fun read(index: Int): IntArray {
    val length = lengths[index]
    if (packed.size < length) packed = ByteArray(length)
    raf.seek(offsets[index])
    raf.readFully(packed, 0, length)
    inflater.reset()
    inflater.setInput(packed, 0, length)
    var filled = 0
    while (filled < raw.size) {
      val n = inflater.inflate(raw, filled, raw.size - filled)
      if (n == 0 && (inflater.finished() || inflater.needsInput())) break
      filled += n
    }
    if (filled != raw.size) throw IOException("Frame cache entry $index is corrupt.")
    val out = IntArray(width * height)
    ByteBuffer.wrap(raw).asIntBuffer().get(out)
    return out
  }

  override fun close() {
    try {
      raf.close()
    } finally {
      deflater.end()
      inflater.end()
      file.delete()
    }
  }

  companion object {
    const val DIR_NAME = "webp-encoder"
    private const val FRAME_PREFIX = "frames-"
    private const val FRAME_SUFFIX = ".bin"
    private const val MB = 1024L * 1024
    private const val SAFETY_MARGIN_BYTES = 16 * MB

    /** Worst case (incompressible frames) plus a margin for the encoded output. */
    fun requiredBytes(frameCount: Int, width: Int, height: Int): Long =
      frameCount.toLong() * (width.toLong() * height * 4 + 1024) + SAFETY_MARGIN_BYTES

    fun create(
      cacheDir: File,
      frameCount: Int,
      width: Int = Limits.CANVAS,
      height: Int = Limits.CANVAS,
      usableSpace: (File) -> Long = { it.usableSpace },
    ): FrameCache {
      val dir = File(cacheDir, DIR_NAME)
      if (!dir.isDirectory && !dir.mkdirs()) throw IOException("Cannot create ${dir.path}")
      val needed = requiredBytes(frameCount, width, height)
      val available = usableSpace(dir)
      if (available < needed) {
        throw EncoderException(
          ErrorCode.INSUFFICIENT_STORAGE,
          "Encoding needs about ${needed / MB} MB of free space; only ${available / MB} MB is available.",
        )
      }
      return FrameCache(File(dir, "$FRAME_PREFIX${UUID.randomUUID()}$FRAME_SUFFIX"), width, height)
    }

    /**
     * Deletes leftover frame-cache files (a previous process was killed mid-encode) in `<cacheDir>/webp-encoder/`.
     * Never throws. Leaves `source-*` content:// copies alone: probe/inspect run on a separate executor and may
     * own one concurrently. Safe to call before creating this job's own cache: animated encodes run one at a
     * time, so no frame cache other than a stale one can exist.
     */
    fun sweepStale(cacheDir: File) {
      try {
        val dir = File(cacheDir, DIR_NAME)
        val files = dir.listFiles() ?: return
        for (f in files) {
          if (f.isFile && f.name.startsWith(FRAME_PREFIX) && f.name.endsWith(FRAME_SUFFIX)) f.delete()
        }
      } catch (_: Exception) {
        // Best-effort cleanup; a failed sweep must never fail the job.
      }
    }

    /** Deletes everything in `<cacheDir>/webp-encoder/` (frame caches and source copies). Never throws. */
    fun sweepAll(cacheDir: File) {
      try {
        val dir = File(cacheDir, DIR_NAME)
        val files = dir.listFiles() ?: return
        for (f in files) if (f.isFile) f.delete()
      } catch (_: Exception) {
        // Best-effort cleanup; a failed sweep must never fail module creation.
      }
    }
  }
}
