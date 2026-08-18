import { Image, Picker } from "scripting"
import type { SearchEntity } from "../model/searchModel"

interface Props {
  value: SearchEntity
  onChanged: (value: SearchEntity) => void
}

export default function SearchPlatformPicker({ value, onChanged }: Props) {
  return (
    <Picker
      value={value}
      onChanged={onChanged as (value: string | number) => void}
      pickerStyle="palette"
      label={<Image systemName="apps.iphone" />}
    >
      <Image tag="software" systemName="iphone" accessibilityLabel="iPhone" />
      <Image tag="iPadSoftware" systemName="ipad" accessibilityLabel="iPad" />
    </Picker>
  )
}
