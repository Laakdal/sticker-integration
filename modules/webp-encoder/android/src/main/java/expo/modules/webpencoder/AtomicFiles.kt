package expo.modules.webpencoder

import java.io.File
import java.io.FileOutputStream
import java.io.IOException

object AtomicFiles {
  /** Writes `<name>.tmp` next to [target], then renames it over [target]; creates missing parent folders. */
  fun write(target: File, bytes: ByteArray) {
    val parent = target.absoluteFile.parentFile ?: throw IOException("No parent folder for ${target.path}")
    if (!parent.isDirectory && !parent.mkdirs()) throw IOException("Cannot create ${parent.path}")
    val tmp = File(parent, "${target.name}.tmp")
    try {
      FileOutputStream(tmp).use { out ->
        out.write(bytes)
        out.fd.sync()
      }
      if (!tmp.renameTo(target)) {
        // Some file systems (and Windows JVMs in unit tests) refuse to rename over an existing file.
        target.delete()
        if (!tmp.renameTo(target)) throw IOException("Cannot move ${tmp.path} to ${target.path}")
      }
    } finally {
      tmp.delete() // no-op after a successful rename
    }
  }
}
