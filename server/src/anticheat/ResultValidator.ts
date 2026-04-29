import type { Keystroke, Player, Room } from '@typecomp/shared';

export class ResultValidator {
  validate(
    keystrokes: Keystroke[],
    player: Player,
    room: Room
  ): { verified: boolean; flags: string[] } {
    const flags: string[] = [];

    // 1. Keystroke count sanity: should have at least 80% of text length in keystrokes
    if (keystrokes.length < room.text.length * 0.8) {
      flags.push('too-few-keystrokes');
    }

    // 2. WPM sanity: flag if > 250 WPM (world record territory)
    if (player.wpm > 250) {
      flags.push('superhuman-wpm');
    }

    // 3. Timing uniformity: bots have unnaturally consistent timing
    if (keystrokes.length > 10) {
      const intervals = keystrokes
        .slice(1)
        .map((k, i) => k.timestamp - keystrokes[i].timestamp)
        .filter((interval) => interval > 0);

      if (intervals.length > 5) {
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const stdDev = Math.sqrt(
          intervals.reduce((sum, x) => sum + (x - mean) ** 2, 0) / intervals.length
        );
        const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;

        if (coefficientOfVariation < 0.15) {
          flags.push('uniform-timing');
        }
      }
    }

    // 4. Burst detection: flag if any 10-keystroke window averages < 30ms/key
    if (keystrokes.length > 10) {
      const intervals = keystrokes
        .slice(1)
        .map((k, i) => k.timestamp - keystrokes[i].timestamp);

      for (let i = 0; i <= intervals.length - 10; i++) {
        const windowAvg =
          intervals.slice(i, i + 10).reduce((a, b) => a + b, 0) / 10;
        if (windowAvg < 30 && windowAvg >= 0) {
          flags.push('burst-detected');
          break;
        }
      }
    }

    return {
      verified: flags.length === 0,
      flags,
    };
  }
}
