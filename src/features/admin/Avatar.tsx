import { PlayerIcon } from './icons'
import type { Player } from './players'

/** Player photo (signed link), or a neutral placeholder when it is missing. */
export function Avatar({ player, large = false }: { player: Player; large?: boolean }) {
  const cls = large ? 'avatar avatar--large' : 'avatar'
  return player.photoUrl ? (
    <img className={cls} src={player.photoUrl} alt="" loading="lazy" decoding="async" />
  ) : (
    <span className={`${cls} avatar--empty`} aria-hidden="true">
      <PlayerIcon size={large ? 40 : 20} />
    </span>
  )
}
