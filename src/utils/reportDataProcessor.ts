import { ReportConfig, ReportFilter } from '../types'
import { downloadColumnMappings } from './columnMappings'

// Функция для применения фильтров к данным
export const applyFilters = (data: any[], filters: ReportFilter[]): any[] => {
  if (!filters.length) return data

  return data.filter(row => {
    return filters.every(filter => {
      const value = row[filter.field]
      const filterValue = filter.value

      if (value === null || value === undefined) {
        return filter.operator === 'equals' && (filterValue === null || filterValue === '')
      }

      switch (filter.operator) {
        case 'equals':
          return String(value).toLowerCase() === String(filterValue).toLowerCase()
        
        case 'contains':
          return String(value).toLowerCase().includes(String(filterValue).toLowerCase())
        
        case 'greater':
          const numValue1 = Number(value)
          const numFilterValue1 = Number(filterValue)
          if (isNaN(numValue1) || isNaN(numFilterValue1)) return false
          return numValue1 > numFilterValue1
        
        case 'less':
          const numValue2 = Number(value)
          const numFilterValue2 = Number(filterValue)
          if (isNaN(numValue2) || isNaN(numFilterValue2)) return false
          return numValue2 < numFilterValue2
        
        case 'between':
          if (Array.isArray(filterValue) && filterValue.length === 2) {
            const numValue = Number(value)
            const numMin = Number(filterValue[0])
            const numMax = Number(filterValue[1])
            if (isNaN(numValue) || isNaN(numMin) || isNaN(numMax)) return false
            return numValue >= numMin && numValue <= numMax
          }
          return false
        
        case 'in':
          if (Array.isArray(filterValue)) {
            return filterValue.some(val => 
              String(value).toLowerCase() === String(val).toLowerCase()
            )
          }
          return String(value).toLowerCase() === String(filterValue).toLowerCase()
        
        default:
          return true
      }
    })
  })
}

// Функция для применения сортировки к данным
export const applySorting = (data: any[], sorting: { field: string; direction: 'asc' | 'desc' }[]): any[] => {
  if (!sorting.length) return data

  return [...data].sort((a, b) => {
    for (const sort of sorting) {
      const aVal = a[sort.field]
      const bVal = b[sort.field]

      // Обработка null/undefined значений
      if (aVal === null || aVal === undefined) {
        if (bVal === null || bVal === undefined) continue
        return sort.direction === 'asc' ? -1 : 1
      }
      if (bVal === null || bVal === undefined) {
        return sort.direction === 'asc' ? 1 : -1
      }

      // Сравнение чисел (проверяем и строки которые являются числами)
      const aNum = Number(aVal)
      const bNum = Number(bVal)
      if (!isNaN(aNum) && !isNaN(bNum) && aVal !== '' && bVal !== '') {
        const result = aNum - bNum
        if (result !== 0) {
          return sort.direction === 'asc' ? result : -result
        }
        continue
      }

      // Сравнение дат
      const aDate = new Date(aVal)
      const bDate = new Date(bVal)
      if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
        const result = aDate.getTime() - bDate.getTime()
        if (result !== 0) {
          return sort.direction === 'asc' ? result : -result
        }
        continue
      }

      // Сравнение строк
      const result = String(aVal).localeCompare(String(bVal))
      if (result !== 0) {
        return sort.direction === 'asc' ? result : -result
      }
    }
    return 0
  })
}

// Функция для выбора только нужных полей
export const selectFields = (data: any[], fields: string[]): any[] => {
  if (!fields.length) return data

  return data.map(row => {
    const newRow: any = {}
    fields.forEach(field => {
      newRow[field] = row[field]
    })
    return newRow
  })
}

// Функция для группировки данных
export const groupData = (data: any[], groupByFields: string[]): any[] => {
  if (!groupByFields.length) return data

  const groups: { [key: string]: any[] } = {}

  data.forEach(row => {
    const groupKey = groupByFields.map(field => row[field] || '').join('|')
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(row)
  })

  // Возвращаем сгруппированные данные с агрегацией
  return Object.entries(groups).map(([groupKey, groupRows]) => {
    const groupValues = groupKey.split('|')
    const aggregatedRow: any = {}

    // Устанавливаем значения группировки
    groupByFields.forEach((field, index) => {
      aggregatedRow[field] = groupValues[index]
    })

    // Агрегируем числовые поля (ищем их динамически)
    const numericFields = ['Itog_Zakaz', 'SOH', 'Kol_vo_Syrya', 'Итог Заказ', 'Количество товаров', 'itog_zakaz', 'soh', 'kol_vo_syrya']
    
    // Также ищем поля, которые содержат числа в первой строке группы
    const firstRow = groupRows[0]
    const additionalNumericFields = Object.keys(firstRow).filter(key => {
      const value = firstRow[key]
      return !isNaN(Number(value)) && value !== null && value !== undefined && value !== ''
    })
    
    const allNumericFields = [...new Set([...numericFields, ...additionalNumericFields])]
    
    allNumericFields.forEach(field => {
      const values = groupRows
        .map(row => {
          const value = row[field]
          return (value !== null && value !== undefined && !isNaN(Number(value))) ? Number(value) : 0
        })
        .filter(val => val !== 0)
      
      if (values.length > 0) {
        aggregatedRow[field] = values.reduce((sum, val) => sum + val, 0)
      } else if (firstRow[field] !== undefined) {
        // Если поле не числовое, берем значение из первой строки
        aggregatedRow[field] = firstRow[field]
      }
    })
    
    // Для нечисловых полей берем значение из первой строки группы
    Object.keys(firstRow).forEach(field => {
      if (!allNumericFields.includes(field)) {
        aggregatedRow[field] = firstRow[field]
      }
    })

    // Считаем количество записей в группе
    aggregatedRow['Количество_записей'] = groupRows.length

    return aggregatedRow
  })
}

// Функция для применения фильтрации по дате
export const applyDateRange = (data: any[], dateRange: { from: string; to: string } | undefined): any[] => {
  if (!dateRange || (!dateRange.from && !dateRange.to)) return data

  const fromDate = dateRange.from ? new Date(dateRange.from + 'T00:00:00') : null
  const toDate = dateRange.to ? new Date(dateRange.to + 'T23:59:59') : null

  return data.filter(row => {
    // Ищем поля с датами
    const dateFields = ['time_start', 'Time_Start', 'time_end', 'Time_End', 'Srok_Godnosti', 'created_at', 'updated_at']
    
    let hasValidDateField = false
    
    for (const field of dateFields) {
      const dateValue = row[field]
      if (dateValue) {
        const date = new Date(dateValue)
        if (!isNaN(date.getTime())) {
          hasValidDateField = true
          // Проверяем попадает ли дата в диапазон
          if (fromDate && date < fromDate) continue // Дата меньше начальной - проверяем следующее поле
          if (toDate && date > toDate) continue // Дата больше конечной - проверяем следующее поле
          return true // Если хотя бы одно поле даты попадает в диапазон
        }
      }
    }
    
    // Если есть поля с датами, но ни одно не попало в диапазон - исключаем запись
    if (hasValidDateField) return false
    
    // Если нет полей с датами, включаем запись (не фильтруем по дате)
    return true
  })
}

// Основная функция для обработки данных отчета
export const processReportData = (rawData: any[], config: ReportConfig, skipFieldSelection: boolean = false): any[] => {
  console.log('🔄 ProcessReportData started:', {
    rawDataLength: rawData.length,
    configFields: config.fields?.length || 0,
    configFilters: config.filters?.length || 0,
    configSorting: config.sorting?.length || 0,
    configGroupBy: config.groupBy?.length || 0,
    skipFieldSelection
  })
  
  let processedData = [...rawData]

  // 1. Применяем фильтрацию по дате
  if (config.dateRange && (config.dateRange.from || config.dateRange.to)) {
    const beforeDateFilter = processedData.length
    processedData = applyDateRange(processedData, config.dateRange)
    console.log(`📅 Date filter: ${beforeDateFilter} → ${processedData.length} records`)
  }

  // 2. Применяем пользовательские фильтры
  if (config.filters && config.filters.length > 0) {
    const beforeFilters = processedData.length
    processedData = applyFilters(processedData, config.filters)
    console.log(`🔍 User filters: ${beforeFilters} → ${processedData.length} records`)
  }

  // 3. Группируем данные если нужно
  if (config.groupBy && config.groupBy.length > 0) {
    const beforeGrouping = processedData.length
    processedData = groupData(processedData, config.groupBy)
    console.log(`📊 Grouping: ${beforeGrouping} → ${processedData.length} records`)
  }

  // 4. Применяем сортировку
  if (config.sorting && config.sorting.length > 0) {
    processedData = applySorting(processedData, config.sorting)
    console.log(`🔄 Sorting applied by: ${config.sorting.map(s => `${s.field} ${s.direction}`).join(', ')}`)
  }

  // 5. Выбираем только нужные поля (пропускаем если нужно сохранить все поля для последующей обработки)
  if (!skipFieldSelection && config.fields && config.fields.length > 0) {
    const beforeFieldSelection = processedData.length > 0 ? Object.keys(processedData[0]).length : 0
    processedData = selectFields(processedData, config.fields)
    const afterFieldSelection = processedData.length > 0 ? Object.keys(processedData[0]).length : 0
    console.log(`📋 Field selection: ${beforeFieldSelection} → ${afterFieldSelection} fields`)
  }

  console.log('✅ ProcessReportData completed:', {
    finalLength: processedData.length,
    finalFields: processedData.length > 0 ? Object.keys(processedData[0]).length : 0
  })

  return processedData
}

// Функция для получения доступных полей из данных
export const getAvailableFields = (data: any[]): string[] => {
  if (!data.length) return []

  const fieldSet = new Set<string>()
  data.forEach(row => {
    Object.keys(row).forEach(key => fieldSet.add(key))
  })

  return Array.from(fieldSet).sort()
}

// Функция для получения русских названий полей
export const getRussianFieldName = (fieldKey: string): string => {
  return downloadColumnMappings[fieldKey] || fieldKey
}

// Функция для получения типа поля на основе данных
export const getFieldType = (data: any[], fieldName: string): 'string' | 'number' | 'date' | 'boolean' => {
  if (!data.length) return 'string'

  // Берем первые несколько записей для анализа
  const sampleSize = Math.min(10, data.length)
  const samples = data.slice(0, sampleSize).map(row => row[fieldName]).filter(val => val !== null && val !== undefined)

  if (!samples.length) return 'string'

  // Проверяем на дату
  if (samples.some(val => {
    const date = new Date(val)
    return !isNaN(date.getTime()) && val.toString().match(/\d{4}-\d{2}-\d{2}/)
  })) {
    return 'date'
  }

  // Проверяем на число
  if (samples.every(val => !isNaN(Number(val)))) {
    return 'number'
  }

  // Проверяем на булево
  if (samples.every(val => val === true || val === false || val === 'true' || val === 'false' || val === 1 || val === 0)) {
    return 'boolean'
  }

  return 'string'
}

// Функция для группировки по артикулу и вычисления итогов
export const groupByArticleAndCalculateTotal = (data: any[]): any[] => {
  if (!data.length) return data

  console.log('Grouping data by article. Sample row:', data[0])
  console.log('Available fields in data:', Object.keys(data[0]))

  // Группируем данные по артикулу
  const groups: { [key: string]: any[] } = {}
  
  data.forEach(row => {
    // Ищем поле артикула в разных возможных названиях
    const articleField = Object.keys(row).find(key => 
      key.toLowerCase().includes('артикул') || 
      key.toLowerCase().includes('article') ||
      key.toLowerCase().includes('sku') ||
      key === 'Artikul' ||
      key === 'artikul'
    )
    
    const articleValue = articleField ? row[articleField] : 'Без артикула'
    const groupKey = String(articleValue || 'Без артикула')
    
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(row)
  })

  // Создаем итоговые записи для каждой группы
  return Object.entries(groups).map(([articleValue, groupRows]) => {
    // Берем первую запись как основу
    const baseRow = { ...groupRows[0] }
    
    console.log(`Processing group for article: ${articleValue}`)
    console.log(`Group has ${groupRows.length} rows`)
    console.log('Base row keys:', Object.keys(baseRow))
    console.log('Ispolnitel in base row:', baseRow['Ispolnitel'], baseRow['ispolnitel'], baseRow['Исполнитель'])
    
    // Находим поля для суммирования
    const fieldsToSum = [
      'Итог Заказ', 'Itog_Zakaz', 'itog_zakaz',
      'Количество товаров', 'Kol_vo_Syrya', 'kol_vo_syrya',
      'SOH', 'soh',
      'Всего в заказе', 'Vsego_v_zakaze', 'vsego_v_zakaze'
    ]
    
    // Суммируем числовые поля
    fieldsToSum.forEach(fieldName => {
      const values = groupRows
        .map(row => {
          const value = row[fieldName]
          return (value !== null && value !== undefined && !isNaN(Number(value))) ? Number(value) : 0
        })
        .filter(val => val !== 0)
      
      if (values.length > 0) {
        baseRow[fieldName] = values.reduce((sum, val) => sum + val, 0)
      }
    })
    
    // Вычисляем "Всего в заказе" как сумму всех "Итог Заказ" для данного артикула
    const totalOrderAmounts = groupRows
      .map(row => {
        const value = row['Итог Заказ'] || row['Itog_Zakaz'] || row['itog_zakaz'] || 0
        return (value !== null && value !== undefined && !isNaN(Number(value))) ? Number(value) : 0
      })
      .filter(val => val !== 0)
    
    const totalInOrder = totalOrderAmounts.reduce((sum, val) => sum + val, 0)
    
    // Добавляем новое поле "Всего в заказе"
    baseRow['Всего в заказе'] = totalInOrder
    
    // Добавляем информацию о количестве сгруппированных записей
    baseRow['Количество записей'] = groupRows.length
    
    return baseRow
  })
}
