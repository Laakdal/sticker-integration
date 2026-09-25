package expo.modules.webpencoder

import android.graphics.Bitmap
import com.bumptech.glide.gifdecoder.GifDecoder

/** Non-premultiplied ARGB copy of the bitmap (Bitmap.getPixels un-premultiplies). */
fun Bitmap.toPixels(): Pixels {
  val argb = IntArray(width * height)
  getPixels(argb, 0, width, 0, 0, width, height)
  return Pixels(argb, width, height)
}

/** Allocation-only BitmapProvider for Glide's standalone GIF decoder; frames are copied out immediately. */
class SimpleBitmapProvider : GifDecoder.BitmapProvider {
  override fun obtain(width: Int, height: Int, config: Bitmap.Config): Bitmap = Bitmap.createBitmap(width, height, config)
  override fun release(bitmap: Bitmap) = bitmap.recycle()
  override fun obtainByteArray(size: Int): ByteArray = ByteArray(size)
  override fun release(bytes: ByteArray) = Unit
  override fun obtainIntArray(size: Int): IntArray = IntArray(size)
  override fun release(array: IntArray) = Unit
}
