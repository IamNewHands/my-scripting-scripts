/**
 * File: components/Toast.tsx
 *
 * Toast 内容组件：普通实底提示（无玻璃特效）
 */

import { VStack, Image, ProgressView } from "scripting"
import { AnimText } from "./AnimText"

const toastRadius = 12

export type ToastType = "loading" | "success" | "error" | "info"

interface ToastProps {
  type: ToastType
  message: string
}

/**
 * Toast 内容组件
 * 根据类型显示不同的图标和文字
 */
export const Toast = ({ type, message }: ToastProps) => {
  return (
    <VStack
      spacing={8}
      padding={{ horizontal: 18, vertical: 14 }}
      frame={{ minWidth: 160, maxWidth: 280 }}
      alignment="center"
      // 普通实底，不用 glassEffect
      background={{
        style: {
          light: "rgba(245,245,247,0.96)",
          dark: "rgba(44,44,46,0.96)",
        },
        shape: {
          type: "rect",
          cornerRadius: toastRadius,
          style: "continuous",
        },
      }}
      clipShape={{ type: "rect", cornerRadius: toastRadius, style: "continuous" }}
      shadow={{ color: "rgba(0,0,0,0.16)", radius: 10, y: 4 }}
    >
      {type === "loading" && (
        <ProgressView progressViewStyle="circular" controlSize="regular" />
      )}
      {type === "success" && (
        <Image
          systemName="checkmark.circle.fill"
          font={28}
          foregroundStyle="systemGreen"
        />
      )}
      {type === "error" && (
        <Image
          systemName="xmark.circle.fill"
          font={28}
          foregroundStyle="systemRed"
        />
      )}
      {type === "info" && (
        <Image
          systemName="info.circle.fill"
          font={28}
          foregroundStyle="systemBlue"
        />
      )}

      <AnimText
        font="subheadline"
        foregroundStyle="label"
        multilineTextAlignment="center"
        lineLimit={4}
      >
        {message}
      </AnimText>
    </VStack>
  )
}
