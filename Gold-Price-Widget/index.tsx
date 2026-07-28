import {
  Navigation,
  NavigationStack,
  Script,
  Widget,
  Text,
  VStack,
  HStack,
  Spacer,
  List,
  Section,
  Image,
  useObservable,
} from "scripting"

const STORAGE_PREFIX = "goldPrice_"

const SOURCES = [
  { key: "cmb", label: "招商银行", desc: "招行黄金实时买入/卖出价" },
  { key: "zs", label: "浙商银行", desc: "京东金融浙商积存金价格" },
  { key: "icbc", label: "工商银行", desc: "工商银行积存金价格" },
  { key: "ms", label: "民生银行", desc: "民生银行积存金价格" },
  { key: "cgb", label: "广发银行", desc: "广发银行积存金价格" },
  { key: "cib", label: "兴业银行", desc: "兴业银行积存金价格" },
  { key: "jd", label: "京东黄金", desc: "京东金融黄金价格" },
  { key: "gj", label: "国际伦敦金", desc: "国际伦敦金价格 (USD)" },
]

function SettingsView() {
  const currentSource = Storage.get<string>(`${STORAGE_PREFIX}source`) ?? "cmb"
  const selected = useObservable<string>(currentSource)

  return (
    <NavigationStack>
      <List navigationTitle="金价设置">
        <Section header={<Text>选择数据源</Text>} footer={<Text>点击银行切换金价来源</Text>}>
          {SOURCES.map((source) => (
            <HStack
              key={source.key}
              padding={{ vertical: 12, horizontal: 16 }}
              background="systemBackground"
              onTapGesture={() => {
                selected.setValue(source.key)
                Storage.set(`${STORAGE_PREFIX}source`, source.key)
                Widget.reloadAll()
              }}
            >
              <VStack alignment="leading" spacing={4}>
                <Text fontWeight="semibold">{source.label}</Text>
                <Text font="caption" opacity={0.6}>{source.desc}</Text>
              </VStack>
              <Spacer />
              {selected.value === source.key ? (
                <Image systemName="checkmark.circle.fill" foregroundStyle="blue" />
              ) : null}
            </HStack>
          ))}
        </Section>
      </List>
    </NavigationStack>
  )
}

async function run() {
  await Navigation.present({
    element: <SettingsView />,
  })

  Script.exit()
}

run()