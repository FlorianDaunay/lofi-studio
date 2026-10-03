package com.lofistudio.app

import android.app.Activity
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@InvokeArg
class NowPlayingArgs {
  var title: String = ""
  var subtitle: String = ""
  var playing: Boolean = false
  var durationMs: Long = 0
  var positionMs: Long = 0
  /** The theme's accent, 0xRRGGBB; absent from an older page. */
  var accent: Int? = null
  /** The cover as a base64 PNG, only sent when it changed. */
  var artwork: String? = null
}

/**
 * The `media` plugin (registered in `src-tauri/src/media.rs`): the page reports what is playing
 * (Rust's `set_now_playing` calls [update]) and hears the system's media buttons as `action` events.
 */
@TauriPlugin
class MediaPlugin(private val activity: Activity) : Plugin(activity) {
  override fun load(webView: WebView) {
    MediaActions.listener = { action -> trigger("action", JSObject().put("action", action)) }
  }

  @Command
  fun update(invoke: Invoke) {
    val args = invoke.parseArgs(NowPlayingArgs::class.java)
    val nowPlaying = NowPlaying(
      args.title,
      args.subtitle,
      args.playing,
      args.durationMs.coerceAtLeast(0),
      args.positionMs.coerceAtLeast(0),
      args.accent?.let { 0xFF000000.toInt() or it },
    )
    // Decoded here, off the main thread; null keeps the cover already shown.
    val artwork = args.artwork?.let(::decode)
    activity.runOnUiThread { PlaybackService.show(activity, nowPlaying, artwork) }
    invoke.resolve()
  }

  private fun decode(base64: String): Bitmap? = try {
    val bytes = Base64.decode(base64, Base64.DEFAULT)
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
  } catch (e: IllegalArgumentException) {
    null
  }

  override fun onDestroy(activity: AppCompatActivity) {
    // The music lives in the activity's web view: without it there is nothing left to control.
    MediaActions.listener = null
    PlaybackService.stop(activity)
  }
}
