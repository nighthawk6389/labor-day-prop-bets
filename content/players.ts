/** The Men of Labor Day. Edit freely — `npm run seed` re-reads this file. */
export type PlayerSeed = {
  slug: string
  name: string
  emoji: string
  commissioner?: boolean
}

export const PLAYERS: PlayerSeed[] = [
  { slug: 'ilan', name: 'Ilan Elkobi', emoji: '🔥', commissioner: true },
  { slug: 'chaim', name: 'Chaim', emoji: '🏕️' },
  { slug: 'brian', name: 'Brian Wiener', emoji: '🥏' },
  { slug: 'yona', name: 'Yona', emoji: '🎾' },
  { slug: 'moshe', name: 'Moshe Fox', emoji: '🔊' },
  { slug: 'oren', name: 'Oren Feder', emoji: '🍖' },
  { slug: 'netanel', name: 'Netanel Heiser', emoji: '😐' },
  { slug: 'justin', name: 'Justin', emoji: '🥩' },
  { slug: 'mikey', name: 'Mikey', emoji: '🎸' },
]
