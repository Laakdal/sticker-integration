package expo.modules.webpencoder

import java.io.File
import kotlin.math.min

/** Encodes [frames] (read one at a time from [cache]) into an animated WebP at [quality]. */
fun interface AnimBackend {
  fun encode(cache: FrameCache, frames: List<OutputFrame>, quality: Int, token: CancelToken, onFrame: (done: Int) -> Unit): ByteArray
}

/** Result of `encodeAnimated()` (spec §7). [frames] counts submitted frames; libwebp may merge identical neighbours. */
data class AnimatedResult(val sizeBytes: Int, val frames: Int, val durationMs: Int, val quality: Int, val fps: Int) {
  fun toMap(): Map<String, Any> =
    mapOf("sizeBytes" to sizeBytes, "frames" to frames, "durationMs" to durationMs, "quality" to quality, "fps" to fps)
}

/**
 * Spec §7 pipeline: decode the trim window once, sampled on the output timeline → rotate/flip → crop/fit to
 * 512×512 → frame cache → output sequence (speed, playback, fps) → encode → measure → retry with the size fitter.
 */
class AnimatedEncoder(
  private val cacheDir: File,
  private val rescaler: Rescaler,
  private val backend: AnimBackend,
  private val fitter: SizeFitter = SizeFitter(),
  private val usableSpace: (File) -> Long = { it.usableSpace },
) {
  fun encode(
    options: AnimatedOptions,
    source: FrameSource,
    output: File,
    token: CancelToken,
    onProgress: (Progress) -> Unit,
  ): AnimatedResult {
    token.throwIfCancelled()
    val progress = ProgressThrottle(emit = onProgress)
    val trimEndMs = min(options.trimEndMs, source.durationMs.toDouble())
    if (trimEndMs <= options.trimStartMs) {
      invalidOptions("The trim window starts at ${options.trimStartMs.toInt()} ms, after the end of the source (${source.durationMs} ms).")
    }
    val cacheFps = options.fps ?: Timeline.resolveAutoFps(source.fps)
    val grid = Timeline.sampleGrid(options.trimStartMs, trimEndMs, options.speed, cacheFps)
    val renderer = FrameRenderer(
      source.width, source.height, options.rotation, options.flipH, options.flipV, options.crop, options.mode, rescaler,
    )

    return FrameCache.create(cacheDir, grid.size, usableSpace = usableSpace).use { cache ->
      grid.sourceTimesMs.forEachIndexed { i, timeMs ->
        token.throwIfCancelled()
        cache.append(renderer.render(source.frameAt(timeMs)))
        progress.report(STAGE_DECODE, 0, (i + 1).toDouble() / grid.size)
      }

      var pass = 0
      val fit = fitter.fit(options.priority, cacheFps) { quality, fps ->
        token.throwIfCancelled()
        val thisPass = ++pass
        val frames = OutputSequence.build(grid, cacheFps, fps, options.playback)
        progress.report(STAGE_ENCODE, thisPass, 0.0)
        backend.encode(cache, frames, quality, token) { done ->
          progress.report(STAGE_ENCODE, thisPass, done.toDouble() / frames.size)
        }
      }

      token.throwIfCancelled()
      AtomicFiles.write(output, fit.bytes)
      val frames = OutputSequence.build(grid, cacheFps, fit.fps, options.playback)
      AnimatedResult(fit.bytes.size, frames.size, frames.sumOf { it.durationMs }, fit.quality, fit.fps)
    }
  }

  companion object {
    const val STAGE_DECODE = "decode"
    const val STAGE_ENCODE = "encode"
  }
}
