import { HStack, Slider, VStack, Menu, Image, Text } from "scripting";
import { MAX_SKELETON_COUNT } from "../model/searchModel";
import { AnimText } from "../../../components/AnimText";

interface SearchCountPickerProps {
  value: number;
  onChanged: (value: number) => void;
}

export default function SearchCountPicker({
  value,
  onChanged,
}: SearchCountPickerProps) {
  const count = Math.round(value);

  return (
    <Menu
      label={
        <HStack spacing={0}>
          <Image
systemName="line.3.horizontal.decrease.circle"
            imageScale="medium"
            foregroundStyle="label"
          />
          <AnimText foregroundStyle="label">{count}</AnimText>
        </HStack>
      }
    >
      <VStack spacing={5}>
        <AnimText>{`count：${count}`}</AnimText>
        <Slider
          padding={0}
          value={count}
          min={0}
          max={MAX_SKELETON_COUNT}
          step={5}
          label={<AnimText>搜索个数</AnimText>}
          onChanged={nextValue => onChanged(Math.round(nextValue))}
        />
      </VStack>
    </Menu>
  );
}
