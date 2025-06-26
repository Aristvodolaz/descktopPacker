import { useQuery } from 'react-query'
import { motion } from 'framer-motion'
import { usePagination } from '../utils/usePagination'
import Pagination from '../components/Pagination'
import { 
  DocumentTextIcon, 
  ClockIcon, 
  CheckCircleIcon,
  CloudArrowUpIcon 
} from '@heroicons/react/24/outline'
import { getTasksInProgress, getCompletedTasks, getUploadedTasks } from '../utils/api'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5
    }
  }
}

const TASKS_PER_PAGE = 5

export default function Dashboard() {
  const { data: tasksInProgress, isLoading: loadingInProgress } = useQuery(
    'tasks-in-progress',
    getTasksInProgress,
    { refetchInterval: 30000 }
  )

  const { data: completedTasks, isLoading: loadingCompleted } = useQuery(
    'completed-tasks',
    getCompletedTasks,
    { refetchInterval: 60000 }
  )

  const { data: uploadedTasks, isLoading: loadingUploaded } = useQuery(
    'uploaded-tasks',
    getUploadedTasks,
    { refetchInterval: 60000 }
  )

  // Пагинация для активных заданий
  const tasksPagination = usePagination({
    data: tasksInProgress || [],
    itemsPerPage: TASKS_PER_PAGE
  })

  const stats = [
    {
      name: 'Выполняемые задания',
      value: loadingInProgress ? '...' : tasksInProgress?.length || 0,
      icon: ClockIcon,
      color: 'text-warning-600',
      bgColor: 'bg-warning-50',
      borderColor: 'border-warning-200'
    },
    {
      name: 'Завершенные задания',
      value: loadingCompleted ? '...' : completedTasks?.length || 0,
      icon: CheckCircleIcon,
      color: 'text-success-600',
      bgColor: 'bg-success-50',
      borderColor: 'border-success-200'
    },
    {
      name: 'Загруженные задания',
      value: loadingUploaded ? '...' : uploadedTasks?.length || 0,
      icon: CloudArrowUpIcon,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
      borderColor: 'border-primary-200'
    },
    {
      name: 'Всего заданий',
      value: loadingInProgress || loadingCompleted || loadingUploaded 
        ? '...' 
        : (tasksInProgress?.length || 0) + (completedTasks?.length || 0) + (uploadedTasks?.length || 0),
      icon: DocumentTextIcon,
      color: 'text-secondary-600',
      bgColor: 'bg-secondary-50',
      borderColor: 'border-secondary-200'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Добро пожаловать в{' '}
          <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
            Packer Desktop
          </span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Управляйте заданиями упаковки, загружайте файлы и отслеживайте прогресс в современном веб-интерфейсе
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.name}
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              relative overflow-hidden rounded-xl border p-6 shadow-soft transition-all duration-200
              ${stat.bgColor} ${stat.borderColor}
              hover:shadow-medium
            `}
          >
            <div className="flex items-center">
              <div className={`rounded-lg p-3 ${stat.bgColor.replace('50', '100')}`}>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            </div>
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-16 w-16 rounded-full bg-white opacity-10" />
          </motion.div>
        ))}
      </motion.div>

      {/* Active Tasks Overview */}
      {tasksInProgress && tasksInProgress.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Активные задания</h3>
            <p className="text-sm text-gray-600">Текущий прогресс выполнения заданий</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {tasksPagination.currentData.map((task, index) => (
                <motion.div
                  key={task.Nazvanie_Zadaniya}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 truncate">
                      {task.Nazvanie_Zadaniya}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {task.CompletedTasks}/{task.TotalTasks} выполнено
                    </p>
                  </div>
                  <div className="ml-4 flex items-center space-x-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${task.Progress}%` }}
                        transition={{ duration: 1, delay: index * 0.1 }}
                        className="bg-primary-600 h-2 rounded-full"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 min-w-[3rem] text-right">
                      {task.Progress}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Pagination for Active Tasks */}
          {tasksInProgress && tasksInProgress.length > TASKS_PER_PAGE && (
            <Pagination
              currentPage={tasksPagination.currentPage}
              totalPages={tasksPagination.totalPages}
              totalItems={tasksPagination.totalItems}
              itemsPerPage={tasksPagination.itemsPerPage}
              onPageChange={tasksPagination.goToPage}
            />
          )}
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-xl shadow-soft p-8 text-white"
      >
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-4">Быстрые действия</h3>
          <p className="text-primary-100 mb-8">
            Выберите действие для быстрого доступа к основным функциям
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.a
              href="/upload"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white/20 backdrop-blur-sm rounded-lg p-6 text-center hover:bg-white/30 transition-all duration-200"
            >
              <CloudArrowUpIcon className="h-8 w-8 mx-auto mb-3" />
              <span className="font-medium">Загрузить файл</span>
            </motion.a>
            <motion.a
              href="/tasks"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white/20 backdrop-blur-sm rounded-lg p-6 text-center hover:bg-white/30 transition-all duration-200"
            >
              <DocumentTextIcon className="h-8 w-8 mx-auto mb-3" />
              <span className="font-medium">Просмотр заданий</span>
            </motion.a>
        
          </div>
        </div>
      </motion.div>
    </div>
  )
} 