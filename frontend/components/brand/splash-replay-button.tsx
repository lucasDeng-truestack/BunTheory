"use client";

import { Button } from "@/components/ui/button";

/** Dev helper (style guide): clears the once-per-session flag and replays the splash. */
export function SplashReplayButton() {
  return (
    <Button
      variant="dark"
      size="sm"
      onClick={() => {
        window.sessionStorage.removeItem("bt_splash_seen");
        window.location.reload();
      }}
    >
      Replay load splash
    </Button>
  );
}
