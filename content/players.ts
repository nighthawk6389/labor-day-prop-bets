/**
 * The Men of Labor Day.
 *
 * `code` is the 2-digit login code — short on purpose so nobody has to remember
 * a PIN at a barbecue. Text each guy his code; changing one here and redeploying
 * applies it (the board reseeds until the first real bet lands).
 */
export type PlayerSeed = {
  slug: string
  name: string
  emoji: string
  code: string
  commissioner?: boolean
}

export const PLAYERS: PlayerSeed[] = [
  { slug: 'ilan', name: 'Ilan Elkobi', emoji: '🔥', code: '47', commissioner: true },
  { slug: 'chaim', name: 'Chaim', emoji: '🏕️', code: '82' },
  { slug: 'brian', name: 'Brian Wiener', emoji: '🥏', code: '19' },
  { slug: 'yona', name: 'Yona', emoji: '🎾', code: '63' },
  { slug: 'moshe', name: 'Moshe Fox', emoji: '🔊', code: '58' },
  { slug: 'oren', name: 'Oren Feder', emoji: '🍖', code: '91' },
  { slug: 'netanel', name: 'Netanel Heiser', emoji: '😐', code: '36' },
  { slug: 'justin', name: 'Justin', emoji: '🥩', code: '74' },
  { slug: 'mikey', name: 'Mikey', emoji: '🎸', code: '25' },
]
