package expo.modules.stickerprovider

/** Column names and row mapping from WhatsApp's official sticker sample (StickerContentProvider.java). */
object ProviderContract {
  const val METADATA = "metadata"
  const val STICKERS = "stickers"
  const val STICKERS_ASSET = "stickers_asset"

  val PACK_COLUMNS = arrayOf(
    "sticker_pack_identifier",
    "sticker_pack_name",
    "sticker_pack_publisher",
    "sticker_pack_icon",
    "android_play_store_link",
    "ios_app_download_link",
    "sticker_pack_publisher_email",
    "sticker_pack_publisher_website",
    "sticker_pack_privacy_policy_website",
    "sticker_pack_license_agreement_website",
    "image_data_version",
    "whatsapp_will_not_cache_stickers",
    "animated_sticker_pack",
  )

  val STICKER_COLUMNS = arrayOf("sticker_file_name", "sticker_emoji", "sticker_accessibility_text")

  fun packRow(p: ProviderPack): Array<Any?> = arrayOf(
    p.id,
    p.name,
    p.publisher,
    p.trayIcon,
    "",
    "",
    p.publisherEmail ?: "",
    p.publisherWebsite ?: "",
    p.privacyPolicyWebsite ?: "",
    p.licenseAgreementWebsite ?: "",
    p.imageDataVersion.toString(),
    if (p.avoidCache) 1 else 0,
    if (p.animated) 1 else 0,
  )

  fun stickerRows(p: ProviderPack): List<Array<Any?>> =
    p.stickers.map { arrayOf<Any?>(it.file, it.emojis.joinToString(","), it.accessibilityText ?: "") }

  fun isServable(p: ProviderPack, fileExists: (String) -> Boolean): Boolean =
    p.stickers.size in 3..30 && fileExists(p.trayIcon) && p.stickers.all { fileExists(it.file) }

  fun isKnownFile(p: ProviderPack, name: String): Boolean =
    name == p.trayIcon || p.stickers.any { it.file == name }
}
