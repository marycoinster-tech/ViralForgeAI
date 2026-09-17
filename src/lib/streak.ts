// Posting streak tracker — localStorage-based, no backend needed

const STREAK_KEY = (uid: string) => `viralforge_streak_${uid}`;
const LAST_GEN_KEY = (uid: string) => `viralforge_last_gen_${uid}`;

export interface StreakData {
  count: number;
  lastDate: string | null;
  isActiveToday: boolean;
}

export function getStreak(userId: string): StreakData {
  const count = parseInt(localStorage.getItem(STREAK_KEY(userId)) || '0', 10);
  const lastDate = localStorage.getItem(LAST_GEN_KEY(userId));
  const today = new Date().toDateString();
  const isActiveToday = lastDate === today;
  return { count, lastDate, isActiveToday };
}

/** Call this each time the user successfully generates content.
 *  Returns the new streak count. */
export function updateStreak(userId: string): number {
  const today = new Date().toDateString();
  const { count, lastDate } = getStreak(userId);

  // Already counted today — don't double-increment
  if (lastDate === today) return count;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  // Streak continues if they generated yesterday; otherwise reset to 1
  const newCount = lastDate === yesterdayStr ? count + 1 : 1;

  localStorage.setItem(STREAK_KEY(userId), String(newCount));
  localStorage.setItem(LAST_GEN_KEY(userId), today);
  return newCount;
}

/** Clears the streak (e.g. for testing or account wipe). */
export function clearStreak(userId: string) {
  localStorage.removeItem(STREAK_KEY(userId));
  localStorage.removeItem(LAST_GEN_KEY(userId));
}
