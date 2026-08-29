/**
 * File: components/Toast.tsx
 *
 * Toast 内容组件
 * 纯 UI 组件，只负责渲染 Toast 内容
 */

import { VStack, Image, ProgressView, RoundedRectangle } from "scripting"
import { AnimText } from "./AnimText"

const toastRadius = 22
const toastGlass = UIGlass.clear().interactive(true)
const toastShape = {
  type: "rect" as const,
  cornerRadius: toastRadius,
  style: "continuous" as const,
}

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
      padding={16}
      frame={{ minWidth: 200 }}
      alignment="center"
      glassEffect={{ glass: toastGlass, shape: toastShape }}
      overlay={
        <RoundedRectangle
          padding={-0.5}
          cornerRadius={toastRadius}
          stroke={{
            shapeStyle: {
              light: "rgba(255,255,255,0.54)",
              dark: "rgba(255,255,255,0.26)",
            },
            strokeStyle: { lineWidth: 0.5 },
          }}
        />
      }
      shadow={{ color: "rgba(0,0,0,0.18)", radius: 18, y: 8 }}
      clipShape={{ type: "rect", cornerRadius: toastRadius, style: "continuous" }}
    >
      {/* 根据类型显示不同的图标 */}
      {type === "loading" && (
        <ProgressView progressViewStyle="circular" controlSize="large" />
      )}
      {type === "success" && (
        <Image
          systemName="checkmark.circle.fill"
          font={48}
          foregroundStyle="systemGreen"
        />
      )}
      {type === "error" && (
        <Image
          systemName="xmark.circle.fill"
          font={48}
          foregroundStyle="systemRed"
        />
      )}
      {type === "info" && (
        <Image
          systemName="info.circle.fill"
          font={48}
          foregroundStyle="systemBlue"
        />
      )}


      {/* 文字 */}
      <AnimText
        font="body"
        foregroundStyle="label"
        multilineTextAlignment="center"
      >
        {message}
      </AnimText>
    </VStack>
  )
}
