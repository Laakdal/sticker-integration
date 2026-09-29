package expo.modules.stickerprovider

/** Which WhatsApp app(s) an add-to-WhatsApp request should open. */
sealed class LaunchTarget {
  /** Neither WhatsApp nor WhatsApp Business is installed. */
  object NotInstalled : LaunchTarget()

  /** Every installed WhatsApp already has the pack and no re-send was asked for. */
  object AlreadyAdded : LaunchTarget()

  /** Both apps should be offered, so the user picks one. */
  object Chooser : LaunchTarget()

  /** Exactly one app should receive the pack. */
  data class App(val packageName: String) : LaunchTarget()

  companion object {
    /** With [force], installed apps that already have the pack are targeted too, so it is sent again. */
    fun forStatus(status: PackStatus, force: Boolean): LaunchTarget {
      if (!status.consumer.installed && !status.business.installed) return NotInstalled
      val consumer = status.consumer.installed && (force || !status.consumer.added)
      val business = status.business.installed && (force || !status.business.added)
      return when {
        consumer && business -> Chooser
        consumer -> App(WhatsAppStatus.CONSUMER)
        business -> App(WhatsAppStatus.BUSINESS)
        else -> AlreadyAdded
      }
    }
  }
}
