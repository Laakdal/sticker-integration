package expo.modules.stickerprovider

import org.json.JSONObject

data class ProviderSticker(val file: String, val emojis: List<String>, val accessibilityText: String?)

data class ProviderPack(
  val id: String,
  val name: String,
  val publisher: String,
  val trayIcon: String,
  val animated: Boolean,
  val imageDataVersion: Int,
  val avoidCache: Boolean,
  val publisherEmail: String?,
  val publisherWebsite: String?,
  val privacyPolicyWebsite: String?,
  val licenseAgreementWebsite: String?,
  val stickers: List<ProviderSticker>,
)

/** Reads the app's pack.json (written by src/services/packSchema.ts). */
object PackJson {
  fun parse(text: String): ProviderPack? = try {
    val o = JSONObject(text)
    val arr = o.getJSONArray("stickers")
    val stickers = (0 until arr.length()).map { i ->
      val s = arr.getJSONObject(i)
      val emojis = s.getJSONArray("emojis")
      ProviderSticker(
        file = s.getString("file"),
        emojis = (0 until emojis.length()).map { emojis.getString(it) },
        accessibilityText = s.optStringOrNull("accessibilityText"),
      )
    }
    ProviderPack(
      id = o.getString("id"),
      name = o.getString("name"),
      publisher = o.getString("publisher"),
      trayIcon = o.getString("trayIcon"),
      animated = o.getBoolean("animated"),
      imageDataVersion = o.getInt("imageDataVersion"),
      avoidCache = o.getBoolean("avoidCache"),
      publisherEmail = o.optStringOrNull("publisherEmail"),
      publisherWebsite = o.optStringOrNull("publisherWebsite"),
      privacyPolicyWebsite = o.optStringOrNull("privacyPolicyWebsite"),
      licenseAgreementWebsite = o.optStringOrNull("licenseAgreementWebsite"),
      stickers = stickers,
    )
  } catch (e: Exception) {
    null
  }

  private fun JSONObject.optStringOrNull(key: String): String? =
    if (has(key) && !isNull(key)) getString(key) else null
}
