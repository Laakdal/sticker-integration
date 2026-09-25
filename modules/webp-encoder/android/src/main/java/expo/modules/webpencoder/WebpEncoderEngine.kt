package expo.modules.webpencoder

import android.content.Context
import android.net.Uri
import java.io.File
import java.util.UUID

/** Everything the module does, without Expo types (used by WebpEncoderModule and the instrumented tests). */
class WebpEncoderEngine(private val context: Context) {
  private val cacheDir: File get() = context.cacheDir

  fun encodeAnimated(
    options: AnimatedOptions,
    token: CancelToken,
    onProgress: (Progress) -> Unit,
    backend: AnimBackend = NativeAnimBackend,
  ): AnimatedResult {
    val output = SourcePaths.toFile(options.outPath)
    return withLocalFile(options.source) { file ->
      FrameSources.open(file, options.sourceType).use { source ->
        AnimatedEncoder(cacheDir, NativeRescaler, backend).encode(options, source, output, token, onProgress)
      }
    }
  }

  fun probe(source: String, sourceType: SourceType): ProbeResult =
    withLocalFile(source) { file -> FrameSources.open(file, sourceType).use { ProbeResult.of(it) } }

  fun encodeStatic(inputPath: String, outPath: String): StaticResult =
    withLocalFile(inputPath) { StaticEncoder(NativeRescaler).encode(it, SourcePaths.toFile(outPath)) }

  fun makeTrayIcon(inputPath: String, outPath: String): Int =
    withLocalFile(inputPath) { TrayIconMaker(NativeRescaler).make(it, SourcePaths.toFile(outPath)) }

  fun inspect(path: String): InspectFacts = withLocalFile(path) { Inspector.inspect(it) }

  /** Runs [block] on a local file: paths and file:// URIs directly; content:// URIs via a temp copy that is always deleted. */
  private fun <T> withLocalFile(source: String, block: (File) -> T): T {
    if (!SourcePaths.isContentUri(source)) return block(SourcePaths.toFile(source))
    val dir = File(cacheDir, FrameCache.DIR_NAME).apply { mkdirs() }
    val temp = File(dir, "source-${UUID.randomUUID()}")
    try {
      val input = context.contentResolver.openInputStream(Uri.parse(source))
        ?: throw EncoderException(ErrorCode.IO_ERROR, "Cannot open $source")
      input.use { stream -> temp.outputStream().use { stream.copyTo(it) } }
      return block(temp)
    } finally {
      temp.delete()
    }
  }
}
