import { BATTING_STYLES, JERSEY_SIZES, PLAYING_ROLES } from '../constants'
import type { PlayingRole } from '../types'
import type { RegistrationForm } from '../useRegistrationForm'
import { ChoiceGroup, type ChoiceOption } from './ChoiceGroup'
import { AllRounderIcon, BallIcon, BatIcon, StumpsIcon } from './icons'
import { JerseyNumberField } from './JerseyNumberField'
import { PhotoUpload } from './PhotoUpload'

const ROLE_DETAILS: Record<PlayingRole, Pick<ChoiceOption<PlayingRole>, 'icon' | 'description'>> = {
  batsman: { icon: <BatIcon />, description: 'Scores the runs' },
  bowler: { icon: <BallIcon />, description: 'Takes the wickets' },
  all_rounder: { icon: <AllRounderIcon />, description: 'Bats and bowls' },
  wicket_keeper: { icon: <StumpsIcon />, description: 'Behind the stumps' },
}

const ROLE_OPTIONS = PLAYING_ROLES.map((role) => ({ ...role, ...ROLE_DETAILS[role.value] }))

type Props = Pick<RegistrationForm, 'data' | 'errors' | 'setField' | 'touchField'> & {
  photoUrl: string | null
}

export function ProfileStep({ data, errors, setField, touchField, photoUrl }: Props) {
  return (
    <>
      <h3 className="section-title">Playing Style</h3>
      <ChoiceGroup
        name="playingRole"
        legend="Playing Role"
        variant="card"
        options={ROLE_OPTIONS}
        value={data.playingRole}
        onChange={(value) => {
          setField('playingRole', value)
          touchField('playingRole')
        }}
        error={errors.playingRole}
        columns={2}
      />
      <ChoiceGroup
        name="battingStyle"
        legend="Batting Style"
        options={BATTING_STYLES}
        value={data.battingStyle}
        onChange={(value) => {
          setField('battingStyle', value)
          touchField('battingStyle')
        }}
        error={errors.battingStyle}
        columns={2}
      />

      <PhotoUpload
        file={data.playerPhoto}
        previewUrl={photoUrl}
        error={errors.playerPhoto}
        onChange={(file) => setField('playerPhoto', file)}
        onTouched={() => touchField('playerPhoto')}
      />

      <h3 className="section-title">Match Kit</h3>
      <ChoiceGroup
        name="jerseySize"
        legend="Jersey Size"
        options={JERSEY_SIZES}
        value={data.jerseySize}
        onChange={(value) => {
          setField('jerseySize', value)
          touchField('jerseySize')
        }}
        error={errors.jerseySize}
        columns={4}
      />
      <JerseyNumberField
        value={data.jerseyNumber}
        size={data.jerseySize}
        error={errors.jerseyNumber}
        onChange={(value) => setField('jerseyNumber', value)}
        onBlur={() => touchField('jerseyNumber')}
      />
    </>
  )
}
