import type { Keystroke, Player, Room } from '@typecomp/shared';

export class KeystrokeValidator {
  validate(
    keystroke: Keystroke,
    player: Player,
    room: Room,
    previousKeystroke: Keystroke | null
  ): { valid: boolean; suspicious: boolean; reason?: string } {
    // Skip validation for special signals (e.g., focus loss)
    if (keystroke.position < 0) {
      return { valid: false, suspicious: false };
    }

    // Position bounds check
    if (keystroke.position < 0 || keystroke.position >= room.text.length) {
      return { valid: false, suspicious: true, reason: 'position-out-of-bounds' };
    }

    // Speed check: if interval between keystrokes is < 20ms, flag as suspicious
    // (humanly impossible to sustain)
    if (previousKeystroke && previousKeystroke.position >= 0) {
      const interval = keystroke.timestamp - previousKeystroke.timestamp;
      if (interval < 20 && interval >= 0) {
        return { valid: true, suspicious: true, reason: 'superhuman-speed' };
      }
    }

    return { valid: true, suspicious: false };
  }
}
