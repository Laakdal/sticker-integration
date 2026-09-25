package expo.modules.webpencoder

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class WebpEncoderModule : Module() {
  private val jobs = JobRegistry()

  // Encodes run one at a time on their own thread; probe/inspect on another so imports never wait behind an encode.
  // Neither uses Expo's shared AsyncFunction queue (a single thread), which a minutes-long encode would block.
  private val encodeExecutor: ExecutorService = Executors.newSingleThreadExecutor { r -> Thread(r, "webp-encoder-encode") }
  private val ioExecutor: ExecutorService = Executors.newSingleThreadExecutor { r -> Thread(r, "webp-encoder-io") }

  private val engine by lazy {
    WebpEncoderEngine(requireNotNull(appContext.reactContext) { "React context is not available" }.applicationContext)
  }

  override fun definition() = ModuleDefinition {
    Name("WebpEncoder")

    Events(PROGRESS_EVENT)

    AsyncFunction("encodeAnimated") { raw: Map<String, Any?>, promise: Promise ->
      val options = try {
        AnimatedOptions.parse(raw)
      } catch (e: EncoderException) {
        reject(promise, e)
        return@AsyncFunction
      }
      val token = try {
        jobs.start(options.jobId)
      } catch (e: EncoderException) {
        reject(promise, e)
        return@AsyncFunction
      }
      submit(encodeExecutor, promise, onDone = { jobs.finish(options.jobId) }) {
        engine.encodeAnimated(options, token, { p ->
          this@WebpEncoderModule.sendEvent(
            PROGRESS_EVENT,
            mapOf("jobId" to options.jobId, "stage" to p.stage, "pass" to p.pass, "fraction" to p.fraction),
          )
        }).toMap()
      }
    }

    AsyncFunction("probe") { source: String, sourceType: String, promise: Promise ->
      submit(ioExecutor, promise) { engine.probe(source, parseJsEnum<SourceType>("sourceType", sourceType)).toMap() }
    }

    AsyncFunction("encodeStatic") { inputPath: String, outPath: String, promise: Promise ->
      submit(encodeExecutor, promise) { engine.encodeStatic(inputPath, outPath).toMap() }
    }

    AsyncFunction("makeTrayIcon") { inputPath: String, outPath: String, promise: Promise ->
      submit(encodeExecutor, promise) { mapOf("sizeBytes" to engine.makeTrayIcon(inputPath, outPath)) }
    }

    AsyncFunction("inspect") { path: String, promise: Promise ->
      submit(ioExecutor, promise) { engine.inspect(path).toMap() }
    }

    Function("cancel") { jobId: String ->
      jobs.cancel(jobId)
    }

    OnDestroy {
      encodeExecutor.shutdownNow()
      ioExecutor.shutdownNow()
    }
  }

  // onDone must run before the promise settles, so a caller that reuses a jobId right after the promise
  // settles is never rejected with "already running" by a jobs.finish() that hasn't happened yet.
  private fun submit(executor: ExecutorService, promise: Promise, onDone: () -> Unit = {}, work: () -> Any?) {
    executor.execute {
      val outcome = runCatching(work)
      onDone()
      outcome.fold({ promise.resolve(it) }, { reject(promise, it) })
    }
  }

  private fun reject(promise: Promise, error: Throwable) {
    val rejection = ErrorMapping.toRejection(error)
    promise.reject(rejection.code, rejection.message, error)
  }

  companion object {
    const val PROGRESS_EVENT = "onProgress"
  }
}
