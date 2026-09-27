package com.lofistudio.app

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.graphics.drawable.Icon
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

data class NowPlaying(val title: String, val subtitle: String, val playing: Boolean)

/**
 * Keeps the app alive while music plays with the screen off or another app in front, and shows
 * the media notification (also the lock screen and quick-settings player). The music itself is
 * synthesized in the web view; this only reports it and relays the buttons ([MediaActions]).
 *
 * It is a foreground service only while playing. Paused, the notification stays so the music can
 * resume from it, but can be swiped away, and Android may freeze or reclaim the idle app.
 */
class PlaybackService : Service() {
  companion object {
    const val NOTIFICATION_ID = 1
    private const val CHANNEL_ID = "playback"
    /** Renewed on every update; songs change every couple of minutes. */
    private const val WAKE_LOCK_MS = 6 * 60 * 60 * 1000L

    private var instance: PlaybackService? = null
    /** What to show once a starting service is created. */
    private var pending: NowPlaying? = null

    /** On the main thread. Starts the service on the first play; before that there is nothing to show. */
    fun show(context: Context, nowPlaying: NowPlaying) {
      val service = instance
      when {
        service != null -> service.show(nowPlaying)
        pending != null -> pending = nowPlaying
        nowPlaying.playing -> {
          pending = nowPlaying
          ContextCompat.startForegroundService(context, Intent(context, PlaybackService::class.java))
        }
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, PlaybackService::class.java))
    }
  }

  private lateinit var session: MediaSession
  private lateinit var wakeLock: PowerManager.WakeLock
  private lateinit var audioManager: AudioManager
  private val notifications by lazy { getSystemService(NotificationManager::class.java) }
  private var nowPlaying = NowPlaying("", "", false)

  private var focusRequest: AudioFocusRequest? = null
  private var hasFocus = false
  /** Paused for a call or a navigation prompt: play again when it ends. */
  private var resumeOnFocusGain = false
  private var noisyRegistered = false

  private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
    when (change) {
      AudioManager.AUDIOFOCUS_LOSS -> {
        resumeOnFocusGain = false
        MediaActions.dispatch(MediaActions.PAUSE)
      }
      AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> if (nowPlaying.playing) {
        resumeOnFocusGain = true
        MediaActions.dispatch(MediaActions.PAUSE)
      }
      AudioManager.AUDIOFOCUS_GAIN -> if (resumeOnFocusGain) {
        resumeOnFocusGain = false
        MediaActions.dispatch(MediaActions.PLAY)
      }
      // A short duck (a notification sound) is handled by the system on its own.
    }
  }

  /** Headphones unplugged or Bluetooth gone: pause rather than play out of the speaker. */
  private val noisyReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = MediaActions.dispatch(MediaActions.PAUSE)
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    instance = this
    audioManager = getSystemService(AudioManager::class.java)
    wakeLock = getSystemService(PowerManager::class.java)
      .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LofiStudio:playback")
      .apply { setReferenceCounted(false) }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL_ID, "Playback", NotificationManager.IMPORTANCE_LOW).apply {
        description = "What is playing, with play, pause and skip"
        setShowBadge(false)
      }
      notifications.createNotificationChannel(channel)
    }
    session = MediaSession(this, "LofiStudio").apply {
      setCallback(object : MediaSession.Callback() {
        override fun onPlay() = MediaActions.dispatch(MediaActions.PLAY)
        override fun onPause() = MediaActions.dispatch(MediaActions.PAUSE)
        override fun onSkipToNext() = MediaActions.dispatch(MediaActions.NEXT)
        override fun onSkipToPrevious() = MediaActions.dispatch(MediaActions.PREVIOUS)
      })
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        @Suppress("DEPRECATION")
        setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS or MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS)
      }
      setSessionActivity(openAppIntent())
      isActive = true
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // Started with startForegroundService(): it must go foreground now, even if a pause came in meanwhile.
    val next = pending ?: nowPlaying
    pending = null
    nowPlaying = next
    goForeground(buildNotification())
    show(next)
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    instance = null
    pending = null
    resumeOnFocusGain = false
    release()
    session.release()
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    notifications.cancel(NOTIFICATION_ID)
    super.onDestroy()
  }

  private fun show(next: NowPlaying) {
    nowPlaying = next
    session.setMetadata(
      MediaMetadata.Builder()
        .putString(MediaMetadata.METADATA_KEY_TITLE, next.title)
        .putString(MediaMetadata.METADATA_KEY_ARTIST, next.subtitle)
        .build(),
    )
    session.setPlaybackState(
      PlaybackState.Builder()
        .setActions(
          PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or PlaybackState.ACTION_PLAY_PAUSE or
            PlaybackState.ACTION_SKIP_TO_NEXT or PlaybackState.ACTION_SKIP_TO_PREVIOUS,
        )
        .setState(
          if (next.playing) PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED,
          PlaybackState.PLAYBACK_POSITION_UNKNOWN,
          1f,
        )
        .build(),
    )
    val notification = buildNotification()
    if (next.playing) {
      resumeOnFocusGain = false
      goForeground(notification)
      hold()
    } else {
      release()
      ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_DETACH)
      post(notification)
    }
  }

  private fun goForeground(notification: Notification) {
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK else 0
    try {
      ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, type)
    } catch (e: RuntimeException) {
      // Android 12+ may refuse from the background (e.g. resuming long after a pause): still show the controls.
      post(notification)
    }
  }

  // Media-session notifications are exempt from Android 13's notification permission: none is asked for.
  @SuppressLint("NotificationPermission")
  private fun post(notification: Notification) {
    notifications.notify(NOTIFICATION_ID, notification)
  }

  /** While playing: keep the CPU awake for the synth, own the audio focus, watch for unplugged headphones. */
  private fun hold() {
    wakeLock.acquire(WAKE_LOCK_MS)
    if (!hasFocus) requestFocus()
    if (!noisyRegistered) {
      ContextCompat.registerReceiver(
        this,
        noisyReceiver,
        IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY),
        ContextCompat.RECEIVER_NOT_EXPORTED,
      )
      noisyRegistered = true
    }
  }

  private fun release() {
    if (wakeLock.isHeld) wakeLock.release()
    // Paused by a call: keep the focus request, so its end is heard.
    if (!resumeOnFocusGain) abandonFocus()
    if (noisyRegistered) {
      unregisterReceiver(noisyReceiver)
      noisyRegistered = false
    }
  }

  private fun requestFocus() {
    val result = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val attributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
        .build()
      val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
        .setAudioAttributes(attributes)
        .setOnAudioFocusChangeListener(focusListener)
        .build()
      focusRequest = request
      audioManager.requestAudioFocus(request)
    } else {
      @Suppress("DEPRECATION")
      audioManager.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN)
    }
    hasFocus = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    // During a phone call: do not play over it.
    if (result == AudioManager.AUDIOFOCUS_REQUEST_FAILED) MediaActions.dispatch(MediaActions.PAUSE)
  }

  private fun abandonFocus() {
    if (!hasFocus) return
    hasFocus = false
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
    } else {
      @Suppress("DEPRECATION")
      audioManager.abandonAudioFocus(focusListener)
    }
  }

  private fun buildNotification(): Notification {
    val playing = nowPlaying.playing
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }
    return builder
      .setSmallIcon(R.drawable.ic_notification)
      .setContentTitle(nowPlaying.title)
      .setContentText(nowPlaying.subtitle)
      .setContentIntent(openAppIntent())
      .setDeleteIntent(actionIntent(MediaActionReceiver.DISMISS))
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setOngoing(playing)
      .setShowWhen(false)
      .addAction(action(android.R.drawable.ic_media_previous, "Previous", MediaActions.PREVIOUS))
      .addAction(
        if (playing) action(android.R.drawable.ic_media_pause, "Pause", MediaActions.PAUSE)
        else action(android.R.drawable.ic_media_play, "Play", MediaActions.PLAY),
      )
      .addAction(action(android.R.drawable.ic_media_next, "Next", MediaActions.NEXT))
      .setStyle(Notification.MediaStyle().setMediaSession(session.sessionToken).setShowActionsInCompactView(0, 1, 2))
      .build()
  }

  private fun action(icon: Int, title: String, name: String) =
    Notification.Action.Builder(Icon.createWithResource(this, icon), title, actionIntent(name)).build()

  private fun actionIntent(name: String): PendingIntent {
    val intent = Intent(this, MediaActionReceiver::class.java).setAction(name)
    return PendingIntent.getBroadcast(this, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  private fun openAppIntent(): PendingIntent {
    val intent = Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }
}
