import axios from 'axios'
import { TaskInProgress, UploadData, ExpiryData, DownloadData, ReportConfig, SavedReport } from '../types'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 75000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Warehouses
export const getWarehouses = async (): Promise<string[]> => {
  const response = await api.get('/sklads')
  return response.data.sklads || []
}

// Tasks
export const getTasksInProgress = async (): Promise<TaskInProgress[]> => {
  const response = await api.get('/tasks-in-progress')
  return response.data.tasksInProgress || []
}

export const getCompletedTasks = async (): Promise<string[]> => {
  const response = await api.get('/completed-tasks')
  return response.data.tasks || []
}

export const getUploadedTasks = async (): Promise<string[]> => {
  const response = await api.get('/uploaded-tasks')
  return response.data.tasks || []
}

// Upload
export const uploadRowData = async (data: UploadData): Promise<void> => {
  await api.post('/upload-data-new', data)
}

// Download
export const downloadTaskData = async (taskName: string): Promise<DownloadData> => {
  const response = await api.get(`/download?task=${encodeURIComponent(taskName)}`)
  return response.data
}

// Expiry data
export const getExpiryData = async (artikul: string): Promise<ExpiryData[]> => {
  const response = await api.get(`/expiry-data?artikul=${encodeURIComponent(artikul)}`)
  return response.data.expiryData || []
}

// Delete uploaded data
export const deleteUploadedData = async (pref: string, taskName: string): Promise<void> => {
  await api.post('/delete-uploaded-data', {
    pref,
    Nazvanie_Zadaniya: taskName,
  })
}

// Hide task
export const hideTask = async (taskName: string): Promise<void> => {
  await api.post('/hideTask', {
    nazvanie_zdaniya: taskName,
  })
}

// Check if task already exists
export const checkTaskExists = async (taskName: string): Promise<boolean> => {
  try {
    const uploadedTasks = await getUploadedTasks()
    return uploadedTasks.includes(taskName)
  } catch (error) {
    console.error('Error checking task existence:', error)
    return false
  }
}

// Report Builder API methods
export const getAllTasksData = async (): Promise<string[]> => {
  // Получаем список всех загруженных заданий
  const uploadedTasks = await getUploadedTasks()
  const completedTasks = await getCompletedTasks()
  return [...uploadedTasks, ...completedTasks]
}

export const getTaskDataForReports = async (taskName: string, reportType?: 'short' | 'full'): Promise<any[]> => {
  // Получаем данные задания через существующий метод downloadTaskData
  const downloadData = await downloadTaskData(taskName)
  
  console.log(`Loading data for task: ${taskName}, reportType: ${reportType}`)
  console.log('Available datasets:')
  console.log('  dataSet1 length:', downloadData.dataSet1?.length || 0)
  console.log('  dataSet2 length:', downloadData.dataSet2?.length || 0)
  
  // Если указан тип отчета, используем его для выбора набора данных
  if (reportType === 'short') {
    // Краткий отчет - всегда используем dataSet1
    console.log('Returning dataSet1 for short report')
    return downloadData.dataSet1 || []
  } else if (reportType === 'full') {
    // Полный отчет - используем dataSet2, если есть
    const result = downloadData.dataSet2 || downloadData.dataSet1 || []
    console.log(`Returning ${downloadData.dataSet2 ? 'dataSet2' : downloadData.dataSet1 ? 'dataSet1' : 'empty array'} for full report`)
    console.log('Result length:', result.length)
    if (result.length > 0) {
      console.log('Sample data keys:', Object.keys(result[0]))
    }
    return result
  }
  
  // Для обратной совместимости: возвращаем dataSet2 если есть (полные данные), иначе dataSet1
  if (downloadData.dataSet2 && downloadData.dataSet2.length > 0) {
    console.log('Returning dataSet2 for compatibility')
    return downloadData.dataSet2
  } else if (downloadData.dataSet1 && downloadData.dataSet1.length > 0) {
    console.log('Returning dataSet1 for compatibility')
    return downloadData.dataSet1
  }
  
  console.log('Returning empty array - no data available')
  return []
}

export const generateWildberriesReport = async (_config: ReportConfig): Promise<any[]> => {
  // Больше не отправляем запрос на сервер для генерации, 
  // а получаем данные и обрабатываем на клиенте
  const allTasks = await getAllTasksData()
  
  // Фильтруем задания WB
  const wbTasks = allTasks.filter(task => 
    task.toLowerCase().includes('wb') || 
    task.toLowerCase().includes('wildberries')
  )
  
  let allData: any[] = []
  
  // Получаем данные из всех WB заданий
  for (const taskName of wbTasks) {
    try {
      const taskData = await getTaskDataForReports(taskName)
      allData = allData.concat(taskData)
    } catch (error) {
      console.error(`Error loading data for task ${taskName}:`, error)
    }
  }
  
  return allData
}

export const generateOzonReport = async (_config: ReportConfig): Promise<any[]> => {
  // Аналогично для Ozon
  const allTasks = await getAllTasksData()
  
  // Фильтруем задания Ozon
  const ozonTasks = allTasks.filter(task => 
    task.toLowerCase().includes('ozon') || 
    task.toLowerCase().includes('озон')
  )
  
  let allData: any[] = []
  
  // Получаем данные из всех Ozon заданий
  for (const taskName of ozonTasks) {
    try {
      const taskData = await getTaskDataForReports(taskName)
      allData = allData.concat(taskData)
    } catch (error) {
      console.error(`Error loading data for task ${taskName}:`, error)
    }
  }
  
  return allData
}

export const saveReportConfig = async (config: ReportConfig): Promise<SavedReport> => {
  const response = await api.post('/reports/save', config)
  return response.data.savedReport
}

export const getSavedReports = async (platform?: 'wildberries' | 'ozon'): Promise<SavedReport[]> => {
  const params = platform ? { platform } : {}
  const response = await api.get('/reports/saved', { params })
  return response.data.reports || []
}

export const deleteSavedReport = async (reportId: string): Promise<void> => {
  await api.delete(`/reports/saved/${reportId}`)
}

export const exportReport = async (data: any[], format: 'excel' | 'csv' = 'excel', filename?: string): Promise<Blob> => {
  const response = await api.post('/reports/export', {
    data,
    format,
    filename
  }, {
    responseType: 'blob'
  })
  return response.data
}

export const getReportFields = async (platform: 'wildberries' | 'ozon'): Promise<any[]> => {
  const response = await api.get(`/reports/${platform}/fields`)
  return response.data.fields || []
}

export default api 