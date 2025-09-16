import { 
  EnhancedReportConfig, 
  ReportRow, 
  DataProcessorOptions 
} from '../../types/report-builder-enhanced'
import { HierarchyBuilder } from './hierarchyBuilder'
import { SortingEngine, createDefaultSortingStrategies } from './sortingEngine'
import { applyFilters, applyDateRange } from '../reportDataProcessor'

/**
 * Продвинутый процессор данных с поддержкой:
 * - Асинхронной обработки больших объёмов данных
 * - Web Workers для фоновой обработки
 * - Кэширования результатов
 * - Пакетной обработки
 * - Иерархических структур
 */

export class EnhancedDataProcessor {
  private hierarchyBuilder: HierarchyBuilder
  private sortingEngine: SortingEngine
  private options: DataProcessorOptions
  private cache = new Map<string, any>()

  constructor(options: DataProcessorOptions = {
    enableAsync: true,
    batchSize: 1000,
    enableWorker: false // Пока отключен, можно включить позже
  }) {
    this.options = options
    this.sortingEngine = new SortingEngine()
    
    // Регистрируем стандартные стратегии сортировки
    const strategies = createDefaultSortingStrategies()
    strategies.forEach((strategy, field) => {
      this.sortingEngine.registerStrategy(field, strategy)
    })
    
    // Инициализируем с пустой конфигурацией
    this.hierarchyBuilder = new HierarchyBuilder({
      enabled: false,
      groupField: ''
    })
  }

  /**
   * Основной метод обработки данных
   */
  async processData(
    rawData: any[], 
    config: EnhancedReportConfig
  ): Promise<ReportRow[]> {
    console.log('🔄 Enhanced data processing started:', {
      rawDataLength: rawData.length,
      hierarchyEnabled: config.hierarchy?.enabled,
      fieldsCount: config.fields.length,
      filtersCount: config.filters.length,
      sortingCount: config.sorting.length
    })

    const startTime = performance.now()
    
    try {
      // Генерируем ключ для кэширования
      const cacheKey = this.generateCacheKey(rawData, config)
      
      // Проверяем кэш
      if (this.cache.has(cacheKey)) {
        console.log('📦 Returning cached result')
        return this.cache.get(cacheKey)
      }

      let processedData = [...rawData]

      // Этап 1: Применяем фильтрацию по дате
      if (config.dateRange && (config.dateRange.from || config.dateRange.to)) {
        processedData = applyDateRange(processedData, config.dateRange)
        console.log(`📅 Date filtering: ${rawData.length} → ${processedData.length}`)
      }

      // Этап 2: Применяем пользовательские фильтры
      if (config.filters?.length > 0) {
        processedData = applyFilters(processedData, config.filters)
        console.log(`🔍 Custom filtering: ${processedData.length} records`)
      }

      // Этап 3: Выбираем только нужные поля (если не используем иерархию)
      if (config.fields?.length > 0 && !config.hierarchy?.enabled) {
        processedData = this.selectFields(processedData, config.fields)
        console.log(`📋 Field selection: ${config.fields.length} fields selected`)
      }

      // Этап 4: Создаем иерархию или конвертируем в ReportRows
      let hierarchicalData: ReportRow[]
      
      if (config.hierarchy?.enabled && config.hierarchy.groupField) {
        this.hierarchyBuilder = new HierarchyBuilder(config.hierarchy)
        hierarchicalData = this.hierarchyBuilder.buildHierarchy(processedData)
        console.log(`🌳 Hierarchy built: ${hierarchicalData.length} groups`)
      } else {
        hierarchicalData = this.convertToReportRows(processedData)
        console.log(`📄 Converted to flat structure: ${hierarchicalData.length} rows`)
      }

      // Этап 5: Применяем сортировку
      if (config.sorting?.length > 0) {
        const sortConfigs = config.sorting.map((sort, index) => ({
          field: sort.field,
          direction: sort.direction,
          priority: index + 1
        }))

        if (config.hierarchy?.enabled) {
          // Сортируем иерархические данные
          const compareFn = (a: any, b: any) => 
            this.sortingEngine.sort([{data: a}, {data: b}], sortConfigs)[0].data === a ? -1 : 1
          
          hierarchicalData = this.hierarchyBuilder.sortHierarchy(hierarchicalData, compareFn)
        } else {
          // Обычная сортировка
          const sortedData = this.sortingEngine.sort(
            hierarchicalData.map(row => row.data), 
            sortConfigs
          )
          hierarchicalData = this.convertToReportRows(sortedData)
        }
        
        console.log(`🔄 Sorting applied: ${config.sorting.length} criteria`)
      }

      // Кэшируем результат
      this.cache.set(cacheKey, hierarchicalData)
      
      const endTime = performance.now()
      console.log(`✅ Processing completed in ${Math.round(endTime - startTime)}ms`)

      return hierarchicalData

    } catch (error) {
      console.error('❌ Error in data processing:', error)
      throw error
    }
  }

  /**
   * Асинхронная обработка больших объёмов данных по частям
   */
  async processDataAsync(
    rawData: any[],
    config: EnhancedReportConfig,
    onProgress?: (progress: number) => void
  ): Promise<ReportRow[]> {
    if (!this.options.enableAsync || rawData.length < this.options.batchSize) {
      return this.processData(rawData, config)
    }

    console.log(`🔄 Starting async processing for ${rawData.length} records`)
    
    const batches = this.createBatches(rawData, this.options.batchSize)
    const processedBatches: any[][] = []
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const processed = await this.processBatch(batch, config)
      processedBatches.push(processed)
      
      // Уведомляем о прогрессе
      if (onProgress) {
        const progress = (i + 1) / batches.length * 100
        onProgress(progress)
      }
      
      // Позволяем UI обновиться
      await this.delay(0)
    }
    
    // Объединяем результаты
    const combinedData = processedBatches.flat()
    
    // Финальная обработка (иерархия, сортировка)
    return this.finalizeProcessing(combinedData, config)
  }

  /**
   * Обрабатывает один пакет данных
   */
  private async processBatch(batch: any[], config: EnhancedReportConfig): Promise<any[]> {
    let processed = [...batch]
    
    // Базовая фильтрация
    if (config.filters?.length > 0) {
      processed = applyFilters(processed, config.filters)
    }
    
    if (config.dateRange) {
      processed = applyDateRange(processed, config.dateRange)
    }
    
    return processed
  }

  /**
   * Финализирует обработку после объединения пакетов
   */
  private async finalizeProcessing(data: any[], config: EnhancedReportConfig): Promise<ReportRow[]> {
    // Выбор полей
    if (config.fields?.length > 0) {
      data = this.selectFields(data, config.fields)
    }
    
    // Создание иерархии
    let hierarchicalData: ReportRow[]
    if (config.hierarchy?.enabled && config.hierarchy.groupField) {
      this.hierarchyBuilder = new HierarchyBuilder(config.hierarchy)
      hierarchicalData = this.hierarchyBuilder.buildHierarchy(data)
    } else {
      hierarchicalData = this.convertToReportRows(data)
    }
    
    // Финальная сортировка
    if (config.sorting?.length > 0) {
      const sortConfigs = config.sorting.map((sort, index) => ({
        field: sort.field,
        direction: sort.direction,
        priority: index + 1
      }))
      
      if (config.hierarchy?.enabled) {
        const compareFn = (a: any, b: any) => 
          this.sortingEngine.sort([{data: a}, {data: b}], sortConfigs)[0].data === a ? -1 : 1
        hierarchicalData = this.hierarchyBuilder.sortHierarchy(hierarchicalData, compareFn)
      } else {
        const sortedData = this.sortingEngine.sort(
          hierarchicalData.map(row => row.data), 
          sortConfigs
        )
        hierarchicalData = this.convertToReportRows(sortedData)
      }
    }
    
    return hierarchicalData
  }

  /**
   * Выбирает только нужные поля из данных
   */
  private selectFields(data: any[], fields: string[]): any[] {
    if (!fields.length) return data

    return data.map(row => {
      const newRow: any = {}
      fields.forEach(field => {
        newRow[field] = row[field]
      })
      return newRow
    })
  }

  /**
   * Преобразует плоские данные в ReportRows
   */
  private convertToReportRows(data: any[]): ReportRow[] {
    return data.map((item, index) => ({
      id: `row-${index}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      data: item,
      level: 0,
      isGroup: false,
      isExpanded: false
    }))
  }

  /**
   * Разделяет данные на пакеты для обработки
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * Создаёт задержку для асинхронной обработки
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Генерирует ключ для кэширования
   */
  private generateCacheKey(data: any[], config: EnhancedReportConfig): string {
    const dataHash = this.simpleHash(JSON.stringify(data.slice(0, 3))) // Хешируем первые 3 записи
    const configHash = this.simpleHash(JSON.stringify(config))
    return `${dataHash}-${configHash}-${data.length}`
  }

  /**
   * Простая hash функция для кэширования
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Конвертируем в 32-битное число
    }
    return hash.toString(36)
  }

  /**
   * Очищает кэш
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Получает статистику кэша
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }

  /**
   * Обновляет настройки процессора
   */
  updateOptions(options: Partial<DataProcessorOptions>): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * Получает билдер иерархий для прямого использования
   */
  getHierarchyBuilder(): HierarchyBuilder {
    return this.hierarchyBuilder
  }

  /**
   * Получает движок сортировки для прямого использования
   */
  getSortingEngine(): SortingEngine {
    return this.sortingEngine
  }
}
