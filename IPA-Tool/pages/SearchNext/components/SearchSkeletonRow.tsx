import { Divider, HStack, RoundedRectangle, Spacer, Text, VStack } from "scripting"
import StarRating from "../../../components/StarRating"
import { fontCaption, fontAppName } from "./GlassTag"

function SkeletonTag({ children }: { children: string }) {
  return (
    <Text
      {...fontCaption}
      foregroundStyle="secondaryLabel"
      padding={{ horizontal: 8, vertical: 4 }}
      glassEffect={{
        glass: UIGlass.clear().interactive(true),
        shape: "buttonBorder",
      }}
      truncationMode="tail"
      lineLimit={1}
    >
      {children}
    </Text>
  )
}

export default function SearchSkeletonRow() {
  return (
    <VStack
      alignment="leading"
      spacing={8}
      redacted="placeholder"
      clipped={true}
      
    >
      <HStack spacing={8}>
        <Text {...fontAppName} truncationMode="tail" lineLimit={1}>
          App Name Placeholder
        </Text>
        <Spacer />
        <Text {...fontCaption}>历史</Text>
      </HStack>
      <Divider />

      <HStack spacing={16}>
        <HStack padding={{ trailing: -20 }}>
          <RoundedRectangle
            fill={"secondarySystemBackground"}
            cornerRadius={4}
            frame={{ width: 80, height: 80 }}
          />
          <VStack alignment="leading" spacing={4}>
            <HStack spacing={4}>
              <SkeletonTag>Price placeholder</SkeletonTag>
              <SkeletonTag>Category placeholder</SkeletonTag>
            </HStack>
            <HStack spacing={4}>
              <SkeletonTag>Version placeholder</SkeletonTag>
              <SkeletonTag>Size placeholder</SkeletonTag>
            </HStack>
            <HStack spacing={4}>
              <StarRating score={0} size="medium" />
              <Text {...fontCaption} foregroundStyle="secondaryLabel">
                (0)
              </Text>
            </HStack>
          </VStack>
        </HStack>

        <Spacer />
        <Text {...fontAppName}>GET</Text>
      </HStack>
    </VStack>
  )
}
