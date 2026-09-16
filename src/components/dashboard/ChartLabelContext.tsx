import { createContext, useContext } from "react"
import type { ChartSlotConfig } from "@/store/useDisplayStore"

export const ChartLabelContext = createContext<Partial<ChartSlotConfig>>({})
export const useChartLabelOptions = () => useContext(ChartLabelContext)
