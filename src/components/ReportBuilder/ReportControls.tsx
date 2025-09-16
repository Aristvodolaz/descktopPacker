import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  Bars3BottomLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { 
  ReportField, 
  FilterConfig, 
  SortConfig, 
  EnhancedReportConfig 
} from '../../types/report-builder-enhanced'

// ===== ОСНОВНЫЕ ИНТЕРФЕЙСЫ =====

interface ReportControlsProps {
  config: EnhancedReportConfig
  availableFields: ReportField[]
  onConfigChange: (config: Partial<EnhancedReportConfig>) => void
  isLoading?: boolean
}

interface FieldSelectorProps {
  availableFields: ReportField[]
  selectedFields: string[]
  onFieldToggle: (fieldId: string) => void
  searchTerm?: string
  onSearchChange?: (term: string) => void
}

interface FilterPanelProps {
  filters: FilterConfig[]
  availableFields: ReportField[]
  onFiltersChange: (filters: FilterConfig[]) => void
}

interface SortingPanelProps {
  sorting: SortConfig[]
  availableFields: ReportField[]
  onSortingChange: (sorting: SortConfig[]) => void
}

// ===== ОСНОВНОЙ КОМПОНЕНТ КОНТРОЛОВ =====

export const ReportControls: React.FC<ReportControlsProps> = ({
  config,
  availableFields,
  onConfigChange,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<'fields' | 'filters' | 'sorting'>('fields')
  const [searchTerm, setSearchTerm] = useState('')
  
  const tabs = [
    { id: 'fields' as const, name: 'Поля', icon: Bars3BottomLeftIcon },
    { id: 'filters' as const, name: 'Фильтры', icon: FunnelIcon },
    { id: 'sorting' as const, name: 'Сортировка', icon: Bars3BottomLeftIcon },
  ]

  const handleFieldToggle = useCallback((fieldId: string) => {
    const newFields = config.fields.includes(fieldId)
      ? config.fields.filter(id => id !== fieldId)
      : [...config.fields, fieldId]
    
    onConfigChange({ fields: newFields })
  }, [config.fields, onConfigChange])

  const handleFiltersChange = useCallback((filters: FilterConfig[]) => {
    onConfigChange({ 
      filters: filters.map(({ id, enabled, ...filter }) => filter)
    })
  }, [onConfigChange])

  const handleSortingChange = useCallback((sorting: SortConfig[]) => {
    onConfigChange({ 
      sorting: sorting.map(({ priority, ...sort }) => sort)
    })
  }, [onConfigChange])

  if (isLoading) {
    return <ControlsSkeleton />
  }

  return (
    <div className="bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden">
      {/* Заголовок с табами */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
              {tab.id === 'fields' && config.fields.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">
                  {config.fields.length}
                </span>
              )}
              {tab.id === 'filters' && config.filters.length > 0 && (
                <span className="ml-2 bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs">
                  {config.filters.length}
                </span>
              )}
              {tab.id === 'sorting' && config.sorting.length > 0 && (
                <span className="ml-2 bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-xs">
                  {config.sorting.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Содержимое табов */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'fields' && (
            <motion.div
              key="fields"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <FieldSelector
                availableFields={availableFields}
                selectedFields={config.fields}
                onFieldToggle={handleFieldToggle}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </motion.div>
          )}

          {activeTab === 'filters' && (
            <motion.div
              key="filters"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <FilterPanel
                filters={config.filters.map((filter, index) => ({
                  id: `filter-${index}`,
                  enabled: true,
                  ...filter
                }))}
                availableFields={availableFields}
                onFiltersChange={handleFiltersChange}
              />
            </motion.div>
          )}

          {activeTab === 'sorting' && (
            <motion.div
              key="sorting"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <SortingPanel
                sorting={config.sorting.map((sort, index) => ({
                  priority: index + 1,
                  ...sort
                }))}
                availableFields={availableFields}
                onSortingChange={handleSortingChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ===== СЕЛЕКТОР ПОЛЕЙ =====

const FieldSelector: React.FC<FieldSelectorProps> = ({
  availableFields,
  selectedFields,
  onFieldToggle,
  searchTerm = '',
  onSearchChange
}) => {
  const fieldCategories = [...new Set(availableFields.map(f => f.category))]
  
  const filteredFields = availableFields.filter(field =>
    !searchTerm || 
    field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Поиск полей */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Поиск полей..."
          value={searchTerm}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Быстрые действия */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Выбрано полей: {selectedFields.length}
        </span>
        <div className="flex space-x-2">
          <button
            onClick={() => availableFields.forEach(field => {
              if (!selectedFields.includes(field.id)) {
                onFieldToggle(field.id)
              }
            })}
            className="text-xs px-2 py-1 text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
          >
            Выбрать все
          </button>
          <button
            onClick={() => selectedFields.forEach(fieldId => onFieldToggle(fieldId))}
            className="text-xs px-2 py-1 text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
          >
            Очистить
          </button>
        </div>
      </div>

      {/* Поля по категориям */}
      {fieldCategories.map(category => {
        const categoryFields = filteredFields.filter(field => field.category === category)
        if (categoryFields.length === 0) return null

        return (
          <div key={category}>
            <h4 className="font-medium text-gray-900 mb-3">{category}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryFields.map(field => (
                <FieldCard
                  key={field.id}
                  field={field}
                  isSelected={selectedFields.includes(field.id)}
                  onToggle={() => onFieldToggle(field.id)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Карточка поля
interface FieldCardProps {
  field: ReportField
  isSelected: boolean
  onToggle: () => void
}

const FieldCard: React.FC<FieldCardProps> = ({ field, isSelected, onToggle }) => (
  <motion.label
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className={`
      flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all
      ${isSelected 
        ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200' 
        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }
    `}
  >
    <input
      type="checkbox"
      checked={isSelected}
      onChange={onToggle}
      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
    />
    <div className="flex-1 min-w-0">
      <span className="text-sm font-medium text-gray-900 truncate block">
        {field.name}
      </span>
      <span className="text-xs text-gray-500 flex items-center mt-1">
        {field.type}
        {field.id !== field.name && (
          <span className="ml-2 text-gray-400">({field.id})</span>
        )}
      </span>
    </div>
  </motion.label>
)

// ===== ПАНЕЛЬ ФИЛЬТРОВ =====

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  availableFields,
  onFiltersChange
}) => {
  const addFilter = () => {
    if (availableFields.length === 0) return

    const newFilter: FilterConfig = {
      id: `filter-${Date.now()}`,
      field: availableFields[0].id,
      operator: 'equals',
      value: '',
      enabled: true
    }

    onFiltersChange([...filters, newFilter])
  }

  const updateFilter = (id: string, updates: Partial<FilterConfig>) => {
    onFiltersChange(
      filters.map(filter => 
        filter.id === id ? { ...filter, ...updates } : filter
      )
    )
  }

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter(filter => filter.id !== id))
  }

  const toggleFilter = (id: string) => {
    updateFilter(id, { enabled: !filters.find(f => f.id === id)?.enabled })
  }

  const filterOperators = [
    { value: 'equals', label: 'Равно' },
    { value: 'contains', label: 'Содержит' },
    { value: 'greater', label: 'Больше' },
    { value: 'less', label: 'Меньше' },
    { value: 'between', label: 'Между' },
    { value: 'in', label: 'В списке' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Фильтры данных</h3>
        <button
          onClick={addFilter}
          disabled={availableFields.length === 0}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Добавить фильтр
        </button>
      </div>

      {filters.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FunnelIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">Фильтры не настроены</p>
          <p>Добавьте фильтры для настройки отображения данных</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filters.map((filter) => (
              <motion.div
                key={filter.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`
                  flex items-center space-x-3 p-4 border rounded-lg transition-all
                  ${filter.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}
                `}
              >
                <input
                  type="checkbox"
                  checked={filter.enabled}
                  onChange={() => toggleFilter(filter.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />

                <select
                  value={filter.field}
                  onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  disabled={!filter.enabled}
                >
                  {availableFields.map(field => (
                    <option key={field.id} value={field.id}>{field.name}</option>
                  ))}
                </select>

                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(filter.id, { operator: e.target.value as any })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  disabled={!filter.enabled}
                >
                  {filterOperators.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>

                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                  placeholder="Значение"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  disabled={!filter.enabled}
                />

                <button
                  onClick={() => removeFilter(filter.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ===== ПАНЕЛЬ СОРТИРОВКИ =====

const SortingPanel: React.FC<SortingPanelProps> = ({
  sorting,
  availableFields,
  onSortingChange
}) => {
  const addSort = () => {
    if (availableFields.length === 0) return

    const newSort: SortConfig = {
      field: availableFields[0].id,
      direction: 'asc',
      priority: sorting.length + 1
    }

    onSortingChange([...sorting, newSort])
  }

  const updateSort = (index: number, updates: Partial<SortConfig>) => {
    onSortingChange(
      sorting.map((sort, i) => 
        i === index ? { ...sort, ...updates } : sort
      )
    )
  }

  const removeSort = (index: number) => {
    const newSorting = sorting.filter((_, i) => i !== index)
    // Пересчитываем приоритеты
    onSortingChange(
      newSorting.map((sort, i) => ({ ...sort, priority: i + 1 }))
    )
  }

  const moveSortUp = (index: number) => {
    if (index === 0) return
    const newSorting = [...sorting]
    ;[newSorting[index], newSorting[index - 1]] = [newSorting[index - 1], newSorting[index]]
    onSortingChange(
      newSorting.map((sort, i) => ({ ...sort, priority: i + 1 }))
    )
  }

  const moveSortDown = (index: number) => {
    if (index === sorting.length - 1) return
    const newSorting = [...sorting]
    ;[newSorting[index], newSorting[index + 1]] = [newSorting[index + 1], newSorting[index]]
    onSortingChange(
      newSorting.map((sort, i) => ({ ...sort, priority: i + 1 }))
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Сортировка</h3>
        <button
          onClick={addSort}
          disabled={availableFields.length === 0}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Добавить сортировку
        </button>
      </div>

      {sorting.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Bars3BottomLeftIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">Сортировка не настроена</p>
          <p>Добавьте правила сортировки для упорядочения данных</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Данные будут отсортированы в указанном порядке приоритета
          </p>
          
          <AnimatePresence>
            {sorting.map((sort, index) => (
              <motion.div
                key={`sort-${index}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg bg-white"
              >
                <div className="flex flex-col space-y-1">
                  <button
                    onClick={() => moveSortUp(index)}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ChevronUpIcon className="h-3 w-3" />
                  </button>
                  <span className="text-xs text-gray-500 text-center min-w-[20px]">
                    {sort.priority}
                  </span>
                  <button
                    onClick={() => moveSortDown(index)}
                    disabled={index === sorting.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ChevronDownIcon className="h-3 w-3" />
                  </button>
                </div>

                <select
                  value={sort.field}
                  onChange={(e) => updateSort(index, { field: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {availableFields.map(field => (
                    <option key={field.id} value={field.id}>{field.name}</option>
                  ))}
                </select>

                <select
                  value={sort.direction}
                  onChange={(e) => updateSort(index, { direction: e.target.value as 'asc' | 'desc' })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="asc">По возрастанию</option>
                  <option value="desc">По убыванию</option>
                </select>

                <button
                  onClick={() => removeSort(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ===== SKELETON ЗАГРУЗКА =====

const ControlsSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl shadow-soft border border-gray-200 animate-pulse">
    <div className="border-b border-gray-200 px-6 py-4">
      <div className="flex space-x-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-6 w-20 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
    <div className="p-6 space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-12 bg-gray-100 rounded-lg"></div>
      ))}
    </div>
  </div>
)
