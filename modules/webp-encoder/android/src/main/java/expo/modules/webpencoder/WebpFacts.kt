package expo.modules.webpencoder

import java.io.File

/** Parsed [WebpNative.demuxInfo] result. */
data class WebpFacts(val width: Int, val height: Int, val animated: Boolean, val frameCount: Int, val durationsMs: List<Int>) {
  companion object {
    fun from(info: IntArray): WebpFacts {
      if (info.size < 4) throw EncoderException(ErrorCode.DECODE_FAILED, "Unreadable WebP header.")
      return WebpFacts(info[0], info[1], info[2] == 1, info[3], info.drop(4))
    }
  }
}

object FileSniffer {
  fun isWebp(header: ByteArray): Boolean =
    header.size >= 12 && header.ascii(0, 4) == "RIFF" && header.ascii(8, 4) == "WEBP"

  fun readHeader(file: File, size: Int = 12): ByteArray = file.inputStream().use { input ->
    val buffer = ByteArray(size)
    var filled = 0
    while (filled < size) {
      val n = input.read(buffer, filled, size - filled)
      if (n < 0) break
      filled += n
    }
    buffer.copyOf(filled)
  }

  private fun ByteArray.ascii(offset: Int, length: Int) = String(this, offset, length, Charsets.ISO_8859_1)
}
