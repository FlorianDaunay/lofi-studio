package com.lofistudio.app

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Media buttons pressed outside the page (notification, lock screen, headset, audio focus), on
 * their way to it. The names match `MEDIA_ACTIONS` in `src/lib/media.ts`.
 */
object MediaActions {
  const val PLAY = "play"
  const val PAUSE = "pause"
  const val NEXT = "next"
  const val PREVIOUS = "previous"

  /** Set while the page can hear: MediaPlugin forwards to it. */
  var listener: ((String) -> Unit)? = null

  fun dispatch(action: String) {
    listener?.invoke(action)
  }
}

/** Receives the notification's buttons. The intent's action is a [MediaActions] name, or [DISMISS]. */
class MediaActionReceiver : BroadcastReceiver() {
  companion object {
    /** The paused notification was swiped away. */
    const val DISMISS = "dismiss"
  }

  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    if (action != DISMISS && MediaActions.listener != null) {
      MediaActions.dispatch(action)
      return
    }
    // Dismissed, or a notification left over from a process Android has since reclaimed: nothing can play it.
    PlaybackService.stop(context)
    context.getSystemService(NotificationManager::class.java)?.cancel(PlaybackService.NOTIFICATION_ID)
  }
}
