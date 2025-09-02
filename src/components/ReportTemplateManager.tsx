import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookmarkIcon,
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'
import { ReportTemplate, ReportConfig } from '../types'
import {
  getTemplatesByPlatform,
  saveReportTemplate,
  updateReportTemplate,
  deleteReportTemplate,
  duplicateReportTemplate,
  exportTemplates,
  importTemplates
} from '../utils/reportTemplates'

interface ReportTemplateManagerProps {
  platform: 'wildberries' | 'ozon'
  reportType?: 'short' | 'full' // Для WB
  currentConfig: ReportConfig
  onLoadTemplate: (template: ReportTemplate) => void
  onClose: () => void
}

export default function ReportTemplateManager({
  platform,
  reportType,
  currentConfig,
  onLoadTemplate,
  onClose
}: ReportTemplateManagerProps) {
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')

  useEffect(() => {
    loadTemplates()
  }, [platform, reportType])

  const loadTemplates = () => {
    const platformTemplates = getTemplatesByPlatform(platform, reportType)
    setTemplates(platformTemplates)
  }

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      alert('Введите название шаблона')
      return
    }
    
    if (templateName.trim().length > 100) {
      alert('Название шаблона не должно превышать 100 символов')
      return
    }
    
    // Проверяем на дубликаты названий
    const existingTemplate = templates.find(t => t.name.toLowerCase() === templateName.trim().toLowerCase())
    if (existingTemplate) {
      alert('Шаблон с таким названием уже существует')
      return
    }

    try {
      const newTemplate = saveReportTemplate({
        name: templateName.trim(),
        description: templateDescription.trim() || undefined,
        platform,
        reportType,
        config: {
          fields: currentConfig.fields,
          filters: currentConfig.filters,
          sorting: currentConfig.sorting,
          groupBy: currentConfig.groupBy,
          dateRange: currentConfig.dateRange
        }
      })

      setTemplates(prev => [...prev, newTemplate])
      setShowSaveDialog(false)
      setTemplateName('')
      setTemplateDescription('')
    } catch (error) {
      console.error('Error saving template:', error)
      alert(error instanceof Error ? error.message : 'Ошибка при сохранении шаблона')
    }
  }

  const handleEditTemplate = () => {
    if (!editingTemplate || !templateName.trim()) {
      alert('Введите название шаблона')
      return
    }
    
    if (templateName.trim().length > 100) {
      alert('Название шаблона не должно превышать 100 символов')
      return
    }
    
    // Проверяем на дубликаты названий (исключая текущий шаблон)
    const existingTemplate = templates.find(t => 
      t.id !== editingTemplate.id && 
      t.name.toLowerCase() === templateName.trim().toLowerCase()
    )
    if (existingTemplate) {
      alert('Шаблон с таким названием уже существует')
      return
    }

    try {
      const updatedTemplate = updateReportTemplate(editingTemplate.id, {
        name: templateName.trim(),
        description: templateDescription.trim() || undefined
      })

      if (updatedTemplate) {
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? updatedTemplate : t))
        setShowEditDialog(false)
        setEditingTemplate(null)
        setTemplateName('')
        setTemplateDescription('')
      } else {
        alert('Шаблон не найден для редактирования')
      }
    } catch (error) {
      console.error('Error updating template:', error)
      alert(error instanceof Error ? error.message : 'Ошибка при редактировании шаблона')
    }
  }

  const handleDeleteTemplate = (template: ReportTemplate) => {
    if (window.confirm(`Удалить шаблон "${template.name}"?`)) {
      deleteReportTemplate(template.id)
      setTemplates(prev => prev.filter(t => t.id !== template.id))
    }
  }

  const handleDuplicateTemplate = (template: ReportTemplate) => {
    const duplicated = duplicateReportTemplate(template.id)
    if (duplicated) {
      setTemplates(prev => [...prev, duplicated])
    }
  }

  const handleExportTemplates = () => {
    const jsonData = exportTemplates()
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-templates-${platform}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportTemplates = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (importTemplates(content, 'merge')) {
        loadTemplates()
        alert('Шаблоны успешно импортированы!')
      } else {
        alert('Ошибка при импорте шаблонов')
      }
    }
    reader.readAsText(file)
    
    // Сброс input
    event.target.value = ''
  }

  const openEditDialog = (template: ReportTemplate) => {
    setEditingTemplate(template)
    setTemplateName(template.name)
    setTemplateDescription(template.description || '')
    setShowEditDialog(true)
  }

  const getTemplateFieldsCount = (template: ReportTemplate) => {
    return template.config.fields.length
  }

  const getTemplateFiltersCount = (template: ReportTemplate) => {
    return template.config.filters.length
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Шаблоны отчетов</h2>
              <p className="text-sm text-gray-500 mt-1">
                {platform === 'wildberries' ? 'Wildberries' : 'Ozon'}
                {reportType && ` - ${reportType === 'short' ? 'Краткий отчет' : 'Полный отчет'}`}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSaveDialog(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                <BookmarkIcon className="h-4 w-4 mr-1" />
                Сохранить текущий
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Actions */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportTemplates}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <CloudArrowDownIcon className="h-4 w-4 mr-1" />
                Экспорт
              </button>
              <label className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                <CloudArrowUpIcon className="h-4 w-4 mr-1" />
                Импорт
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportTemplates}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm text-gray-500">
              Найдено шаблонов: {templates.length}
            </p>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {templates.map(template => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="text-sm font-medium text-gray-900">{template.name}</h3>
                        {template.isDefault && (
                          <StarSolidIcon className="h-4 w-4 text-yellow-400 ml-2" title="Шаблон по умолчанию" />
                        )}
                      </div>
                      {template.description && (
                        <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>{getTemplateFieldsCount(template)} полей</span>
                    <span>{getTemplateFiltersCount(template)} фильтров</span>
                    <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => onLoadTemplate(template)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                    >
                      Загрузить
                    </button>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditDialog(template)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                        title="Редактировать"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicateTemplate(template)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                        title="Дублировать"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </button>
                      {!template.isDefault && (
                        <button
                          onClick={() => handleDeleteTemplate(template)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                          title="Удалить"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {templates.length === 0 && (
            <div className="text-center py-12">
              <BookmarkIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Нет сохраненных шаблонов</p>
              <button
                onClick={() => setShowSaveDialog(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Создать первый шаблон
              </button>
            </div>
          )}
        </div>

        {/* Save Dialog */}
        <AnimatePresence>
          {showSaveDialog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
              >
                <h3 className="text-lg font-medium text-gray-900 mb-4">Сохранить шаблон</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Название шаблона *
                    </label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Например: Основной отчет"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Описание (опционально)
                    </label>
                    <textarea
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Краткое описание шаблона..."
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowSaveDialog(false)
                      setTemplateName('')
                      setTemplateDescription('')
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSaveTemplate}
                    disabled={!templateName.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Сохранить
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Dialog */}
        <AnimatePresence>
          {showEditDialog && editingTemplate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
              >
                <h3 className="text-lg font-medium text-gray-900 mb-4">Редактировать шаблон</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Название шаблона *
                    </label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Описание (опционально)
                    </label>
                    <textarea
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowEditDialog(false)
                      setEditingTemplate(null)
                      setTemplateName('')
                      setTemplateDescription('')
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleEditTemplate}
                    disabled={!templateName.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Сохранить
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
