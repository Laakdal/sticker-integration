// JNI bridge between expo.modules.webpencoder.WebpNative (Kotlin) and the vendored libwebp.
//
// Pixels cross the bridge as Android ARGB ints (0xAARRGGBB, not premultiplied). That is libwebp's
// own ARGB layout (WebPPicture.argb with use_argb = 1), so rows are copied without conversion.
// All orchestration (framing, timing, size fitting) lives in Kotlin; keep this file thin.

#include <jni.h>

#include <cstdint>
#include <cstdlib>
#include <new>
#include <vector>

#include "webp/decode.h"
#include "webp/demux.h"
#include "webp/encode.h"
#include "webp/mux.h"

namespace {

struct AnimDecoder {
  uint8_t* data;  // input bytes; must outlive the decoder
  WebPAnimDecoder* decoder;
  int width;
  int height;
};

struct AnimEncoder {
  WebPAnimEncoder* encoder;
  int width;
  int height;
};

// Fills `pic` (use_argb) from a Java int[] holding width * height ARGB pixels.
bool ImportArgb(JNIEnv* env, jintArray argb, jint width, jint height, WebPPicture* pic) {
  if (argb == nullptr || width <= 0 || height <= 0) return false;
  if (env->GetArrayLength(argb) < static_cast<jsize>(width) * height) return false;
  if (!WebPPictureInit(pic)) return false;
  pic->use_argb = 1;
  pic->width = width;
  pic->height = height;
  if (!WebPPictureAlloc(pic)) return false;
  for (int y = 0; y < height; ++y) {
    env->GetIntArrayRegion(argb, y * width, width,
                           reinterpret_cast<jint*>(pic->argb + static_cast<size_t>(y) * pic->argb_stride));
  }
  return true;
}

jbyteArray ToByteArray(JNIEnv* env, const uint8_t* data, size_t size) {
  jbyteArray out = env->NewByteArray(static_cast<jsize>(size));
  if (out != nullptr) {
    env->SetByteArrayRegion(out, 0, static_cast<jsize>(size), reinterpret_cast<const jbyte*>(data));
  }
  return out;  // nullptr with a pending OutOfMemoryError if the allocation failed
}

// Copies a Java byte[] into malloc'd memory (libwebp demuxers keep pointers into their input).
uint8_t* CopyBytes(JNIEnv* env, jbyteArray data, size_t* size) {
  const jsize length = env->GetArrayLength(data);
  if (length <= 0) return nullptr;
  auto* bytes = static_cast<uint8_t*>(malloc(static_cast<size_t>(length)));
  if (bytes == nullptr) return nullptr;
  env->GetByteArrayRegion(data, 0, length, reinterpret_cast<jbyte*>(bytes));
  *size = static_cast<size_t>(length);
  return bytes;
}

bool InitLossyConfig(WebPConfig* config, jint quality, jint method) {
  if (!WebPConfigInit(config)) return false;
  config->lossless = 0;
  config->quality = static_cast<float>(quality);
  config->method = method;
  return WebPValidateConfig(config) != 0;
}

}  // namespace

extern "C" {

JNIEXPORT jbyteArray JNICALL Java_expo_modules_webpencoder_WebpNative_encodeStatic(
    JNIEnv* env, jobject, jintArray argb, jint width, jint height, jboolean lossless, jint quality) {
  WebPConfig config;
  if (lossless) {
    if (!WebPConfigInit(&config) || !WebPConfigLosslessPreset(&config, 6)) return nullptr;
  } else {
    if (!InitLossyConfig(&config, quality, 6)) return nullptr;
    config.use_sharp_yuv = 1;  // crisper colour edges on text and outlines
  }
  if (!WebPValidateConfig(&config)) return nullptr;
  WebPPicture pic;
  if (!ImportArgb(env, argb, width, height, &pic)) return nullptr;
  WebPMemoryWriter writer;
  WebPMemoryWriterInit(&writer);
  pic.writer = WebPMemoryWrite;
  pic.custom_ptr = &writer;
  const int ok = WebPEncode(&config, &pic);
  WebPPictureFree(&pic);
  jbyteArray out = ok ? ToByteArray(env, writer.mem, writer.size) : nullptr;
  WebPMemoryWriterClear(&writer);
  return out;
}

JNIEXPORT jintArray JNICALL Java_expo_modules_webpencoder_WebpNative_rescaleOnto(
    JNIEnv* env, jobject, jintArray argb, jint width, jint height, jint dstWidth, jint dstHeight,
    jint canvasWidth, jint canvasHeight, jint offsetX, jint offsetY) {
  if (dstWidth <= 0 || dstHeight <= 0 || offsetX < 0 || offsetY < 0 || offsetX + dstWidth > canvasWidth ||
      offsetY + dstHeight > canvasHeight) {
    return nullptr;
  }
  WebPPicture pic;
  if (!ImportArgb(env, argb, width, height, &pic)) return nullptr;
  // Area-averaging rescaler; premultiplies alpha internally so transparent edges do not bleed.
  if ((dstWidth != width || dstHeight != height) && !WebPPictureRescale(&pic, dstWidth, dstHeight)) {
    WebPPictureFree(&pic);
    return nullptr;
  }
  jintArray out = env->NewIntArray(canvasWidth * canvasHeight);  // zero-filled = transparent
  if (out != nullptr) {
    for (int y = 0; y < dstHeight; ++y) {
      env->SetIntArrayRegion(out, (offsetY + y) * canvasWidth + offsetX, dstWidth,
                             reinterpret_cast<const jint*>(pic.argb + static_cast<size_t>(y) * pic.argb_stride));
    }
  }
  WebPPictureFree(&pic);
  return out;
}

JNIEXPORT jlong JNICALL Java_expo_modules_webpencoder_WebpNative_animEncoderNew(
    JNIEnv*, jobject, jint width, jint height, jint kmin, jint kmax, jboolean allowMixed) {
  WebPAnimEncoderOptions options;
  if (!WebPAnimEncoderOptionsInit(&options)) return 0;
  options.anim_params.loop_count = 0;  // loop forever
  options.anim_params.bgcolor = 0x00000000;
  options.minimize_size = 0;
  options.kmin = kmin;
  options.kmax = kmax;  // kmax <= 0 disables key-frame insertion
  options.allow_mixed = allowMixed ? 1 : 0;
  WebPAnimEncoder* encoder = WebPAnimEncoderNew(width, height, &options);
  if (encoder == nullptr) return 0;
  auto* handle = new (std::nothrow) AnimEncoder{encoder, width, height};
  if (handle == nullptr) {
    WebPAnimEncoderDelete(encoder);
    return 0;
  }
  return reinterpret_cast<jlong>(handle);
}

JNIEXPORT jboolean JNICALL Java_expo_modules_webpencoder_WebpNative_animEncoderAdd(
    JNIEnv* env, jobject, jlong handle, jintArray argb, jint timestampMs, jint quality, jint method) {
  auto* h = reinterpret_cast<AnimEncoder*>(handle);
  if (h == nullptr) return JNI_FALSE;
  WebPConfig config;
  if (!InitLossyConfig(&config, quality, method)) return JNI_FALSE;
  WebPPicture pic;
  if (!ImportArgb(env, argb, h->width, h->height, &pic)) return JNI_FALSE;
  const int ok = WebPAnimEncoderAdd(h->encoder, &pic, timestampMs, &config);
  WebPPictureFree(&pic);
  return ok ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT jbyteArray JNICALL Java_expo_modules_webpencoder_WebpNative_animEncoderAssemble(
    JNIEnv* env, jobject, jlong handle, jint endTimestampMs) {
  auto* h = reinterpret_cast<AnimEncoder*>(handle);
  if (h == nullptr) return nullptr;
  // A final NULL frame marks the end timestamp, i.e. the duration of the last frame.
  if (!WebPAnimEncoderAdd(h->encoder, nullptr, endTimestampMs, nullptr)) return nullptr;
  WebPData data;
  WebPDataInit(&data);
  if (!WebPAnimEncoderAssemble(h->encoder, &data)) return nullptr;
  jbyteArray out = ToByteArray(env, data.bytes, data.size);
  WebPDataClear(&data);
  return out;
}

JNIEXPORT jbyteArray JNICALL Java_expo_modules_webpencoder_WebpNative_animFromSingleFrame(
    JNIEnv* env, jobject, jbyteArray data, jint firstMs, jint secondMs) {
  size_t size = 0;
  uint8_t* bytes = CopyBytes(env, data, &size);
  if (bytes == nullptr) return nullptr;
  const WebPData input = {bytes, size};
  WebPMux* source = WebPMuxCreate(&input, 0);
  WebPMux* mux = WebPMuxNew();
  WebPMuxFrameInfo frame;
  WebPDataInit(&frame.bitstream);
  WebPData assembled;
  WebPDataInit(&assembled);
  int width = 0;
  int height = 0;
  // Same animation settings as animEncoderNew: loop forever over a transparent background.
  const WebPMuxAnimParams params = {0x00000000, 0};
  bool ok = source != nullptr && mux != nullptr && WebPMuxGetFrame(source, 1, &frame) == WEBP_MUX_OK &&
            WebPMuxGetCanvasSize(source, &width, &height) == WEBP_MUX_OK &&
            WebPMuxSetCanvasSize(mux, width, height) == WEBP_MUX_OK &&
            WebPMuxSetAnimationParams(mux, &params) == WEBP_MUX_OK;
  // The first frame's image (the full canvas when libwebp emitted a still), shown twice without blending.
  frame.id = WEBP_CHUNK_ANMF;
  frame.dispose_method = WEBP_MUX_DISPOSE_NONE;
  frame.blend_method = WEBP_MUX_NO_BLEND;
  for (const jint duration : {firstMs, secondMs}) {
    frame.duration = duration;
    ok = ok && WebPMuxPushFrame(mux, &frame, 0) == WEBP_MUX_OK;
  }
  ok = ok && WebPMuxAssemble(mux, &assembled) == WEBP_MUX_OK;
  jbyteArray out = ok ? ToByteArray(env, assembled.bytes, assembled.size) : nullptr;
  WebPDataClear(&assembled);
  WebPMuxDelete(mux);
  WebPDataClear(&frame.bitstream);
  WebPMuxDelete(source);
  free(bytes);
  return out;
}

JNIEXPORT void JNICALL Java_expo_modules_webpencoder_WebpNative_animEncoderDelete(JNIEnv*, jobject, jlong handle) {
  auto* h = reinterpret_cast<AnimEncoder*>(handle);
  if (h == nullptr) return;
  WebPAnimEncoderDelete(h->encoder);
  delete h;
}

JNIEXPORT jlong JNICALL Java_expo_modules_webpencoder_WebpNative_animDecoderNew(JNIEnv* env, jobject,
                                                                                jbyteArray data) {
  size_t size = 0;
  uint8_t* bytes = CopyBytes(env, data, &size);
  if (bytes == nullptr) return 0;
  WebPAnimDecoderOptions options;
  if (!WebPAnimDecoderOptionsInit(&options)) {
    free(bytes);
    return 0;
  }
  options.color_mode = MODE_BGRA;  // bytes B,G,R,A == little-endian 0xAARRGGBB ints, not premultiplied
  options.use_threads = 1;
  WebPData webp_data = {bytes, size};
  WebPAnimDecoder* decoder = WebPAnimDecoderNew(&webp_data, &options);
  WebPAnimInfo info;
  if (decoder == nullptr || !WebPAnimDecoderGetInfo(decoder, &info)) {
    if (decoder != nullptr) WebPAnimDecoderDelete(decoder);
    free(bytes);
    return 0;
  }
  auto* handle = new (std::nothrow)
      AnimDecoder{bytes, decoder, static_cast<int>(info.canvas_width), static_cast<int>(info.canvas_height)};
  if (handle == nullptr) {
    WebPAnimDecoderDelete(decoder);
    free(bytes);
    return 0;
  }
  return reinterpret_cast<jlong>(handle);
}

JNIEXPORT jint JNICALL Java_expo_modules_webpencoder_WebpNative_animDecoderNext(JNIEnv* env, jobject,
                                                                                jlong handle, jintArray out) {
  auto* h = reinterpret_cast<AnimDecoder*>(handle);
  if (h == nullptr || !WebPAnimDecoderHasMoreFrames(h->decoder)) return -1;
  const jsize pixels = static_cast<jsize>(h->width) * h->height;
  if (env->GetArrayLength(out) < pixels) return -1;
  uint8_t* frame = nullptr;
  int timestamp = 0;
  if (!WebPAnimDecoderGetNext(h->decoder, &frame, &timestamp)) return -1;
  env->SetIntArrayRegion(out, 0, pixels, reinterpret_cast<const jint*>(frame));
  return timestamp;
}

JNIEXPORT void JNICALL Java_expo_modules_webpencoder_WebpNative_animDecoderDelete(JNIEnv*, jobject, jlong handle) {
  auto* h = reinterpret_cast<AnimDecoder*>(handle);
  if (h == nullptr) return;
  WebPAnimDecoderDelete(h->decoder);
  free(h->data);
  delete h;
}

JNIEXPORT jintArray JNICALL Java_expo_modules_webpencoder_WebpNative_demuxInfo(JNIEnv* env, jobject,
                                                                               jbyteArray data) {
  size_t size = 0;
  uint8_t* bytes = CopyBytes(env, data, &size);
  if (bytes == nullptr) return nullptr;
  WebPData webp_data = {bytes, size};
  WebPDemuxer* demux = WebPDemux(&webp_data);
  if (demux == nullptr) {
    free(bytes);
    return nullptr;
  }
  const bool animated = (WebPDemuxGetI(demux, WEBP_FF_FORMAT_FLAGS) & ANIMATION_FLAG) != 0;
  std::vector<jint> values = {
      static_cast<jint>(WebPDemuxGetI(demux, WEBP_FF_CANVAS_WIDTH)),
      static_cast<jint>(WebPDemuxGetI(demux, WEBP_FF_CANVAS_HEIGHT)),
      animated ? 1 : 0,
      static_cast<jint>(WebPDemuxGetI(demux, WEBP_FF_FRAME_COUNT)),
  };
  if (animated) {
    WebPIterator iter;
    if (WebPDemuxGetFrame(demux, 1, &iter)) {
      do {
        values.push_back(iter.duration);
      } while (WebPDemuxNextFrame(&iter));
      WebPDemuxReleaseIterator(&iter);
    }
  }
  WebPDemuxDelete(demux);
  free(bytes);
  jintArray out = env->NewIntArray(static_cast<jsize>(values.size()));
  if (out != nullptr) env->SetIntArrayRegion(out, 0, static_cast<jsize>(values.size()), values.data());
  return out;
}

}  // extern "C"
