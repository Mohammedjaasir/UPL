interface JerseyPreviewProps {
  name: string
  number: string
  size: string
  /** Caption before the size; the registration form speaks to the player. */
  caption?: string
}

/** Live mock-up of the back of the player's shirt. Decorative; the real values are in the fields. */
export function JerseyPreview({ name, number, size, caption = 'Your jersey' }: JerseyPreviewProps) {
  const label = name.trim()
  return (
    <figure className="jersey-preview" aria-hidden="true">
      <svg className="jersey" viewBox="0 0 100 100" focusable="false">
        <path
          className="jersey__shirt"
          d="M33 7 19 12 3 29l13 14 9-6v56h50V37l9 6 13-14L81 12 67 7c-3 8-9 12-17 12S36 15 33 7z"
        />
        <path className="jersey__trim" d="M33 7c3 8 9 12 17 12s14-4 17-12" />
        <text
          className={`jersey__name${label ? '' : ' jersey__placeholder'}`}
          x="50"
          y="38"
          textAnchor="middle"
          // Long names are squeezed to fit between the sleeves, like real shirt printing.
          {...(label.length > 7 ? { textLength: 46, lengthAdjust: 'spacingAndGlyphs' } : {})}
        >
          {label || 'NAME'}
        </text>
        <text className={`jersey__number${number ? '' : ' jersey__placeholder'}`} x="50" y="78" textAnchor="middle">
          {number || '00'}
        </text>
      </svg>
      <figcaption className="jersey-preview__caption">
        {caption}
        {size ? <> · <strong>{size}</strong></> : null}
      </figcaption>
    </figure>
  )
}
