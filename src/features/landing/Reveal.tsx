import type { CSSProperties, ElementType, ReactNode } from 'react'
import { useInView } from './motionHooks'

/** Fades/slides its children in when scrolled into view. `index` staggers siblings. */
export function Reveal({
  as: Tag = 'div',
  index = 0,
  className = '',
  children,
}: {
  as?: ElementType
  index?: number
  className?: string
  children: ReactNode
}) {
  const { ref, inView } = useInView<HTMLElement>()
  return (
    <Tag
      ref={ref}
      className={`reveal${inView ? ' is-in' : ''}${className ? ` ${className}` : ''}`}
      style={{ '--i': index } as CSSProperties}
    >
      {children}
    </Tag>
  )
}
