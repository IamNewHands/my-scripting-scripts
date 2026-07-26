import {
  List,
  Navigation,
  NavigationStack,
  Button,
  SecureField,
  Section,
  useObservable,
  useEffect,
  Text,
  TextField,
  HStack,
  Spacer,
  Image,
  Picker,
  ProgressView,
  VStack,
} from "scripting";
import { gist, GistProfileMeta } from "../class/gist";

const TOKEN_HELP_URL =
  "https://github.com/settings/tokens/new?scopes=gist&description=Scripting%20Gist";
const TOKEN_LIST_URL = "https://github.com/settings/tokens";

export function View() {
  const dismiss = Navigation.useDismiss();
  const tick = useObservable(0);
  const refresh = () => tick.setValue(tick.value + 1);

  return (
    <NavigationStack>
      <List
        navigationTitle={"设置"}
        toolbar={{
          topBarLeading: [
            <Button title={"完成"} systemImage={"checkmark"} action={dismiss} />,
          ],
          topBarTrailing: [
            <Button
              title="添加档案"
              systemImage="plus"
              action={async () => {
                const ok = await Navigation.present(<ProfileEditor mode="add" />);
                if (ok) refresh();
              }}
            />,
          ],
        }}>
        <ActiveSection key={`a-${tick.value}`} onChanged={refresh} />
        <ProfilesSection key={`p-${tick.value}`} onChanged={refresh} />
        <HelpView />
      </List>
    </NavigationStack>
  );
}

function formatProfileLabel(p: GistProfileMeta) {
  return p.login ? `${p.name} (@${p.login})` : p.name;
}

function ActiveSection({ onChanged }: { onChanged: () => void }) {
  const profiles = gist.listProfiles();
  const activeId = useObservable(gist.activeId || "");

  useEffect(() => {
    if (!activeId.value) return;
    if (activeId.value === gist.activeId) return;
    gist.switchProfile(activeId.value);
    onChanged();
  }, [activeId.value]);

  if (profiles.length === 0) {
    return (
      <Section
        header={<Text>当前档案</Text>}
        footer={
          <Text font="footnote" foregroundStyle="secondaryLabel">
            还没有档案。点右上角「添加档案」，填写名称与 Token。
          </Text>
        }>
        <Text foregroundStyle="secondaryLabel">未配置</Text>
      </Section>
    );
  }

  return (
    <Section
      header={<Text>当前档案</Text>}
      footer={
        <Text font="footnote" foregroundStyle="secondaryLabel">
          切换后列表使用对应账号的 Gist。密钥仅存本脚本 Keychain。
        </Text>
      }>
      <Picker title="切换" value={activeId} pickerStyle="menu">
        {profiles.map((p) => (
          <Text key={p.id} tag={p.id}>
            {formatProfileLabel(p)}
          </Text>
        ))}
      </Picker>
      {gist.activeProfile?.login ? (
        <Text font="footnote" foregroundStyle="secondaryLabel">
          GitHub：@{gist.activeProfile.login}
        </Text>
      ) : null}
    </Section>
  );
}

function ProfilesSection({ onChanged }: { onChanged: () => void }) {
  const profiles = gist.listProfiles();
  return (
    <Section header={<Text>全部档案</Text>}>
      {profiles.length === 0 ? (
        <Text foregroundStyle="secondaryLabel">暂无</Text>
      ) : (
        profiles.map((p) => <ProfileRow key={p.id} profile={p} onChanged={onChanged} />)
      )}
    </Section>
  );
}

function ProfileRow({
  profile,
  onChanged,
}: {
  profile: GistProfileMeta;
  onChanged: () => void;
}) {
  const isActive = gist.activeId === profile.id;
  return (
    <HStack>
      <VStack
        alignment="leading"
        frame={{ maxWidth: Infinity, alignment: "leading" }}
        contentShape="rect"
        onTapGesture={() => {
          if (!isActive) {
            gist.switchProfile(profile.id);
            onChanged();
          }
        }}>
        <HStack spacing={6}>
          <Text fontWeight={isActive ? "semibold" : "regular"}>{profile.name}</Text>
          {isActive ? (
            <Image systemName="checkmark.circle.fill" foregroundStyle="accentColor" />
          ) : null}
        </HStack>
        <Text font="caption" foregroundStyle="secondaryLabel">
          {profile.login ? `@${profile.login}` : isActive ? "当前使用" : "点按名称切换"}
        </Text>
      </VStack>
      <Spacer />
      <Button
        title="编辑"
        systemImage="pencil"
        buttonStyle="borderless"
        action={async () => {
          const ok = await Navigation.present(
            <ProfileEditor mode="edit" profileId={profile.id} />,
          );
          if (ok) onChanged();
        }}
      />
      <Button
        title="删除"
        systemImage="trash"
        role="destructive"
        buttonStyle="borderless"
        action={async () => {
          const confirm = await Dialog.prompt({
            title: "确认删除",
            message: `输入 DELETE 删除「${profile.name}」及其 Token`,
            placeholder: "DELETE",
          });
          if (confirm !== "DELETE") return;
          gist.deleteProfile(profile.id);
          onChanged();
        }}
      />
    </HStack>
  );
}

function HelpView() {
  return (
    <Section
      header={<Text>如何获取 Token</Text>}
      footer={
        <Text font="footnote" foregroundStyle="secondaryLabel">
          经典 PAT 勾选 gist。GitHub 上的 Token note（备注）不会通过 API 返回，请在本脚本用「档案名称」自行命名。保存时会尝试读取 @login 方便辨认。
        </Text>
      }>
      <Button
        title="一键创建 Token（含 gist）"
        systemImage="link"
        action={async () => {
          await Safari.openURL(TOKEN_HELP_URL);
        }}
      />
      <Button
        title="打开 Token 列表"
        systemImage="list.bullet"
        action={async () => {
          await Safari.openURL(TOKEN_LIST_URL);
        }}
      />
      <Text font="footnote" foregroundStyle="secondaryLabel">
        步骤：1) 生成 PAT 并勾选 gist；2) 复制；3) 添加档案时填「名称」+ Token；4) 多账号多建档案切换。
      </Text>
    </Section>
  );
}

function ProfileEditor({
  mode,
  profileId,
}: {
  mode: "add" | "edit";
  profileId?: string;
}) {
  const dismiss = Navigation.useDismiss();
  const existing = profileId ? gist.listProfiles().find((p) => p.id === profileId) : null;
  const name = useObservable(existing?.name || "");
  const token = useObservable("");
  const busy = useObservable(false);

  return (
    <NavigationStack>
      <List
        navigationTitle={mode === "add" ? "添加档案" : "编辑档案"}
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: [
            <Button title="取消" systemImage="xmark" action={() => dismiss(false)} />,
          ],
          confirmationAction: [
            <Button
              title="保存"
              systemImage="checkmark"
              disabled={busy.value}
              action={async () => {
                try {
                  busy.setValue(true);
                  if (mode === "add") {
                    await gist.addProfile({ name: name.value, token: token.value });
                  } else if (profileId) {
                    const patch: { name?: string; token?: string } = { name: name.value };
                    if ((token.value || "").trim()) patch.token = token.value;
                    await gist.updateProfile(profileId, patch);
                  }
                  dismiss(true);
                } catch (e) {
                  await Dialog.alert({ title: "错误", message: String(e) });
                } finally {
                  busy.setValue(false);
                }
              }}
            />,
          ],
        }}>
        <Section
          header={<Text>档案</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              名称显示在列表与切换器中（GitHub Token note 无法自动带入，请手写便于辨认的名字）。
            </Text>
          }>
          <TextField title="名称" value={name} prompt="例如：工作号 / 个人" />
          {existing?.login ? (
            <Text font="footnote" foregroundStyle="secondaryLabel">
              已关联 @{existing.login}
            </Text>
          ) : null}
        </Section>
        <Section
          header={<Text>Token</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              {mode === "edit"
                ? "留空表示不修改原 Token。"
                : "必填。保存时会请求 api.github.com/user 校验。"}
            </Text>
          }>
          <SecureField
            title="Token"
            value={token}
            prompt={mode === "edit" ? "留空则保持原 Token" : "ghp_… 或 github_pat_…"}
          />
        </Section>
        {busy.value ? (
          <Section>
            <ProgressView title="保存中" />
          </Section>
        ) : null}
      </List>
    </NavigationStack>
  );
}
