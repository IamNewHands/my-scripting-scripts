import {
  Button,
  HStack,
  Image,


  List,
  Section,
  Text,
  VStack,
  useState,
} from "scripting"
import { RepositoryIcon } from "./glass-ui"
import type { GitHubRepository } from "./types"

export function PinnedRepositoriesPage({
  repositories,
  initialPinnedIDs,
  onChange,
}: {
  repositories: GitHubRepository[]
  initialPinnedIDs: number[]
  onChange: (ids: number[]) => void
}) {
  const [pinnedIDs, setPinnedIDs] = useState(initialPinnedIDs)
  const [searchQuery, setSearchQuery] = useState("")
  const repositoryByID = new Map(repositories.map(repository => [repository.id, repository]))
  const pinned = pinnedIDs.flatMap(id => {
    const repository = repositoryByID.get(id)
    return repository ? [repository] : []
  })
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase()
  const unpinned = repositories
    .filter(repository => !pinnedIDs.includes(repository.id))
    .filter(repository => !normalizedQuery || repository.fullName.toLocaleLowerCase().includes(normalizedQuery))
    .sort((left, right) => {
      const leftTime = new Date(left.starredAt ?? 0).getTime()
      const rightTime = new Date(right.starredAt ?? 0).getTime()
      return rightTime - leftTime || left.fullName.localeCompare(right.fullName)
    })

  function updatePinnedIDs(ids: number[]) {
    setPinnedIDs(ids)
    onChange(ids)
  }

  return (
    

      
<List
      listStyle="inset"
      scrollContentBackground="hidden"
       scrollEdgeEffectHidden={{ edges: "top", hidden: true }}
       
      listRowBackground={<></>}
      listRowSeparator="hidden"
      listRowSpacing={12}
      listSectionSpacing="compact"
      navigationTitle="置顶项目"
      navigationBarTitleDisplayMode="inline"
      searchable={{
        value: searchQuery,
        onChanged: setSearchQuery,
        placement: "toolbar",
        prompt: "搜索仓库名称",
      }}
      searchToolbarBehavior="minimize"
    >
      <Section listRowBackground={<></>} listRowSeparator="hidden">
        <PinnedPageHeader pinnedTotal={pinned.length} />
      </Section>
      <Section listRowBackground={<></>} listRowSeparator="hidden">
        <VStack
          spacing={12}
          frame={{ maxWidth: "infinity" }}
          listRowBackground={<></>}
          listRowSeparator="hidden"
        >
          {pinned.length > 0 ? (
            <>
              <SectionGlassTitle title="已置顶" />
              {pinned.map(repository => (
                <PinnedRepositoryRow
                  key={String(repository.id)}
                  repository={repository}
                  actionTitle="取消置顶"
                  compact
                  action={() => updatePinnedIDs(pinnedIDs.filter(id => id !== repository.id))}
                />
              ))}
            </>
          ) : null}
          <SectionGlassTitle title="仓库候选" />
          {unpinned.map(repository => (
            <PinnedRepositoryRow
              key={String(repository.id)}
              repository={repository}
              actionTitle="置顶"
              compact
              action={() => updatePinnedIDs([...pinnedIDs, repository.id])}
            />
          ))}
        </VStack>
      </Section>
      </List>


  )
}

function PinnedPageHeader({ pinnedTotal }: { pinnedTotal: number }) {
  return (
    <VStack
      spacing={7}
      alignment="leading"
      padding={{ horizontal: 16, vertical: 14 }}
      frame={{ maxWidth: "infinity", alignment: "leading" }}
      glassEffect={{ glass: UIGlass.clear().interactive(false), shape: { type: "rect", cornerRadius: 16 } }}
    >
      <HStack spacing={8}>
        <Image systemName="pin.fill" font={15} foregroundStyle="systemBlue" />
        <Text font={17} fontWeight="semibold" foregroundStyle="label">固定关注的仓库</Text>
      </HStack>
      <Text font={13} foregroundStyle="secondaryLabel" multilineTextAlignment="leading">
        置顶仓库会固定在首页顶部，不受最近推送时间影响。
      </Text>
      <Text font={12} fontWeight="medium" foregroundStyle="secondaryLabel">
        {pinnedTotal === 0 ? "尚未置顶仓库" : `已置顶 ${pinnedTotal} 个仓库`}
      </Text>
    </VStack>
  )
}

function SectionGlassTitle({ title }: { title: string }) {
  return (
    <HStack
      spacing={6}
      padding={{ horizontal: 16, vertical: 4 }}
      frame={{ maxWidth: "infinity", alignment: "leading" }}
    >
      <Image systemName={title === "已置顶" ? "pin.fill" : "tray.full"} font={12} foregroundStyle="secondaryLabel" />
      <Text font={13} fontWeight="semibold" foregroundStyle="secondaryLabel">{title}</Text>
    </HStack>
  )
}

function compactNumber(value: number): string {
  if (value < 1000) return String(value)
  if (value < 1000000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(/\\.0$/, "")}k`
  return `${(value / 1000000).toFixed(1).replace(/\\.0$/, "")}m`
}

function PinnedRepositoryRow({
  repository,
  actionTitle,
  action,
  compact = false,
  listRowInsets,
  listRowBackground,
}: {
  repository: GitHubRepository
  actionTitle: string
  action: () => void
  compact?: boolean
  listRowInsets?: { top: number; bottom: number; leading: number; trailing: number }
  listRowBackground?: JSX.Element
}) {
  return (
    <Button
      action={action}
      accessibilityLabel={`${actionTitle} ${repository.fullName}`}
      buttonStyle="plain"
      padding={14}
      frame={{ maxWidth: "infinity", minHeight: 44 }}
      listRowInsets={listRowInsets}
      listRowBackground={listRowBackground ?? <></>}
      glassEffect={{ glass: UIGlass.clear().interactive(true), shape: { type: "rect", cornerRadius: 16 } }}
    >
      <HStack spacing={12} alignment="center" frame={{ maxWidth: "infinity" }}>
        <RepositoryIcon repository={repository} size={42} />
        <VStack
          spacing={6}
          alignment="leading"
          frame={{ maxWidth: "infinity" }}
          fixedSize={{ horizontal: false, vertical: true }}
        >
          <Text
            font={16}
            fontWeight="semibold"
            foregroundStyle="label"
            lineLimit={2}
            frame={{ maxWidth: "infinity", alignment: "leading" }}
            multilineTextAlignment="leading"
          >
            {repository.fullName}
          </Text>
          <HStack
            spacing={0}
            alignment="center"
            frame={{ maxWidth: "infinity", alignment: "leading" }}
          >
            <Text font={12} fontWeight="medium" foregroundStyle="secondaryLabel" frame={{ alignment: "leading" }}>
              {repository.language ?? "未标注"}
            </Text>
            <Text font={12} foregroundStyle="tertiaryLabel" frame={{ alignment: "leading" }}> · </Text>
            <Text font={12} fontWeight="medium" foregroundStyle="secondaryLabel" frame={{ alignment: "leading" }}>
              {compactNumber(repository.stargazersCount)} Stars
            </Text>
          </HStack>
        </VStack>
        <Text font={12} fontWeight="semibold" foregroundStyle="systemBlue" frame={{ minWidth: 60, alignment: "trailing" }}>
          {actionTitle}
        </Text>
      </HStack>
    </Button>
  )
}
