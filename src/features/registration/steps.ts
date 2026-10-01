import type { FieldName } from './types'

interface StepDefinition {
  id: string
  label: string
  title: string
  description: string
  fields: readonly FieldName[]
}

export const STEPS: readonly StepDefinition[] = [
  {
    id: 'personal',
    label: 'Personal Info',
    title: 'Personal Info',
    description: 'Tell us who you are and how to reach you.',
    fields: ['fullName', 'dateOfBirth', 'village', 'whatsappNumber'],
  },
  {
    id: 'profile',
    label: 'Profile',
    title: 'Player Profile',
    description: 'Your role on the field and your match kit.',
    fields: ['playingRole', 'battingStyle', 'playerPhoto', 'jerseySize', 'jerseyName', 'jerseyNumber'],
  },
  {
    id: 'review',
    label: 'Review',
    title: 'Review & Submit',
    description: 'Check your details before submitting.',
    fields: [],
  },
]

export type StepIndex = 0 | 1 | 2
export const REVIEW_STEP: StepIndex = 2

export function stepOfField(field: FieldName): StepIndex {
  const index = STEPS.findIndex((step) => step.fields.includes(field))
  return (index === -1 ? 0 : index) as StepIndex
}
