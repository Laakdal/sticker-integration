package expo.modules.stickerprovider

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PackJsonTest {
  @Test fun parsesAFullPack() {
    val pack = PackJson.parse(TestPacks.json(id = "p1", stickers = 3, website = "https://x.example"))!!
    assertEquals("p1", pack.id)
    assertEquals("My Pack", pack.name)
    assertEquals(3, pack.stickers.size)
    assertEquals(listOf("😀", "👍🏽"), pack.stickers[0].emojis)
    assertEquals("https://x.example", pack.publisherWebsite)
    assertNull(pack.publisherEmail)
    assertEquals(7, pack.imageDataVersion)
  }

  @Test fun returnsNullForInvalidJson() {
    assertNull(PackJson.parse("{nope"))
    assertNull(PackJson.parse("""{"id":"p1"}"""))
  }
}
