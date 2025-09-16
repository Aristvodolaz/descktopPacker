import { ReportFilter, ReportSort } from './index'

export interface ReportField {
  id: string
  name: string
  type: 'string' | 'number' | 'date' | 'boolean'
  category: string
}

// Расширенные типы для улучшенного конструктора отчётов

export interface EnhancedReportConfig {
  id?: string
  name: string
  platform: 'wildberries' | 'ozon'
  reportType?: 'short' | 'full'
  fields: string[]
  filters: ReportFilter[]
  sorting: ReportSort[]
  groupBy?: string[]
  hierarchy?: HierarchyConfig
  dateRange?: {
    from: string
    to: string
  }
}

export interface HierarchyConfig {
  enabled: boolean
  groupField: string // Поле для группировки (например, 'Artikul')
  childrenFields?: string[] // Поля которые показывать в детях
  aggregateFields?: string[] // Поля для агрегации (суммирование)
  maxDepth?: number // Максимальная глубина вложенности
}

export interface ReportRow {
  id: string
  data: Record<string, any>
  children?: ReportRow[]
  level?: number // Уровень вложенности (0 = корень)
  isExpanded?: boolean
  parentId?: string
  isGroup?: boolean // Является ли строка группой
  aggregatedData?: Record<string, number> // Агрегированные данные для групп
}

export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
  priority: number // Для мульти-сортировки
}

export interface FilterConfig extends ReportFilter {
  id: string
  enabled: boolean
}

export interface ProcessingOptions {
  enableHierarchy: boolean
  enableGrouping: boolean
  enableVirtualization: boolean
  batchSize: number
}

export interface ReportState {
  // Данные
  rawData: any[]
  processedData: ReportRow[]
  
  // Конфигурация
  config: EnhancedReportConfig
  
  // UI состояние  
  selectedFields: string[]
  columnOrder: string[]
  expandedRows: Set<string>
  
  // Статус
  isLoading: boolean
  isProcessing: boolean
  error: string | null
  
  // Фильтрация и сортировка
  filters: FilterConfig[]
  sorting: SortConfig[]
}

export interface DataProcessorOptions {
  enableAsync: boolean
  batchSize: number
  enableWorker: boolean
}

// Типы для продвинутой сортировки
export interface SortingStrategy {
  field: string
  direction: 'asc' | 'desc'
  compareFn?: (a: any, b: any) => number
  customSort?: boolean
}

// Типы для фильтрации
export interface AdvancedFilter {
  id: string
  field: string
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'in' | 'regex' | 'exists'
  value: any
  caseSensitive?: boolean
  enabled: boolean
}

// Типы для экспорта
export interface ExportOptions {
  format: 'excel' | 'csv' | 'json'
  includeHeaders: boolean
  includeHierarchy: boolean
  expandedOnly: boolean
  selectedFieldsOnly: boolean
  filename?: string
}

// Колбэки и обработчики
export interface ReportBuilderCallbacks {
  onDataLoad?: (data: any[]) => void
  onConfigChange?: (config: EnhancedReportConfig) => void
  onRowExpand?: (rowId: string, isExpanded: boolean) => void
  onExport?: (data: ReportRow[], options: ExportOptions) => void
}

// Контекст для провайдера
export interface ReportBuilderContextValue {
  state: ReportState
  actions: {
    loadTaskData: (taskName: string, reportType?: 'short' | 'full') => Promise<void>
    updateConfig: (config: Partial<EnhancedReportConfig>) => void
    toggleField: (fieldId: string) => void
    addFilter: (filter: FilterConfig) => void
    removeFilter: (filterId: string) => void
    updateSorting: (sorting: SortConfig[]) => void
    toggleRowExpansion: (rowId: string) => void
    reorderColumns: (fromIndex: number, toIndex: number) => void
    exportReport: (options: ExportOptions) => Promise<void>
    processData: () => Promise<void>
  }
}
