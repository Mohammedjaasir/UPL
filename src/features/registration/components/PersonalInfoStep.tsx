import { DOB_MAX, DOB_MIN, NAME_MAX_LENGTH, VILLAGES, WHATSAPP_COUNTRY_CODE } from '../constants'
import type { RegistrationForm } from '../useRegistrationForm'
import { normalizeFullName, sanitizeWhatsappInput } from '../validation'
import { ChoiceGroup } from './ChoiceGroup'
import { Field } from './Field'
import { describedBy, fieldId } from './fieldIds'

type Props = Pick<RegistrationForm, 'data' | 'errors' | 'setField' | 'touchField'>

export function PersonalInfoStep({ data, errors, setField, touchField }: Props) {
  return (
    <>
      <Field name="fullName" label="Full Name" error={errors.fullName}>
        <input
          id={fieldId('fullName')}
          className="input"
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          maxLength={NAME_MAX_LENGTH + 10}
          value={data.fullName}
          onChange={(event) => setField('fullName', event.target.value)}
          onBlur={() => {
            setField('fullName', normalizeFullName(data.fullName))
            touchField('fullName')
          }}
          aria-invalid={errors.fullName ? true : undefined}
          aria-describedby={describedBy('fullName', { error: errors.fullName })}
        />
      </Field>

      <Field
        name="dateOfBirth"
        label="Date of Birth"
        labelSuffix={<span className="field__label-note"> (2012 or earlier)</span>}
        error={errors.dateOfBirth}
      >
        <input
          id={fieldId('dateOfBirth')}
          className={`input input--date${data.dateOfBirth ? '' : ' input--empty'}`}
          type="date"
          autoComplete="bday"
          min={DOB_MIN}
          max={DOB_MAX}
          value={data.dateOfBirth}
          onChange={(event) => setField('dateOfBirth', event.target.value)}
          onBlur={() => touchField('dateOfBirth')}
          aria-invalid={errors.dateOfBirth ? true : undefined}
          aria-describedby={describedBy('dateOfBirth', { error: errors.dateOfBirth })}
        />
      </Field>

      <ChoiceGroup
        name="village"
        legend="Village"
        options={VILLAGES}
        value={data.village}
        onChange={(value) => {
          setField('village', value)
          touchField('village')
        }}
        error={errors.village}
        columns={3}
      />

      <Field
        name="whatsappNumber"
        label="WhatsApp Number"
        hint="We'll send match updates to this number."
        error={errors.whatsappNumber}
      >
        <div className="input-group">
          <span className="input-group__prefix" aria-hidden="true">
            {WHATSAPP_COUNTRY_CODE}
          </span>
          <input
            id={fieldId('whatsappNumber')}
            className="input input-group__input"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            enterKeyHint="done"
            placeholder="77 123 4567"
            value={data.whatsappNumber}
            onChange={(event) => setField('whatsappNumber', sanitizeWhatsappInput(event.target.value))}
            onBlur={() => touchField('whatsappNumber')}
            aria-label={`WhatsApp number, country code ${WHATSAPP_COUNTRY_CODE}`}
            aria-invalid={errors.whatsappNumber ? true : undefined}
            aria-describedby={describedBy('whatsappNumber', { hint: true, error: errors.whatsappNumber })}
          />
        </div>
      </Field>
    </>
  )
}
