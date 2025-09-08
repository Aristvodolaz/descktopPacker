import React, { useState, useEffect, useMemo } from 'react'
import { TaskName, TaskRecord } from '../types'
import { getUniqueTaskNames, getTaskRecords } from '../utils/api'
import { createExcelWithTimeInfo } from '../utils/excelProcessor'
import { MagnifyingGlassIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import Pagination from '../components/Pagination'
import ItemsPerPageSelector from '../components/ItemsPerPageSelector'

const ReceptionReport: React.FC = () => {
  // Состояния для списка заданий
  const [taskNames, setTaskNames] = useState<TaskName[]>([])
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [taskRecords, setTaskRecords] = useState<TaskRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Состояния для поиска и фильтрации
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Состояния для пагинации
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Фильтрация и сортировка списка заданий
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...taskNames]
    
    // Фильтрация по поисковому запросу
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(task => 
        task.Nazvanie_Zadaniya.toLowerCase().includes(query)
      )
    }
    
    // Сортировка
    result.sort((a, b) => {
      const comparison = a.Nazvanie_Zadaniya.localeCompare(b.Nazvanie_Zadaniya)
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return result
  }, [taskNames, searchQuery, sortOrder])

  // Пагинация
  const totalPages = Math.ceil(filteredAndSortedTasks.length / itemsPerPage)
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedTasks.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedTasks, currentPage, itemsPerPage])

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, itemsPerPage])

  // Загрузка списка заданий при монтировании компонента
  useEffect(() => {
    loadTaskNames()
  }, [])

  const loadTaskNames = async () => {
    try {
      setLoading(true)
      setError(null)
      const names = await getUniqueTaskNames()
      setTaskNames(names)
    } catch (err) {
      console.error('Error loading task names:', err)
      setError('Ошибка загрузки списка заданий')
    } finally {
      setLoading(false)
    }
  }

  const handleTaskClick = async (taskName: string) => {
    try {
      setLoading(true)
      setError(null)
      setSelectedTask(taskName)
      
      const records = await getTaskRecords(taskName)
      setTaskRecords(records)
    } catch (err) {
      console.error('Error loading task records:', err)
      setError('Ошибка загрузки записей задания')
      setTaskRecords([])
    } finally {
      setLoading(false)
    }
  }

  const handleExportToExcel = () => {
    if (taskRecords.length === 0) {
      alert('Нет данных для экспорта')
      return
    }

    try {
      // Преобразуем данные в нужный формат для Excel с русскими названиями колонок
      const formattedData = taskRecords.map(record => ({
        'ВП': record.VP,
        'Название задания': selectedTask,
        'Артикул': record.Artikul,
        'По плану': record.Plans,
        'Факт': record.Fact,
        'Различие': record.Razlichie
      }))

      // Отладочная информация
      console.log('Formatted Data:', formattedData)

      // Создаем структуру данных для Excel
      const excelData = {
        dataSet1: formattedData,
        dataSet2: formattedData // Добавляем также в dataSet2 для полного отчета
      }

      console.log('Excel Data Structure:', excelData)

      // Создаем Excel файл
      const excelBuffer = createExcelWithTimeInfo(excelData, selectedTask || 'Отчет о приемке')
      
      // Скачиваем файл
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Отчет_о_приемке_${selectedTask || 'данные'}.xlsx`
      link.click()
      
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting to Excel:', err)
      alert('Ошибка при экспорте в Excel')
    }
  }

  const goBack = () => {
    setSelectedTask(null)
    setTaskRecords([])
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">
                Отчет о приемке
              </h1>
              {selectedTask && (
                <button
                  onClick={goBack}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  ← Назад к списку заданий
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-2 text-gray-600">Загрузка...</span>
              </div>
            )}

            {!selectedTask ? (
              // Список заданий
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-lg font-medium text-gray-900">
                    Список заданий ({filteredAndSortedTasks.length})
                  </h2>
                  
                  {/* Поиск */}
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Поиск по названию..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                {/* Сортировка и количество элементов на странице */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Сортировка
                    {sortOrder === 'asc' ? (
                      <ArrowUpIcon className="ml-2 h-4 w-4" />
                    ) : (
                      <ArrowDownIcon className="ml-2 h-4 w-4" />
                    )}
                  </button>

                  <ItemsPerPageSelector
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    options={[5, 10, 20, 50]}
                  />
                </div>

                {filteredAndSortedTasks.length === 0 && !loading ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? 'Нет заданий, соответствующих поиску' : 'Нет доступных заданий'}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 mb-4">
                      {paginatedTasks.map((task, index) => (
                        <div
                          key={index}
                          onClick={() => handleTaskClick(task.Nazvanie_Zadaniya)}
                          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                        >
                          <div className="text-sm font-medium text-gray-900">
                            {task.Nazvanie_Zadaniya}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Пагинация */}
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={filteredAndSortedTasks.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                    />
                  </>
                )}
              </div>
            ) : (
              // Детали задания
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-lg font-medium text-gray-900">
                    Детали задания: {selectedTask}
                  </h2>
                  <div className="flex gap-2">
                    {taskRecords.length > 0 && (
                      <button
                        onClick={handleExportToExcel}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        📊 Экспорт в Excel
                      </button>
                    )}
                  </div>
                </div>

                {/* Статистика */}
                {taskRecords.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-sm font-medium text-gray-500">Всего записей</div>
                      <div className="mt-1 text-2xl font-semibold text-gray-900">{taskRecords.length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-sm font-medium text-gray-500">Всего по плану</div>
                      <div className="mt-1 text-2xl font-semibold text-gray-900">
                        {taskRecords.reduce((sum, record) => sum + record.Plans, 0)}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-sm font-medium text-gray-500">Фактически</div>
                      <div className="mt-1 text-2xl font-semibold text-gray-900">
                        {taskRecords.reduce((sum, record) => sum + record.Fact, 0)}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-sm font-medium text-gray-500">Общее различие</div>
                      <div className={`mt-1 text-2xl font-semibold ${
                        taskRecords.reduce((sum, record) => sum + record.Razlichie, 0) === 0
                          ? 'text-green-600'
                          : taskRecords.reduce((sum, record) => sum + record.Razlichie, 0) > 0
                          ? 'text-blue-600'
                          : 'text-red-600'
                      }`}>
                        {taskRecords.reduce((sum, record) => sum + record.Razlichie, 0) > 0 ? '+' : ''}
                        {taskRecords.reduce((sum, record) => sum + record.Razlichie, 0)}
                      </div>
                    </div>
                  </div>
                )}

                {taskRecords.length === 0 && !loading ? (
                  <div className="text-center py-8 text-gray-500">
                    Нет данных по выбранному заданию
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                              <div className="flex items-center">
                                ВП
                                <ArrowUpIcon className="ml-1 h-4 w-4 text-gray-400" />
                              </div>
                            </th>
                            <th className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                              <div className="flex items-center">
                                Артикул
                                <ArrowUpIcon className="ml-1 h-4 w-4 text-gray-400" />
                              </div>
                            </th>
                            <th className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                              <div className="flex items-center">
                                По плану
                                <ArrowUpIcon className="ml-1 h-4 w-4 text-gray-400" />
                              </div>
                            </th>
                            <th className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                              <div className="flex items-center">
                                Факт
                                <ArrowUpIcon className="ml-1 h-4 w-4 text-gray-400" />
                              </div>
                            </th>
                            <th className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                              <div className="flex items-center">
                                Различие
                                <ArrowUpIcon className="ml-1 h-4 w-4 text-gray-400" />
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {taskRecords.map((record, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {record.VP}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {record.Artikul}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {record.Plans}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {record.Fact}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  record.Razlichie === 0 
                                    ? 'bg-green-100 text-green-800'
                                    : record.Razlichie > 0
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {record.Razlichie > 0 ? '+' : ''}{record.Razlichie}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReceptionReport
