import * as Haptics from 'expo-haptics';

/**
 * One vocabulary of touch feedback for the whole app.
 * Android uses the system haptic constants (they respect the user's touch-feedback setting
 * and need no vibrate permission); iOS uses the Taptic Engine equivalents.
 */
const android = process.env.EXPO_OS === 'android';
const web = process.env.EXPO_OS === 'web';

function run(fn: () => Promise<void>) {
  if (web) return;
  fn().catch(() => {});
}

export const haptic = {
  /** A single egg, a key press, a chip. */
  tick: () => run(() => (android ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Keyboard_Tap) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))),
  /** A full tray of 30. Noticeably heavier than an egg. */
  tray: () => run(() => (android ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium))),
  /** Scrubbing across a chart: one tick per data point. */
  scrub: () => run(() => (android ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick) : Haptics.selectionAsync())),
  toggleOn: () => run(() => (android ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Toggle_On) : Haptics.selectionAsync())),
  toggleOff: () => run(() => (android ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Toggle_Off) : Haptics.selectionAsync())),
  success: () => run(() => (android ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm) : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))),
  warning: () => run(() => (android ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject) : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning))),
};
