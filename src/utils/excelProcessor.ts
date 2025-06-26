import * as XLSX from 'xlsx'
import { downloadColumnMappings, desiredColumnOrder } from './columnMappings'

// Список колонок, которые нужно исключить из Excel файла
const EXCLUDED_COLUMNS = [
  'Op_14_TU_1_Sht',
  'Op_15_TU_2_Sht',
  'Pechat_Etiketki_s_SHK',
  'Pechat_Etiketki_s_Opisaniem',
  'Kompleksnaya_priemka_tovara',
  'Priemka_tovara_v_transportnykh_korobkakh',
  'Priemka_tovara_palletnaya',
  'Razbrakovka_tovara',
  'Sortiruemyi_Tovar'
]

// Функция для удаления исключенных колонок из данных
const removeExcludedColumns = (data: any[]): any[] => {
  if (data.length === 0) return data
  
  return data.map(row => {
    const filteredRow: any = {}
    
    for (const [key, value] of Object.entries(row)) {
      // Пропускаем исключенные колонки
      if (!EXCLUDED_COLUMNS.includes(key)) {
        filteredRow[key] = value
      }
    }
    
    return filteredRow
  })
}

interface TimeInfo {
  taskName: string
  startTime?: string
  endTime?: string
  duration?: string
  totalRows: number
}

// Функция для парсинга российского формата даты "HH:MM:SS DD.MM.YYYY"
const parseRussianDateTime = (dateStr: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null
  
  try {
    const parts = dateStr.trim().split(' ')
    if (parts.length === 2) {
      const [timePart, datePart] = parts
      
      // Разбираем время
      const [hours, minutes, seconds] = timePart.split(':').map(Number)
      
      // Разбираем дату
      const [day, month, year] = datePart.split('.').map(Number)
      
      return new Date(year, month - 1, day, hours, minutes, seconds)
    }
  } catch (error) {
    console.error('Ошибка парсинга даты:', error)
  }
  
  return null
}

// Функция для парсинга различных форматов дат
const parseDateTime = (dateStr: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null
  
  // Сначала пробуем российский формат
  const russianDate = parseRussianDateTime(dateStr)
  if (russianDate) return russianDate
  
  // Пробуем стандартные форматы
  const formats = [
    /(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})/, // MM-DD-YYYY HH:MM:SS
    /(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2}):(\d{2})/, // DD.MM.YYYY HH:MM:SS
    /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/, // YYYY-MM-DD HH:MM:SS
  ]
  
  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      try {
        const [, p1, p2, p3, hours, minutes, seconds] = match
        // Определяем порядок в зависимости от формата
        if (format === formats[0]) { // MM-DD-YYYY
          return new Date(Number(p3), Number(p1) - 1, Number(p2), Number(hours), Number(minutes), Number(seconds))
        } else if (format === formats[1]) { // DD.MM.YYYY
          return new Date(Number(p3), Number(p2) - 1, Number(p1), Number(hours), Number(minutes), Number(seconds))
        } else { // YYYY-MM-DD
          return new Date(Number(p1), Number(p2) - 1, Number(p3), Number(hours), Number(minutes), Number(seconds))
        }
      } catch (error) {
        console.error('Ошибка парсинга формата:', error)
      }
    }
  }
  
  // Последняя попытка - стандартный парсер
  try {
    return new Date(dateStr)
  } catch {
    return null
  }
}

// Функция для извлечения информации о времени работы
const extractTimeInfo = (data: any[], taskName: string): TimeInfo => {
  const timeInfo: TimeInfo = {
    taskName,
    totalRows: data.length
  }
  
  // Ищем колонки с временными данными
  const timeStartCol = data.length > 0 ? Object.keys(data[0]).find(col => 
    ['Начало', 'Time_Start', 'time_start'].includes(col)
  ) : null
  
  const timeEndCol = data.length > 0 ? Object.keys(data[0]).find(col => 
    ['Окончание', 'Time_End', 'time_end'].includes(col)
  ) : null
  
  if (timeStartCol && timeEndCol && data.length > 0) {
    // Извлекаем все даты и находим минимальную и максимальную
    const startTimes = data
      .map(row => parseDateTime(row[timeStartCol]))
      .filter(date => date !== null) as Date[]
    
    const endTimes = data
      .map(row => parseDateTime(row[timeEndCol]))
      .filter(date => date !== null) as Date[]
    
    if (startTimes.length > 0 && endTimes.length > 0) {
      const startTime = new Date(Math.min(...startTimes.map(d => d.getTime())))
      const endTime = new Date(Math.max(...endTimes.map(d => d.getTime())))
      
      timeInfo.startTime = startTime.toLocaleString('ru-RU')
      timeInfo.endTime = endTime.toLocaleString('ru-RU')
      
      // Вычисляем продолжительность
      const durationMs = endTime.getTime() - startTime.getTime()
      const hours = Math.floor(durationMs / (1000 * 60 * 60))
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((durationMs % (1000 * 60)) / 1000)
      
      timeInfo.duration = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
  }
  
  return timeInfo
}

// Функция для фильтрации данных (удаляет строки где Вложенность == 0 и Причина пустая)
const filterData = (data: any[]): any[] => {
  return data.filter(row => {
    const vlozhennost = row['Вложенность'] || row['Vlozhennost']
    const reason = row['Причина'] || row['reason']
    
    // Удаляем строки где Вложенность == 0 и Причина пустая
    if (Number(vlozhennost) === 0 && (!reason || String(reason).trim() === '')) {
      return false
    }
    
    return true
  })
}

// Функция для переупорядочивания колонок по шаблону
const reorderColumns = (data: any[]): any[] => {
  if (data.length === 0) return data
  
  return data.map(row => {
    const reorderedRow: any = {}
    
    // Добавляем колонки в нужном порядке
    for (const col of desiredColumnOrder) {
      reorderedRow[col] = row[col] || null
    }
    
    // Добавляем оставшиеся колонки, которых нет в шаблоне
    for (const key of Object.keys(row)) {
      if (!desiredColumnOrder.includes(key)) {
        reorderedRow[key] = row[key]
      }
    }
    
    return reorderedRow
  })
}

// Функция для автоподбора ширины колонок по максимальной длине текста
function autosizeColumns(worksheet: XLSX.WorkSheet, data: any[], header: string[]) {
  const MAX_WIDTH = 40 // Максимальная ширина колонки в символах
  const colWidths = header.map((col, i) => {
    // Максимальная длина: заголовок или значение в строке
    let maxLen = (col ? String(col).length : 10)
    for (const row of data) {
      const val = row[col]
      if (val !== undefined && val !== null) {
        const len = String(val).length
        if (len > maxLen) maxLen = len
      }
    }
    // Немного увеличим ширину для красоты, но не больше MAX_WIDTH
    return { wch: Math.min(maxLen + 2, MAX_WIDTH) }
  })
  worksheet['!cols'] = colWidths
}

// Основная функция для создания Excel файла с данными о времени
export const createExcelWithTimeInfo = (
  data: any, 
  taskName: string
): ArrayBuffer => {
  const workbook = XLSX.utils.book_new()
  
  // Обрабатываем данные в зависимости от типа
  let dataSet1: any[] = []
  let dataSet2: any[] = []
  
  if (data.dataSet1 && Array.isArray(data.dataSet1)) {
    dataSet1 = data.dataSet1
  }
  
  if (data.dataSet2 && Array.isArray(data.dataSet2)) {
    dataSet2 = data.dataSet2
  }
  
  // Если нет отдельных наборов, используем основные данные
  if (dataSet1.length === 0 && dataSet2.length === 0) {
    dataSet1 = Array.isArray(data) ? data : [data]
  }
  
  // Определяем основной набор данных для извлечения времени
  const mainDataSet = dataSet2.length > 0 ? dataSet2 : dataSet1
  
  // Переименовываем колонки и обрабатываем данные
  const renameColumns = (dataset: any[]) => {
    return dataset.map(row => {
      const renamedRow: any = {}
      for (const [key, value] of Object.entries(row)) {
        const russianName = downloadColumnMappings[key] || key
        
        // Преобразуем ШК в строку для корректного отображения
        if (russianName === 'ШК' || russianName === 'ШК Сырья' || russianName === 'ШК WPS') {
          renamedRow[russianName] = String(value || '')
        } 
        // Обрабатываем операционные колонки - преобразуем в числа
        else if (russianName.includes('Упаковка') || russianName.includes('Маркировка') || 
                 russianName.includes('Печать') || russianName.includes('Пересчет') ||
                 russianName.includes('Фасовка') || russianName.includes('Термо') ||
                 russianName.includes('Разбор') || russianName.includes('Подготовка') ||
                 russianName.includes('Раскомплект') || russianName.includes('Удаление') ||
                 russianName.includes('Проверка') || russianName.includes('Спецификация') ||
                 russianName.includes('Вложить') || russianName.includes('Измерение') ||
                 russianName.includes('Индекс') || russianName.includes('Прочие') ||
                 russianName.includes('Сборка') || russianName.includes('Хранение') ||
                 russianName === 'Продукты' || russianName === 'Опасный товар' ||
                 russianName === 'Закрытая зона' || russianName === 'Крупногабаритный товар' ||
                 russianName === 'Ювелирные изделия' || russianName === 'Не сортируемый товар' ||
                 russianName === 'Сортируемый товар') {
          // Преобразуем в число, если это возможно
          const numValue = Number(value)
          renamedRow[russianName] = !isNaN(numValue) && value !== null && value !== undefined ? numValue : (value || null)
        }
        // Для остальных полей оставляем как есть
        else {
          renamedRow[russianName] = value
        }
      }
      return renamedRow
    })
  }
  
  // Переименовываем колонки в обоих наборах
  if (dataSet1.length > 0) {
    dataSet1 = removeExcludedColumns(dataSet1) // Удаляем исключенные колонки
    dataSet1 = renameColumns(dataSet1)
    dataSet1 = reorderColumns(dataSet1) // Переупорядочиваем колонки
  }
  
  if (dataSet2.length > 0) {
    dataSet2 = removeExcludedColumns(dataSet2) // Удаляем исключенные колонки
    dataSet2 = renameColumns(dataSet2)
    dataSet2 = filterData(dataSet2) // Фильтруем данные
    dataSet2 = reorderColumns(dataSet2) // Переупорядочиваем колонки
  }
  
  // Извлекаем информацию о времени
  const timeInfo = extractTimeInfo(mainDataSet, taskName)
  
  // Создаем лист с информацией о времени
  const timeData = [
    ['Информация о времени работы с заданием'],
    ['Название задания:', timeInfo.taskName],
    ['Количество строк:', timeInfo.totalRows],
    ['Начало работы:', timeInfo.startTime || 'Нет данных'],
    ['Окончание работы:', timeInfo.endTime || 'Нет данных'],
    ['Общее время работы:', timeInfo.duration || 'Нет данных']
  ]
  
  const timeWorksheet = XLSX.utils.aoa_to_sheet(timeData)
  XLSX.utils.book_append_sheet(workbook, timeWorksheet, 'Время работы')
  
  // Добавляем листы с данными
  if (dataSet1.length > 0) {
    const worksheet1 = XLSX.utils.json_to_sheet(dataSet1)
    autosizeColumns(worksheet1, dataSet1, Object.keys(dataSet1[0] || {}))
    XLSX.utils.book_append_sheet(workbook, worksheet1, 'Краткий отчет')
  }
  
  if (dataSet2.length > 0) {
    const worksheet2 = XLSX.utils.json_to_sheet(dataSet2)
    autosizeColumns(worksheet2, dataSet2, Object.keys(dataSet2[0] || {}))
    XLSX.utils.book_append_sheet(workbook, worksheet2, 'Полный отчет')
  }
  
  // Если есть только один набор данных, называем его "Отчет"
  if (dataSet1.length > 0 && dataSet2.length === 0) {
    // Переименовываем лист
    if (workbook.SheetNames.includes('Краткий отчет')) {
      const sheetIndex = workbook.SheetNames.indexOf('Краткий отчет')
      workbook.SheetNames[sheetIndex] = 'Отчет'
      workbook.Sheets['Отчет'] = workbook.Sheets['Краткий отчет']
      delete workbook.Sheets['Краткий отчет']
    }
  }
  
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
}

// Функция для обработки загружаемых Excel файлов
export const processUploadedExcel = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // Берем первый лист
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Конвертируем в JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        
        // Обрабатываем данные (заменяем NaN, пустые строки на null)
        const processedData = jsonData.map((row: any) => {
          const processedRow: any = {}
          for (const [key, value] of Object.entries(row)) {
            if (value === null || value === undefined || value === '' || 
                String(value).trim() === '' || String(value) === 'NaN') {
              processedRow[key] = null
            } else {
              processedRow[key] = value
            }
          }
          return processedRow
        })
        
        resolve(processedData)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Ошибка чтения файла'))
    reader.readAsArrayBuffer(file)
  })
} 