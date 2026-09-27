package com.lofistudio.app

import android.app.Activity
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
    val nowPlaying = NowPlaying(args.title, args.subtitle, args.playing)
    activity.runOnUiThread { PlaybackService.show(activity, nowPlaying) }
    invoke.resolve()
  }

  override fun onDestroy(activity: AppCompatActivity) {
    // The music lives in the activity's web view: without it there is nothing left to control.
    MediaActions.listener = null
    PlaybackService.stop(activity)
  }
}
