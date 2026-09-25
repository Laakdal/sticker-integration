package expo.modules.webpencoder

import org.junit.Assert.assertEquals
import org.junit.Test

class FramingTest {
  @Test fun fitKeepsTheAspectRatioAndCentres() {
    // Spec §8: 270×200 → 512×379 with 66 px transparent bands.
    assertEquals(
      FramePlan(PixelRect(0, 0, 270, 200), 512, 379, 0, 66, 512),
      Framing.plan(270, 200, Framing.FULL_CROP, FrameMode.FIT),
    )
    assertEquals(
      FramePlan(PixelRect(0, 0, 200, 400), 256, 512, 128, 0, 512),
      Framing.plan(200, 400, Framing.FULL_CROP, FrameMode.FIT),
    )
  }

  @Test fun fillCentreCropsToASquare() {
    assertEquals(
      FramePlan(PixelRect(35, 0, 200, 200), 512, 512, 0, 0, 512),
      Framing.plan(270, 200, Framing.FULL_CROP, FrameMode.FILL),
    )
  }

  @Test fun cropRectIsNormalizedToPixels() {
    assertEquals(
      FramePlan(PixelRect(200, 200, 200, 200), 512, 512, 0, 0, 512),
      Framing.plan(400, 400, CropRect(0.5, 0.5, 0.5, 0.5), FrameMode.FILL),
    )
    assertEquals(
      FramePlan(PixelRect(100, 100, 500, 200), 512, 205, 0, 153, 512),
      Framing.plan(1000, 500, CropRect(0.1, 0.2, 0.5, 0.4), FrameMode.FIT),
    )
  }

  @Test fun planUsesTheGivenCanvas() {
    assertEquals(
      FramePlan(PixelRect(0, 0, 300, 150), 96, 48, 0, 24, 96),
      Framing.plan(300, 150, Framing.FULL_CROP, FrameMode.FIT, 96),
    )
  }

  @Test fun tinyCropsNeverCollapseToZeroPixels() {
    assertEquals(PixelRect(0, 0, 1, 1), Framing.plan(10, 10, CropRect(0.0, 0.0, 0.01, 0.01), FrameMode.FILL).src)
  }

  @Test fun quarterTurnsSwapWidthAndHeight() {
    assertEquals(200 to 300, Framing.rotatedSize(300, 200, 90))
    assertEquals(200 to 300, Framing.rotatedSize(300, 200, 270))
    assertEquals(300 to 200, Framing.rotatedSize(300, 200, 180))
  }
}
