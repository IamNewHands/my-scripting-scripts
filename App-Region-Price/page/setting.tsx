import {
  Button,
  HStack,
  Image,
  List,
  Navigation,
  NavigationStack,
  Section,
  Spacer,
  Text,
  useEffect,
  useObservable,
} from "scripting"
import { DEFAULT_COUNTRIES, itunes, regionLabel, type CountryItem } from "../class/itunes"
import { isValidRegion, isValidCurrency } from "../util/validate"

/** 校验地区/货币代码并提示；通过返回 true */
async function validateCodes(region: string, currency: string): Promise<boolean> {
  if (!isValidRegion(region)) {
    await Dialog.alert({ title: "格式错误", message: "国家代码必须是 2 位字母，如 CN、US" })
    return false
  }
  if (!isValidCurrency(currency)) {
    await Dialog.alert({ title: "格式错误", message: "货币代码必须是 3 位字母，如 CNY、USD" })
    return false
  }
  return true
}

export function View() {
  const dismiss = Navigation.useDismiss()
  return (
    <NavigationStack>
      <StackView
        navigationTitle={"设置"}
        toolbar={{
          cancellationAction: [
            <Button title={"关闭"} systemImage={"xmark"} action={dismiss} />,
          ],
          confirmationAction: [
            <Button
              title={"保存"}
              systemImage={"checkmark"}
              action={() => {
                itunes.save()
                dismiss()
              }}
            />,
          ],
        }}
      />
    </NavigationStack>
  )
}

function StackView() {
  const list = useObservable(itunes.countries.map((c) => ({ ...c })))
  const tick = useObservable(0)

  useEffect(() => {
    // 每次打开设置与存储对齐
    list.setValue(itunes.countries.map((c) => ({ ...c })))
  }, [])

  function apply(next: CountryItem[]) {
    itunes.countries = next.map((c) => ({ ...c }))
    list.setValue(next.map((c) => ({ ...c })))
    tick.setValue(Number(tick.value || 0) + 1)
  }

  function onAdd(region: string, rate: string, enabled: boolean) {
    apply([...list.value, { region, rate, enabled }])
  }

  function onDelete(index: number) {
    apply(list.value.filter((_, idx) => idx !== index))
  }

  function onEdit(index: number, region: string, rate: string, enabled: boolean) {
    const next = [...list.value]
    next[index] = { region, rate, enabled }
    apply(next)
  }

  function onToggle(index: number) {
    const next = list.value.map((c, i) =>
      i === index ? { ...c, enabled: !c.enabled } : { ...c }
    )
    apply(next)
  }

  function onReset() {
    apply(DEFAULT_COUNTRIES.map((c) => ({ ...c })))
    itunes.save()
  }

  return (
    <List>
      <Section
        header={<Text>地区</Text>}
        footer={
          <Text font="footnote" foregroundStyle="secondaryLabel">
            {
              "点选开关启用/禁用。进入应用详情后会按已启用地区分别展示价格。国家代码如 CN/US，汇率代码如 CNY/USD。"
            }
          </Text>
        }
      >
        {list.value.map((i, idx) => (
          <CountryItem
            key={`${i.region}-${idx}-${tick.value}`}
            region={i.region}
            rate={i.rate}
            enabled={i.enabled}
            onToggle={() => onToggle(idx)}
            trailingSwipeActions={{
              actions: [
                <Button title={"删除"} role={"destructive"} action={() => onDelete(idx)} />,
                <Button
                  title={"编辑"}
                  action={async () => {
                    const region = await Dialog.prompt({
                      title: "编辑",
                      message: "请输入国家代码（2 位字母，如 US）",
                      defaultValue: i.region,
                    })
                    if (!region) return
                    const rate = await Dialog.prompt({
                      title: "编辑",
                      message: "请输入货币代码（3 位字母，如 USD）",
                      defaultValue: i.rate,
                    })
                    if (!rate) return
                    const r = region.trim().toUpperCase()
                    const c = rate.trim().toUpperCase()
                    if (!(await validateCodes(r, c))) return
                    // 检查是否已存在相同地区（排除自身）
                    const dup = list.value.findIndex(
                      (x: CountryItem, j: number) => j !== idx && x.region === r
                    )
                    if (dup !== -1) {
                      await Dialog.alert({ title: "已存在", message: `地区 ${r} 已在列表中` })
                      return
                    }
                    onEdit(idx, r, c, i.enabled)
                  }}
                />,
              ],
            }}
          />
        ))}
        <Button
          title={"添加"}
          systemImage={"plus.circle.fill"}
          symbolRenderingMode={"multicolor"}
          action={async () => {
            try {
              const region = await Dialog.prompt({
                title: "添加",
                message: "请输入国家代码（2 位字母，如 US）",
              })
              if (!region) return
              const rate = await Dialog.prompt({
                title: "添加",
                message: "请输入货币代码（3 位字母，如 USD）",
              })
              if (!rate) return
              const r = region.trim().toUpperCase()
              const c = rate.trim().toUpperCase()
              if (!(await validateCodes(r, c))) return
              // 去重：同地区代码只保留一条
              if (list.value.some((x: CountryItem) => x.region === r)) {
                await Dialog.alert({ title: "已存在", message: `地区 ${r} 已在列表中` })
                return
              }
              onAdd(r, c, true)
            } catch (e) {
              Dialog.alert({ title: "错误", message: String(e) })
            }
          }}
        />
      </Section>
      <Section
        footer={
          <Text font="footnote" foregroundStyle="secondaryLabel">
            {"恢复 CN/US/HK/TW/JP/GB/SG 等常用区默认开关状态。"}
          </Text>
        }
      >
        <Button title={"恢复默认多区"} role={"destructive"} action={onReset} />
      </Section>
    </List>
  )
}

function CountryItem({
  region,
  rate,
  enabled,
  onToggle,
}: {
  region: string
  rate: string
  enabled: boolean
  onToggle: () => void
}) {
  const label = regionLabel(region)
  return (
    <Button buttonStyle={"plain"} action={onToggle}>
      <HStack contentShape={"rect"} spacing={6}>
        <Text font={"subheadline"}>{label}</Text>
        <Text font={"caption"} foregroundStyle={"secondaryLabel"}>{rate}</Text>
        <Spacer />
        {enabled ? (
          <Image foregroundStyle={"accentColor"} fontWeight={"medium"} systemName={"checkmark"} />
        ) : null}
      </HStack>
    </Button>
  )
}
