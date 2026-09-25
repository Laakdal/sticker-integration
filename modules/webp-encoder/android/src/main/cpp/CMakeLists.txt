cmake_minimum_required(VERSION 3.22.1)
project(webpencoder C CXX)

set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Build only the libraries we link: libwebp (still encode/decode + rescaler), libwebpdemux
# (WebPDemux, WebPAnimDecoder) and libwebpmux (WebPAnimEncoder). No tools, extras or fuzzers.
foreach(option
    WEBP_BUILD_ANIM_UTILS WEBP_BUILD_CWEBP WEBP_BUILD_DWEBP WEBP_BUILD_GIF2WEBP
    WEBP_BUILD_IMG2WEBP WEBP_BUILD_VWEBP WEBP_BUILD_WEBPINFO WEBP_BUILD_WEBPMUX
    WEBP_BUILD_EXTRAS WEBP_BUILD_WEBP_JS WEBP_BUILD_FUZZTEST)
  set(${option} OFF CACHE BOOL "" FORCE)
endforeach()
set(WEBP_BUILD_LIBWEBPMUX ON CACHE BOOL "" FORCE)

add_subdirectory(libwebp EXCLUDE_FROM_ALL)

add_library(webpencoder SHARED webp_jni.cpp)
target_include_directories(webpencoder PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/libwebp/src)
target_link_libraries(webpencoder libwebpmux webpdemux webp sharpyuv log)
# 16 KB page alignment for Android 15+ devices with 16 KB pages.
target_link_options(webpencoder PRIVATE "-Wl,-z,max-page-size=16384")
