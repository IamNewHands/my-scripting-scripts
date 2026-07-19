import { HStack, Spacer, Text, Button } from "scripting";

export function InfoSection({
  name,
  appid,
  version,
  date,
  symbol,
}: {
  name: string;
  appid: string;
  version: string;
  date: string;
  symbol: string;
}) {
  return (
    <>
      <InfoItem title="应用名称" content={name} />
      <InfoItem title="应用编号" content={appid} />
      <InfoItem title="当前版本" content={version} />
      <InfoItem title="更新时间" content={date} />
      <InfoItem title="包标识符" content={symbol} />
    </>
  );
}

function InfoItem({ title, content }: { title: string; content: string }) {
  return (
    <HStack
      contextMenu={{
        menuItems: (
          <>
            <Button title="复制" action={() => Pasteboard.setString(content)} />
          </>
        ),
      }}>
      <Text foregroundStyle={"secondaryLabel"}>{title}</Text>
      <Spacer />
      <Text>{content}</Text>
    </HStack>
  );
}
