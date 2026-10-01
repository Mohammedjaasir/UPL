import { STEPS, type StepIndex } from '../steps'
import { CheckIcon } from './icons'

export function StepIndicator({ current }: { current: StepIndex }) {
  return (
    <nav className="stepper" aria-label="Registration progress">
      <ol className="stepper__list">
        {STEPS.map((step, index) => {
          const state = index < current ? 'done' : index === current ? 'current' : 'upcoming'
          return (
            <li key={step.id} className={`stepper__item stepper__item--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="stepper__dot">
                {state === 'done' ? <CheckIcon size={14} strokeWidth={3} /> : index + 1}
              </span>
              <span className="stepper__label">
                {step.label}
                {state === 'done' && <span className="sr-only"> (completed)</span>}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
