package expo.modules.stickerprovider

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ProviderContractTest {
  private val pack = PackJson.parse(TestPacks.json(id = "p1", stickers = 3, animated = true))!!

  @Test fun packRowMatchesWhatsAppColumns() {
    val row = ProviderContract.packRow(pack)
    assertEquals(ProviderContract.PACK_COLUMNS.size, row.size)
    assertArrayEquals(
      arrayOf<Any?>("p1", "My Pack", "Me", "tray.png", "", "", "", "", "", "", "7", 0, 1),
      row,
    )
  }

  @Test fun stickerRowsJoinCompositeEmojisUnchanged() {
    val rows = ProviderContract.stickerRows(pack)
    assertEquals(3, rows.size)
    assertArrayEquals(arrayOf<Any?>("s0.webp", "😀,👍🏽", "sticker 0"), rows[0])
  }

  @Test fun servableRequiresThreeToThirtyStickersAndAllFiles() {
    assertTrue(ProviderContract.isServable(pack) { true })
    assertFalse(ProviderContract.isServable(pack) { it != "s1.webp" })
    assertFalse(ProviderContract.isServable(PackJson.parse(TestPacks.json(id = "p", stickers = 2))!!) { true })
    assertFalse(ProviderContract.isServable(PackJson.parse(TestPacks.json(id = "p", stickers = 31))!!) { true })
  }

  @Test fun knownFilesAreTrayAndStickersOnly() {
    assertTrue(ProviderContract.isKnownFile(pack, "tray.png"))
    assertTrue(ProviderContract.isKnownFile(pack, "s2.webp"))
    assertFalse(ProviderContract.isKnownFile(pack, "pack.json"))
  }
}
