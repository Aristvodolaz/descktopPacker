import React, { useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'
import { ReportRow, SortConfig } from '../../types/report-builder-enhanced'
import { downloadColumnMappings } from '../../utils/columnMappings'

interface EnhancedTableProps {
  data: ReportRow[]
  columns: string[]
  onSort?: (sortConfig: SortConfig[]) => void
  onRowExpand?: (rowId: string, isExpanded: boolean) => void
  onColumnReorder?: (fromIndex: number, toIndex: number) => void
  isLoading?: boolean
  enableHierarchy?: boolean
  enableSorting?: boolean
  enableColumnReorder?: boolean
  maxHeight?: string
  className?: string
}

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

/**
 * Продвинутая таблица с поддержкой:
 * - Иерархических данных с expand/collapse
 * - Интерактивной сортировки по клику на заголовки
 * - Перетаскивания колонок
 * - Виртуализации для больших данных
 * - Skeleton loading
 */
export const EnhancedTable: React.FC<EnhancedTableProps> = ({
  data,
  columns,
  onSort,
  onRowExpand,
  onColumnReorder,
  isLoading = false,
  enableHierarchy = false,
  enableSorting = true,
  enableColumnReorder = true,
  maxHeight = 'calc(100vh - 400px)',
  className = ''
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig[]>([])
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<number | null>(null)

  // Мемоизированные данные для оптимизации
  const flattenedData = useMemo(() => {
    const flattened: ReportRow[] = []
    
    const processRows = (rows: ReportRow[]) => {
      rows.forEach(row => {
        flattened.push(row)
        
        if (enableHierarchy && row.isExpanded && row.children) {
          processRows(row.children)
        }
      })
    }
    
    processRows(data)
    return flattened
  }, [data, enableHierarchy])

  // Обработчик сортировки
  const handleSort = useCallback((field: string) => {
    if (!enableSorting) return

    setSortConfig(prev => {
      const existingIndex = prev.findIndex(config => config.field === field)
      let newConfig: SortConfig[]

      if (existingIndex >= 0) {
        // Поле уже сортируется - меняем направление или удаляем
        const existing = prev[existingIndex]
        if (existing.direction === 'asc') {
          newConfig = prev.map(config => 
            config.field === field 
              ? { ...config, direction: 'desc' as const }
              : config
          )
        } else {
          // Убираем сортировку для этого поля
          newConfig = prev.filter(config => config.field !== field)
          // Обновляем приоритеты
          newConfig = newConfig.map((config, index) => ({ ...config, priority: index + 1 }))
        }
      } else {
        // Добавляем новую сортировку
        const newSort: SortConfig = {
          field,
          direction: 'asc',
          priority: prev.length + 1
        }
        newConfig = [...prev, newSort]
      }

      onSort?.(newConfig)
      return newConfig
    })
  }, [enableSorting, onSort])

  // Обработчик развёртывания строк
  const handleRowToggle = useCallback((row: ReportRow) => {
    if (!enableHierarchy || !row.isGroup) return
    
    onRowExpand?.(row.id, !row.isExpanded)
  }, [enableHierarchy, onRowExpand])

  // Обработчики drag and drop для колонок
  const handleColumnDragStart = useCallback((e: React.DragEvent, columnIndex: number) => {
    if (!enableColumnReorder) return
    
    setDraggedColumn(columnIndex)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', '')
  }, [enableColumnReorder])

  const handleColumnDragOver = useCallback((e: React.DragEvent, columnIndex: number) => {
    if (!enableColumnReorder || draggedColumn === null) return
    
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnIndex)
  }, [enableColumnReorder, draggedColumn])

  const handleColumnDrop = useCallback((e: React.DragEvent, columnIndex: number) => {
    if (!enableColumnReorder || draggedColumn === null) return
    
    e.preventDefault()
    
    if (draggedColumn !== columnIndex) {
      onColumnReorder?.(draggedColumn, columnIndex)
    }
    
    setDraggedColumn(null)
    setDragOverColumn(null)
  }, [enableColumnReorder, draggedColumn, onColumnReorder])

  const handleColumnDragEnd = useCallback(() => {
    setDraggedColumn(null)
    setDragOverColumn(null)
  }, [])

  // Получить иконку сортировки для колонки
  const getSortIcon = (field: string) => {
    const sortInfo = sortConfig.find(config => config.field === field)
    if (!sortInfo) return null
    
    return (
      <span className="ml-1 inline-flex items-center">
        {sortInfo.direction === 'asc' ? (
          <ArrowUpIcon className="h-3 w-3" />
        ) : (
          <ArrowDownIcon className="h-3 w-3" />
        )}
        {sortConfig.length > 1 && (
          <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 rounded-full">
            {sortInfo.priority}
          </span>
        )}
      </span>
    )
  }

  if (isLoading) {
    return <TableSkeleton columns={columns.length} rows={10} />
  }

  return (
    <div className={`relative overflow-hidden rounded-lg border border-gray-200 ${className}`}>
      <div 
        className="overflow-auto"
        style={{ maxHeight }}
      >
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {columns.map((column, index) => {
                const isDragging = draggedColumn === index
                const isDragOver = dragOverColumn === index
                
                return (
                  <th
                    key={column}
                    className={`
                      px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                      select-none transition-all duration-200
                      ${enableSorting ? 'cursor-pointer hover:bg-gray-100' : ''}
                      ${enableColumnReorder ? 'draggable cursor-move' : ''}
                      ${isDragging ? 'opacity-50 scale-95' : ''}
                      ${isDragOver ? 'bg-blue-50 border-l-2 border-blue-300' : ''}
                    `}
                    draggable={enableColumnReorder}
                    onDragStart={(e) => handleColumnDragStart(e, index)}
                    onDragOver={(e) => handleColumnDragOver(e, index)}
                    onDrop={(e) => handleColumnDrop(e, index)}
                    onDragEnd={handleColumnDragEnd}
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {enableColumnReorder && (
                          <Bars3Icon className="h-3 w-3 mr-2 text-gray-400" />
                        )}
                        <span>{column}</span>
                        {enableSorting && getSortIcon(column)}
                      </div>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            <AnimatePresence mode="popLayout">
              {flattenedData.map((row) => (
                <TableRow
                  key={row.id}
                  row={row}
                  columns={columns}
                  enableHierarchy={enableHierarchy}
                  onToggle={handleRowToggle}
                />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      
      {flattenedData.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-lg font-medium mb-2">Нет данных для отображения</div>
          <div className="text-sm">Попробуйте изменить фильтры или параметры отчёта</div>
        </div>
      )}
    </div>
  )
}

// Компонент отдельной строки таблицы
interface TableRowProps {
  row: ReportRow
  columns: string[]
  enableHierarchy: boolean
  onToggle: (row: ReportRow) => void
}

const TableRow: React.FC<TableRowProps> = React.memo(({ 
  row, 
  columns, 
  enableHierarchy, 
  onToggle 
}) => {
  const paddingLeft = enableHierarchy ? `${(row.level || 0) * 24}px` : '0px'
  
  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`
        hover:bg-gray-50 transition-colors duration-150
        ${row.isGroup ? 'bg-blue-50 font-medium' : ''}
      `}
    >
      {columns.map((column, columnIndex) => (
        <td
          key={`${row.id}-${column}`}
          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
          style={columnIndex === 0 ? { paddingLeft: `calc(1.5rem + ${paddingLeft})` } : {}}
        >
          <div className="flex items-center">
            {/* Кнопка развёртывания для первой колонки */}
            {columnIndex === 0 && enableHierarchy && row.isGroup && (
              <button
                onClick={() => onToggle(row)}
                className="mr-2 p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
              >
                {row.isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4" />
                )}
              </button>
            )}
            
            {/* Содержимое ячейки */}
            <span className={row.isGroup ? 'font-semibold text-blue-900' : ''}>
              {formatCellValue(getCellValue(row.data, column))}
            </span>
            
            {/* Индикатор для групповых строк */}
            {columnIndex === 0 && row.isGroup && row.aggregatedData && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {row.aggregatedData['Количество записей'] || 0} записей
              </span>
            )}
          </div>
        </td>
      ))}
    </motion.tr>
  )
})

// Skeleton загрузка для таблицы
const TableSkeleton: React.FC<TableSkeletonProps> = ({ 
  rows = 10, 
  columns = 5 
}) => (
  <div className="animate-pulse">
    <div className="bg-gray-50 px-6 py-3">
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className="flex-1 h-4 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
    <div className="bg-white divide-y divide-gray-200">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4">
          <div className="flex space-x-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="flex-1 h-4 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
)

// Утилита для получения значения ячейки по русскому/английскому названию
function getCellValue(data: any, columnName: string): any {
  console.log(`🔍 Looking for column "${columnName}" in data:`, Object.keys(data))
  
  // Сначала пробуем найти по точному названию (русскому)
  if (data[columnName] !== undefined) {
    console.log(`✅ Found exact match for "${columnName}":`, data[columnName])
    return data[columnName]
  }
  
  // Ищем по всем ключам, включая английские варианты
  const keys = Object.keys(data)
  
  // Используем существующие маппинги из columnMappings.ts
  // Создаем обратный маппинг русское_название -> английское_поле
  const reverseMapping: Record<string, string> = {}
  Object.entries(downloadColumnMappings).forEach(([englishKey, russianValue]) => {
    reverseMapping[russianValue] = englishKey
  })
  
  // Проверяем обратный маппинг
  const englishKey = reverseMapping[columnName]
  if (englishKey && data[englishKey] !== undefined) {
    console.log(`✅ Found reverse mapping match for "${columnName}" -> "${englishKey}":`, data[englishKey])
    return data[englishKey]
  }
  
  // Также проверяем прямое совпадение с английскими ключами
  if (data[columnName] !== undefined) {
    console.log(`✅ Found direct English key match for "${columnName}":`, data[columnName])
    return data[columnName]
  }
  
  // Поиск по частичному совпадению (убираем пробелы и приводим к нижнему регистру)
  const normalizedColumn = columnName.toLowerCase().replace(/\s+/g, '')
  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[_\s]+/g, '')
    if (normalizedKey === normalizedColumn) {
      console.log(`✅ Found normalized match for "${columnName}" -> "${key}":`, data[key])
      return data[key]
    }
  }
  
  // Если ничего не найдено, возвращаем undefined
  console.log(`❌ No match found for column "${columnName}" in data keys:`, keys)
  return undefined
}

// Утилита для форматирования значений ячеек
function formatCellValue(value: any): string {
  if (value === null || value === undefined) return '-'
  
  if (typeof value === 'number') {
    // Форматируем числа с разделителями тысяч
    return value.toLocaleString('ru-RU')
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Да' : 'Нет'
  }
  
  // Проверяем, является ли строка датой
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    try {
      const date = new Date(value)
      return date.toLocaleDateString('ru-RU')
    } catch {
      return value
    }
  }
  
  return String(value)
}
