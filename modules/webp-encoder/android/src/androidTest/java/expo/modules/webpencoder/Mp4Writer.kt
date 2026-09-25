package expo.modules.webpencoder

import android.media.Image
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMuxer
import java.io.File

/** Writes small H.264 MP4 fixtures on the device (no ffmpeg on the dev machine). Width and height must be even. */
object Mp4Writer {
  fun write(
    file: File,
    width: Int,
    height: Int,
    fps: Int,
    frameCount: Int,
    orientationHint: Int = 0,
    paint: (frame: Int, argb: IntArray) -> Unit,
  ) {
    val format = MediaFormat.createVideoFormat(MediaFormat.MIMETYPE_VIDEO_AVC, width, height).apply {
      setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible)
      setInteger(MediaFormat.KEY_BIT_RATE, 4_000_000)
      setInteger(MediaFormat.KEY_FRAME_RATE, fps)
      setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1)
    }
    val codec = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_VIDEO_AVC)
    codec.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
    codec.start()
    val muxer = MediaMuxer(file.path, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
    muxer.setOrientationHint(orientationHint)
    val info = MediaCodec.BufferInfo()
    val argb = IntArray(width * height)
    var track = -1
    var submitted = 0
    var inputDone = false
    var outputDone = false
    val deadline = System.nanoTime() + 30_000_000_000L
    try {
      while (!outputDone) {
        check(System.nanoTime() < deadline) { "MP4 encoder timed out" }
        if (!inputDone) {
          val inIndex = codec.dequeueInputBuffer(10_000)
          if (inIndex >= 0) {
            val ptsUs = submitted * 1_000_000L / fps
            if (submitted == frameCount) {
              codec.queueInputBuffer(inIndex, 0, 0, ptsUs, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
              inputDone = true
            } else {
              paint(submitted, argb)
              writeYuv(codec.getInputImage(inIndex)!!, argb, width, height)
              codec.queueInputBuffer(inIndex, 0, width * height * 3 / 2, ptsUs, 0)
              submitted++
            }
          }
        }
        val outIndex = codec.dequeueOutputBuffer(info, 10_000)
        if (outIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
          track = muxer.addTrack(codec.outputFormat)
          muxer.start()
        } else if (outIndex >= 0) {
          val buffer = codec.getOutputBuffer(outIndex)!!
          val isConfig = (info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0
          if (!isConfig && info.size > 0 && track >= 0) {
            buffer.position(info.offset)
            buffer.limit(info.offset + info.size)
            muxer.writeSampleData(track, buffer, info)
          }
          codec.releaseOutputBuffer(outIndex, false)
          if ((info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) outputDone = true
        }
      }
    } finally {
      codec.stop()
      codec.release()
      if (track >= 0) muxer.stop()
      muxer.release()
    }
  }

  /** BT.601 limited-range RGB → YUV 4:2:0 into the codec's flexible input image. */
  private fun writeYuv(image: Image, argb: IntArray, width: Int, height: Int) {
    val yPlane = image.planes[0]
    val uPlane = image.planes[1]
    val vPlane = image.planes[2]
    for (y in 0 until height) {
      for (x in 0 until width) {
        val c = argb[y * width + x]
        val r = (c shr 16) and 0xFF
        val g = (c shr 8) and 0xFF
        val b = c and 0xFF
        yPlane.buffer.put(y * yPlane.rowStride + x * yPlane.pixelStride, (((66 * r + 129 * g + 25 * b + 128) shr 8) + 16).toByte())
        if (y % 2 == 0 && x % 2 == 0) {
          val cy = y / 2
          val cx = x / 2
          uPlane.buffer.put(cy * uPlane.rowStride + cx * uPlane.pixelStride, (((-38 * r - 74 * g + 112 * b + 128) shr 8) + 128).toByte())
          vPlane.buffer.put(cy * vPlane.rowStride + cx * vPlane.pixelStride, (((112 * r - 94 * g - 18 * b + 128) shr 8) + 128).toByte())
        }
      }
    }
  }
}
