import {
  Button,
  HStack,
  Image,
  Rectangle,
  Text,
  VStack,
  ZStack,
} from "scripting"
import type { GitHubRepository } from "./types"

const contentGlass = UIGlass.clear().interactive(false)
const controlGlass = UIGlass.clear().interactive(true)

const METADATA_COLORS = {
  language: "systemBlue" as import("scripting").Color,
  stars: "systemOrange" as import("scripting").Color,
  forks: "systemPurple" as import("scripting").Color,
} as const

const DESIGN = {
  inset: 14,
  rowRadius: 16,
  touch: 44,
} as const

export function PageBackground({ children }: { children?: JSX.Element }) {
  if (!children) {
    return (
      <Rectangle
        fill="systemGroupedBackground"
        ignoresSafeArea={true}
        allowsHitTesting={false}
      />
    )
  }

  return (
    <ZStack
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      background="systemGroupedBackground"
    >
      {children}
    </ZStack>
  )
}

export function IconButton({
  icon,
  label,
  action,
  navigationDestination,
}: {
  icon: string
  label: string
  action: () => void
  navigationDestination?: {
    isPresented: boolean
    onChanged: (isPresented: boolean) => void
    content: JSX.Element
  }
}) {
  return (
    <Button
      action={action}
      accessibilityLabel={label}
      buttonStyle="plain"
      navigationDestination={navigationDestination}
      frame={{ minWidth: 44, minHeight: 44 }}
    >
      <Image systemName={icon} foregroundStyle="label" />
    </Button>
  )
}

export function TokenButton({ action }: { action: () => void }) {
  return (
    <Button
      title="GitHub Token 设置"
      systemImage="key.fill"
      action={action}
      accessibilityLabel="GitHub Token 设置"
      buttonStyle="plain"
      frame={{ minWidth: 44, minHeight: 44 }}
    />
  )
}

export function StatusSurface({
  icon,
  title,
  detail,
  action,
  iconForegroundStyle = "systemBlue",
}: {
  icon: string
  title: string
  detail: string
  action?: () => void
  iconForegroundStyle?: import("scripting").Color
}) {
  return (
    <VStack
      spacing={10}
      alignment="center"
      padding={24}
      frame={{ maxWidth: "infinity" }}
      glassEffect={{ glass: contentGlass, shape: { type: "rect", cornerRadius: 18 } }}
    >
      <Image systemName={icon} font={28} fontWeight="semibold" foregroundStyle={iconForegroundStyle} />
      <Text font={17} fontWeight="semibold" foregroundStyle="label">{title}</Text>
      <Text font={13} foregroundStyle="secondaryLabel" multilineTextAlignment="center">{detail}</Text>
      {action ? (
        <Button
          title="重新载入"
          systemImage="arrow.clockwise"
          action={action}
          padding={{ horizontal: 14, vertical: 10 }}
          glassEffect={{ glass: controlGlass, shape: "capsule" }}
        />
      ) : null}
    </VStack>
  )
}

export function RepositoryIcon({ repository, size }: { repository: GitHubRepository; size: number }) {
  const inset = 3
  const frameShape = { type: "rect" as const, cornerRadius: Math.round(size * 0.24) }
  const imageSize = size - inset * 2
  const imageShape = { type: "rect" as const, cornerRadius: Math.max(4, Math.round(size * 0.17)) }

  return (
    <ZStack
      frame={{ width: size, height: size }}
      clipShape={frameShape}
    >
      <Image
        imageUrl={repository.owner.avatarUrl}
        resizable={true}
        aspectRatio={{ contentMode: "fit" }}
        frame={{ width: imageSize, height: imageSize }}
        clipped={true}
        clipShape={imageShape}
      />
    </ZStack>
  )
}

export function RepositoryRow({
  repository,
  onOpen,
  pinned = false,
}: {
  repository: GitHubRepository
  onOpen: () => void
  pinned?: boolean
}) {
  const updateDate = repository.pushedAt ?? repository.updatedAt
  const pinLabel = pinned ? "已置顶" : "未置顶"

  return (
    <Button
      action={onOpen}
      accessibilityLabel={`打开 ${repository.fullName}，${pinLabel}`}
      padding={DESIGN.inset}
      frame={{ maxWidth: "infinity", minHeight: DESIGN.touch }}
      glassEffect={{ glass: controlGlass, shape: { type: "rect", cornerRadius: DESIGN.rowRadius } }}
    >
      <HStack spacing={12} alignment="center" frame={{ maxWidth: "infinity" }}>
        <RepositoryIcon repository={repository} size={42} />
        <VStack
          spacing={7}
          alignment="leading"
          frame={{ maxWidth: "infinity" }}
          fixedSize={{ horizontal: false, vertical: true }}
        >
          <HStack spacing={6} frame={{ maxWidth: "infinity", alignment: "leading" }}>
            <Text
              font={16}
              fontWeight="semibold"
              foregroundStyle="label"
              lineLimit={1}
              frame={{ maxWidth: "infinity", alignment: "leading" }}
              multilineTextAlignment="leading"
            >
              {repository.fullName}
            </Text>
          </HStack>
          {repository.description ? (
            <Text
              font={13}
              foregroundStyle="secondaryLabel"
              frame={{ maxWidth: "infinity", alignment: "leading" }}
              multilineTextAlignment="leading"
              fixedSize={{ horizontal: false, vertical: true }}
            >
              {repository.description}
            </Text>
          ) : (
            <Text font={13} foregroundStyle="secondaryLabel">暂无描述</Text>
          )}
          <Text font={12} fontWeight="medium" foregroundStyle="secondaryLabel">
            {`最近推送 · ${relativeTime(updateDate)}`}
          </Text>
          <HStack spacing={6} alignment="center" frame={{ maxWidth: "infinity", alignment: "leading" }}>
            <Metadata icon="chevron.left.forwardslash.chevron.right" value={repository.language ?? "未标注"} color={METADATA_COLORS.language} />
            <Metadata icon="star.fill" value={compactNumber(repository.stargazersCount)} color={METADATA_COLORS.stars} />
            <Metadata icon="arrow.triangle.branch" value={compactNumber(repository.forksCount)} color={METADATA_COLORS.forks} />
          </HStack>
        </VStack>
        <Image
          systemName={pinned ? "pin.fill" : "chevron.right"}
          font={pinned ? 14 : 12}
          fontWeight="semibold"
          foregroundStyle={pinned ? "systemBlue" : "secondaryLabel"}
          frame={{ minWidth: 20, maxHeight: "infinity" }}
        />
      </HStack>
    </Button>
  )
}

function Metadata({ icon, value, color = "secondaryLabel" }: { icon: string; value: string; color?: import("scripting").Color }) {
  return (
    <HStack
      spacing={5}
      padding={{ horizontal: 8, vertical: 4 }}
      frame={{ minHeight: 24 }}
      glassEffect={{ glass: contentGlass, shape: "capsule" }}
    >
      <Image
        systemName={icon}
        font={icon === "chevron.left.forwardslash.chevron.right" ? 10 : 11}
        fontWeight="semibold"
        foregroundStyle={color}
        frame={{ width: 14, alignment: "center" }}
      />
      <Text font={12} fontWeight="medium" foregroundStyle={color}>{value}</Text>
    </HStack>
  )
}

function relativeTime(isoDate: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000))
  if (seconds < 60) return "刚刚"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} 个月前`
  return `${Math.floor(months / 12)} 年前`
}

function compactNumber(value: number): string {
  if (value < 1000) return String(value)
  if (value < 1000000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(/\\.0$/, "")}k`
  return `${(value / 1000000).toFixed(1).replace(/\\.0$/, "")}m`
}

