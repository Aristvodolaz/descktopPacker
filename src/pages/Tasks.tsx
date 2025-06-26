import { useState } from 'react'
import { useQuery } from 'react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { createExcelWithTimeInfo } from '../utils/excelProcessor'
import { usePagination } from '../utils/usePagination'
import Pagination from '../components/Pagination'
import ItemsPerPageSelector from '../components/ItemsPerPageSelector'
import {
  ClockIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { getTasksInProgress, getCompletedTasks, getUploadedTasks, downloadTaskData, hideTask } from '../utils/api'

type TabType = 'in-progress' | 'completed' | 'uploaded'

const tabs = [
  { id: 'in-progress', name: 'Выполняемые', icon: ClockIcon, color: 'text-warning-600' },
  { id: 'completed', name: 'Завершенные', icon: CheckCircleIcon, color: 'text-success-600' },
  { id: 'uploaded', name: 'Загруженные', icon: CloudArrowUpIcon, color: 'text-primary-600' }
]

export default function Tasks() {
  const [activeTab, setActiveTab] = useState<TabType>('in-progress')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const { data: tasksInProgress, isLoading: loadingInProgress, error: errorInProgress } = useQuery(
    'tasks-in-progress',
    getTasksInProgress,
    { refetchInterval: 30000 }
  )

  const { data: completedTasks, isLoading: loadingCompleted, error: errorCompleted } = useQuery(
    'completed-tasks',
    getCompletedTasks
  )

  const { data: uploadedTasks, isLoading: loadingUploaded, error: errorUploaded } = useQuery(
    'uploaded-tasks',
    getUploadedTasks
  )

  const getCurrentTasks = () => {
    switch (activeTab) {
      case 'in-progress':
        return tasksInProgress || []
      case 'completed':
        return completedTasks || []
      case 'uploaded':
        return uploadedTasks || []
      default:
        return []
    }
  }

  const getCurrentLoading = () => {
    switch (activeTab) {
      case 'in-progress':
        return loadingInProgress
      case 'completed':
        return loadingCompleted
      case 'uploaded':
        return loadingUploaded
      default:
        return false
    }
  }

  const getCurrentError = () => {
    switch (activeTab) {
      case 'in-progress':
        return errorInProgress
      case 'completed':
        return errorCompleted
      case 'uploaded':
        return errorUploaded
      default:
        return null
    }
  }

  const filteredTasks = getCurrentTasks().filter((task: any) => {
    const taskName = typeof task === 'string' ? task : task.Nazvanie_Zadaniya || ''
    return taskName.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Пагинация для отфильтрованных задач
  const pagination = usePagination({
    data: filteredTasks,
    itemsPerPage: itemsPerPage
  })

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId)
    setSearchTerm('')
    setSelectedTask(null)
    // Сбрасываем на первую страницу при смене вкладки
    pagination.goToPage(1)
  }

  const handleDownload = async (taskName: string) => {
    try {
      toast.loading('Подготовка Excel файла с данными о времени работы...')
      const data = await downloadTaskData(taskName)
      
      // Создаем Excel файл с информацией о времени работы
      const excelBuffer = createExcelWithTimeInfo(data, taskName)
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      // Скачиваем файл
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${taskName}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.dismiss()
      toast.success('Excel файл с русскими названиями колонок и данными о времени работы успешно скачан!')
    } catch (error) {
      toast.dismiss()
      toast.error('Ошибка при скачивании файла')
      console.error('Download error:', error)
    }
  }

  const handleHideTask = async (taskName: string) => {
    try {
      toast.loading('Скрытие задания...')
      await hideTask(taskName)
      toast.dismiss()
      toast.success('Задание успешно скрыто')
      
      // Обновляем данные после скрытия
      window.location.reload()
    } catch (error) {
      toast.dismiss()
      toast.error('Ошибка при скрытии задания')
      console.error('Hide task error:', error)
    }
  }

  const renderTaskItem = (task: any, index: number) => {
    const isInProgress = activeTab === 'in-progress'
    const taskName = typeof task === 'string' ? task : task.Nazvanie_Zadaniya || ''
    const isSelected = selectedTask === taskName

    return (
      <motion.div
        key={taskName}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`
          p-4 rounded-lg border cursor-pointer transition-all duration-200
          ${isSelected 
            ? 'border-primary-300 bg-primary-50 shadow-medium' 
            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-soft'
          }
        `}
        onClick={() => setSelectedTask(isSelected ? null : taskName)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">
              {taskName}
            </h4>
            {isInProgress && (
              <div className="mt-2 flex items-center space-x-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Прогресс</span>
                    <span>{task.Progress}%</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${task.Progress}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className="bg-primary-600 h-2 rounded-full"
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {task.CompletedTasks}/{task.TotalTasks}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            {/* Кнопка скрытия задания */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation()
                handleHideTask(taskName)
              }}
              title="Скрыть задание"
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </motion.button>
            
            {/* Кнопка скачивания для завершенных заданий */}
            {activeTab === 'completed' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload(taskName)
                }}
                title="Скачать Excel файл с русскими названиями колонок, данными о времени работы и количестве строк"
                className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Управление заданиями</h1>
        <p className="text-lg text-gray-600">
          Просматривайте и управляйте заданиями упаковки
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden"
      >
        <div className="border-b border-gray-200">
          <div className="flex">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as TabType)}
                  className={`
                    relative flex items-center px-6 py-4 text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'text-primary-700 bg-primary-50 border-b-2 border-primary-600' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <tab.icon className={`mr-2 h-5 w-5 ${isActive ? tab.color : 'text-gray-400'}`} />
                  {tab.name}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Search and Items Per Page */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Поиск в разделе "${tabs.find(t => t.id === activeTab)?.name}"`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
            <ItemsPerPageSelector
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setItemsPerPage(newItemsPerPage)
                pagination.setItemsPerPage(newItemsPerPage)
              }}
              options={[5, 10, 20, 50]}
            />
          </div>
        </div>

        {/* Task List */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {getCurrentError() ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <div className="text-danger-500 mb-4">
                  <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ошибка загрузки</h3>
                <p className="text-gray-600 mb-4">
                  Не удалось загрузить данные. Проверьте подключение к серверу.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="btn btn-primary"
                >
                  Попробовать снова
                </button>
              </motion.div>
            ) : getCurrentLoading() ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Загрузка заданий...</p>
              </motion.div>
            ) : filteredTasks.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <div className="text-gray-400 mb-4">
                  {searchTerm ? (
                    <MagnifyingGlassIcon className="h-12 w-12 mx-auto" />
                  ) : (
                    (() => {
                      const TabIcon = tabs.find(t => t.id === activeTab)?.icon
                      return TabIcon ? <TabIcon className="h-12 w-12 mx-auto" /> : null
                    })()
                  )}
                </div>
                <p className="text-gray-600">
                  {searchTerm 
                    ? `Ничего не найдено по запросу "${searchTerm}"` 
                    : `Нет ${tabs.find(t => t.id === activeTab)?.name.toLowerCase()} заданий`
                  }
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {pagination.currentData.map((task, index) => renderTaskItem(task, index))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Pagination */}
        {filteredTasks.length > 0 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={pagination.goToPage}
          />
        )}
      </motion.div>

      {/* Selected Task Details */}
      <AnimatePresence>
        {selectedTask && activeTab === 'in-progress' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-xl shadow-soft border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Детали задания</h3>
            <div className="space-y-4">
              {tasksInProgress?.find((task: any) => task.Nazvanie_Zadaniya === selectedTask) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Название</p>
                    <p className="font-medium text-gray-900">{selectedTask}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Прогресс</p>
                    <p className="font-medium text-gray-900">
                      {tasksInProgress.find((task: any) => task.Nazvanie_Zadaniya === selectedTask)?.Progress}%
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Выполнено</p>
                    <p className="font-medium text-gray-900">
                      {tasksInProgress.find((task: any) => task.Nazvanie_Zadaniya === selectedTask)?.CompletedTasks}/
                      {tasksInProgress.find((task: any) => task.Nazvanie_Zadaniya === selectedTask)?.TotalTasks}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 