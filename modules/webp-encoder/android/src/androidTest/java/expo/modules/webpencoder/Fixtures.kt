package expo.modules.webpencoder

import android.content.Context
import android.graphics.Bitmap
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import java.util.Random

object Fixtures {
  val context: Context get() = InstrumentationRegistry.getInstrumentation().targetContext

  /** A fresh, empty scratch folder under the app cache (outside the encoder's own cache folder). */
  fun workDir(name: String): File = File(context.cacheDir, "test-$name").apply {
    deleteRecursively()
    mkdirs()
  }

  /** Copies an androidTest asset (made by scripts/generate-encoder-fixtures.mjs) into [dir]. */
  fun asset(name: String, dir: File): File {
    val file = File(dir, name)
    InstrumentationRegistry.getInstrumentation().context.assets.open(name).use { input ->
      file.outputStream().use { input.copyTo(it) }
    }
    return file
  }

  /** Names of the files currently in the encoder's frame-cache folder. */
  fun encoderCacheFiles(): List<String> = File(context.cacheDir, FrameCache.DIR_NAME).listFiles().orEmpty().map { it.name }

  fun png(dir: File, name: String, width: Int, height: Int, pixel: (x: Int, y: Int) -> Int): File {
    val argb = IntArray(width * height) { i -> pixel(i % width, i / width) }
    val bitmap = Bitmap.createBitmap(argb, width, height, Bitmap.Config.ARGB_8888)
    val file = File(dir, name)
    file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    bitmap.recycle()
    return file
  }

  /** Opaque random noise: incompressible, so lossless WebP cannot fit and the lossy search must run. */
  fun noisePng(dir: File, name: String, width: Int, height: Int, seed: Long = 7): File {
    val random = Random(seed)
    return png(dir, name, width, height) { _, _ -> random.nextInt() or (0xFF shl 24) }
  }

  class DecodedFrame(val argb: IntArray, val endTimestampMs: Int)

  /** Decodes every full-canvas frame of an animated WebP with libwebp. */
  fun decodeFrames(file: File): Pair<WebpFacts, List<DecodedFrame>> {
    val bytes = file.readBytes()
    val facts = WebpFacts.from(WebpNative.demuxInfo(bytes)!!)
    val handle = WebpNative.animDecoderNew(bytes)
    check(handle != 0L) { "cannot decode ${file.name}" }
    try {
      val frames = ArrayList<DecodedFrame>()
      while (true) {
        val argb = IntArray(facts.width * facts.height)
        val end = WebpNative.animDecoderNext(handle, argb)
        if (end < 0) break
        frames += DecodedFrame(argb, end)
      }
      return facts to frames
    } finally {
      WebpNative.animDecoderDelete(handle)
    }
  }

  /** Red, green, blue, yellow, magenta, cyan — shared by DecodersTest and Task 9's AnimatedEncodingTest. */
  val MP4_COLORS = intArrayOf(
    0xFFFF0000.toInt(),
    0xFF00FF00.toInt(),
    0xFF0000FF.toInt(),
    0xFFFFFF00.toInt(),
    0xFFFF00FF.toInt(),
    0xFF00FFFF.toInt(),
  )

  /** 320×240, 30 fps, 60 frames; frame k is solid [MP4_COLORS]\[k / 10\] (2 s, 10 frames per colour). */
  fun colorsMp4(dir: File): File {
    val file = File(dir, "colors.mp4")
    Mp4Writer.write(file, 320, 240, fps = 30, frameCount = 60) { k, argb -> argb.fill(MP4_COLORS[k / 10]) }
    return file
  }

  /** 320×240, 30 fps, 10 frames, orientationHint 90; encoded left half (x < 160) red, right half blue. */
  fun rotatedMp4(dir: File): File {
    val file = File(dir, "rotated.mp4")
    Mp4Writer.write(file, 320, 240, fps = 30, frameCount = 10, orientationHint = 90) { _, argb ->
      for (i in argb.indices) argb[i] = if (i % 320 < 160) MP4_COLORS[0] else MP4_COLORS[2]
    }
    return file
  }
}
