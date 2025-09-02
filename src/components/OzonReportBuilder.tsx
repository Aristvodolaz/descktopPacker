import { useState, useEffect } from 'react'
import { 
  PlusIcon,
  TrashIcon,
  PlayIcon,
  DocumentArrowDownIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  BookmarkIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { ReportConfig, ReportField, ReportFilter, ReportSort } from '../types'
import { saveReportConfig, getAllTasksData, getTaskDataForReports } from '../utils/api'
import { processReportData, getAvailableFields, getRussianFieldName, getFieldType, groupByArticleAndCalculateTotal } from '../utils/reportDataProcessor'
import { ReportTemplate } from '../types'
import { createDefaultTemplates } from '../utils/reportTemplates'
import ReportTemplateManager from './ReportTemplateManager'
import * as XLSX from 'xlsx'



const filterOperators = [
  { value: 'equals', label: 'Равно' },
  { value: 'contains', label: 'Содержит' },
  { value: 'greater', label: 'Больше' },
  { value: 'less', label: 'Меньше' },
  { value: 'between', label: 'Между' },
  { value: 'in', label: 'В списке' },
]

export default function OzonReportBuilder() {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    name: '',
    platform: 'ozon',
    fields: [],
    filters: [],
    sorting: [],
    groupBy: [],
    dateRange: {
      from: '',
      to: ''
    }
  })

  const [activeTab, setActiveTab] = useState<'task' | 'fields' | 'filters' | 'sorting' | 'preview'>('task')
  const [reportData, setReportData] = useState<any[]>([])
  const [rawData, setRawData] = useState<any[]>([])
  const [availableFields, setAvailableFields] = useState<ReportField[]>([])
  const [availableTasks, setAvailableTasks] = useState<string[]>([])
  const [selectedTask, setSelectedTask] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [groupByArticle, setGroupByArticle] = useState<boolean>(false)
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>('')
  const [showTemplateManager, setShowTemplateManager] = useState(false)

  const tabs = [
    { id: 'task', name: 'Выбор задания', icon: DocumentTextIcon },
    { id: 'fields', name: 'Поля', icon: AdjustmentsHorizontalIcon },
    { id: 'filters', name: 'Фильтры', icon: PlusIcon },
    { id: 'sorting', name: 'Сортировка', icon: TrashIcon },
    { id: 'preview', name: 'Предварительный просмотр', icon: EyeIcon },
  ]

  const fieldCategories = Array.from(new Set(availableFields.map(f => f.category)))
  
  // Фильтруем задания по поисковому запросу
  const filteredTasks = availableTasks.filter(task =>
    task.toLowerCase().includes(taskSearchQuery.toLowerCase())
  )
  
  // Загружаем список заданий при монтировании компонента
  useEffect(() => {
    loadOzonTasks()
    // Создаем дефолтные шаблоны если их нет
    createDefaultTemplates()
  }, [])

  // Загружаем данные задания при выборе
  useEffect(() => {
    if (selectedTask) {
      loadTaskData()
    }
  }, [selectedTask])

  // Сбрасываем порядок колонок при изменении настройки группировки
  useEffect(() => {
    if (reportData.length > 0) {
      setColumnOrder([])
      console.log('Ozon: Column order reset due to groupByArticle change:', groupByArticle)
    }
  }, [groupByArticle])

  const loadOzonTasks = async () => {
    setIsLoadingTasks(true)
    try {
      const allTasks = await getAllTasksData()
      // Фильтруем задания Ozon
      const ozonTasks = allTasks.filter(task => 
        task.toLowerCase().includes('ozon') || 
        task.toLowerCase().includes('озон')
      )
      setAvailableTasks(ozonTasks)
    } catch (error) {
      console.error('Error loading Ozon tasks:', error)
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
        // Загружаем данные из всех Ozon заданий
        console.log('Loading data from all Ozon tasks...')
        const ozonTasks = availableTasks.filter(task =>
          task.toLowerCase().includes('ozon') ||
          task.toLowerCase().includes('озон')
        )
        
        for (const taskName of ozonTasks) {
          try {
            const singleTaskData = await getTaskDataForReports(taskName)
            console.log(`Loaded ${singleTaskData.length} records from ${taskName}`)
            taskData = taskData.concat(singleTaskData)
          } catch (error) {
            console.error(`Error loading data for task ${taskName}:`, error)
          }
        }
        console.log(`Total loaded records from all Ozon tasks: ${taskData.length}`)
      } else {
        // Загружаем данные конкретного задания
        taskData = await getTaskDataForReports(selectedTask)
      }
      
      setRawData(taskData)
      
      // Создаем поля на основе реальных данных
      const fieldNames = getAvailableFields(taskData)
      const fields: ReportField[] = fieldNames.map(fieldName => ({
        id: fieldName,
        name: getRussianFieldName(fieldName),
        type: getFieldType(taskData, fieldName),
        category: getCategoryForField(fieldName)
      }))
      
      setAvailableFields(fields)
      
      // Автоматически переходим на вкладку полей после загрузки данных
      if (taskData.length > 0) {
        setActiveTab('fields')
      }
    } catch (error) {
      console.error('Error loading task data:', error)
    } finally {
      setIsLoadingData(false)
    }
  }
  
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
    if (['ozon', 'озон', 'order_id', 'posting'].some(f => fieldNameLower.includes(f))) {
      return 'Ozon специфичные'
    }
    
    return 'Прочие'
  }

  // Функция для переключения выбора полей
  const handleFieldToggle = (fieldId: string) => {
    setReportConfig(prev => {
      const newFields = prev.fields.includes(fieldId)
        ? prev.fields.filter(id => id !== fieldId)  // Убираем поле
        : [...prev.fields, fieldId]  // Добавляем поле
      
      // Обновляем порядок колонок при изменении выбранных полей
      setColumnOrder(prevOrder => {
        const fieldRussianName = getRussianFieldName(fieldId)
        console.log(`Field toggle: ${fieldId} -> ${fieldRussianName}`)
        console.log('  Previous order:', prevOrder)
        console.log('  Field was selected:', prev.fields.includes(fieldId))
        
        let newOrder
        if (prev.fields.includes(fieldId)) {
          // Убираем колонку из порядка
          newOrder = prevOrder.filter(col => col !== fieldRussianName)
          console.log('  Removing column, new order:', newOrder)
        } else {
          // Добавляем колонку в конец (только если её там нет)
          newOrder = prevOrder.includes(fieldRussianName) 
            ? prevOrder 
            : [...prevOrder, fieldRussianName]
          console.log('  Adding column, new order:', newOrder)
        }
        
        return newOrder
      })
      
      return {
        ...prev,
        fields: newFields
      }
    })
  }

  // Функция для загрузки шаблона
  const handleLoadTemplate = (template: ReportTemplate) => {
    // Валидация шаблона перед загрузкой
    if (!template.config.fields || template.config.fields.length === 0) {
      alert('Шаблон не содержит выбранных полей')
      return
    }
    
    setReportConfig(prev => ({
      ...prev,
      fields: template.config.fields || [],
      filters: template.config.filters || [],
      sorting: template.config.sorting || [],
      groupBy: template.config.groupBy || [],
      dateRange: template.config.dateRange
    }))
    
    // Сбрасываем порядок колонок чтобы он пересоздался с новыми полями
    setColumnOrder([])
    
    setShowTemplateManager(false)
    
    console.log(`Ozon: Loaded template: ${template.name}`)
    console.log('Ozon: Template config:', template.config)
    
    // Показываем уведомление об успешной загрузке
    setTimeout(() => {
      alert(`Шаблон "${template.name}" успешно загружен`)
    }, 100)
  }



  const handleAddFilter = () => {
    if (availableFields.length === 0) return
    
    const newFilter: ReportFilter = {
      field: availableFields[0].id,
      operator: 'equals',
      value: ''
    }
    setReportConfig(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }))
  }

  const handleUpdateFilter = (index: number, updates: Partial<ReportFilter>) => {
    setReportConfig(prev => ({
      ...prev,
      filters: prev.filters.map((filter, i) => 
        i === index ? { ...filter, ...updates } : filter
      )
    }))
  }

  const handleRemoveFilter = (index: number) => {
    setReportConfig(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index)
    }))
  }

  const handleAddSort = () => {
    if (availableFields.length === 0) return
    
    const newSort: ReportSort = {
      field: availableFields[0].id,
      direction: 'asc'
    }
    setReportConfig(prev => ({
      ...prev,
      sorting: [...prev.sorting, newSort]
    }))
  }

  const handleUpdateSort = (index: number, updates: Partial<ReportSort>) => {
    setReportConfig(prev => ({
      ...prev,
      sorting: prev.sorting.map((sort, i) => 
        i === index ? { ...sort, ...updates } : sort
      )
    }))
  }

  const handleRemoveSort = (index: number) => {
    setReportConfig(prev => ({
      ...prev,
      sorting: prev.sorting.filter((_, i) => i !== index)
    }))
  }

  const generateReport = async () => {
    setIsGenerating(true)
    try {
      console.log('Generating report with config:', reportConfig)
      console.log('Raw data length:', rawData.length)
      console.log('Selected fields:', reportConfig.fields)
      
      if (rawData.length === 0) {
        alert('Нет данных для генерации отчета. Убедитесь, что выбрано задание и данные загружены.')
        return
      }
      
      if (reportConfig.fields.length === 0) {
        alert('Выберите хотя бы одно поле для отчета.')
        return
      }
      
              // Используем уже загруженные данные и применяем фильтрацию/сортировку на клиенте
        // Пропускаем выбор полей если будем применять группировку по артикулу
        let processedData = processReportData(rawData, reportConfig, groupByArticle)
        console.log('Processed data length:', processedData.length)
        
        // Отладка для исполнителя в обычной обработке
        if (processedData.length > 0) {
          console.log('Sample processed row:', processedData[0])
          console.log('Fields in processed data:', Object.keys(processedData[0]))
          const executorFields = Object.keys(processedData[0]).filter(key => 
            key.toLowerCase().includes('исполнитель') || key.toLowerCase().includes('ispolnitel')
          )
          console.log('Executor fields found:', executorFields)
          executorFields.forEach(field => {
            console.log(`${field}: ${processedData[0][field]}`)
          })
        }

        // Применяем группировку по артикулу, если включена
        if (groupByArticle) {
          console.log('Applying article grouping...')
          processedData = groupByArticleAndCalculateTotal(processedData)
          console.log('After article grouping:', processedData.length)
        }
        
        // Преобразуем поля в русские названия
        if (processedData.length > 0) {
          console.log('Converting fields to Russian names...')
          processedData = processedData.map((row, index) => {
            const newRow: any = {}
            // Добавляем выбранные пользователем поля
            reportConfig.fields.forEach(fieldId => {
              const russianName = getRussianFieldName(fieldId)
              const value = row[fieldId] !== undefined ? row[fieldId] : row[russianName]
              newRow[russianName] = value
              
              // Отладка для исполнителя
              if (fieldId === 'Ispolnitel' || russianName === 'Исполнитель') {
                console.log(`Row ${index}: Ispolnitel field processing:`)
                console.log(`  fieldId: ${fieldId}, russianName: ${russianName}`)
                console.log(`  row[fieldId]: ${row[fieldId]}`)
                console.log(`  row[russianName]: ${row[russianName]}`)
                console.log(`  final value: ${value}`)
              }
            })
            
            // Если есть группировка, добавляем поля от группировки
            if (groupByArticle) {
              const groupingFields = ['Всего в заказе', 'Количество записей']
              groupingFields.forEach(field => {
                if (row[field] !== undefined) {
                  newRow[field] = row[field]
                }
              })
            }
            
            return newRow
          })
          
          console.log('Final processed data:', processedData.length)
          if (processedData.length > 0) {
            console.log('Sample row:', processedData[0])
            console.log('Available fields:', Object.keys(processedData[0]))
          }
        }
      
      // Устанавливаем начальный порядок колонок если он еще не установлен
      if (columnOrder.length === 0 && processedData.length > 0) {
        // Создаем список колонок: выбранные поля (в русских названиях) + новые поля от группировки
        const selectedFieldsRussian = reportConfig.fields.map(fieldId => getRussianFieldName(fieldId))
        const groupingFields = groupByArticle ? Object.keys(processedData[0]).filter(key => 
          !selectedFieldsRussian.includes(key) && 
          (key === 'Всего в заказе' || key === 'Количество записей')
        ) : []
        const displayColumns = [...new Set([...selectedFieldsRussian, ...groupingFields])]
        
        console.log('Setting column order:')
        console.log('  selectedFieldsRussian:', selectedFieldsRussian)
        console.log('  groupingFields:', groupingFields)
        console.log('  displayColumns (with duplicates removed):', displayColumns)
        console.log('  processedData keys:', Object.keys(processedData[0]))
        
        setColumnOrder(displayColumns)
      }
      
      setReportData(processedData)
      setActiveTab('preview')
    } catch (error) {
      console.error('Error generating Ozon report:', error)
      alert('Ошибка при генерации отчета: ' + error)
      // Fallback к мокапным данным в случае ошибки
      setReportData([
        { Artikul: 'OZ001', 'Название товара': 'Товар Ozon 1', 'Итог Заказ': 12, 'СОХ': 6, 'ID заказа Ozon': 'ORD-001' },
        { Artikul: 'OZ002', 'Название товара': 'Товар Ozon 2', 'Итог Заказ': 18, 'СОХ': 9, 'ID заказа Ozon': 'ORD-002' },
        { Artikul: 'OZ003', 'Название товара': 'Товар Ozon 3', 'Итог Заказ': 25, 'СОХ': 15, 'ID заказа Ozon': 'ORD-003' },
      ])
      setActiveTab('preview')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportReport = async () => {
    try {
      console.log('Starting export...')
      console.log('Report data length:', reportData.length)
      console.log('Column order:', columnOrder)
      console.log('Report config fields:', reportConfig.fields)
      
      if (reportData.length === 0) {
        alert('Нет данных для экспорта')
        return
      }

      // Создаем Excel файл с нашими отфильтрованными данными
      const workbook = XLSX.utils.book_new()
      
      // Создаем лист с данными отчета в правильном порядке колонок
      const fieldsToUse = columnOrder.length > 0 ? columnOrder : reportConfig.fields
      console.log('Fields to use for export:', fieldsToUse)
      
      const orderedData = reportData.map((row, index) => {
        const orderedRow: any = {}
        fieldsToUse.forEach(fieldId => {
          // Получаем значение поля, используя русское название если есть
          const field = availableFields.find(f => f.id === fieldId)
          const fieldName = field?.name || fieldId
          
          // Пробуем найти значение по разным ключам
          let value = row[fieldId] || row[fieldName] || row[field?.name || '']
          orderedRow[fieldName] = value !== undefined ? value : '-'
        })
        console.log(`Row ${index}:`, orderedRow)
        return orderedRow
      })
      
      console.log('Ordered data for export:', orderedData.slice(0, 2)) // Показываем только первые 2 строки
      const worksheet = XLSX.utils.json_to_sheet(orderedData)
      
      // Автоматически подгоняем ширину колонок
      const colWidths: any[] = []
      if (orderedData.length > 0) {
        const headers = Object.keys(orderedData[0])
        headers.forEach((header, index) => {
          let maxWidth = header.length
          orderedData.forEach(row => {
            const cellValue = String(row[header] || '')
            maxWidth = Math.max(maxWidth, cellValue.length)
          })
          colWidths[index] = { wch: Math.min(maxWidth + 2, 50) }
        })
        worksheet['!cols'] = colWidths
      }
      
      // Ограничиваем длину имени листа до 31 символа (ограничение Excel)
      let sheetName = selectedTask ? `Отчет ${selectedTask}` : 'Отчет Ozon'
      if (sheetName.length > 31) {
        // Оставляем "Отчет " (6 символов) + сокращенное имя задания + "..." (3 символа) = 31 символ максимум
        const maxTaskNameLength = 31 - 6 - 3 // 22 символа для имени задания
        const truncatedTaskName = selectedTask ? selectedTask.substring(0, maxTaskNameLength) : ''
        sheetName = `Отчет ${truncatedTaskName}...`
      }
      console.log('Sheet name:', sheetName, 'Length:', sheetName.length)
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
      
      // Генерируем файл и скачиваем
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${reportConfig.name || selectedTask || 'ozon_report'}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      console.log(`Экспортировано ${reportData.length} записей в Excel файл`)
    } catch (error) {
      console.error('Error exporting Ozon report:', error)
      console.error('Error details:', {
        reportDataLength: reportData.length,
        columnOrderLength: columnOrder.length,
        reportConfigFields: reportConfig.fields,
        selectedTask,
        errorMessage: error instanceof Error ? error.message : String(error)
      })
      alert(`Ошибка при экспорте отчета: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const saveReport = async () => {
    try {
      await saveReportConfig(reportConfig)
      alert('Конфигурация отчета Ozon сохранена!')
    } catch (error) {
      console.error('Error saving Ozon report config:', error)
      alert('Ошибка при сохранении конфигурации отчета Ozon')
    }
  }

  // Функции для drag-and-drop колонок
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    
    if (!draggedColumn || draggedColumn === targetColumnId) {
      setDraggedColumn(null)
      return
    }

    const newOrder = [...columnOrder]
    const draggedIndex = newOrder.indexOf(draggedColumn)
    const targetIndex = newOrder.indexOf(targetColumnId)

    // Удаляем перетаскиваемый элемент и вставляем его в новое место
    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedColumn)

    setColumnOrder(newOrder)
    setDraggedColumn(null)
  }

  const handleDragEnd = () => {
    setDraggedColumn(null)
  }

  return (
    <div className="space-y-6">
      {/* Report Name and Actions */}
      <div className="bg-white rounded-xl shadow-soft border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <input
              type="text"
              value={reportConfig.name}
              onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Введите название отчета Ozon..."
              className="text-2xl font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0 w-full"
            />
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
              onClick={saveReport}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <BookmarkIcon className="h-4 w-4 mr-2" />
              Сохранить
            </button>
            <button
              onClick={generateReport}
              disabled={isGenerating || reportConfig.fields.length === 0 || !selectedTask || rawData.length === 0}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <PlayIcon className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? 'Генерация...' : 'Сгенерировать'}
            </button>
          </div>
        </div>
        
        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Дата с</label>
            <input
              type="date"
              value={reportConfig.dateRange?.from || ''}
              onChange={(e) => setReportConfig(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange!, from: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Дата по</label>
            <input
              type="date"
              value={reportConfig.dateRange?.to || ''}
              onChange={(e) => setReportConfig(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange!, to: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-soft border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
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
          {/* Task Selection Tab */}
          {activeTab === 'task' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Выберите задание Ozon</h3>
                {isLoadingTasks ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-600">Загружаем список заданий...</p>
                  </div>
                ) : availableTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">Нет доступных заданий Ozon</p>
                    <p>Убедитесь, что есть завершенные или загруженные задания с пометкой Ozon или Озон</p>
                    <button
                      onClick={loadOzonTasks}
                      className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                    >
                      Обновить список
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Поле поиска заданий */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Поиск по названию задания:
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={taskSearchQuery}
                          onChange={(e) => setTaskSearchQuery(e.target.value)}
                          placeholder="Введите название задания для поиска..."
                          className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                      </div>
                      {taskSearchQuery && (
                        <p className="text-sm text-gray-500 mt-1">
                          Найдено заданий: {filteredTasks.length} из {availableTasks.length}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Выберите задание для создания отчета:
                      </label>
                      <select
                        value={selectedTask}
                        onChange={(e) => setSelectedTask(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">-- Выберите задание --</option>
                        <option value="__ALL_TASKS__">🔄 Все задания Ozon (объединить данные)</option>
                        {filteredTasks.map(taskName => (
                          <option key={taskName} value={taskName}>{taskName}</option>
                        ))}
                      </select>
                      {filteredTasks.length === 0 && taskSearchQuery && (
                        <p className="text-sm text-red-500 mt-1">
                          Задания с названием "{taskSearchQuery}" не найдены
                        </p>
                      )}
                    </div>
                    
                    {selectedTask && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="text-sm font-medium text-blue-900">
                            Выбрано задание: {selectedTask}
                          </span>
                        </div>
                        {isLoadingData ? (
                          <div className="mt-3 flex items-center text-sm text-blue-700">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2" />
                            Загружаем данные задания...
                          </div>
                        ) : rawData.length > 0 ? (
                          <div className="mt-3 text-sm text-blue-700">
                            Загружено {rawData.length} записей. Перейдите на вкладку "Поля" для настройки отчета.
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fields Tab */}
          {activeTab === 'fields' && (
            <div className="space-y-6">
              {isLoadingData ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-600">Загружаем данные Ozon...</p>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Выберите поля для отчета Ozon</h3>
                  {fieldCategories.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Нет доступных полей</p>
                      <button
                        onClick={loadOzonTasks}
                        className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                      >
                        Перезагрузить данные
                      </button>
                    </div>
                  ) : (
                    fieldCategories.map(category => (
                      <div key={category} className="mb-6">
                        <h4 className="text-md font-medium text-gray-700 mb-3">{category}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {availableFields
                            .filter(field => field.category === category)
                            .map(field => (
                              <label key={field.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={reportConfig.fields.includes(field.id)}
                                  onChange={() => handleFieldToggle(field.id)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <div className="flex-1">
                                  <span className="text-sm font-medium text-gray-900">{field.name}</span>
                                  <span className="text-xs text-gray-500 ml-2">({field.type})</span>
                                </div>
                              </label>
                            ))
                          }
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              
              {/* Группировка по артикулу */}
              {!isLoadingData && fieldCategories.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="groupByArticle"
                      checked={groupByArticle}
                      onChange={(e) => setGroupByArticle(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="groupByArticle" className="text-sm font-medium text-gray-900">
                      Группировать по артикулу и вычислять "Всего в заказе"
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-7">
                    Объединяет строки с одинаковыми артикулами, суммирует "Итог Заказ" и создает новое поле "Всего в заказе" с итоговой суммой по артикулу
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Filters Tab */}
          {activeTab === 'filters' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Фильтры</h3>
                <button
                  onClick={handleAddFilter}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Добавить фильтр
                </button>
              </div>
              
              {reportConfig.filters.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Фильтры не добавлены
                </div>
              ) : (
                <div className="space-y-4">
                  {reportConfig.filters.map((filter, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                      <select
                        value={filter.field}
                        onChange={(e) => handleUpdateFilter(index, { field: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {availableFields.map(field => (
                          <option key={field.id} value={field.id}>{field.name}</option>
                        ))}
                      </select>
                      
                      <select
                        value={filter.operator}
                        onChange={(e) => handleUpdateFilter(index, { operator: e.target.value as any })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {filterOperators.map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>
                      
                      <input
                        type="text"
                        value={filter.value}
                        onChange={(e) => handleUpdateFilter(index, { value: e.target.value })}
                        placeholder="Значение"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      
                      <button
                        onClick={() => handleRemoveFilter(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sorting Tab */}
          {activeTab === 'sorting' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Сортировка</h3>
                <button
                  onClick={handleAddSort}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Добавить сортировку
                </button>
              </div>
              
              {reportConfig.sorting.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Сортировка не настроена
                </div>
              ) : (
                <div className="space-y-4">
                  {reportConfig.sorting.map((sort, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                      <select
                        value={sort.field}
                        onChange={(e) => handleUpdateSort(index, { field: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {availableFields.map(field => (
                          <option key={field.id} value={field.id}>{field.name}</option>
                        ))}
                      </select>
                      
                      <select
                        value={sort.direction}
                        onChange={(e) => handleUpdateSort(index, { direction: e.target.value as 'asc' | 'desc' })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="asc">По возрастанию</option>
                        <option value="desc">По убыванию</option>
                      </select>
                      
                      <button
                        onClick={() => handleRemoveSort(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Предварительный просмотр</h3>
                {reportData.length > 0 && (
                  <button
                    onClick={handleExportReport}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-success-600 border border-transparent rounded-md hover:bg-success-700"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    Экспорт
                  </button>
                )}
              </div>
              
              {reportData.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <DocumentArrowDownIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">Отчет не сгенерирован</p>
                  <p>Настройте поля и нажмите "Сгенерировать" для создания отчета</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      💡 Вы можете перетаскивать заголовки колонок для изменения их порядка
                    </p>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {(() => {
                          console.log('Rendering table with columnOrder:', columnOrder)
                          const uniqueColumns = [...new Set(columnOrder)]
                          console.log('Unique columns:', uniqueColumns)
                          return uniqueColumns.map(columnName => {
                            const isDragging = draggedColumn === columnName
                          return (
                            <th 
                              key={columnName} 
                              className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-move select-none transition-all duration-200 ${
                                isDragging ? 'opacity-50 bg-blue-100' : 'hover:bg-gray-100'
                              }`}
                              draggable
                              onDragStart={(e) => handleDragStart(e, columnName)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, columnName)}
                              onDragEnd={handleDragEnd}
                              title="Перетащите для изменения порядка колонок"
                            >
                              <div className="flex items-center space-x-2">
                                <span>⋮⋮</span>
                                <span>{columnName}</span>
                              </div>
                            </th>
                          )
                          })
                        })()}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {[...new Set(columnOrder)].map(columnName => (
                            <td key={columnName} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row[columnName] !== undefined && row[columnName] !== null ? row[columnName] : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Template Manager Modal */}
      {showTemplateManager && (
        <ReportTemplateManager
          platform="ozon"
          currentConfig={reportConfig}
          onLoadTemplate={handleLoadTemplate}
          onClose={() => setShowTemplateManager(false)}
        />
      )}
    </div>
  )
}
