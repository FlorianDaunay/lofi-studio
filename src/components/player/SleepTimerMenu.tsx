import { Moon, MoonStar, TimerOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import { SLEEP_FADE_SECONDS, SLEEP_MINUTES, cancelSleepTimer, setSleepTimer, sleepAfterSong, useSleep } from "@/state/sleep";

const durationLabel = (minutes: number) => (minutes < 60 ? `${minutes} minutes` : minutes === 60 ? "1 hour" : `${minutes / 60} hours`);

/** Minutes left before `endsAt`, refreshed every few seconds while a timer runs. */
function useMinutesLeft(endsAt: number | null): number | null {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (endsAt === null) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, [endsAt]);
  return endsAt === null ? null : Math.max(1, Math.ceil((endsAt - now) / 60_000));
}

/** Stop the music later: after some minutes or at the end of the song, fading out. */
export function SleepTimerMenu() {
  const endsAt = useSleep((s) => s.endsAt);
  const afterSong = useSleep((s) => s.afterSong);
  const minutesLeft = useMinutesLeft(endsAt);
  const active = endsAt !== null || afterSong;
  const status = afterSong ? "Stops at the end of this song" : minutesLeft !== null ? `Stops in ${minutesLeft} min` : "Sleep timer off";

  return (
    <DropdownMenu>
      <DropdownTrigger asChild>
        <Button
          variant="ghost"
          size={active ? "sm" : "icon"}
          aria-label={`Sleep timer: ${status}`}
          title={status}
          className={cn(active && "gap-1.5 bg-accent/15 px-2.5 text-accent")}
        >
          {active ? <MoonStar className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
          {afterSong ? <span className="text-xs">Song end</span> : minutesLeft !== null && <span className="font-mono text-xs tabular-nums">{minutesLeft}m</span>}
        </Button>
      </DropdownTrigger>
      <DropdownContent>
        <p className="px-3 py-2 text-xs text-text-muted">Fade the music out ({SLEEP_FADE_SECONDS} s) and stop:</p>
        {SLEEP_MINUTES.map((minutes) => (
          <DropdownItem key={minutes} icon={<Moon className="h-4 w-4" />} label={`In ${durationLabel(minutes)}`} onSelect={() => setSleepTimer(minutes)} />
        ))}
        <DropdownItem icon={<MoonStar className="h-4 w-4" />} label="At the end of this song" onSelect={sleepAfterSong} />
        <DropdownSeparator />
        <DropdownItem icon={<TimerOff className="h-4 w-4" />} label="Turn off" disabled={!active} onSelect={cancelSleepTimer} />
      </DropdownContent>
    </DropdownMenu>
  );
}
