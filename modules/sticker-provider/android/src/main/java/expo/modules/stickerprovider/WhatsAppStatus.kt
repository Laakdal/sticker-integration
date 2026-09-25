package expo.modules.stickerprovider

import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri

data class AppStatus(val installed: Boolean, val added: Boolean) {
  fun toMap() = mapOf("installed" to installed, "added" to added)
}

data class PackStatus(val consumer: AppStatus, val business: AppStatus) {
  fun toMap() = mapOf("consumer" to consumer.toMap(), "business" to business.toMap())
}

/** Mirrors WhatsApp's sample WhitelistCheck.java. */
object WhatsAppStatus {
  const val CONSUMER = "com.whatsapp"
  const val BUSINESS = "com.whatsapp.w4b"

  fun forPack(context: Context, authority: String, packId: String) = PackStatus(
    consumer = appStatus(context, CONSUMER, authority, packId),
    business = appStatus(context, BUSINESS, authority, packId),
  )

  private fun appStatus(context: Context, pkg: String, authority: String, packId: String): AppStatus {
    val installed = try {
      context.packageManager.getApplicationInfo(pkg, 0).enabled
    } catch (e: PackageManager.NameNotFoundException) {
      false
    }
    return AppStatus(installed, installed && isAdded(context, pkg, authority, packId))
  }

  private fun isAdded(context: Context, pkg: String, authority: String, packId: String): Boolean {
    val uri = Uri.Builder()
      .scheme("content")
      .authority("$pkg.provider.sticker_whitelist_check")
      .appendPath("is_whitelisted")
      .appendQueryParameter("authority", authority)
      .appendQueryParameter("identifier", packId)
      .build()
    return try {
      context.contentResolver.query(uri, null, null, null, null)?.use { c ->
        c.moveToFirst() && c.getInt(c.getColumnIndexOrThrow("result")) == 1
      } ?: false
    } catch (e: Exception) {
      false
    }
  }
}
