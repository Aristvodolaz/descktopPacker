import { ReportTemplate } from '../types'

const TEMPLATES_STORAGE_KEY = 'report-templates'

// Получить все шаблоны из localStorage
export const getReportTemplates = (): ReportTemplate[] => {
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading report templates:', error)
    return []
  }
}

// Получить шаблоны для конкретной платформы
export const getTemplatesByPlatform = (platform: 'wildberries' | 'ozon', reportType?: 'short' | 'full'): ReportTemplate[] => {
  const templates = getReportTemplates()
  return templates.filter(template => {
    if (template.platform !== platform) return false
    if (reportType && template.reportType && template.reportType !== reportType) return false
    return true
  })
}

// Максимальное количество шаблонов
const MAX_TEMPLATES = 50

// Сохранить шаблон
export const saveReportTemplate = (template: Omit<ReportTemplate, 'id' | 'createdAt'>): ReportTemplate => {
  const templates = getReportTemplates()
  
  // Проверяем лимит шаблонов
  if (templates.length >= MAX_TEMPLATES) {
    throw new Error(`Достигнут лимит шаблонов (${MAX_TEMPLATES}). Удалите старые шаблоны.`)
  }
  
  const newTemplate: ReportTemplate = {
    ...template,
    id: generateTemplateId(),
    createdAt: new Date().toISOString()
  }
  
  try {
    templates.push(newTemplate)
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates))
    console.log(`Template saved successfully: ${newTemplate.name}`)
    return newTemplate
  } catch (error) {
    console.error('Error saving template to localStorage:', error)
    // Проверяем, не превышен ли лимит localStorage
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      throw new Error('Недостаточно места для сохранения шаблона. Удалите старые шаблоны.')
    }
    throw new Error('Ошибка при сохранении шаблона')
  }
}

// Обновить шаблон
export const updateReportTemplate = (id: string, updates: Partial<Omit<ReportTemplate, 'id' | 'createdAt'>>): ReportTemplate | null => {
  const templates = getReportTemplates()
  const templateIndex = templates.findIndex(t => t.id === id)
  
  if (templateIndex === -1) return null
  
  const updatedTemplate = {
    ...templates[templateIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  }
  
  try {
    templates[templateIndex] = updatedTemplate
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates))
    console.log(`Template updated successfully: ${updatedTemplate.name}`)
    return updatedTemplate
  } catch (error) {
    console.error('Error updating template in localStorage:', error)
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      throw new Error('Недостаточно места для обновления шаблона.')
    }
    throw new Error('Ошибка при обновлении шаблона')
  }
}

// Удалить шаблон
export const deleteReportTemplate = (id: string): boolean => {
  const templates = getReportTemplates()
  const filteredTemplates = templates.filter(t => t.id !== id)
  
  if (filteredTemplates.length === templates.length) {
    console.warn(`Template with id ${id} not found for deletion`)
    return false
  }
  
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(filteredTemplates))
    console.log(`Template deleted successfully: ${id}`)
    return true
  } catch (error) {
    console.error('Error deleting template from localStorage:', error)
    return false
  }
}

// Получить шаблон по ID
export const getReportTemplate = (id: string): ReportTemplate | null => {
  const templates = getReportTemplates()
  return templates.find(t => t.id === id) || null
}

// Дублировать шаблон
export const duplicateReportTemplate = (id: string, newName?: string): ReportTemplate | null => {
  const template = getReportTemplate(id)
  if (!template) return null
  
  return saveReportTemplate({
    ...template,
    name: newName || `${template.name} (копия)`,
    description: template.description,
    isDefault: false // Копии не могут быть дефолтными
  })
}

// Экспорт шаблонов в JSON
export const exportTemplates = (): string => {
  const templates = getReportTemplates()
  return JSON.stringify(templates, null, 2)
}

// Импорт шаблонов из JSON
export const importTemplates = (jsonData: string, mergeMode: 'replace' | 'merge' = 'merge'): boolean => {
  try {
    const importedTemplates: ReportTemplate[] = JSON.parse(jsonData)
    
    if (!Array.isArray(importedTemplates)) {
      throw new Error('Invalid template format')
    }
    
    // Валидация структуры шаблонов
    for (const template of importedTemplates) {
      if (!template.id || !template.name || !template.platform || !template.config) {
        throw new Error(`Invalid template structure: missing required fields in template "${template.name || 'unknown'}"`)
      }
      
      // Проверяем платформу
      if (!['wildberries', 'ozon'].includes(template.platform)) {
        throw new Error(`Invalid platform "${template.platform}" in template "${template.name}"`)
      }
      
      // Проверяем тип отчета для WB
      if (template.platform === 'wildberries' && template.reportType && !['short', 'full'].includes(template.reportType)) {
        throw new Error(`Invalid reportType "${template.reportType}" in template "${template.name}"`)
      }
      
      // Проверяем конфигурацию
      if (!template.config.fields || !Array.isArray(template.config.fields)) {
        throw new Error(`Invalid fields configuration in template "${template.name}"`)
      }
      
      if (!template.config.filters || !Array.isArray(template.config.filters)) {
        throw new Error(`Invalid filters configuration in template "${template.name}"`)
      }
      
      if (!template.config.sorting || !Array.isArray(template.config.sorting)) {
        throw new Error(`Invalid sorting configuration in template "${template.name}"`)
      }
    }
    
    if (mergeMode === 'replace') {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(importedTemplates))
    } else {
      const existingTemplates = getReportTemplates()
      const existingIds = new Set(existingTemplates.map(t => t.id))
      
      // Добавляем только новые шаблоны или обновляем существующие
      const mergedTemplates = [...existingTemplates]
      
      for (const importedTemplate of importedTemplates) {
        if (existingIds.has(importedTemplate.id)) {
          // Обновляем существующий
          const index = mergedTemplates.findIndex(t => t.id === importedTemplate.id)
          mergedTemplates[index] = {
            ...importedTemplate,
            updatedAt: new Date().toISOString()
          }
        } else {
          // Добавляем новый
          mergedTemplates.push(importedTemplate)
        }
      }
      
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(mergedTemplates))
    }
    
    return true
  } catch (error) {
    console.error('Error importing templates:', error)
    return false
  }
}

// Генерация уникального ID для шаблона
const generateTemplateId = (): string => {
  return `template_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

// Обновление дефолтных шаблонов до новой версии
export const updateDefaultTemplates = (): void => {
  const existingTemplates = getReportTemplates()
  let hasUpdates = false
  
  // Обновляем краткий отчет WB - убираем лишние поля
  const shortWBTemplate = existingTemplates.find(t => 
    t.platform === 'wildberries' && 
    t.reportType === 'short' && 
    t.isDefault && 
    t.name === 'Краткий отчет WB'
  )
  
  if (shortWBTemplate) {
    const currentFields = shortWBTemplate.config.fields
    const shouldHaveFields = ['Artikul']
    
    // Проверяем, нужно ли обновление
    if (JSON.stringify(currentFields.sort()) !== JSON.stringify(shouldHaveFields.sort())) {
      console.log('Updating WB short report template fields:', currentFields, '->', shouldHaveFields)
      
      updateReportTemplate(shortWBTemplate.id, {
        config: {
          ...shortWBTemplate.config,
          fields: shouldHaveFields
        }
      })
      hasUpdates = true
    }
  }
  
  if (hasUpdates) {
    console.log('Default templates updated to new version')
  }
}

// Создание шаблонов по умолчанию
export const createDefaultTemplates = (): void => {
  const existingTemplates = getReportTemplates()
  
  // Если уже есть шаблоны, проверяем нужно ли их обновить
  if (existingTemplates.length > 0) {
    updateDefaultTemplates()
    return
  }
  
  console.log('Creating default report templates...')
  
  const defaultTemplates: Omit<ReportTemplate, 'id' | 'createdAt'>[] = [
    // Ozon шаблоны
    {
      name: 'Основной отчет Ozon',
      description: 'Базовый шаблон с основными полями для Ozon',
      platform: 'ozon',
      config: {
        fields: ['Artikul', 'Nazvanie_tovara', 'Itog_Zakaz', 'SOH', 'Kol_vo_Syrya'],
        filters: [],
        sorting: [{ field: 'Artikul', direction: 'asc' }],
        groupBy: []
      },
      isDefault: true
    },
    {
      name: 'Детальный отчет Ozon',
      description: 'Расширенный шаблон с дополнительными полями',
      platform: 'ozon',
      config: {
        fields: ['Artikul', 'Nazvanie_tovara', 'Itog_Zakaz', 'SOH', 'Kol_vo_Syrya', 'Ispolnitel', 'Mesto', 'Time_Start'],
        filters: [],
        sorting: [{ field: 'Time_Start', direction: 'desc' }],
        groupBy: []
      },
      isDefault: true
    },
    // Wildberries шаблоны
    {
      name: 'Краткий отчет WB',
      description: 'Базовый шаблон для краткого отчета Wildberries',
      platform: 'wildberries',
      reportType: 'short',
      config: {
        fields: ['Artikul'],
        filters: [],
        sorting: [{ field: 'Artikul', direction: 'asc' }],
        groupBy: []
      },
      isDefault: true
    },
    {
      name: 'Полный отчет WB',
      description: 'Расширенный шаблон для полного отчета Wildberries',
      platform: 'wildberries',
      reportType: 'full',
      config: {
        fields: ['Artikul', 'Nazvanie_tovara', 'Itog_Zakaz', 'SOH', 'Kol_vo_Syrya', 'Ispolnitel', 'Time_Start', 'Time_End'],
        filters: [],
        sorting: [{ field: 'Time_Start', direction: 'desc' }],
        groupBy: []
      },
      isDefault: true
    }
  ]
  
  // Создаем дефолтные шаблоны
  defaultTemplates.forEach(template => {
    saveReportTemplate(template)
  })
  
  console.log('Default report templates created')
}
