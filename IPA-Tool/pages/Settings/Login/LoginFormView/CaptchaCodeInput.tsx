import {
  GeometryReader,
  HStack,
  Rectangle,
  RoundedRectangle,
  TextField,
  VStack,
  Spacer,
  ZStack,
} from "scripting";
import { AnimText } from "../../../../components/AnimText";

const slotSpacing = 10;
const slotHeight = 74;
const slotRadius = 14;
const slotGlass = UIGlass.clear().interactive(true);

const normalizeCode = (value: string, length: number) =>
  value.replace(/\D/g, "").slice(0, length);

type CaptchaCodeInputProps = {
  value: string;
  onChanged: (value: string) => void;
  length?: number;
};

type CodeSlotsProps = {
  code: string;
  length: number;
  width: number;
};

function CodeSlots({ code, length, width }: CodeSlotsProps) {
  const activeIndex = Math.min(code.length, length - 1);
  const slotWidth = (width - slotSpacing * (length - 1)) / length;

  return (
    <HStack
      spacing={slotSpacing}
      frame={{ width, height: 82 }}
      allowsHitTesting={false}
    >
      {Array.from({ length }, (_, index) => {
        const char = code[index] ?? "";
        const isActive = index === activeIndex && code.length < length;
        const borderStyle = isActive
          ? ("systemBlue" as const)
          : {
              light: "rgba(255,255,255,0.58)" as const,
              dark: "rgba(255,255,255,0.18)" as const,
            };

        return (
          <ZStack>
            <RoundedRectangle
              key={index}
              cornerRadius={slotRadius}
              style="continuous"
              fill={{
                light: "rgba(255,255,255,0.34)",
                dark: "rgba(255,255,255,0.08)",
              }}
              stroke={{
                shapeStyle: borderStyle,
                strokeStyle: { lineWidth: 5 },
              }}
              frame={{ width: slotWidth, height: slotHeight }}
              glassEffect={{
                glass: slotGlass,
                shape: {
                  type: "rect",
                  cornerRadius: slotRadius,
                  style: "continuous",
                },
              }}
              shadow={{
                color: isActive ? "rgba(0,122,255,0.32)" : "rgba(0,0,0,0.22)",
                radius: isActive ? 16 : 14,
                y: 9,
              }}
              clipShape={{
                type: "rect",
                cornerRadius: slotRadius,
                style: "continuous",
              }}
              clipped
            />
            {char ? (
              <AnimText
                font={36}
                fontWeight="regular"
                foregroundStyle="label"
                anim={"numericTextCountsUp"}
              >
                {char}
              </AnimText>
            ) : isActive ? (
              <Rectangle fill="systemBlue" frame={{ width: 2, height: 40 }} />
            ) : (
              <VStack frame={{ width: slotWidth, height: slotHeight }}>
                <Spacer />
                <Rectangle
                  fill={{
                    light: "rgba(60,60,67,0.24)",
                    dark: "rgba(235,235,245,0.28)",
                  }}
                  frame={{ width: 22, height: 3 }}
                  padding={{ bottom: 16 }}
                  clipShape={{
                    type: "rect",
                    cornerRadius: 1.5,
                    style: "continuous",
                  }}
                />
              </VStack>
            )}
          </ZStack>
        );
      })}
    </HStack>
  );
}

export function CaptchaCodeInput({
  value,
  onChanged,
  length = 6,
}: CaptchaCodeInputProps) {
  const code = normalizeCode(value, length);

  return (
    <ZStack frame={{ maxWidth: "infinity", height: 82 }}>
      <GeometryReader>
        {proxy => (
          <CodeSlots
            key={proxy.size.width}
            code={code}
            length={length}
            width={proxy.size.width}
          />
        )}
      </GeometryReader>

      <TextField
        title=""
        value={code}
        onChanged={text => onChanged(normalizeCode(text, length))}
        keyboardType="numberPad"
        textContentType="oneTimeCode"
        textFieldStyle="plain"
        autofocus
        foregroundStyle="clear"
        tint="clear"
        background="clear"
        frame={{ maxWidth: "infinity", height: 82 }}
      />
    </ZStack>
  );
}
