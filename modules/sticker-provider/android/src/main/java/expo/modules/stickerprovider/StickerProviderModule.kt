package expo.modules.stickerprovider

import android.app.Activity
import android.content.Intent
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/** Optional third argument of addToWhatsApp; when omitted, the call is a plain add. */
class AddOptions : Record {
  /** Launch WhatsApp even when every installed WhatsApp already has the pack (Update). */
  @Field val force: Boolean = false
}

class StickerProviderModule : Module() {
  private var pendingAdd: Promise? = null

  private val context get() = requireNotNull(appContext.reactContext) { "React context is not available" }
  private val authority get() = StickerContentProvider.authorityFor(context.packageName)

  override fun definition() = ModuleDefinition {
    Name("StickerProvider")

    AsyncFunction("getWhatsAppStatus") { packId: String ->
      WhatsAppStatus.forPack(context, authority, packId).toMap()
    }

    AsyncFunction("addToWhatsApp") { packId: String, name: String, options: AddOptions?, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("NO_ACTIVITY", "No foreground activity to launch WhatsApp from.", null)
        return@AsyncFunction
      }
      if (pendingAdd != null) {
        promise.reject("BUSY", "An add-to-WhatsApp request is already in progress.", null)
        return@AsyncFunction
      }
      val target = LaunchTarget.forStatus(WhatsAppStatus.forPack(context, authority, packId), options?.force ?: false)
      if (target == LaunchTarget.NotInstalled) {
        promise.resolve(errorResult(REASON_NOT_INSTALLED, "WhatsApp is not installed."))
        return@AsyncFunction
      }
      if (target == LaunchTarget.AlreadyAdded) {
        promise.resolve(mapOf("status" to "added"))
        return@AsyncFunction
      }
      val intent = Intent(ACTION_ENABLE_STICKER_PACK).apply {
        putExtra(EXTRA_PACK_ID, packId)
        putExtra(EXTRA_AUTHORITY, authority)
        putExtra(EXTRA_PACK_NAME, name)
      }
      val launch = when (target) {
        is LaunchTarget.App -> intent.setPackage(target.packageName)
        else -> Intent.createChooser(intent, "Add to WhatsApp") // LaunchTarget.Chooser
      }
      pendingAdd = promise
      try {
        activity.startActivityForResult(launch, ADD_PACK_REQUEST)
      } catch (e: Exception) {
        // Any launch failure (not only ActivityNotFoundException, e.g. SecurityException) must release
        // the pending slot, or every later add is rejected with BUSY until the app restarts.
        pendingAdd = null
        promise.resolve(errorResult(REASON_LAUNCH_FAILED, "WhatsApp could not be opened."))
      }
    }.runOnQueue(Queues.MAIN)

    OnActivityResult { _, payload ->
      if (payload.requestCode != ADD_PACK_REQUEST) return@OnActivityResult
      val promise = pendingAdd ?: return@OnActivityResult
      pendingAdd = null
      val validationError = payload.data?.getStringExtra(EXTRA_VALIDATION_ERROR)
      promise.resolve(
        when {
          payload.resultCode == Activity.RESULT_OK -> mapOf("status" to "added")
          validationError != null -> errorResult(REASON_VALIDATION, validationError)
          else -> mapOf("status" to "cancelled")
        },
      )
    }
  }

  private fun errorResult(reason: String, message: String) =
    mapOf("status" to "error", "reason" to reason, "message" to message)

  companion object {
    private const val REASON_NOT_INSTALLED = "not_installed"
    private const val REASON_LAUNCH_FAILED = "launch_failed"
    private const val REASON_VALIDATION = "validation"
    private const val ADD_PACK_REQUEST = 200
    private const val ACTION_ENABLE_STICKER_PACK = "com.whatsapp.intent.action.ENABLE_STICKER_PACK"
    private const val EXTRA_PACK_ID = "sticker_pack_id"
    private const val EXTRA_AUTHORITY = "sticker_pack_authority"
    private const val EXTRA_PACK_NAME = "sticker_pack_name"
    private const val EXTRA_VALIDATION_ERROR = "validation_error"
  }
}
