import { Button, Divider, HStack, Menu, Text, useEffect, useMemo, useObservable } from "scripting"
import { AnimText } from "../../../components/AnimText"
import { COUNTRIES, countryCodeToFlag } from "../../../utils/countries"

interface RegionPickerProps {
  value: string
  label: string
  onChanged: (value: string) => void
}

function RotatingGlobe() {
  const deg = useObservable(0)
  const animation = useMemo(() => ({
    rotationEffect: deg.value,
    animation: {
      animation: Animation.linear(4).repeatForever(false),
      value: deg.value,
    },
  }), [deg.value])

  useEffect(() => {
    deg.setValue(360)
  }, [])

  return <Text {...animation}>🌍</Text>
}

export default function RegionPicker({ value, label, onChanged }: RegionPickerProps) {
  return (
    <Menu
      label={
        <HStack spacing={0}>
          <RotatingGlobe />
          <AnimText foregroundStyle="label">{label}</AnimText>
        </HStack>
      }
    >
      {COUNTRIES.flatMap((country, index) => [
        <Button
          key={country.code}
          title={`${countryCodeToFlag(country.code)} ${country.name} - ${country.code}`}
          systemImage={country.code === value ? "checkmark" : undefined}
          action={() => onChanged(country.code)}
        />,
        index < COUNTRIES.length - 1 ? <Divider key={`${country.code}-divider`} /> : null,
      ])}
    </Menu>
  )
}
