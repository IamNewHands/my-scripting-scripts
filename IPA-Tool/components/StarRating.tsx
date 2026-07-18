import { HStack, Image, VStack, ZStack, type Color } from "scripting"

type StarSize = "small" | "medium" | "large" | number

interface StarRatingProps {
  score: number
  size?: StarSize
  color?: Color
  direction?: "x" | "y"
  spacing?: number
}

const STAR_COUNT = 5

const getNumericSize = (size: StarSize): number => {
  if (typeof size === "number") return size

  switch (size) {
    case "small":
      return 14
    case "medium":
      return 18
    case "large":
      return 28
    default:
      return 24
  }
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

const makeStars = ({
  systemName,
  size,
  color,
  direction,
  spacing,
}: {
  systemName: "star" | "star.fill"
  size: number
  color: Color
  direction: "x" | "y"
  spacing: number
}) => {
  const Direction = direction === "x" ? HStack : VStack

  return (
    <Direction spacing={spacing}>
      {Array.from({ length: STAR_COUNT }, (_, index) => (
        <Image
          key={index}
          systemName={systemName}
          foregroundStyle={color}
          font={size}
          frame={{ width: size, height: size }}
        />
      ))}
    </Direction>
  )
}

export const StarRating = ({
  score = 0,
  size = "medium",
  color = "#FFD700",
  direction = "x",
  spacing = 5,
}: StarRatingProps) => {
  const starSize = getNumericSize(size)
  const totalLength = starSize * STAR_COUNT + spacing * (STAR_COUNT - 1)
  const filledLength = totalLength * clamp(score / STAR_COUNT)

  const frame = direction === "x"
    ? { width: totalLength, height: starSize }
    : { width: starSize, height: totalLength }

  const filledFrame = direction === "x"
    ? { width: filledLength, height: starSize, alignment: "leading" as const }
    : { width: starSize, height: filledLength, alignment: "top" as const }

  return (
    <ZStack alignment={direction === "x" ? "leading" : "top"} frame={frame}>
      {makeStars({
        systemName: "star",
        size: starSize,
        color,
        direction,
        spacing,
      })}

      <ZStack frame={filledFrame} clipped={true} alignment={direction === "x" ? "leading" : "top"}>
        {makeStars({
          systemName: "star.fill",
          size: starSize,
          color,
          direction,
          spacing,
        })}
      </ZStack>
    </ZStack>
  )
}

export default StarRating
