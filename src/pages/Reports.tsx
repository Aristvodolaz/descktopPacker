import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  ChartBarIcon,
  DocumentChartBarIcon,
  CogIcon,
  PlayIcon
} from '@heroicons/react/24/outline'
import WildberriesReportBuilder from '../components/WildberriesReportBuilder'
import OzonReportBuilder from '../components/OzonReportBuilder'

type Platform = 'wildberries' | 'ozon' | null

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

export default function Reports() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(null)
  const [selectedWBReportType, setSelectedWBReportType] = useState<'short' | 'full' | null>(null)

  const resetSelection = () => {
    setSelectedPlatform(null)
    setSelectedWBReportType(null)
  }

  const platforms = [
    {
      id: 'wildberries' as const,
      name: 'Wildberries',
      description: 'Создание отчетов для площадки Wildberries',
      icon: ChartBarIcon,
      color: 'from-purple-500 to-pink-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700'
    },
    {
      id: 'ozon' as const,
      name: 'Ozon',
      description: 'Создание отчетов для площадки Ozon',
      icon: DocumentChartBarIcon,
      color: 'from-blue-500 to-cyan-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700'
    }
  ]

  if (selectedPlatform === 'wildberries') {
    if (!selectedWBReportType) {
      // Показываем выбор типа отчета для Wildberries
      return (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Конструктор отчетов</h1>
              <p className="text-gray-600 mt-2">Wildberries - Выберите тип отчета</p>
            </div>
            <button
              onClick={resetSelection}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              ← Назад к выбору платформы
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Краткий отчет */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedWBReportType('short')}
              className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-soft border border-gray-200 hover:border-purple-300 transition-all duration-200"
            >
              <DocumentChartBarIcon className="h-16 w-16 text-purple-600 mb-4" />
              <span className="text-xl font-semibold text-gray-900 mb-2">Краткий отчет</span>
              <p className="text-sm text-gray-500 text-center">
                Основная информация по товарам: артикулы, названия, количество, места размещения
              </p>
              <div className="mt-3 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                dataSet1
              </div>
            </motion.button>

            {/* Полный отчет */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedWBReportType('full')}
              className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-soft border border-gray-200 hover:border-purple-300 transition-all duration-200"
            >
              <CogIcon className="h-16 w-16 text-purple-600 mb-4" />
              <span className="text-xl font-semibold text-gray-900 mb-2">Полный отчет</span>
              <p className="text-sm text-gray-500 text-center">
                Расширенная информация: детали операций, временные метки, дополнительные поля
              </p>
              <div className="mt-3 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                dataSet2
              </div>
            </motion.button>
          </div>
        </div>
      )
    }

    // Показываем конструктор отчетов для выбранного типа
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Конструктор отчетов</h1>
            <p className="text-gray-600 mt-2">
              Wildberries - {selectedWBReportType === 'short' ? 'Краткий отчет' : 'Полный отчет'}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedWBReportType(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              ← Назад к выбору типа
            </button>
            <button
              onClick={resetSelection}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Выбрать платформу
            </button>
          </div>
        </div>
        <WildberriesReportBuilder reportType={selectedWBReportType} />
      </div>
    )
  }

  if (selectedPlatform === 'ozon') {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Конструктор отчетов</h1>
            <p className="text-gray-600 mt-2">Ozon</p>
          </div>
          <button
            onClick={() => setSelectedPlatform(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            ← Назад к выбору платформы
          </button>
        </div>
        <OzonReportBuilder />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Конструктор{' '}
          <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
            отчетов
          </span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Создавайте кастомные отчеты для различных маркетплейсов с гибкой настройкой полей, фильтров и группировки
        </p>
      </motion.div>

      {/* Platform Selection */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2"
      >
        {platforms.map((platform) => (
          <motion.div
            key={platform.id}
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedPlatform(platform.id)}
            className={`
              relative overflow-hidden rounded-xl border p-8 shadow-soft transition-all duration-200 cursor-pointer
              ${platform.bgColor} ${platform.borderColor}
              hover:shadow-medium
            `}
          >
            <div className="flex flex-col items-center text-center">
              <div className={`rounded-lg p-4 bg-gradient-to-r ${platform.color} mb-6`}>
                <platform.icon className="h-12 w-12 text-white" />
              </div>
              <h3 className={`text-2xl font-bold ${platform.textColor} mb-3`}>
                {platform.name}
              </h3>
              <p className="text-gray-600 mb-6 max-w-sm">
                {platform.description}
              </p>
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-500">
                <CogIcon className="h-4 w-4" />
                <span>Настроить отчет</span>
                <PlayIcon className="h-4 w-4" />
              </div>
            </div>
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white opacity-10" />
          </motion.div>
        ))}
      </motion.div>

      {/* Features Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-soft border border-gray-200 p-8"
      >
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Возможности конструктора</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-primary-100 rounded-lg p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <CogIcon className="h-6 w-6 text-primary-600" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Гибкая настройка</h4>
            <p className="text-sm text-gray-600">Выбирайте нужные поля, применяйте фильтры и настраивайте сортировку</p>
          </div>
          <div className="text-center">
            <div className="bg-success-100 rounded-lg p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-success-600" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Аналитика</h4>
            <p className="text-sm text-gray-600">Группировка данных и создание сводных отчетов</p>
          </div>
          <div className="text-center">
            <div className="bg-warning-100 rounded-lg p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <DocumentChartBarIcon className="h-6 w-6 text-warning-600" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Экспорт</h4>
            <p className="text-sm text-gray-600">Сохранение отчетов в различных форматах</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
