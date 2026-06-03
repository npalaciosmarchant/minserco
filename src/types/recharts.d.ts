// Minimal type declarations for recharts (package.json missing from install)
declare module "recharts" {
  import * as React from "react"

  export interface BaseAxisProps {
    dataKey?: string
    tick?: object
    axisLine?: boolean
    tickLine?: boolean
    allowDecimals?: boolean
    width?: number
    fontSize?: number
    [key: string]: unknown
  }

  export interface TooltipProps {
    contentStyle?: React.CSSProperties
    labelStyle?: React.CSSProperties
    cursor?: object
    [key: string]: unknown
  }

  export interface BarProps {
    dataKey?: string
    radius?: number | number[]
    barSize?: number
    fill?: string
    children?: React.ReactNode
    [key: string]: unknown
  }

  export interface PieProps {
    data?: object[]
    cx?: string | number
    cy?: string | number
    innerRadius?: number
    outerRadius?: number
    dataKey?: string
    strokeWidth?: number
    children?: React.ReactNode
    [key: string]: unknown
  }

  export interface CellProps {
    fill?: string
    [key: string]: unknown
  }

  export const BarChart: React.FC<{ data?: object[]; barSize?: number; children?: React.ReactNode; [k: string]: unknown }>
  export const Bar: React.FC<BarProps>
  export const XAxis: React.FC<BaseAxisProps>
  export const YAxis: React.FC<BaseAxisProps>
  export const Tooltip: React.FC<TooltipProps>
  export const ResponsiveContainer: React.FC<{ width?: string | number; height?: string | number; children?: React.ReactNode }>
  export const PieChart: React.FC<{ children?: React.ReactNode; [k: string]: unknown }>
  export const Pie: React.FC<PieProps>
  export const Cell: React.FC<CellProps>
  export const LineChart: React.FC<{ data?: object[]; children?: React.ReactNode; [k: string]: unknown }>
  export const Line: React.FC<{ dataKey?: string; stroke?: string; [k: string]: unknown }>
  export const Legend: React.FC<{ [k: string]: unknown }>
}
