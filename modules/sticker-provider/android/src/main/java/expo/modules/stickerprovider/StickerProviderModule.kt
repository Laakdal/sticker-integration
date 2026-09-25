package expo.modules.stickerprovider

import android.app.Activity
import android.content.Intent
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class StickerProviderModule : Module() {
  private var pendingAdd: Promise? = null

  private val context get() = requireNotNull(appContext.reactContext) { "React context is not available" }
  private val authority get() = StickerContentProvider.authorityFor(context.packageName)

  override fun definition() = ModuleDefinition {
    Name("StickerProvider")

    AsyncFunction("getWhatsAppStatus") { packId: String ->
      WhatsAppStatus.forPack(context, authority, packId).toMap()
    }

    AsyncFunction("addToWhatsApp") { packId: String, name: String, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("NO_ACTIVITY", "No foreground activity to launch WhatsApp from.", null)
        return@AsyncFunction
      }
      if (pendingAdd != null) {
        promise.reject("BUSY", "An add-to-WhatsApp request is already in progress.", null)
        return@AsyncFunction
      }
      val status = WhatsAppStatus.forPack(context, authority, packId)
      if (!status.consumer.installed && !status.business.installed) {
        promise.resolve(errorResult(REASON_NOT_INSTALLED, "WhatsApp is not installed."))
        return@AsyncFunction
      }
      val needConsumer = status.consumer.installed && !status.consumer.added
      val needBusiness = status.business.installed && !status.business.added
      if (!needConsumer && !needBusiness) {
        promise.resolve(mapOf("status" to "added"))
        return@AsyncFunction
      }
      val intent = Intent(ACTION_ENABLE_STICKER_PACK).apply {
        putExtra(EXTRA_PACK_ID, packId)
        putExtra(EXTRA_AUTHORITY, authority)
        putExtra(EXTRA_PACK_NAME, name)
      }
      val launch = when {
        needConsumer && needBusiness -> Intent.createChooser(intent, "Add to WhatsApp")
        needConsumer -> intent.setPackage(WhatsAppStatus.CONSUMER)
        else -> intent.setPackage(WhatsAppStatus.BUSINESS)
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
