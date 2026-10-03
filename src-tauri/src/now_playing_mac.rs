//! macOS' media controls: the play / pause, next and previous keys of keyboards, the buttons of
//! headphones (AirPods included), and "Now Playing" in the menu bar and Control Center.
//!
//! As on Windows (`smtc.rs`), the music is synthesized in the page with Web Audio: the remote
//! commands are registered here and relay each button as a `media-action` event, like the tray
//! menu, and `set_now_playing` updates what macOS shows, progress bar included.

use std::ptr::NonNull;

use block2::RcBlock;
use objc2::runtime::AnyObject;
use objc2_foundation::{NSDictionary, NSNumber, NSString};
use objc2_media_player::{
    MPMediaItemPropertyAlbumTitle, MPMediaItemPropertyArtist, MPMediaItemPropertyPlaybackDuration, MPMediaItemPropertyTitle,
    MPNowPlayingInfoCenter, MPNowPlayingInfoPropertyElapsedPlaybackTime, MPNowPlayingInfoPropertyPlaybackRate, MPNowPlayingPlaybackState,
    MPRemoteCommand, MPRemoteCommandCenter, MPRemoteCommandEvent, MPRemoteCommandHandlerStatus,
};
use tauri::{AppHandle, Emitter, Runtime};

use crate::{media::NowPlaying, window::MAIN};

/// Registers the buttons. On the main thread (the app's `setup`), as AppKit expects.
pub fn attach<R: Runtime>(app: &AppHandle<R>) {
    let center = unsafe { MPRemoteCommandCenter::sharedCommandCenter() };
    let commands = unsafe {
        [
            (center.playCommand(), "play"),
            (center.pauseCommand(), "pause"),
            (center.togglePlayPauseCommand(), "toggle"),
            (center.nextTrackCommand(), "next"),
            (center.previousTrackCommand(), "previous"),
        ]
    };
    for (command, action) in commands {
        relay(app, &command, action);
    }
}

fn relay<R: Runtime>(app: &AppHandle<R>, command: &MPRemoteCommand, action: &'static str) {
    let app = app.clone();
    let handler = RcBlock::new(move |_event: NonNull<MPRemoteCommandEvent>| {
        if let Err(error) = app.emit_to(MAIN, "media-action", action) {
            eprintln!("media keys: {error}");
        }
        MPRemoteCommandHandlerStatus::Success
    });
    unsafe {
        command.setEnabled(true);
        // The command center keeps the handler for the life of the app: the returned token is not needed.
        let _ = command.addTargetWithHandler(&handler);
    }
}

/// Shows the song in Now Playing. Dispatched to the main thread, where AppKit state belongs.
pub fn show_now_playing<R: Runtime>(app: &AppHandle<R>, now: &NowPlaying) {
    let now = now.clone();
    let _ = app.run_on_main_thread(move || unsafe {
        let title = NSString::from_str(&now.title);
        let source = NSString::from_str(&now.subtitle);
        let album = NSString::from_str("Lofi Studio");
        let duration = NSNumber::new_f64(now.duration);
        let elapsed = NSNumber::new_f64(now.position);
        let rate = NSNumber::new_f64(if now.playing { 1.0 } else { 0.0 });
        let keys: [&NSString; 6] = [
            MPMediaItemPropertyTitle,
            MPMediaItemPropertyArtist,
            MPMediaItemPropertyAlbumTitle,
            MPMediaItemPropertyPlaybackDuration,
            MPNowPlayingInfoPropertyElapsedPlaybackTime,
            MPNowPlayingInfoPropertyPlaybackRate,
        ];
        let values: [&AnyObject; 6] = [&title, &source, &album, &duration, &elapsed, &rate];
        let info = NSDictionary::<NSString, AnyObject>::from_slices(&keys, &values);
        let center = MPNowPlayingInfoCenter::defaultCenter();
        center.setNowPlayingInfo(Some(&info));
        center.setPlaybackState(if now.playing { MPNowPlayingPlaybackState::Playing } else { MPNowPlayingPlaybackState::Paused });
    });
}
