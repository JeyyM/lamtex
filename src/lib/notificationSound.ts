export type NotificationSoundId = 'alert-tri' | 'chat-ping';

const ACTIVE_SOUND_ID: NotificationSoundId = 'alert-tri';
const CHAT_SOUND_ID: NotificationSoundId = 'chat-ping';

let _audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!_audioCtx) _audioCtx = new AC();
    return _audioCtx;
  } catch {
    return null;
  }
}

export async function unlockNotificationAudio(): Promise<void> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume();
  } catch {
    // ignore
  }
}

function tone(
  ctx: AudioContext,
  start: number,
  freq: number,
  duration: number,
  volume: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playAlert(ctx: AudioContext, t: number): void {
  tone(ctx, t, 523.25, 0.12, 0.2);
  tone(ctx, t + 0.14, 659.25, 0.12, 0.2);
  tone(ctx, t + 0.28, 783.99, 0.2, 0.22);
}

/** Soft double ping — distinct from the rising Alert used for workflow notifications. */
function playChatPing(ctx: AudioContext, t: number): void {
  tone(ctx, t, 880, 0.07, 0.16);
  tone(ctx, t + 0.09, 1046.5, 0.11, 0.14);
}

async function playSound(playFn: (ctx: AudioContext, t: number) => void): Promise<void> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume();
    if (ctx.state !== 'running') return;
    playFn(ctx, ctx.currentTime);
  } catch {
    // fail silently
  }
}

export function getNotificationSoundId(): NotificationSoundId {
  return ACTIVE_SOUND_ID;
}

export function getChatNotificationSoundId(): NotificationSoundId {
  return CHAT_SOUND_ID;
}

/** Workflow / bell notifications (orders, approvals, etc.). */
export async function playNotificationSound(): Promise<void> {
  await playSound(playAlert);
}

/** Chat message notifications only. */
export async function playChatNotificationSound(): Promise<void> {
  await playSound(playChatPing);
}
