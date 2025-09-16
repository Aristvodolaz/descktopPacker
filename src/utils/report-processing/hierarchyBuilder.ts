import { ReportRow, HierarchyConfig } from '../../types/report-builder-enhanced'

/**
 * Продвинутый построитель иерархий для отчётов
 * Поддерживает многоуровневую группировку и агрегацию данных
 */

export class HierarchyBuilder {
  private config: HierarchyConfig
  
  constructor(config: HierarchyConfig) {
    this.config = config
  }

  /**
   * Строит иерархическую структуру из плоских данных
   */
  buildHierarchy(data: any[]): ReportRow[] {
    if (!this.config.enabled || !data.length) {
      return this.convertToReportRows(data, 0)
    }

    const groups = this.groupData(data, this.config.groupField)
    const hierarchicalData: ReportRow[] = []

    for (const [groupValue, groupItems] of groups.entries()) {
      const groupRow = this.createGroupRow(groupValue, groupItems, 0)
      
      // Если есть дочерние поля для отображения
      if (this.config.childrenFields && this.config.childrenFields.length > 0) {
        groupRow.children = this.convertToReportRows(groupItems, 1)
      }

      hierarchicalData.push(groupRow)
    }

    return hierarchicalData
  }

  /**
   * Группирует данные по указанному полю
   */
  private groupData(data: any[], groupField: string): Map<string, any[]> {
    const groups = new Map<string, any[]>()
    
    data.forEach(item => {
      const groupValue = String(item[groupField] || 'Без группы')
      
      if (!groups.has(groupValue)) {
        groups.set(groupValue, [])
      }
      
      groups.get(groupValue)!.push(item)
    })

    return groups
  }

  /**
   * Создаёт строку-группу с агрегированными данными
   */
  private createGroupRow(groupValue: string, items: any[], level: number): ReportRow {
    const aggregatedData = this.aggregateData(items)
    
    return {
      id: `group-${level}-${groupValue}`,
      data: {
        [this.config.groupField]: groupValue,
        ...aggregatedData
      },
      level,
      isGroup: true,
      isExpanded: false,
      aggregatedData,
      children: []
    }
  }

  /**
   * Агрегирует числовые данные для группы
   */
  private aggregateData(items: any[]): Record<string, any> {
    const aggregated: Record<string, any> = {}
    
    if (!items.length) return aggregated

    // Базовые агрегаты
    aggregated['Количество записей'] = items.length

    // Агрегируем указанные поля
    const fieldsToAggregate = this.config.aggregateFields || this.getNumericFields(items[0])
    
    fieldsToAggregate.forEach(field => {
      const values = items
        .map(item => this.parseNumber(item[field]))
        .filter(val => !isNaN(val))
      
      if (values.length > 0) {
        aggregated[field] = values.reduce((sum, val) => sum + val, 0)
        aggregated[`${field} (Среднее)`] = aggregated[field] / values.length
        aggregated[`${field} (Макс)`] = Math.max(...values)
        aggregated[`${field} (Мин)`] = Math.min(...values)
      }
    })

    return aggregated
  }

  /**
   * Получает список числовых полей из объекта
   */
  private getNumericFields(sample: any): string[] {
    const numericFieldPatterns = [
      /итог/i, /сох/i, /количество/i, /кол.*во/i, /сумма/i,
      /amount/i, /count/i, /total/i, /sum/i, /qty/i
    ]
    
    return Object.keys(sample).filter(key => {
      const value = sample[key]
      
      // Проверяем, является ли значение числом
      if (!isNaN(this.parseNumber(value))) return true
      
      // Проверяем название поля на соответствие паттернам
      return numericFieldPatterns.some(pattern => pattern.test(key))
    })
  }

  /**
   * Безопасно парсит число
   */
  private parseNumber(value: any): number {
    if (value === null || value === undefined || value === '') return NaN
    
    const num = Number(value)
    return isNaN(num) ? NaN : num
  }

  /**
   * Преобразует плоские данные в ReportRows
   */
  private convertToReportRows(data: any[], level: number): ReportRow[] {
    return data.map((item, index) => ({
      id: `row-${level}-${index}-${Date.now()}`,
      data: item,
      level,
      isGroup: false,
      isExpanded: false
    }))
  }

  /**
   * Разворачивает/сворачивает узлы иерархии
   */
  expandNode(rows: ReportRow[], nodeId: string, isExpanded: boolean): ReportRow[] {
    return rows.map(row => {
      if (row.id === nodeId) {
        return { ...row, isExpanded }
      }
      
      if (row.children) {
        return {
          ...row,
          children: this.expandNode(row.children, nodeId, isExpanded)
        }
      }
      
      return row
    })
  }

  /**
   * Получает плоский список видимых строк с учётом состояния развёрнутости
   */
  getFlattenedRows(rows: ReportRow[]): ReportRow[] {
    const flattened: ReportRow[] = []
    
    const processRows = (rowList: ReportRow[]) => {
      rowList.forEach(row => {
        flattened.push(row)
        
        if (row.isExpanded && row.children && row.children.length > 0) {
          processRows(row.children)
        }
      })
    }
    
    processRows(rows)
    return flattened
  }

  /**
   * Фильтрует иерархические данные
   */
  filterHierarchy(rows: ReportRow[], filterFn: (data: any) => boolean): ReportRow[] {
    const filterRecursive = (rowList: ReportRow[]): ReportRow[] => {
      return rowList
        .map(row => {
          const filteredChildren = row.children 
            ? filterRecursive(row.children)
            : []

          // Включаем группу если она сама проходит фильтр ИЛИ есть подходящие дети
          if (row.isGroup) {
            const hasMatchingChildren = filteredChildren.length > 0
            const groupMatches = filterFn(row.data)
            
            if (hasMatchingChildren || groupMatches) {
              return { ...row, children: filteredChildren }
            }
          } else {
            // Обычная строка - проверяем фильтр
            if (filterFn(row.data)) {
              return { ...row, children: filteredChildren }
            }
          }
          
          return null
        })
        .filter((row): row is ReportRow => row !== null)
    }
    
    return filterRecursive(rows)
  }

  /**
   * Сортирует иерархические данные
   */
  sortHierarchy(rows: ReportRow[], compareFn: (a: any, b: any) => number): ReportRow[] {
    const sortRecursive = (rowList: ReportRow[]): ReportRow[] => {
      // Сортируем текущий уровень
      const sorted = [...rowList].sort((a, b) => compareFn(a.data, b.data))
      
      // Рекурсивно сортируем детей
      return sorted.map(row => ({
        ...row,
        children: row.children ? sortRecursive(row.children) : undefined
      }))
    }
    
    return sortRecursive(rows)
  }
}
