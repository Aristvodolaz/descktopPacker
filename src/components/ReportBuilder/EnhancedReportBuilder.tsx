import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  PlayIcon,
  DocumentArrowDownIcon,
  BookmarkIcon,
  Cog6ToothIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import * as XLSX from 'xlsx'

import { 
  EnhancedReportConfig,
  ReportRow, 
  ReportField
} from '../../types/report-builder-enhanced'
import { ReportTemplate } from '../../types'
import { EnhancedDataProcessor } from '../../utils/report-processing/dataProcessor'
import { EnhancedTable } from './EnhancedTable'
import { ReportControls } from './ReportControls'
import ReportTemplateManager from '../ReportTemplateManager'

import { 
  getAllTasksData, 
  getTaskDataForReports 
} from '../../utils/api'
import { 
  getAvailableFields, 
  getRussianFieldName, 
  getFieldType 
} from '../../utils/reportDataProcessor'

// ===== ОСНОВНЫЕ ИНТЕРФЕЙСЫ =====

interface EnhancedReportBuilderProps {
  platform: 'wildberries' | 'ozon'
  reportType?: 'short' | 'full'
  className?: string
}

interface TaskSelectorProps {
  availableTasks: string[]
  selectedTask: string
  onTaskSelect: (task: string) => void
  isLoading?: boolean
  searchQuery?: string
  onSearchChange?: (query: string) => void
}

// ===== ГЛАВНЫЙ КОМПОНЕНТ =====

export const EnhancedReportBuilder: React.FC<EnhancedReportBuilderProps> = ({
  platform,
  reportType,
  className = ''
}) => {
  // ===== СОСТОЯНИЕ =====
  const [reportConfig, setReportConfig] = useState<EnhancedReportConfig>({
    name: '',
    platform,
    reportType,
    fields: [],
    filters: [],
    sorting: [],
    groupBy: [],
    hierarchy: {
      enabled: false,
      groupField: ''
    },
    dateRange: {
      from: '',
      to: ''
    }
  })

  const [reportData, setReportData] = useState<ReportRow[]>([])
  const [rawData, setRawData] = useState<any[]>([])
  const [availableFields, setAvailableFields] = useState<ReportField[]>([])
  const [availableTasks, setAvailableTasks] = useState<string[]>([])
  const [selectedTask, setSelectedTask] = useState<string>('')
  
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  
  const [taskSearchQuery, setTaskSearchQuery] = useState('')
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  
  const [currentTab, setCurrentTab] = useState<'task' | 'config' | 'preview'>('task')
  const [processingProgress, setProcessingProgress] = useState(0)

  // ===== ИНСТАНСЫ ПРОЦЕССОРОВ =====
  const dataProcessor = useMemo(() => new EnhancedDataProcessor({
    enableAsync: true,
    batchSize: 1000,
    enableWorker: false
  }), [])

  // ===== ВЫЧИСЛЯЕМЫЕ ЗНАЧЕНИЯ =====
  const filteredTasks = useMemo(() => 
    availableTasks.filter(task =>
      task.toLowerCase().includes(taskSearchQuery.toLowerCase())
    ), 
    [availableTasks, taskSearchQuery]
  )

  const platformLabel = platform === 'wildberries' ? 'Wildberries' : 'Ozon'
  const reportTypeLabel = reportType ? 
    (reportType === 'short' ? ' - Краткий отчет' : ' - Полный отчет') : ''

  // ===== ЭФФЕКТЫ =====
  
  // Загрузка списка заданий при инициализации
  useEffect(() => {
    loadAvailableTasks()
  }, [platform])

  // Загрузка данных задания при выборе
  useEffect(() => {
    if (selectedTask) {
      loadTaskData()
    }
  }, [selectedTask, reportType])

  // Обновление порядка колонок при изменении конфигурации
  useEffect(() => {
    if (reportConfig.fields.length > 0) {
      const newOrder = reportConfig.fields.map(fieldId => {
        const field = availableFields.find(f => f.id === fieldId)
        return field ? field.name : fieldId
      })
      setColumnOrder(newOrder)
    }
  }, [reportConfig.fields, availableFields])

  // ===== ОБРАБОТЧИКИ СОБЫТИЙ =====

  const loadAvailableTasks = async () => {
    setIsLoadingTasks(true)
    try {
      const allTasks = await getAllTasksData()
      
      const platformTasks = allTasks.filter(task => {
        const taskLower = task.toLowerCase()
        if (platform === 'wildberries') {
          return taskLower.includes('wb') || taskLower.includes('wildberries')
        } else {
          return taskLower.includes('ozon') || taskLower.includes('озон')
        }
      })
      
      setAvailableTasks(platformTasks)
    } catch (error) {
      console.error(`Error loading ${platform} tasks:`, error)
    } finally {
      setIsLoadingTasks(false)
    }
  }

  const loadTaskData = async () => {
    if (!selectedTask) return
    
    setIsLoadingData(true)
    try {
      let taskData: any[] = []
      
      if (selectedTask === '__ALL_TASKS__') {
        // Загружаем данные из всех заданий платформы
        console.log(`Loading data from all ${platform} tasks...`)
        for (const taskName of filteredTasks) {
          if (taskName === '__ALL_TASKS__') continue
          try {
            const singleTaskData = await getTaskDataForReports(taskName, reportType)
            taskData = taskData.concat(singleTaskData)
          } catch (error) {
            console.error(`Error loading data for task ${taskName}:`, error)
          }
        }
      } else {
        // Загружаем данные конкретного задания
        taskData = await getTaskDataForReports(selectedTask, reportType)
      }
      
      setRawData(taskData)
      
      // Создаем поля на основе реальных данных
      if (taskData.length > 0) {
        const fieldNames = getAvailableFields(taskData)
        const fields: ReportField[] = fieldNames.map(fieldName => ({
          id: fieldName,
          name: getRussianFieldName(fieldName),
          type: getFieldType(taskData, fieldName),
          category: getCategoryForField(fieldName)
        }))
        
        setAvailableFields(fields)
        
        // Автоматически переходим на вкладку конфигурации
        setCurrentTab('config')
      }
    } catch (error) {
      console.error('Error loading task data:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleConfigChange = useCallback((updates: Partial<EnhancedReportConfig>) => {
    setReportConfig(prev => ({ ...prev, ...updates }))
  }, [])

  const handleRowExpand = useCallback((rowId: string, isExpanded: boolean) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (isExpanded) {
        newSet.add(rowId)
      } else {
        newSet.delete(rowId)
      }
      return newSet
    })
  }, [])

  const handleColumnReorder = useCallback((fromIndex: number, toIndex: number) => {
    const newOrder = [...columnOrder]
    const [movedColumn] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, movedColumn)
    setColumnOrder(newOrder)
  }, [columnOrder])

  const handleSort = useCallback((sortConfig: any[]) => {
    setReportConfig(prev => ({
      ...prev,
      sorting: sortConfig.map(({ priority, ...sort }) => sort)
    }))
  }, [])

  const generateReport = async () => {
    if (!rawData.length || !reportConfig.fields.length) {
      alert('Выберите задание и поля для генерации отчета')
      return
    }

    setIsGenerating(true)
    setIsProcessing(true)
    
    try {
      console.log('🚀 Starting enhanced report generation...')
      console.log('Raw data sample:', rawData.slice(0, 2))
      console.log('Report config fields:', reportConfig.fields)
      
      const processedData = await dataProcessor.processDataAsync(
        rawData, 
        reportConfig, 
        setProcessingProgress
      )
      
      console.log('Processed data sample:', processedData.slice(0, 2))
      
      // Преобразуем поля в русские названия для отображения
      const processedDataWithRussianNames = processedData.map((row, index) => {
        const newData: any = {}
        
        // Копируем исходные данные
        Object.keys(row.data).forEach(key => {
          const russianName = getRussianFieldName(key)
          newData[russianName] = row.data[key]
          // Также сохраняем под английским ключом для совместимости
          newData[key] = row.data[key]
        })
        
        return {
          ...row,
          data: newData
        }
      })
      
      console.log('Data with Russian names sample:', processedDataWithRussianNames.slice(0, 2))
      
      // Обновляем данные с учетом состояния expanded rows
      const updatedData = updateExpandedState(processedDataWithRussianNames, expandedRows)
      
      setReportData(updatedData)
      setCurrentTab('preview')
      
      console.log('✅ Report generated successfully')
    } catch (error) {
      console.error('❌ Error generating report:', error)
      alert(`Ошибка при генерации отчета: ${error}`)
    } finally {
      setIsGenerating(false)
      setIsProcessing(false)
      setProcessingProgress(0)
    }
  }

  const handleExportReport = async (format: 'excel' | 'csv' = 'excel') => {
    try {
      if (!reportData.length) {
        alert('Нет данных для экспорта')
        return
      }

      const exportData = prepareDataForExport(reportData, columnOrder)
      
      if (format === 'excel') {
        await exportToExcel(exportData, `${reportConfig.name || selectedTask || `${platform}_report`}.xlsx`)
      } else {
        await exportToCSV(exportData, `${reportConfig.name || selectedTask || `${platform}_report`}.csv`)
      }
      
      console.log(`📊 Report exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Error exporting report:', error)
      alert(`Ошибка при экспорте: ${error}`)
    }
  }

  const handleTemplateLoad = (template: ReportTemplate) => {
    setReportConfig(prev => ({
      ...prev,
      fields: template.config.fields || [],
      filters: template.config.filters || [],
      sorting: template.config.sorting || [],
      groupBy: template.config.groupBy || [],
      dateRange: template.config.dateRange || prev.dateRange,
      hierarchy: prev.hierarchy // Пока не сохраняем иерархию в шаблонах
    }))
    
    setShowTemplateManager(false)
    alert(`Шаблон "${template.name}" успешно загружен`)
  }

  // ===== УТИЛИТЫ =====

  const getCategoryForField = (fieldName: string): string => {
    const fieldNameLower = fieldName.toLowerCase()
    
    if (['artikul', 'nazvanie_tovara', 'shkcode', 'nomenklatura'].some(f => fieldNameLower.includes(f))) {
      return 'Основные'
    }
    if (['itog_zakaz', 'soh', 'kol_vo'].some(f => fieldNameLower.includes(f))) {
      return 'Количество'
    }
    if (['time_', 'srok_godnosti'].some(f => fieldNameLower.includes(f))) {
      return 'Даты'
    }
    if (['ispolnitel'].some(f => fieldNameLower.includes(f))) {
      return 'Персонал'
    }
    if (['pallet', 'mesto'].some(f => fieldNameLower.includes(f))) {
      return 'Логистика'
    }
    if (fieldNameLower.includes('op_') || fieldNameLower.includes('операц')) {
      return 'Операции'
    }
    
    const platformSpecific = platform === 'wildberries' ? 
      ['wildberries', 'wb'] : ['ozon', 'озон']
    
    if (platformSpecific.some(f => fieldNameLower.includes(f))) {
      return `${platformLabel} специфичные`
    }
    
    return 'Прочие'
  }

  const updateExpandedState = (data: ReportRow[], expandedSet: Set<string>): ReportRow[] => {
    return data.map(row => {
      if (row.children) {
        return {
          ...row,
          isExpanded: expandedSet.has(row.id),
          children: updateExpandedState(row.children, expandedSet)
        }
      }
      return row
    })
  }

  const prepareDataForExport = (data: ReportRow[], columns: string[]): any[] => {
    const flattened: any[] = []
    
    const processRows = (rows: ReportRow[], level = 0) => {
      rows.forEach(row => {
        const exportRow: any = {}
        
        // Добавляем отступ для иерархических данных
        columns.forEach((column, index) => {
          let value = row.data[column]
          
          // Для первой колонки в иерархических данных добавляем отступ
          if (index === 0 && level > 0 && reportConfig.hierarchy?.enabled) {
            const indent = '  '.repeat(level)
            value = `${indent}${value || ''}`
          }
          
          exportRow[column] = value
        })
        
        flattened.push(exportRow)
        
        // Обрабатываем дочерние элементы если они развернуты
        if (row.isExpanded && row.children) {
          processRows(row.children, level + 1)
        }
      })
    }
    
    processRows(data)
    return flattened
  }

  const exportToExcel = async (data: any[], filename: string) => {
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)
    
    // Автоподгонка ширины колонок
    const colWidths: any[] = []
    if (data.length > 0) {
      const headers = Object.keys(data[0])
      headers.forEach((header, index) => {
        let maxWidth = header.length
        data.forEach(row => {
          const cellValue = String(row[header] || '')
          maxWidth = Math.max(maxWidth, cellValue.length)
        })
        colWidths[index] = { wch: Math.min(maxWidth + 2, 50) }
      })
      worksheet['!cols'] = colWidths
    }
    
    const sheetName = selectedTask && selectedTask.length <= 31 ? 
      selectedTask : `${platformLabel}_Report`
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    downloadBlob(blob, filename)
  }

  const exportToCSV = async (data: any[], filename: string) => {
    const csv = convertToCSV(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, filename)
  }

  const convertToCSV = (data: any[]): string => {
    if (!data.length) return ''
    
    const headers = Object.keys(data[0])
    const csvHeaders = headers.join(',')
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header] || ''
        // Экранируем запятые и кавычки
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(',')
    )
    
    return [csvHeaders, ...csvRows].join('\n')
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  // ===== RENDER =====

  const tabs = [
    { id: 'task' as const, name: 'Задание', icon: ChartBarIcon },
    { id: 'config' as const, name: 'Настройка', icon: Cog6ToothIcon },
    { id: 'preview' as const, name: 'Предварительный просмотр', icon: DocumentArrowDownIcon },
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Заголовок с действиями */}
      <div className="bg-white rounded-xl shadow-soft border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <input
              type="text"
              value={reportConfig.name}
              onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
              placeholder={`Введите название отчета ${platformLabel}${reportTypeLabel}...`}
              className="text-2xl font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0 w-full"
            />
            <div className="text-sm text-gray-500 mt-1">
              {selectedTask && (
                <span>Задание: {selectedTask} • </span>
              )}
              <span>{platformLabel}{reportTypeLabel}</span>
              {reportData.length > 0 && (
                <span> • {reportData.length} записей</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowTemplateManager(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100"
            >
              <BookmarkIcon className="h-4 w-4 mr-2" />
              Шаблоны
            </button>
            
            <button
              onClick={generateReport}
              disabled={isGenerating || !selectedTask || !reportConfig.fields.length || rawData.length === 0}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <PlayIcon className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? 'Генерация...' : 'Сгенерировать'}
            </button>
            
            {reportData.length > 0 && (
              <button
                onClick={() => handleExportReport('excel')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Экспорт
              </button>
            )}
          </div>
        </div>

        {/* Диапазон дат */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Дата с</label>
            <input
              type="date"
              value={reportConfig.dateRange?.from || ''}
              onChange={(e) => handleConfigChange({
                dateRange: { ...reportConfig.dateRange!, from: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Дата по</label>
            <input
              type="date"
              value={reportConfig.dateRange?.to || ''}
              onChange={(e) => handleConfigChange({
                dateRange: { ...reportConfig.dateRange!, to: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Прогресс обработки */}
        {isProcessing && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Обработка данных...</span>
              <span>{Math.round(processingProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Табы */}
      <div className="bg-white rounded-xl shadow-soft border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`
                  flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${currentTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Выбор задания */}
          {currentTab === 'task' && (
            <motion.div
              key="task"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <TaskSelector
                availableTasks={filteredTasks}
                selectedTask={selectedTask}
                onTaskSelect={setSelectedTask}
                isLoading={isLoadingTasks || isLoadingData}
                searchQuery={taskSearchQuery}
                onSearchChange={setTaskSearchQuery}
              />
            </motion.div>
          )}

          {/* Настройка отчета */}
          {currentTab === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <ReportControls
                config={reportConfig}
                availableFields={availableFields}
                onConfigChange={handleConfigChange}
                isLoading={isLoadingData}
              />
            </motion.div>
          )}

          {/* Предварительный просмотр */}
          {currentTab === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <EnhancedTable
                data={reportData}
                columns={columnOrder}
                onSort={handleSort}
                onRowExpand={handleRowExpand}
                onColumnReorder={handleColumnReorder}
                isLoading={isGenerating}
                enableHierarchy={reportConfig.hierarchy?.enabled}
                enableSorting={true}
                enableColumnReorder={true}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Модальное окно управления шаблонами */}
      {showTemplateManager && (
        <ReportTemplateManager
          platform={platform}
          reportType={reportType}
          currentConfig={reportConfig}
          onLoadTemplate={handleTemplateLoad}
          onClose={() => setShowTemplateManager(false)}
        />
      )}
    </div>
  )
}

// ===== КОМПОНЕНТ ВЫБОРА ЗАДАНИЯ =====

const TaskSelector: React.FC<TaskSelectorProps> = ({
  availableTasks,
  selectedTask,
  onTaskSelect,
  isLoading = false,
  searchQuery = '',
  onSearchChange
}) => {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Загружаем список заданий...</p>
      </div>
    )
  }

  if (availableTasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium mb-2">Нет доступных заданий</p>
        <p>Убедитесь, что есть завершенные или загруженные задания для данной платформы</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Выберите задание</h3>
      
      {/* Поиск заданий */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Поиск заданий..."
          className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Выпадающий список заданий */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Выберите задание для создания отчета:
        </label>
        <select
          value={selectedTask}
          onChange={(e) => onTaskSelect(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">-- Выберите задание --</option>
          <option value="__ALL_TASKS__">🔄 Все задания (объединить данные)</option>
          {availableTasks.map(taskName => (
            <option key={taskName} value={taskName}>{taskName}</option>
          ))}
        </select>
      </div>

      {/* Информация о выбранном задании */}
      {selectedTask && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <ChartBarIcon className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-900">
              Выбрано задание: {selectedTask}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
