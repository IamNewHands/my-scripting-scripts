import { Button, Divider, HStack, Menu } from "scripting"
import { AnimText } from "../../../components/AnimText"
import { COUNTRIES, countryCodeToFlag } from "../../../utils/countries"
import CountryFlag from "../../../components/CountryFlag"

interface RegionPickerProps {
  value: string
  label: string
  onChanged: (value: string) => void
}

export default function RegionPicker({ value, label, onChanged }: RegionPickerProps) {
  return (
    <Menu
      label={
        <HStack spacing={6}>
          <CountryFlag value={countryCodeToFlag(value)} size={20} />
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