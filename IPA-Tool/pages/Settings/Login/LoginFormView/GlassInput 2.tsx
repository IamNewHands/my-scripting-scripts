import { Button, HStack, Image, SecureField, TextField, VStack } from "scripting";
import { AnimText } from "../../../../components/AnimText";
import { pillGlassProps } from "./styles";

type GlassInputProps = {
  label: string;
  prompt: string;
  value: string;
  onChanged: (value: string) => void;
  keyboardType?: "numberPad";
  secure?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
};

export function GlassInput({
  label,
  prompt,
  value,
  onChanged,
  keyboardType,
  secure = false,
  showPassword = false,
  onTogglePassword,
}: GlassInputProps) {
  return (
    <VStack alignment="leading" spacing={7}>
      <AnimText font="callout" foregroundStyle="secondaryLabel">
        {label}
      </AnimText>
      <HStack spacing={8} {...pillGlassProps}>
        {secure && !showPassword ? (
          <SecureField
            title=""
            prompt={prompt}
            value={value}
            onChanged={onChanged}
          />
        ) : (
          <TextField
            title=""
            prompt={prompt}
            value={value}
            onChanged={onChanged}
            keyboardType={keyboardType}
            textFieldStyle="plain"
            textInputAutocapitalization={
              label === "Apple ID" ? "never" : undefined
            }
          />
        )}
        {secure && onTogglePassword && (
          <Button action={onTogglePassword} buttonStyle="plain">
            <Image
              systemName={showPassword ? "eye.slash" : "eye.slash.fill"}
              font={17}
              foregroundStyle="secondaryLabel"
            />
          </Button>
        )}
      </HStack>
    </VStack>
  );
}
