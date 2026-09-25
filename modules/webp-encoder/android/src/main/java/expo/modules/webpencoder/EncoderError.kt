package expo.modules.webpencoder

import java.io.IOException
import java.util.Locale

/** Error codes the JS promises are rejected with (spec §7). */
enum class ErrorCode { DECODE_FAILED, OUT_OF_MEMORY, TOO_LARGE, CANCELLED, IO_ERROR, INSUFFICIENT_STORAGE, INVALID_OPTIONS }

class EncoderException(val code: ErrorCode, message: String, cause: Throwable? = null) : Exception(message, cause)

fun invalidOptions(message: String): Nothing = throw EncoderException(ErrorCode.INVALID_OPTIONS, message)

fun kb(bytes: Long): String = String.format(Locale.US, "%.1f KB", bytes / 1024.0)

/** Maps anything a job throws to the (code, message) pair its promise is rejected with. */
object ErrorMapping {
  data class Rejection(val code: String, val message: String)

  fun toRejection(error: Throwable): Rejection = when (error) {
    is EncoderException -> Rejection(error.code.name, error.message ?: error.code.name)
    is OutOfMemoryError -> Rejection(ErrorCode.OUT_OF_MEMORY.name, "Not enough memory to process this file.")
    is IOException -> Rejection(ErrorCode.IO_ERROR.name, error.message ?: "Reading or writing a file failed.")
    else -> Rejection(ErrorCode.IO_ERROR.name, error.message ?: error.javaClass.simpleName)
  }
}
