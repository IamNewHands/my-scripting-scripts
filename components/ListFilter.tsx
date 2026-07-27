import { HStack, Text, TextField } from "scripting"

export function ListFilter({
  value,
  onChanged,
  placeholder,
  count,
}: {
  value: string
  onChanged: (v: string) => void
  placeholder: string
  count: number
}) {
  return (
    <HStack spacing={8}>
      <TextField
        title="过滤"
        prompt={placeholder}
        value={value}
        onChanged={onChanged}
      />
      <Text font="caption" foregroundStyle="secondaryLabel">
        共 {count}
      </Text>
    </HStack>
  )
}

/** 简易不区分大小写的子串匹配（中英文都可用） */
export function matchesFilter(text: string, q: string): boolean {
  if (!q) return true
  return String(text).toLowerCase().includes(q.toLowerCase())
}
