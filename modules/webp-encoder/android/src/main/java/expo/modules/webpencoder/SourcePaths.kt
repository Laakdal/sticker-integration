package expo.modules.webpencoder

import java.io.File
import java.net.URI
import java.net.URISyntaxException

/** Turns what JS passes (absolute paths or file:// URIs from expo-file-system) into files. */
object SourcePaths {
  fun isContentUri(value: String): Boolean = value.startsWith("content://")

  fun toFile(pathOrUri: String): File = when {
    pathOrUri.startsWith("file://") -> File(decodeFileUri(pathOrUri))
    pathOrUri.startsWith("/") -> File(pathOrUri)
    else -> invalidOptions("Expected an absolute path or a file:// URI, got '$pathOrUri'.")
  }

  private fun decodeFileUri(uri: String): String = try {
    URI(uri).path ?: invalidOptions("Unreadable file URI '$uri'.")
  } catch (e: URISyntaxException) {
    uri.removePrefix("file://") // expo URIs are percent-encoded; tolerate raw spaces anyway
  }
}
