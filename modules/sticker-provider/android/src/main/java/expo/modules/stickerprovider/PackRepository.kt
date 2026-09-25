package expo.modules.stickerprovider

import java.io.File

/** Reads packs from `<filesDir>/packs/<id>/pack.json`, serving only complete, valid packs. */
class PackRepository(filesDir: File) {
  private val packsDir = File(filesDir, "packs")

  fun all(): List<ProviderPack> =
    packsDir.listFiles()
      ?.filter { it.isDirectory && !it.name.startsWith(".") }
      ?.mapNotNull { load(it.name) }
      ?.sortedBy { it.name }
      ?: emptyList()

  fun load(id: String): ProviderPack? {
    if (!isSafeName(id) || !ID_PATTERN.matches(id)) return null
    val dir = File(packsDir, id)
    // The JS writer writes pack.json.tmp completely before replacing pack.json, so while pack.json
    // is missing mid-replace the tmp file holds the full new contents.
    val json = File(dir, "pack.json").takeIf { it.isFile }
      ?: File(dir, "pack.json.tmp").takeIf { it.isFile }
      ?: return null
    val pack = PackJson.parse(json.readText()) ?: return null
    if (pack.id != id) return null
    return if (ProviderContract.isServable(pack) { resolveInPack(dir, it)?.isFile == true }) pack else null
  }

  fun file(id: String, name: String): File? {
    if (!isSafeName(name)) return null
    val pack = load(id) ?: return null
    if (!ProviderContract.isKnownFile(pack, name)) return null
    val f = resolveInPack(File(packsDir, id), name) ?: return null
    return if (f.isFile) f else null
  }

  /** Two independent layers: a plain-name check, then a canonical-path containment check. */
  private fun resolveInPack(dir: File, name: String): File? {
    if (!isSafeName(name)) return null
    val f = File(dir, name)
    return if (isContained(dir, f)) f else null
  }

  private fun isSafeName(name: String) =
    name.isNotEmpty() && name != "." && name != ".." && !name.contains('/') && !name.contains('\\')

  companion object {
    val ID_PATTERN = Regex("^[A-Za-z0-9_.-]{1,128}$")

    /** True when `file` resolves (following `..` and symlinks) to a path strictly inside `dir`. */
    internal fun isContained(dir: File, file: File): Boolean =
      try {
        file.canonicalPath.startsWith(dir.canonicalPath + File.separator)
      } catch (e: java.io.IOException) {
        false
      }
  }
}
