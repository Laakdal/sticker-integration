package expo.modules.webpencoder

import android.graphics.Bitmap
import java.io.ByteArrayOutputStream
import java.io.File

/** `makeTrayIcon`: any still image (or the first frame of an animation) → 96×96 PNG ≤ 50 KB, aspect kept. */
class TrayIconMaker(private val rescaler: Rescaler) {
  fun make(input: File, output: File): Int {
    val image = StillDecoder.decode(input)
    val size = Limits.TRAY
    val argb = rescaler.rescaleOnto(image, Framing.plan(image.width, image.height, Framing.FULL_CROP, FrameMode.FIT, size))
    val bitmap = Bitmap.createBitmap(argb, size, size, Bitmap.Config.ARGB_8888)
    val bytes = try {
      ByteArrayOutputStream().use { out ->
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
        out.toByteArray()
      }
    } finally {
      bitmap.recycle()
    }
    if (bytes.size > Limits.TRAY_MAX_BYTES) {
      throw EncoderException(ErrorCode.TOO_LARGE, "Tray icon is ${kb(bytes.size.toLong())}; the limit is 50 KB.")
    }
    AtomicFiles.write(output, bytes)
    return bytes.size
  }
}
