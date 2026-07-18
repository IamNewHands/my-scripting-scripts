import {
  Rectangle,
  type Color,
  type DynamicShapeStyle,
  type KeywordPoint,
} from "scripting"

type HourGradient = {
  light: Color[][]
  dark: Color[][]
}

const gradientPairs: [KeywordPoint, KeywordPoint][] = [
  ["topLeading", "bottomTrailing"],
  ["bottomTrailing", "topLeading"],
  ["topTrailing", "bottomLeading"],
  ["bottomLeading", "topTrailing"]
]

const hourlyGradients: HourGradient[] = [
  {
    light: [["#e8edf0", "#dde7e2", "#efe2d2"], ["#e6ecef", "#dbe4dd", "#f0e5d8"]],
    dark: [["#070914", "#11162a", "#20162d"], ["#080b16", "#151b30", "#24172b"]]
  },
  {
    light: [["#e7edf1", "#dce8e5", "#eee4d6"], ["#e9eef0", "#d9e4df", "#f1e7db"]],
    dark: [["#080a13", "#101a2f", "#1b1833"], ["#090c18", "#162035", "#211a31"]]
  },
  {
    light: [["#e7eff2", "#dbe8e1", "#f0e4d4"], ["#e5ecea", "#dce7df", "#efe6dc"]],
    dark: [["#090b15", "#12182d", "#271831"], ["#070b17", "#142137", "#1f1730"]]
  },
  {
    light: [["#e9eff1", "#dce6df", "#efe1d0"], ["#e4eceb", "#d9e5df", "#f1e6d7"]],
    dark: [["#090d18", "#111e34", "#1d1730"], ["#080c17", "#172039", "#29182d"]]
  },
  {
    light: [["#e6eef1", "#d9e7e2", "#f0e2cf"], ["#e8edec", "#dce6dc", "#eee5d8"]],
    dark: [["#0b101c", "#17243c", "#2c1f32"], ["#0a0f1b", "#192640", "#221e35"]]
  },
  {
    light: [["#eadfce", "#dce9e6", "#e6e2d4"], ["#efe2cf", "#d8e7e4", "#e9e1d6"]],
    dark: [["#111321", "#21324a", "#382b3c"], ["#121725", "#25384e", "#3b2937"]]
  },
  {
    light: [["#ecdfc9", "#d9e8e7", "#e8e3d6"], ["#f0e1cc", "#dce9e5", "#e5e2d8"]],
    dark: [["#171626", "#2a3a50", "#46303d"], ["#161a2a", "#304055", "#422c42"]]
  },
  {
    light: [["#eaf2f3", "#d8e9e5", "#f2dfc8"], ["#edf3f1", "#dbe8df", "#f0e4d3"]],
    dark: [["#151b2c", "#263b52", "#423044"], ["#141d30", "#284356", "#3d334d"]]
  },
  {
    light: [["#eee3d3", "#dce7e8", "#e8dfd2"], ["#e9eeec", "#d9e5dc", "#f0e3d0"]],
    dark: [["#151827", "#23334a", "#3b2a3a"], ["#141c2d", "#263a47", "#3d3036"]]
  },
  {
    light: [["#e9efef", "#dce6e5", "#eee4d8"], ["#e6eeed", "#d9e5dc", "#f0e6d6"]],
    dark: [["#10131f", "#18213a", "#2a1d2d"], ["#101827", "#1d2d3d", "#2b2432"]]
  },
  {
    light: [["#e8eeed", "#dbe6e2", "#efe6d8"], ["#e6eceb", "#dce5df", "#e8eadc"]],
    dark: [["#111827", "#1b2c41", "#2f2631"], ["#101725", "#1f293f", "#282f30"]]
  },
  {
    light: [["#e9eeec", "#dbe6e3", "#f0e7d8"], ["#e7edeb", "#dce5dc", "#eee3d7"]],
    dark: [["#101722", "#1a2d3c", "#302832"], ["#111823", "#1f2f36", "#32272d"]]
  },
  {
    light: [["#ecefeb", "#dce6e3", "#eee6d8"], ["#e8edeb", "#dbe4df", "#e7eadc"]],
    dark: [["#101722", "#192c3a", "#302832"], ["#111825", "#1d2e40", "#263333"]]
  },
  {
    light: [["#e8eeed", "#dbe6e2", "#f0e5d6"], ["#e9edeb", "#dce4df", "#eee2d7"]],
    dark: [["#111724", "#1a2b40", "#2e2634"], ["#111624", "#20283f", "#322430"]]
  },
  {
    light: [["#e7eeef", "#d9e5e2", "#efe3d3"], ["#e8ebe8", "#d9e5dc", "#eee1d6"]],
    dark: [["#121727", "#1b2a43", "#322633"], ["#121827", "#1d303b", "#352330"]]
  },
  {
    light: [["#e8ecee", "#dbe3e2", "#eee0d3"], ["#e9e7e1", "#d8e5e4", "#f0e5d2"]],
    dark: [["#141727", "#1f2940", "#342532"], ["#131829", "#223043", "#362a2f"]]
  },
  {
    light: [["#efe3d3", "#dce2e8", "#e8ddd4"], ["#e9e1d8", "#d9e5e4", "#f0e2ce"]],
    dark: [["#171624", "#292843", "#3b2735"], ["#171827", "#24324a", "#3d2b31"]]
  },
  {
    light: [["#ecdcca", "#e0d9d2", "#d7e0e8"], ["#efe0cc", "#dce1d7", "#d8e4e8"]],
    dark: [["#171321", "#33213a", "#4a2b30"], ["#1a1423", "#302446", "#44323a"]]
  },
  {
    light: [["#ead8ca", "#dfd8d0", "#d7dde8"], ["#edddd0", "#dedcd2", "#d9e3e7"]],
    dark: [["#17111d", "#36203a", "#512c32"], ["#1b1321", "#3b2540", "#49323c"]]
  },
  {
    light: [["#e7d8d2", "#d9dde2", "#d7e5e8"], ["#eadcd3", "#d8dee5", "#e0e6e6"]],
    dark: [["#14111c", "#271f3d", "#23324a"], ["#171321", "#302047", "#29384d"]]
  },
  {
    light: [["#e7edf0", "#dce3e0", "#ece2d8"], ["#e8ece8", "#d9e3e2", "#eee1d7"]],
    dark: [["#090b14", "#111a2f", "#1d1730"], ["#0b0d18", "#17203a", "#271832"]]
  },
  {
    light: [["#e7ecef", "#dce2de", "#eee3d8"], ["#e6edf0", "#dbe2dc", "#efe5d9"]],
    dark: [["#080a13", "#10172b", "#1e1730"], ["#090c17", "#151e35", "#24192e"]]
  },
  {
    light: [["#e8edf0", "#dbe5e3", "#ece3d8"], ["#e7ebe8", "#dce2df", "#eee2d6"]],
    dark: [["#080914", "#11172a", "#21162d"], ["#090b16", "#141d31", "#25172b"]]
  },
  {
    light: [["#e8ecef", "#dce5e2", "#eee2d5"], ["#e6eeef", "#dfe3dc", "#f0e5d8"]],
    dark: [["#070914", "#10162a", "#20162d"], ["#080b16", "#151b30", "#24172b"]]
  }
]

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]

const tuneLightColor = (color: Color): Color => {
  const hex = String(color).replace("#", "")

  if (hex.length !== 6) {
    return color
  }

  const channels = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16))
  const adjusted = channels.map(channel => {
    const softenedWhite = Math.min(channel, 246)
    const fromWhite = 255 - softenedWhite
    const value = 255 - fromWhite * 1.72 - 8
    return Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0")
  })

  return `#${adjusted.join("")}` as Color
}

const warmLightAnchors: Color[] = [
  "#e7d8c8",
  "#ded7ca",
  "#d8dfd6",
  "#d6e1df",
]

const tuneLightColors = (colors: Color[]) => [
  ...colors.map(tuneLightColor),
  pick(warmLightAnchors),
]

type PageBackgroundStyle = {
  fill: DynamicShapeStyle
  accent: {
    light: Color
    dark: Color
  }
}

const createBackground = (date = new Date()): PageBackgroundStyle => {
  const variants = hourlyGradients[date.getHours()]
  const lightColors = tuneLightColors(pick(variants.light))
  const darkColors = pick(variants.dark)
  const [startPoint, endPoint] = pick(gradientPairs)

  return {
    fill: {
      light: {
        colors: lightColors,
        startPoint,
        endPoint
      },
      dark: {
        colors: darkColors,
        startPoint,
        endPoint
      }
    },
    accent: {
      light: lightColors[1] ?? lightColors[0],
      dark: darkColors[1] ?? darkColors[0]
    }
  }
}

export const pageBackgroundStyle = createBackground()
export const pageBackground = pageBackgroundStyle.fill

export function PageBackground() {
  return (
    <Rectangle
      fill={pageBackground}
      ignoresSafeArea={true}
      allowsHitTesting={false}
    />
  )
}
