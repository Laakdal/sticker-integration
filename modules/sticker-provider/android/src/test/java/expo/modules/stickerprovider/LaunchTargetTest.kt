package expo.modules.stickerprovider

import org.junit.Assert.assertEquals
import org.junit.Test

class LaunchTargetTest {
  private val missing = AppStatus(installed = false, added = false)
  private val installed = AppStatus(installed = true, added = false)
  private val added = AppStatus(installed = true, added = true)

  private fun target(consumer: AppStatus, business: AppStatus, force: Boolean = false) =
    LaunchTarget.forStatus(PackStatus(consumer, business), force)

  @Test fun nothingInstalledIsReportedEvenWhenForced() {
    assertEquals(LaunchTarget.NotInstalled, target(missing, missing))
    assertEquals(LaunchTarget.NotInstalled, target(missing, missing, force = true))
  }

  @Test fun addTargetsOnlyAppsThatLackThePack() {
    assertEquals(LaunchTarget.Chooser, target(installed, installed))
    assertEquals(LaunchTarget.App(WhatsAppStatus.CONSUMER), target(installed, missing))
    assertEquals(LaunchTarget.App(WhatsAppStatus.BUSINESS), target(missing, installed))
    assertEquals(LaunchTarget.App(WhatsAppStatus.BUSINESS), target(added, installed))
    assertEquals(LaunchTarget.App(WhatsAppStatus.CONSUMER), target(installed, added))
  }

  @Test fun addSkipsLaunchWhenEveryInstalledAppHasThePack() {
    assertEquals(LaunchTarget.AlreadyAdded, target(added, added))
    assertEquals(LaunchTarget.AlreadyAdded, target(added, missing))
    assertEquals(LaunchTarget.AlreadyAdded, target(missing, added))
  }

  @Test fun forceTargetsEveryInstalledAppEvenIfAlreadyAdded() {
    assertEquals(LaunchTarget.Chooser, target(added, added, force = true))
    assertEquals(LaunchTarget.Chooser, target(added, installed, force = true))
    assertEquals(LaunchTarget.App(WhatsAppStatus.CONSUMER), target(added, missing, force = true))
    assertEquals(LaunchTarget.App(WhatsAppStatus.BUSINESS), target(missing, added, force = true))
  }
}
