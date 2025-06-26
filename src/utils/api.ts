import axios from 'axios'
import { TaskInProgress, UploadData, ExpiryData, DownloadData } from '../types'

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

export default api 