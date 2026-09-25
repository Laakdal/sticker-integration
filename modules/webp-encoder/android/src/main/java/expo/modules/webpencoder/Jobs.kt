package expo.modules.webpencoder

class CancelToken {
  @Volatile
  var isCancelled: Boolean = false
    private set

  fun cancel() {
    isCancelled = true
  }

  fun throwIfCancelled() {
    if (isCancelled) throw EncoderException(ErrorCode.CANCELLED, "Encoding was cancelled.")
  }
}

/**
 * Tracks running encode jobs by id. A cancel that arrives before its job starts (JS called cancel while
 * the job was still queued) is remembered and applied at start; a late cancel of a finished job is ignored.
 */
class JobRegistry(private val memory: Int = 64) {
  private val running = HashMap<String, CancelToken>()
  private val cancelledEarly = LinkedHashSet<String>()
  private val finished = LinkedHashSet<String>()

  @Synchronized
  fun start(jobId: String): CancelToken {
    if (running.containsKey(jobId)) invalidOptions("Job '$jobId' is already running.")
    finished.remove(jobId)
    val token = CancelToken()
    if (cancelledEarly.remove(jobId)) token.cancel()
    running[jobId] = token
    return token
  }

  @Synchronized
  fun cancel(jobId: String) {
    val token = running[jobId]
    when {
      token != null -> token.cancel()
      jobId in finished -> Unit
      else -> remember(cancelledEarly, jobId)
    }
  }

  @Synchronized
  fun finish(jobId: String) {
    running.remove(jobId)
    remember(finished, jobId)
  }

  private fun remember(set: LinkedHashSet<String>, id: String) {
    set.remove(id)
    set.add(id)
    while (set.size > memory) set.remove(set.first())
  }
}
