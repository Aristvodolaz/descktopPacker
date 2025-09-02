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
  'Priemka_tovara_v_transportnykh_korobakh', // вариант без h в конце
  'Priemka_tovara_palletnaya',
  'Razbrakovka_tovara'
  // Убрали колонки для Озона из исключений:
  // 'Sortiruemyi_Tovar', 'Ne_Sortiruemyi_Tovar', 'Produkty', 'Opasnyi_Tovar',
  // 'Zakrytaya_Zona', 'Krupnogabaritnyi_Tovar', 'Yuvelirnye_Izdelia', 'PriznakSortirovki'
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

// Функция для удаления колонок ВП и Название задания из итогового отчета
const removeFinalReportColumns = (data: any[]): any[] => {
  if (data.length === 0) return data
  
  const columnsToRemove = ['ВП', 'vp', 'Название задания', 'Nazvanie_Zadaniya']
  
  return data.map(row => {
    const filteredRow: any = {}
    
    for (const [key, value] of Object.entries(row)) {
      // Пропускаем колонки ВП и Название задания
      if (!columnsToRemove.includes(key)) {
        filteredRow[key] = value
      }
    }
    
    return filteredRow
  })
}

// Функция для удаления колонок Озона из ВБ отчетов
const removeOzonColumnsForWB = (data: any[]): any[] => {
  if (data.length === 0) return data
  
  const ozonColumns = [
    'Сортируемый товар', 'Не сортируемый товар', 'Продукты', 
    'Опасный товар', 'Закрытая зона', 'Крупногабаритный товар', 'Ювелирные изделия'
  ]
  
  return data.map(row => {
    const filteredRow: any = {}
    
    for (const [key, value] of Object.entries(row)) {
      // Пропускаем колонки Озона для ВБ отчетов
      if (!ozonColumns.includes(key)) {
        filteredRow[key] = value
      }
    }
    
    return filteredRow
  })
}

// Функция для обработки краткого отчета ВБ: проставление срока годности и удаление записей без ШК_WPS
const processWBShortReport = (data: any[]): any[] => {
  if (data.length === 0) return data
  
  // Группируем по артикулам для проставления срока годности
  const artikulGroups: { [key: string]: any[] } = {}
  
  data.forEach(row => {
    const artikul = row['Артикул'] || row['Artikul']
    if (artikul) {
      if (!artikulGroups[artikul]) {
        artikulGroups[artikul] = []
      }
      artikulGroups[artikul].push(row)
    }
  })
  
  // Проставляем срок годности для одинаковых артикулов
  Object.values(artikulGroups).forEach(group => {
    // Находим срок годности в группе (где он есть)
    const expiryDate = group.find(row => 
      row['Срок Годности'] || row['Srok_Godnosti']
    )?.['Срок Годности'] || group.find(row => 
      row['Срок Годности'] || row['Srok_Godnosti']
    )?.['Srok_Godnosti']
    
    // Проставляем найденный срок годности всем записям в группе
    if (expiryDate) {
      group.forEach(row => {
        row['Срок Годности'] = expiryDate
        row['Srok_Godnosti'] = expiryDate
      })
    }
  })
  
  // Удаляем записи без ШК_WPS
  const filteredData = data.filter(row => {
    const shkWps = row['ШК WPS'] || row['SHK_WPS']
    return shkWps && String(shkWps).trim() !== ''
  })
  
  // Удаляем поле Srok_Godnosti из краткого отчета
  return filteredData.map(row => {
    const { Srok_Godnosti, ...filteredRow } = row
    return filteredRow
  })
}

// Функция для применения маппинга номеров паллетов к полному отчету ВБ
const applyPalletNumberMapping = (fullReportData: any[], palletSummary: any[]): any[] => {
  if (!fullReportData || fullReportData.length === 0 || !palletSummary || palletSummary.length === 0) {
    return fullReportData
  }
  
  // Создаем маппинг оригинальный номер -> новый номер
  const palletMapping: { [key: string]: number } = {}
  
  palletSummary.forEach(row => {
    const originalPallet = row['Оригинальный номер паллета'] || row['original_pallet_number']
    const newPallet = row['Новый номер паллета'] || row['renamed_number']
    
    if (originalPallet && newPallet) {
      palletMapping[String(originalPallet)] = Number(newPallet)
    }
  })
  
  // Применяем маппинг к полному отчету
  return fullReportData.map(row => {
    const updatedRow = { ...row }
    
    // Обновляем номер паллета в полном отчете
    const currentPallet = row['Pallet_No'] || row['Паллет №']
    if (currentPallet && palletMapping[String(currentPallet)]) {
      updatedRow['Pallet_No'] = palletMapping[String(currentPallet)]
      updatedRow['Паллет №'] = palletMapping[String(currentPallet)]
    }
    
    return updatedRow
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
    const processedKeys = new Set<string>()
    
    // Добавляем колонки в нужном порядке
    for (const col of desiredColumnOrder) {
      if (row.hasOwnProperty(col)) {
        reorderedRow[col] = row[col]
        processedKeys.add(col)
      }
    }
    
    // Добавляем оставшиеся колонки, которых нет в шаблоне и которые еще не обработаны
    for (const key of Object.keys(row)) {
      if (!processedKeys.has(key)) {
        reorderedRow[key] = row[key]
      }
    }
    
    return reorderedRow
  })
}

// Функция для установки фиксированной ширины колонок
function autosizeColumns(worksheet: XLSX.WorkSheet, _data: any[], header: string[]) {
  // Устанавливаем фиксированную ширину для всех колонок
  const FIXED_WIDTH = 12 // Фиксированная ширина колонки в символах
  const colWidths = header.map((col, _index) => {
    // Определяем ширину в зависимости от типа колонки
    let width = FIXED_WIDTH
    
    // Для некоторых колонок устанавливаем специальную ширину
    if (col === 'ВП' || col === 'Артикул' || col === 'Артикул Сырья' || col === 'ШК' || col === 'ШК Сырья') {
      width = 15 // Шире для кодов и артикулов
    } else if (col === 'Номенклатура' || col === 'Название товара') {
      width = 20 // Шире для названий
    } else if (col === 'Название задания') {
      width = 25 // Самая широкая для названия задания
    } else if (col.includes('Упаковка') || col.includes('Маркировка') || col.includes('Пересчет') || 
               col.includes('Фасовка') || col.includes('Термо') || col.includes('Разбор') || 
               col.includes('Подготовка') || col.includes('Раскомплект') || col.includes('Удаление') ||
               col.includes('Проверка') || col.includes('Спецификация') || col.includes('Вложить') ||
               col.includes('Измерение') || col.includes('Индекс') || col.includes('Прочие') ||
               col.includes('Сборка') || col.includes('Хранение') || col === 'Тип операции' ||
               col === 'Сортируемый товар' || col === 'Не сортируемый товар' || col === 'Продукты' ||
               col === 'Опасный товар' || col === 'Закрытая зона' || col === 'Крупногабаритный товар' ||
               col === 'Ювелирные изделия') {
      width = 10 // Уже для операционных колонок
    }
    
    return { 
      wch: width,
      wrapText: true // Включаем перенос текста
    }
  })
  worksheet['!cols'] = colWidths
}

// Функция для установки форматирования ячеек с переносом текста
function setCellFormatting(worksheet: XLSX.WorkSheet, _data: any[], _header: string[]) {
  // Устанавливаем форматирование для всех ячеек
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
  
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
      
      if (!worksheet[cellAddress]) {
        worksheet[cellAddress] = { v: '', t: 's' }
      }
      
      // Устанавливаем форматирование с переносом текста
      if (!worksheet[cellAddress].s) {
        worksheet[cellAddress].s = {}
      }
      
      // Специальное форматирование для заголовков (первая строка)
      if (row === 0) {
        worksheet[cellAddress].s = {
          ...worksheet[cellAddress].s,
          alignment: {
            vertical: 'center',
            horizontal: 'center',
            wrapText: true
          },
          font: {
            name: 'Calibri',
            sz: 9,
            bold: true
          },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        }
      } else {
        // Форматирование для данных (остальные строки)
        worksheet[cellAddress].s = {
          ...worksheet[cellAddress].s,
          alignment: {
            vertical: 'top',
            horizontal: 'left',
            wrapText: true
          },
          font: {
            name: 'Calibri',
            sz: 10
          },
          border: {
            top: { style: 'thin', color: { rgb: 'D0D0D0' } },
            bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
            left: { style: 'thin', color: { rgb: 'D0D0D0' } },
            right: { style: 'thin', color: { rgb: 'D0D0D0' } }
          }
        }
      }
    }
  }
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
    // Отладочная информация: выводим все колонки из первой строки
    if (dataset.length > 0) {
      console.log('=== DEBUG: Доступные колонки в данных ===')
      console.log('Английские названия:', Object.keys(dataset[0]))
      
      // Проверяем, есть ли колонки, связанные с хранением
      const storageRelatedKeys = Object.keys(dataset[0]).filter(key => 
        key.toLowerCase().includes('storage') || 
        key.toLowerCase().includes('khranenie') || 
        key.toLowerCase().includes('hranenie') ||
        key.toLowerCase().includes('store')
      )
      console.log('Колонки, связанные с хранением:', storageRelatedKeys)
    }
    
    return dataset.map(row => {
      const renamedRow: any = {}
      for (const [key, value] of Object.entries(row)) {
        const russianName = downloadColumnMappings[key] || key
        
        // Преобразуем ШК и ВП в строку для корректного отображения
        if (russianName === 'ШК' || russianName === 'ШК Сырья' || russianName === 'ШК WPS' || russianName === 'ВП') {
          renamedRow[russianName] = String(value || '')
        } 
        // Обрабатываем операционные колонки - преобразуем в числа, но 0 заменяем на пустую строку
        else if (russianName.includes('Упаковка') || russianName.includes('Маркировка') || 
                 russianName.includes('Печать') || russianName.includes('Пересчет') ||
                 russianName.includes('Фасовка') || russianName.includes('Термо') ||
                 russianName.includes('Разбор') || russianName.includes('Подготовка') ||
                 russianName.includes('Раскомплект') || russianName.includes('Удаление') ||
                 russianName.includes('Проверка') || russianName.includes('Спецификация') ||
                 russianName.includes('Вложить') || russianName.includes('Измерение') ||
                 russianName.includes('Индекс') || russianName.includes('Прочие') ||
                 russianName.includes('Сборка') || russianName.includes('Хранение') ||
                 russianName === 'Тип операции' || russianName === 'Продукты' || russianName === 'Опасный товар' ||
                 russianName === 'Закрытая зона' || russianName === 'Крупногабаритный товар' ||
                 russianName === 'Ювелирные изделия' || russianName === 'Не сортируемый товар' ||
                 russianName === 'Сортируемый товар') {
          // Преобразуем в число, если это возможно, но 0 заменяем на пустую строку
          const numValue = Number(value)
          if (!isNaN(numValue) && value !== null && value !== undefined) {
            renamedRow[russianName] = numValue === 0 ? '' : numValue
          } else {
            renamedRow[russianName] = value || null
          }
        }
        // Для остальных полей оставляем как есть
        else {
          renamedRow[russianName] = value
        }
      }
      return renamedRow
    })
  }
  
  // Определяем тип отчета по названию задания для предварительной обработки
  const isWB = taskName.toLowerCase().includes('wb') || taskName.toLowerCase().includes('wildberries')
  
  // Переименовываем колонки в обоих наборах
  if (dataSet1.length > 0) {
    dataSet1 = removeExcludedColumns(dataSet1) // Удаляем исключенные колонки
    dataSet1 = renameColumns(dataSet1)
    
    // Специальная обработка для ВБ краткого отчета
    if (isWB) {
      dataSet1 = processWBShortReport(dataSet1) // Проставляем срок годности и удаляем записи без ШК_WPS
      dataSet1 = removeOzonColumnsForWB(dataSet1) // Удаляем колонки Озона для ВБ
    }
    
    dataSet1 = reorderColumns(dataSet1) // Переупорядочиваем колонки
  }
  
  // Для WB: обрабатываем полный отчет с данными из краткого отчета
  if (isWB && dataSet1.length > 0 && dataSet2.length > 0) {
    // Используем новую функцию для расчета полного отчета ВБ
    dataSet2 = calculateWBFullReport(dataSet1, dataSet2)
    
    // После обработки применяем стандартную обработку
    dataSet2 = removeExcludedColumns(dataSet2)
    dataSet2 = renameColumns(dataSet2)
    dataSet2 = filterData(dataSet2)
    dataSet2 = removeOzonColumnsForWB(dataSet2) // Удаляем колонки Озона для ВБ
    dataSet2 = reorderColumns(dataSet2)
  } else if (isWB && dataSet1.length > 0) {
    // Если нет полного отчета, используем старую логику агрегации
    const aggregatedData = aggregateWBDataFromShortReport(dataSet1)
    if (aggregatedData.length > 0) {
      // Обрабатываем агрегированные данные так же, как и основные данные
      let processedAggregatedData = removeExcludedColumns(aggregatedData)
      processedAggregatedData = renameColumns(processedAggregatedData)
      processedAggregatedData = filterData(processedAggregatedData)
      processedAggregatedData = removeOzonColumnsForWB(processedAggregatedData) // Удаляем колонки Озона для ВБ
      processedAggregatedData = reorderColumns(processedAggregatedData)
      
      // Добавляем агрегированные данные к полному отчету
      dataSet2 = [...dataSet2, ...processedAggregatedData]
    }
  } else if (dataSet2.length > 0) {
    // Для не-WB отчетов применяем стандартную обработку
    dataSet2 = removeExcludedColumns(dataSet2)
    dataSet2 = renameColumns(dataSet2)
    dataSet2 = filterData(dataSet2)
    dataSet2 = reorderColumns(dataSet2)
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
  
  // Устанавливаем ширину колонок для листа времени
  timeWorksheet['!cols'] = [
    { wch: 25 }, // Первая колонка - названия полей
    { wch: 40 }  // Вторая колонка - значения
  ]
  
  // Применяем форматирование к листу времени
  const timeRange = XLSX.utils.decode_range(timeWorksheet['!ref'] || 'A1')
  for (let row = timeRange.s.r; row <= timeRange.e.r; row++) {
    for (let col = timeRange.s.c; col <= timeRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
      
      if (!timeWorksheet[cellAddress]) {
        timeWorksheet[cellAddress] = { v: '', t: 's' }
      }
      
      if (!timeWorksheet[cellAddress].s) {
        timeWorksheet[cellAddress].s = {}
      }
      
      // Форматирование для заголовка (первая строка)
      if (row === 0) {
        timeWorksheet[cellAddress].s = {
          alignment: {
            vertical: 'center',
            horizontal: 'center',
            wrapText: true
          },
          font: {
            name: 'Calibri',
            sz: 12,
            bold: true
          },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        }
      } else {
        // Форматирование для данных
        timeWorksheet[cellAddress].s = {
          alignment: {
            vertical: 'center',
            horizontal: 'left',
            wrapText: true
          },
          font: {
            name: 'Calibri',
            sz: 10
          },
          border: {
            top: { style: 'thin', color: { rgb: 'D0D0D0' } },
            bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
            left: { style: 'thin', color: { rgb: 'D0D0D0' } },
            right: { style: 'thin', color: { rgb: 'D0D0D0' } }
          }
        }
      }
    }
  }
  
  XLSX.utils.book_append_sheet(workbook, timeWorksheet, 'Время работы')

     // Создаем отчеты с отклонениями для WB и Озон
    const sourceData = dataSet2.length > 0 ? dataSet2 : dataSet1
   
   // Определяем тип отчета Озон (isWB уже определен выше)
    const isOzon = taskName.toLowerCase().includes('ozon') || taskName.toLowerCase().includes('озон')
  
  if (isWB && sourceData.length > 0) {
    const wbReport = createWBReport(sourceData)
    if (wbReport.length > 0) {
      const reorderedWbReport = reorderColumns(wbReport) // Применяем переупорядочивание колонок
      const cleanedWbReport = removeFinalReportColumns(reorderedWbReport) // Удаляем ВП и Название задания
      const finalWbReport = removeOzonColumnsForWB(cleanedWbReport) // Удаляем колонки Озона для ВБ
      const wbWorksheet = XLSX.utils.json_to_sheet(finalWbReport)
      autosizeColumns(wbWorksheet, finalWbReport, Object.keys(finalWbReport[0] || {}))
      setCellFormatting(wbWorksheet, finalWbReport, Object.keys(finalWbReport[0] || {}))
      XLSX.utils.book_append_sheet(workbook, wbWorksheet, 'WB Отклонения')
    }
  }
  
  if (isOzon && sourceData.length > 0) {
    const ozonReport = createOzonReport(sourceData)
    if (ozonReport.length > 0) {
      const reorderedOzonReport = reorderColumns(ozonReport) // Применяем переупорядочивание колонок
      const cleanedOzonReport = removeFinalReportColumns(reorderedOzonReport) // Удаляем ВП и Название задания
      const ozonWorksheet = XLSX.utils.json_to_sheet(cleanedOzonReport)
      autosizeColumns(ozonWorksheet, cleanedOzonReport, Object.keys(cleanedOzonReport[0] || {}))
      setCellFormatting(ozonWorksheet, cleanedOzonReport, Object.keys(cleanedOzonReport[0] || {}))
      XLSX.utils.book_append_sheet(workbook, ozonWorksheet, 'Озон Отклонения')
    }
  }
  
  // Если не WB и не Озон, создаем общий отчет отклонений
  if (!isWB && !isOzon && sourceData.length > 0) {
    const generalReport = createWBReport(sourceData) // Используем ту же логику
    if (generalReport.length > 0) {
      const reorderedGeneralReport = reorderColumns(generalReport) // Применяем переупорядочивание колонок
      const cleanedGeneralReport = removeFinalReportColumns(reorderedGeneralReport) // Удаляем ВП и Название задания
      const generalWorksheet = XLSX.utils.json_to_sheet(cleanedGeneralReport)
      autosizeColumns(generalWorksheet, cleanedGeneralReport, Object.keys(cleanedGeneralReport[0] || {}))
      setCellFormatting(generalWorksheet, cleanedGeneralReport, Object.keys(cleanedGeneralReport[0] || {}))
      XLSX.utils.book_append_sheet(workbook, generalWorksheet, 'Отклонения количества')
    }
  }
  
  // Создаем сводку по паллетам
  if (sourceData.length > 0) {
    const palletSummary = createPalletSummary(sourceData, isWB)
    if (palletSummary.length > 0) {
      let cleanedPalletSummary = removeFinalReportColumns(palletSummary) // Удаляем ВП и Название задания
      
      // Для ВБ удаляем колонки Озона
      if (isWB) {
        cleanedPalletSummary = removeOzonColumnsForWB(cleanedPalletSummary)
      }
      
      const palletWorksheet = XLSX.utils.json_to_sheet(cleanedPalletSummary)
      autosizeColumns(palletWorksheet, cleanedPalletSummary, Object.keys(cleanedPalletSummary[0] || {}))
      setCellFormatting(palletWorksheet, cleanedPalletSummary, Object.keys(cleanedPalletSummary[0] || {}))
      XLSX.utils.book_append_sheet(workbook, palletWorksheet, 'Сводка по паллетам')
      
      // Для ВБ: применяем маппинг номеров паллетов к полному отчету
      if (isWB && dataSet2.length > 0) {
        dataSet2 = applyPalletNumberMapping(dataSet2, palletSummary)
      }
    }
    
    // Создаем общую сводку по заданию
    const taskSummary = createTaskSummary(sourceData)
    if (taskSummary.length > 0) {
      let cleanedTaskSummary = removeFinalReportColumns(taskSummary) // Удаляем ВП и Название задания
      
      // Для ВБ удаляем колонки Озона
      if (isWB) {
        cleanedTaskSummary = removeOzonColumnsForWB(cleanedTaskSummary)
      }
      
      const taskSummaryWorksheet = XLSX.utils.json_to_sheet(cleanedTaskSummary)
      autosizeColumns(taskSummaryWorksheet, cleanedTaskSummary, Object.keys(cleanedTaskSummary[0] || {}))
      setCellFormatting(taskSummaryWorksheet, cleanedTaskSummary, Object.keys(cleanedTaskSummary[0] || {}))
      XLSX.utils.book_append_sheet(workbook, taskSummaryWorksheet, 'Общая сводка')
    }
  }
  
  // Добавляем листы с данными
  if (dataSet1.length > 0) {
    // Удаляем колонки ВП и Название задания из краткого отчета
    const cleanedDataSet1 = removeFinalReportColumns(dataSet1)
    const worksheet1 = XLSX.utils.json_to_sheet(cleanedDataSet1)
    autosizeColumns(worksheet1, cleanedDataSet1, Object.keys(cleanedDataSet1[0] || {}))
    setCellFormatting(worksheet1, cleanedDataSet1, Object.keys(cleanedDataSet1[0] || {}))
    XLSX.utils.book_append_sheet(workbook, worksheet1, 'Краткий отчет')
  }
  
  if (dataSet2.length > 0) {
    // Удаляем колонки ВП и Название задания из полного отчета
    const cleanedDataSet2 = removeFinalReportColumns(dataSet2)
    const worksheet2 = XLSX.utils.json_to_sheet(cleanedDataSet2)
    autosizeColumns(worksheet2, cleanedDataSet2, Object.keys(cleanedDataSet2[0] || {}))
    setCellFormatting(worksheet2, cleanedDataSet2, Object.keys(cleanedDataSet2[0] || {}))
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

// Интерфейс для отклонений количества
interface QuantityDiscrepancy {
  artikul: string
  nazvanie_tovara?: string
  calculated_quantity: number
  itog_zakaz: number
  discrepancy: number
  discrepancy_percentage: number
}

// Функция для расчета отклонений количества сборки
const calculateQuantityDiscrepancies = (data: any[]): QuantityDiscrepancy[] => {
  if (!data || data.length === 0) return []

  // Группируем данные по артикулам
  const groupedByArtikul: { [key: string]: any[] } = {}
  
  data.forEach(row => {
    const artikul = row.Artikul || row['Артикул']
    if (artikul) {
      if (!groupedByArtikul[artikul]) {
        groupedByArtikul[artikul] = []
      }
      groupedByArtikul[artikul].push(row)
    }
  })

  const discrepancies: QuantityDiscrepancy[] = []

  // Для каждого артикула рассчитываем отклонения
  Object.keys(groupedByArtikul).forEach(artikul => {
    const rows = groupedByArtikul[artikul]
    
    // Суммируем места * вложенность для артикула
    let totalCalculated = 0
    let itogZakaz = 0
    let nazvanieTovara = ''

    rows.forEach(row => {
      const mesto = Number(row.Mesto || row['Место'] || 0)
      const vlozhennost = Number(row.Vlozhennost || row['Вложенность'] || 0)
      const itog = Number(row.Itog_Zakaz || row['Итог Заказ'] || 0)
      
      totalCalculated += mesto * vlozhennost
      
      // Берем максимальное значение Итог заказа (должно быть одинаковое для артикула)
      if (itog > itogZakaz) {
        itogZakaz = itog
      }
      
      // Берем название товара из первой строки
      if (!nazvanieTovara && (row.Nazvanie_Tovara || row['Название товара'])) {
        nazvanieTovara = row.Nazvanie_Tovara || row['Название товара']
      }
    })

    // Рассчитываем отклонение
    const discrepancy = totalCalculated - itogZakaz
    const discrepancyPercentage = itogZakaz > 0 ? Math.round((discrepancy / itogZakaz) * 100) : 0

    // Добавляем в отчет только если есть отклонения
    if (discrepancy !== 0) {
      discrepancies.push({
        artikul,
        nazvanie_tovara: nazvanieTovara,
        calculated_quantity: totalCalculated,
        itog_zakaz: itogZakaz,
        discrepancy,
        discrepancy_percentage: discrepancyPercentage
      })
    }
  })

  return discrepancies.sort((a, b) => Math.abs(b.discrepancy) - Math.abs(a.discrepancy))
}

// Функция для создания отчета WB с отклонениями
const createWBReport = (data: any[]): any[] => {
  const discrepancies = calculateQuantityDiscrepancies(data)
  
  return discrepancies.map(item => ({
    'Артикул': item.artikul,
    'Название товара': item.nazvanie_tovara || '',
    'Расчетное количество (Места × Вложенность)': item.calculated_quantity,
    'Итог заказа': item.itog_zakaz,
    'Отклонение': item.discrepancy,
    'Отклонение %': item.discrepancy_percentage,
    'Статус': item.discrepancy > 0 ? 'Переизбыток' : 'Недостача'
  }))
}

// Функция для создания отчета Озон с отклонениями
const createOzonReport = (data: any[]): any[] => {
  const discrepancies = calculateQuantityDiscrepancies(data)
  
  return discrepancies.map(item => ({
    'Артикул': item.artikul,
    'Название товара': item.nazvanie_tovara || '',
    'Расчетное количество (Места × Вложенность)': item.calculated_quantity,
    'Итог заказа': item.itog_zakaz,
    'Отклонение': item.discrepancy,
    'Отклонение %': item.discrepancy_percentage,
    'Статус': item.discrepancy > 0 ? 'Переизбыток' : 'Недостача'
  }))
}

// Интерфейс для сводки по паллетам
interface PalletSummary {
  pallet_number: string
  places_count: number
  renamed_number?: number
}

// Функция для создания сводки по паллетам
const createPalletSummary = (data: any[], isWB: boolean = false): any[] => {
  if (!data || data.length === 0) return []
  
  const palletGroups: { [key: string]: number } = {}
  
  // Группируем данные по номерам паллетов и считаем места
  data.forEach(row => {
    const palletNo = row['Pallet_No'] || row['Паллет №'] || 'Без паллета'
    const mesto = Number(row['Mesto'] || row['Место'] || 0)
    
    if (palletNo && palletNo !== 'Без паллета') {
      if (!palletGroups[palletNo]) {
        palletGroups[palletNo] = 0
      }
      palletGroups[palletNo] += mesto
    }
  })
  
  // Создаем массив сводки
  const palletSummaries: PalletSummary[] = Object.entries(palletGroups).map(([palletNo, placesCount]) => ({
    pallet_number: palletNo,
    places_count: placesCount
  }))
  
  // Сортируем по номеру паллета
  palletSummaries.sort((a, b) => {
    const aNum = parseInt(a.pallet_number) || 0
    const bNum = parseInt(b.pallet_number) || 0
    return aNum - bNum
  })
  
  // Для WB переименовываем номера паллетов в 1, 2, 3, 4...
  if (isWB) {
    palletSummaries.forEach((summary, index) => {
      summary.renamed_number = index + 1
    })
    
    return palletSummaries.map((summary, index) => ({
      'Оригинальный номер паллета': summary.pallet_number,
      'Новый номер паллета': index + 1,
      'Количество мест': summary.places_count
    }))
  } else {
    return palletSummaries.map(summary => ({
      'Номер паллета': summary.pallet_number,
      'Количество мест': summary.places_count
    }))
  }
}

// Функция для создания общей сводки по заданию
const createTaskSummary = (data: any[]): any[] => {
  if (!data || data.length === 0) return []
  
  const totalPallets = new Set()
  let totalPlaces = 0
  
  data.forEach(row => {
    const palletNo = row['Pallet_No'] || row['Паллет №']
    const mesto = Number(row['Mesto'] || row['Место'] || 0)
    
    if (palletNo && palletNo !== 'Без паллета') {
      totalPallets.add(palletNo)
    }
    totalPlaces += mesto
  })
  
  return [
    {
      'Показатель': 'Общее количество паллетов',
      'Значение': totalPallets.size
    },
    {
      'Показатель': 'Общее количество мест',
      'Значение': totalPlaces
    },
    {
      'Показатель': 'Среднее количество мест на паллет',
      'Значение': totalPallets.size > 0 ? Math.round(totalPlaces / totalPallets.size) : 0
    }
  ]
}

// Функция для расчета полного отчета ВБ (аналогично calculate_full_report из Python)
const calculateWBFullReport = (shortReportData: any[], fullReportData: any[]): any[] => {
  console.log('=== calculateWBFullReport DEBUG ===')
  console.log('Краткий отчет (первые 2 строки):', shortReportData.slice(0, 2))
  console.log('Полный отчет (первые 2 строки):', fullReportData.slice(0, 2))
  console.log('Колонки краткого отчета:', shortReportData.length > 0 ? Object.keys(shortReportData[0]) : 'пустой')
  console.log('Колонки полного отчета:', fullReportData.length > 0 ? Object.keys(fullReportData[0]) : 'пустой')
  
  if (!shortReportData || shortReportData.length === 0) {
    console.log('Краткий отчет пуст, возвращаем полный отчет без изменений')
    return fullReportData
  }
  
  // Стандартизируем названия колонок
  const standardizeColumnNames = (data: any[]) => {
    return data.map(row => {
      const standardizedRow = { ...row }
      
      // Стандартизируем ключевые поля (проверяем все возможные варианты названий)
      // Артикул - ОБЯЗАТЕЛЬНО устанавливаем значение
      standardizedRow['Artikul'] = row['Артикул'] || row['Artikul'] || null
      
      // Количество товаров - ОБЯЗАТЕЛЬНО устанавливаем значение
      standardizedRow['Kolvo_Tovarov'] = row['Количество товаров'] || row['Kolvo_Tovarov'] || null
      
      // Паллет № - ОБЯЗАТЕЛЬНО устанавливаем значение
      standardizedRow['Pallet_No'] = row['Паллет №'] || row['Pallet_No'] || null
      
      // Вложенность - ОБЯЗАТЕЛЬНО устанавливаем значение
      standardizedRow['Vlozhennost'] = row['Вложенность'] || row['Vlozhennost'] || null
      
      // Место - ОБЯЗАТЕЛЬНО устанавливаем значение
      standardizedRow['Mesto'] = row['Место'] || row['Mesto'] || null
      
      return standardizedRow
    })
  }
  
  // Стандартизируем данные
  const standardizedShortReport = standardizeColumnNames(shortReportData)
  let standardizedFullReport = standardizeColumnNames(fullReportData)
  
  console.log('После стандартизации краткий отчет (первая строка):', standardizedShortReport[0])
  console.log('После стандартизации полный отчет (первая строка):', standardizedFullReport[0])
  
  // Проверяем конкретные значения стандартизированных полей
  if (standardizedShortReport.length > 0) {
    console.log('Стандартизированные поля краткого отчета:', {
      Artikul: standardizedShortReport[0]['Artikul'],
      Kolvo_Tovarov: standardizedShortReport[0]['Kolvo_Tovarov'],
      Pallet_No: standardizedShortReport[0]['Pallet_No']
    })
  }
  
  if (standardizedFullReport.length > 0) {
    console.log('Стандартизированные поля полного отчета:', {
      Artikul: standardizedFullReport[0]['Artikul'],
      Vlozhennost: standardizedFullReport[0]['Vlozhennost'],
      Mesto: standardizedFullReport[0]['Mesto'],
      Pallet_No: standardizedFullReport[0]['Pallet_No']
    })
  }
  
  // Проверяем наличие необходимых колонок в кратком отчете
  const requiredColumns = ['Artikul', 'Kolvo_Tovarov', 'Pallet_No']
  const hasRequiredColumns = standardizedShortReport.length > 0 && 
    requiredColumns.every(col => standardizedShortReport[0].hasOwnProperty(col))
  
  console.log('Проверка необходимых колонок:', {
    hasRequiredColumns,
    availableColumns: standardizedShortReport.length > 0 ? Object.keys(standardizedShortReport[0]) : [],
    requiredColumns
  })
  
  if (!hasRequiredColumns) {
    console.warn('Отсутствуют необходимые колонки в кратком отчете:', requiredColumns)
    console.warn('Доступные колонки:', standardizedShortReport.length > 0 ? Object.keys(standardizedShortReport[0]) : [])
    return fullReportData
  }
  
  // Группируем данные краткого отчета по стандартизированным колонкам
  const groupedData: { [key: string]: { count: number, pallet: string } } = {}
  
  standardizedShortReport.forEach((row, index) => {
    const artikul = row['Artikul']
    const kolvo = row['Kolvo_Tovarov']
    const pallet = row['Pallet_No']
    
    if (index < 3) { // Логируем первые 3 строки
      console.log(`Строка ${index}:`, { artikul, kolvo, pallet })
    }
    
    if (artikul && kolvo && pallet) {
      const groupKey = `${artikul}_${kolvo}_${pallet}`
      
      if (!groupedData[groupKey]) {
        groupedData[groupKey] = { count: 0, pallet }
      }
      groupedData[groupKey].count += 1
    }
  })
  
  console.log('Сгруппированные данные:', groupedData)
  console.log('Количество групп:', Object.keys(groupedData).length)
  
  // Логируем уникальные артикулы из обоих отчетов для сравнения
  const shortReportArtikuls = [...new Set(standardizedShortReport.map(row => row['Artikul']).filter(Boolean))].slice(0, 10)
  const fullReportArtikuls = [...new Set(standardizedFullReport.map(row => row['Artikul']).filter(Boolean))].slice(0, 10)
  
  console.log('Первые 10 артикулов из краткого отчета:', shortReportArtikuls)
  console.log('Первые 10 артикулов из полного отчета:', fullReportArtikuls)
  
  // Проверяем типы данных артикулов
  if (shortReportArtikuls.length > 0 && fullReportArtikuls.length > 0) {
    console.log('Тип артикула в кратком отчете:', typeof shortReportArtikuls[0], shortReportArtikuls[0])
    console.log('Тип артикула в полном отчете:', typeof fullReportArtikuls[0], fullReportArtikuls[0])
  }
  
  // Проверяем пересечения артикулов (с приведением к строке)
  const allShortArtikuls = new Set(standardizedShortReport.map(row => String(row['Artikul'])).filter(Boolean))
  const allFullArtikuls = new Set(standardizedFullReport.map(row => String(row['Artikul'])).filter(Boolean))
  const intersection = [...allShortArtikuls].filter(art => allFullArtikuls.has(art))
  
  console.log('Всего уникальных артикулов в кратком отчете:', allShortArtikuls.size)
  console.log('Всего уникальных артикулов в полном отчете:', allFullArtikuls.size)
  console.log('Пересекающихся артикулов:', intersection.length)
  if (intersection.length > 0) {
    console.log('Первые 5 пересекающихся артикулов:', intersection.slice(0, 5))
  }
  
  const newRows: any[] = []
  
  // Обрабатываем каждую группу
  Object.entries(groupedData).forEach(([groupKey, groupData]) => {
    const [artikul, kolvo, pallet] = groupKey.split('_')
    const mesto = groupData.count
    
    console.log(`Обрабатываем группу: ${groupKey}, место: ${mesto}`)
    
    // Сначала ищем по артикулу (с приведением типов)
    const artikulMatches = standardizedFullReport.filter(row => String(row['Artikul']) === String(artikul))
    console.log(`Найдено строк с артикулом ${artikul}: ${artikulMatches.length}`)
    
    if (artikulMatches.length > 0) {
      console.log(`Пример строки с артикулом ${artikul}:`, {
        Artikul: artikulMatches[0]['Artikul'],
        Vlozhennost: artikulMatches[0]['Vlozhennost'],
        Mesto: artikulMatches[0]['Mesto'],
        Pallet_No: artikulMatches[0]['Pallet_No']
      })
    }
    
    // Ищем совпадения в полном отчете по артикулу и вложенности (с приведением типов)
    const matches = standardizedFullReport.filter(row => 
      String(row['Artikul']) === String(artikul) && Number(row['Vlozhennost']) === Number(kolvo)
    )
    
    console.log(`Найдено совпадений для ${artikul}/${kolvo}: ${matches.length}`)
    
    if (matches.length > 0) {
      // Обновляем существующие строки
      matches.forEach(match => {
        const index = standardizedFullReport.findIndex(row => row === match)
        if (index !== -1) {
          console.log(`Обновляем строку ${index} для ${artikul}:`, {
            oldMesto: standardizedFullReport[index]['Mesto'],
            newMesto: mesto,
            oldPallet: standardizedFullReport[index]['Pallet_No'],
            newPallet: pallet
          })
          
          standardizedFullReport[index] = {
            ...standardizedFullReport[index],
            'Mesto': mesto,
            'Место': mesto,
            'Pallet_No': pallet,
            'Паллет №': pallet
          }
        }
      })
    } else {
      // Добавляем новые строки для несовпадающих элементов
      const matchesForCopy = standardizedFullReport.filter(row => String(row['Artikul']) === String(artikul))
      
      console.log(`Создаем новые строки для ${artikul}, найдено для копирования: ${matchesForCopy.length}`)
      
      if (matchesForCopy.length > 0) {
        matchesForCopy.forEach(match => {
          const newRow = {
            ...match,
            'Vlozhennost': Number(kolvo),
            'Вложенность': Number(kolvo),
            'Mesto': mesto,
            'Место': mesto,
            'Pallet_No': pallet,
            'Паллет №': pallet
          }
          newRows.push(newRow)
        })
      }
    }
  })
  
  // Добавляем новые строки
  if (newRows.length > 0) {
    standardizedFullReport = [...standardizedFullReport, ...newRows]
  }
  
  // Удаляем избыточные строки: строки с пустыми Место, Вложенность и Pallet_No,
  // если для того же артикула уже есть строки с заполненными значениями
  const artikulGroups: { [key: string]: { filled: any[], empty: any[] } } = {}
  
  standardizedFullReport.forEach(row => {
    const artikul = String(row['Artikul'])
    if (!artikul || artikul === 'null' || artikul === 'undefined') return
    
    if (!artikulGroups[artikul]) {
      artikulGroups[artikul] = { filled: [], empty: [] }
    }
    
    const mesto = row['Mesto'] || row['Место']
    const vlozhennost = row['Vlozhennost'] || row['Вложенность']
    const pallet = row['Pallet_No'] || row['Паллет №']
    
    // Проверяем, заполнены ли ключевые поля
    if (mesto && vlozhennost && pallet) {
      artikulGroups[artikul].filled.push(row)
    } else if (!mesto && !vlozhennost && !pallet) {
      artikulGroups[artikul].empty.push(row)
    } else {
      // Частично заполненные строки оставляем
      artikulGroups[artikul].filled.push(row)
    }
  })
  
  // Формируем финальный результат, исключая избыточные пустые строки
  const finalResult: any[] = []
  
  Object.values(artikulGroups).forEach(group => {
    // Добавляем все заполненные строки
    finalResult.push(...group.filled)
    
    // Добавляем пустые строки только если нет заполненных
    if (group.filled.length === 0) {
      finalResult.push(...group.empty)
    }
  })
  
  console.log('Финальный результат (первые 2 строки):', finalResult.slice(0, 2))
  console.log('Добавлено новых строк:', newRows.length)
  console.log('Итоговое количество строк:', finalResult.length)
  console.log('=== END calculateWBFullReport DEBUG ===')
  
  return finalResult
}

// Функция для агрегации данных WB из краткого отчета (устаревшая, заменена на calculateWBFullReport)
const aggregateWBDataFromShortReport = (shortReportData: any[]): any[] => {
  if (!shortReportData || shortReportData.length === 0) return []
  
  // Группируем данные по комбинации Артикул + Паллет №
  const groupedData: { [key: string]: any } = {}
  
  shortReportData.forEach(row => {
    const artikul = row['Artikul'] || row['Артикул'] || ''
    const palletNo = row['Pallet_No'] || row['Паллет №'] || ''
    const vlozhennost = Number(row['Vlozhennost'] || row['Вложенность'] || 1)
    
    // Создаем уникальный ключ для группировки
    const groupKey = `${artikul}_${palletNo}`
    
    if (!groupedData[groupKey]) {
      // Создаем новую запись, копируя все данные из первой записи группы
      groupedData[groupKey] = { ...row }
      // Инициализируем агрегированные поля
      groupedData[groupKey]['Место'] = 0
      groupedData[groupKey]['Вложенность'] = vlozhennost
      groupedData[groupKey]['Паллет №'] = palletNo
      groupedData[groupKey]['Артикул'] = artikul
      
      // Также обновляем английские названия полей
      groupedData[groupKey]['Mesto'] = 0
      groupedData[groupKey]['Vlozhennost'] = vlozhennost
      groupedData[groupKey]['Pallet_No'] = palletNo
      groupedData[groupKey]['Artikul'] = artikul
    }
    
    // Суммируем места (каждая запись = 1 место)
    groupedData[groupKey]['Место'] = (groupedData[groupKey]['Место'] || 0) + 1
    groupedData[groupKey]['Mesto'] = (groupedData[groupKey]['Mesto'] || 0) + 1
  })
  
  return Object.values(groupedData)
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