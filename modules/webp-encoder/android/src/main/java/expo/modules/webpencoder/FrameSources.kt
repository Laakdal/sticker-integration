package expo.modules.webpencoder

import java.io.File

object FrameSources {
  fun open(file: File, type: SourceType): FrameSource {
    if (!file.isFile) throw EncoderException(ErrorCode.IO_ERROR, "Source file not found: ${file.path}")
    return when (type) {
      SourceType.GIF -> GifFrameSource.open(file)
      SourceType.WEBP -> WebpFrameSource.open(file)
      SourceType.MP4 -> Mp4FrameSource.open(file)
    }
  }
}
