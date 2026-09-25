package expo.modules.webpencoder

/** One `onProgress` event body (without the job id): stage "decode" (pass 0) or "encode" (pass 1, 2, …). */
data class Progress(val stage: String, val pass: Int, val fraction: Double)

/** Forwards a progress report when the stage or pass changes, at the end of a stage, or after ≥ [minStep] of progress. */
class ProgressThrottle(private val minStep: Double = 0.02, private val emit: (Progress) -> Unit) {
  private var last: Progress? = null

  fun report(stage: String, pass: Int, fraction: Double) {
    val next = Progress(stage, pass, fraction.coerceIn(0.0, 1.0))
    val previous = last
    val changed = previous == null || previous.stage != stage || previous.pass != pass
    if (changed || next.fraction >= 1.0 || next.fraction - previous!!.fraction >= minStep) {
      last = next
      emit(next)
    }
  }
}
