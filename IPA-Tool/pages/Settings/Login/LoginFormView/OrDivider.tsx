import { HStack, Rectangle } from "scripting";
import { AnimText } from "../../../../components/AnimText";
import { dividerFill } from "./styles";

export function OrDivider() {
  return (
    <HStack spacing={16} padding={{ vertical: 10 }}>
      <Rectangle
        fill={dividerFill}
        frame={{ height: 1 }}
        padding={{ horizontal: 3 }}
      />
      <AnimText font="footnote" foregroundStyle="secondaryLabel">
        OR
      </AnimText>
      <Rectangle
        fill={dividerFill}
        frame={{ height: 1 }}
        padding={{ horizontal: 3 }}
      />
    </HStack>
  );
}
