package expo.modules.stickerprovider

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

object TestPacks {
  fun json(id: String, stickers: Int, animated: Boolean = false, website: String? = null): String {
    val arr = JSONArray()
    for (i in 0 until stickers) {
      arr.put(
        JSONObject()
          .put("id", "s$i").put("file", "s$i.webp")
          .put("emojis", JSONArray().put("😀").put("👍🏽"))
          .put("accessibilityText", "sticker $i")
          .put("animated", animated).put("sizeBytes", 1000).put("editable", false),
      )
    }
    val o = JSONObject()
      .put("id", id).put("name", "My Pack").put("publisher", "Me").put("trayIcon", "tray.png")
      .put("animated", animated).put("stickers", arr).put("imageDataVersion", 7).put("avoidCache", false)
      .put("origin", "user").put("createdAt", "2026-09-25T00:00:00.000Z").put("updatedAt", "2026-09-25T00:00:00.000Z")
    if (website != null) o.put("publisherWebsite", website)
    return o.toString()
  }
}

class PackRepositoryTest {
  @get:Rule val tmp = TemporaryFolder()

  private fun writePack(id: String, stickers: Int = 3, withFiles: Boolean = true, folder: String = id) {
    val dir = File(tmp.root, "packs/$folder").apply { mkdirs() }
    File(dir, "pack.json").writeText(TestPacks.json(id, stickers))
    if (withFiles) {
      File(dir, "tray.png").writeText("png")
      for (i in 0 until stickers) File(dir, "s$i.webp").writeText("webp$i")
    }
  }

  private fun repo() = PackRepository(tmp.root)

  @Test fun listsOnlyServablePacks() {
    writePack("good")
    writePack("few", stickers = 2)
    writePack("nofiles", withFiles = false)
    writePack("other", folder = "mismatch")
    File(tmp.root, "packs/broken").mkdirs()
    File(tmp.root, "packs/broken/pack.json").writeText("{nope")
    assertEquals(listOf("good"), repo().all().map { it.id })
  }

  @Test fun servesListedFiles() {
    writePack("good")
    assertEquals("webp1", repo().file("good", "s1.webp")!!.readText())
    assertNotNull(repo().file("good", "tray.png"))
  }

  @Test fun refusesUnlistedFilesAndTraversal() {
    writePack("good")
    File(tmp.root, "secret.txt").writeText("secret")
    val r = repo()
    assertNull(r.file("good", "pack.json"))
    assertNull(r.file("good", "../secret.txt"))
    assertNull(r.file("..", "secret.txt"))
    assertNull(r.file(".", "packs"))
    assertNull(r.file("good/../good", "s1.webp"))
    assertNull(r.load(".."))
    assertNull(r.load("missing"))
  }
}
