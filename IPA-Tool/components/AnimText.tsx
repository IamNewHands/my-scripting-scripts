import type { ContentTransition, TextProps } from "scripting"
import { Text, useEffect, useMemo, useState } from "scripting"

export function AnimText({
  children,
  anim = "numericText",
  dur = 0.3,
  ...textProps
}: TextProps & {
  children: Extract<TextProps, { children: any }>["children"]
  anim?: ContentTransition
  dur?: number
}) {
  const [show, setShow] = useState(false)
  const context = (children as unknown as string[]).join("").trim()
  useEffect(() => {
    setShow(true)
  }, [])

  return useMemo(
    () => (
      <Text
        {...textProps}
        contentTransition={anim}
        animation={{ animation: Animation.smooth({ duration: dur }), value: show ? context : "" }}
      >
        {show ? context : ""}
      </Text>
    ),
    [show, context, dur]
  )
}
