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
    val json = File(dir, "pack.json")
    if (!json.isFile) return null
    val pack = PackJson.parse(json.readText()) ?: return null
    if (pack.id != id) return null
    return if (ProviderContract.isServable(pack) { isSafeName(it) && File(dir, it).isFile }) pack else null
  }

  fun file(id: String, name: String): File? {
    if (!isSafeName(name)) return null
    val pack = load(id) ?: return null
    if (!ProviderContract.isKnownFile(pack, name)) return null
    val f = File(File(packsDir, id), name)
    return if (f.isFile) f else null
  }

  private fun isSafeName(name: String) =
    name.isNotEmpty() && name != "." && name != ".." && !name.contains('/') && !name.contains('\\')

  companion object {
    val ID_PATTERN = Regex("^[A-Za-z0-9_.-]{1,128}$")
  }
}
