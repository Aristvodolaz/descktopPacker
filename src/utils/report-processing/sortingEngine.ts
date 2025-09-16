import { SortConfig, SortingStrategy } from '../../types/report-builder-enhanced'

/**
 * Продвинутый движок сортировки с поддержкой:
 * - Множественной сортировки по приоритетам
 * - Кастомных функций сравнения
 * - Умной сортировки чисел, дат и строк
 * - Сортировки с учётом locale
 */

export class SortingEngine {
  private strategies: Map<string, SortingStrategy> = new Map()

  /**
   * Регистрирует кастомную стратегию сортировки для поля
   */
  registerStrategy(field: string, strategy: SortingStrategy) {
    this.strategies.set(field, strategy)
  }

  /**
   * Сортирует данные по нескольким полям с приоритетами
   */
  sort(data: any[], sortConfigs: SortConfig[]): any[] {
    if (!sortConfigs.length) return data

    // Сортируем конфигурацию по приоритету
    const sortedConfigs = [...sortConfigs].sort((a, b) => a.priority - b.priority)

    return [...data].sort((a, b) => {
      for (const config of sortedConfigs) {
        const result = this.compareByField(a, b, config)
        if (result !== 0) return result
      }
      return 0
    })
  }

  /**
   * Сравнивает два объекта по указанному полю
   */
  private compareByField(a: any, b: any, config: SortConfig): number {
    const { field, direction } = config
    
    // Проверяем, есть ли кастомная стратегия для этого поля
    const strategy = this.strategies.get(field)
    if (strategy && strategy.compareFn) {
      const result = strategy.compareFn(a[field], b[field])
      return direction === 'asc' ? result : -result
    }

    // Используем умную сортировку
    const result = this.smartCompare(a[field], b[field], field)
    return direction === 'asc' ? result : -result
  }

  /**
   * Умное сравнение значений с автоопределением типа
   */
  private smartCompare(aVal: any, bVal: any, fieldName: string): number {
    // Обработка null/undefined
    if (this.isNullish(aVal) && this.isNullish(bVal)) return 0
    if (this.isNullish(aVal)) return -1
    if (this.isNullish(bVal)) return 1

    // Определяем тип данных и применяем подходящую сортировку
    const type = this.detectDataType(aVal, bVal, fieldName)
    
    switch (type) {
      case 'number':
        return this.compareNumbers(aVal, bVal)
      case 'date':
        return this.compareDates(aVal, bVal)
      case 'boolean':
        return this.compareBooleans(aVal, bVal)
      case 'string':
      default:
        return this.compareStrings(aVal, bVal)
    }
  }

  /**
   * Определяет тип данных для оптимальной сортировки
   */
  private detectDataType(aVal: any, bVal: any, fieldName: string): 'number' | 'date' | 'boolean' | 'string' {
    // Проверяем по названию поля
    const fieldLower = fieldName.toLowerCase()
    
    if (fieldLower.includes('date') || fieldLower.includes('время') || fieldLower.includes('дата')) {
      return 'date'
    }
    
    if (fieldLower.includes('количество') || fieldLower.includes('итог') || fieldLower.includes('сумма')) {
      return 'number'
    }

    // Проверяем фактические значения
    if (this.isNumeric(aVal) && this.isNumeric(bVal)) {
      return 'number'
    }
    
    if (this.isDate(aVal) && this.isDate(bVal)) {
      return 'date'
    }
    
    if (this.isBoolean(aVal) && this.isBoolean(bVal)) {
      return 'boolean'
    }
    
    return 'string'
  }

  /**
   * Сравнение чисел
   */
  private compareNumbers(a: any, b: any): number {
    const numA = this.parseNumber(a)
    const numB = this.parseNumber(b)
    
    if (isNaN(numA) && isNaN(numB)) return 0
    if (isNaN(numA)) return -1
    if (isNaN(numB)) return 1
    
    return numA - numB
  }

  /**
   * Сравнение дат
   */
  private compareDates(a: any, b: any): number {
    const dateA = this.parseDate(a)
    const dateB = this.parseDate(b)
    
    if (!dateA && !dateB) return 0
    if (!dateA) return -1
    if (!dateB) return 1
    
    return dateA.getTime() - dateB.getTime()
  }

  /**
   * Сравнение булевых значений
   */
  private compareBooleans(a: any, b: any): number {
    const boolA = this.parseBoolean(a)
    const boolB = this.parseBoolean(b)
    
    if (boolA === boolB) return 0
    return boolA ? 1 : -1
  }

  /**
   * Сравнение строк с учётом locale
   */
  private compareStrings(a: any, b: any): number {
    const strA = String(a || '')
    const strB = String(b || '')
    
    // Используем локализованное сравнение для русского языка
    return strA.localeCompare(strB, 'ru', {
      numeric: true, // Правильная сортировка строк с числами ("файл1", "файл2", "файл10")
      sensitivity: 'base' // Игнорируем регистр и диакритические знаки
    })
  }

  /**
   * Утилиты проверки типов
   */
  private isNullish(value: any): boolean {
    return value === null || value === undefined || value === ''
  }

  private isNumeric(value: any): boolean {
    if (this.isNullish(value)) return false
    return !isNaN(Number(value)) && isFinite(Number(value))
  }

  private isDate(value: any): boolean {
    if (this.isNullish(value)) return false
    const date = this.parseDate(value)
    return date !== null && !isNaN(date.getTime())
  }

  private isBoolean(value: any): boolean {
    return typeof value === 'boolean' || 
           value === 'true' || value === 'false' ||
           value === 1 || value === 0
  }

  /**
   * Парсеры значений
   */
  private parseNumber(value: any): number {
    if (this.isNullish(value)) return NaN
    
    // Убираем пробелы и заменяем запятые на точки для русских чисел
    const cleanValue = String(value).trim().replace(/,/g, '.')
    return Number(cleanValue)
  }

  private parseDate(value: any): Date | null {
    if (this.isNullish(value)) return null
    
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  }

  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    
    const str = String(value).toLowerCase()
    return str === 'true' || str === '1' || str === 'да' || str === 'yes'
  }

  /**
   * Создаёт функцию сортировки для Array.sort()
   */
  createSortFunction(sortConfigs: SortConfig[]) {
    return (a: any, b: any) => this.sort([a, b], sortConfigs).indexOf(a) - 
                               this.sort([a, b], sortConfigs).indexOf(b)
  }

  /**
   * Быстрая сортировка по одному полю
   */
  quickSort(data: any[], field: string, direction: 'asc' | 'desc' = 'asc'): any[] {
    const config: SortConfig = { field, direction, priority: 1 }
    return this.sort(data, [config])
  }

  /**
   * Сортировка с сохранением исходного порядка для равных элементов (stable sort)
   */
  stableSort(data: any[], sortConfigs: SortConfig[]): any[] {
    // Добавляем индекс для stable sort
    const indexedData = data.map((item, index) => ({ item, originalIndex: index }))
    
    const sorted = indexedData.sort((a, b) => {
      const result = this.sort([a.item, b.item], sortConfigs).indexOf(a.item) - 
                    this.sort([a.item, b.item], sortConfigs).indexOf(b.item)
      
      // Если элементы равны, сохраняем исходный порядок
      return result !== 0 ? result : a.originalIndex - b.originalIndex
    })
    
    return sorted.map(item => item.item)
  }
}

// Предустановленные стратегии сортировки
export const createDefaultSortingStrategies = (): Map<string, SortingStrategy> => {
  const strategies = new Map<string, SortingStrategy>()
  
  // Стратегия для артикулов (буквы + цифры)
  strategies.set('Artikul', {
    field: 'Artikul',
    direction: 'asc',
    compareFn: (a: any, b: any) => {
      const strA = String(a || '').toUpperCase()
      const strB = String(b || '').toUpperCase()
      return strA.localeCompare(strB, 'ru', { numeric: true })
    }
  })
  
  // Стратегия для исполнителей (по фамилии)
  strategies.set('Ispolnitel', {
    field: 'Ispolnitel',
    direction: 'asc', 
    compareFn: (a: any, b: any) => {
      const strA = String(a || '')
      const strB = String(b || '')
      
      // Извлекаем фамилию (первое слово)
      const lastNameA = strA.split(' ')[0] || strA
      const lastNameB = strB.split(' ')[0] || strB
      
      return lastNameA.localeCompare(lastNameB, 'ru')
    }
  })
  
  return strategies
}
