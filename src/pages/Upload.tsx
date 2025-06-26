import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from 'react-query'
import toast from 'react-hot-toast'
import {
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { getWarehouses, uploadRowData } from '../utils/api'
import { UploadData, UploadProgress } from '../types'
import { processOpColumnValue, uploadColumnMappings, reverseUploadColumnMappings } from '../utils/columnMappings'
import { processUploadedExcel } from '../utils/excelProcessor'

export default function Upload() {
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    isUploading: false,
    progress: 0,
    total: 0,
    currentRow: 0
  })
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const { data: warehouses, isLoading: loadingWarehouses, error: errorWarehouses } = useQuery(
    'warehouses',
    getWarehouses
  )

  const processExcelData = useCallback(async (file: File): Promise<UploadData[]> => {
    try {
      const fileName = file.name
      const pref = fileName.split(' ')[0]

      // Обрабатываем Excel файл
      const rawData = await processUploadedExcel(file)
      
      // Список исключенных колонок (должен совпадать с excelProcessor.ts)
      const EXCLUDED_COLUMNS = [
        'Op_14_TU_1_Sht',
        'Op_15_TU_2_Sht',
        'Pechat_Etiketki_s_SHK',
        'Pechat_Etiketki_s_Opisaniem',
        'Kompleksnaya_priemka_tovara',
        'Priemka_tovara_v_transportnykh_korobkakh',
        'Priemka_tovara_palletnaya',
        'Razbrakovka_tovara',
        'Sortiruemyi_Tovar'
      ]
      
      // Преобразуем данные в нужный формат
      const processedData: UploadData[] = rawData.map((row: any) => {
        // Создаем базовую структуру со всеми полями как в test.py
        const processedRow: any = {
          // Базовые поля
          pref,
          Scklad_Pref: selectedWarehouse,
          Status: 0,
          Status_Zadaniya: 0,
          Nazvanie_Zadaniya: fileName,
          
          // Основные поля данных
          Artikul: null,
          Artikul_Syrya: null,
          Nomenklatura: null,
          Nazvanie_Tovara: null,
          SHK: null,
          SHK_Syrya: null,
          SHK_SPO: null,
          Kol_vo_Syrya: null,
          Itog_Zakaz: null,
          SOH: null,
          Tip_Postavki: null,
          Srok_Godnosti: null,
          
          // Операции
          Op_1_Bl_1_Sht: null,
          Op_2_Bl_2_Sht: null,
          Op_3_Bl_3_Sht: null,
          Op_4_Bl_4_Sht: null,
          Op_5_Bl_5_Sht: null,
          Op_6_Blis_6_10_Sht: null,
          Op_7_Pereschyot: null,
          Op_9_Fasovka_Sborka: null,
          Op_10_Markirovka_SHT: null,
          Op_11_Markirovka_Prom: null,
          Op_13_Markirovka_Fabr: null,
          Op_16_TU_3_5: null,
          Op_17_TU_6_8: null,
          Zakrytaya_Zona: null,
          Op_469_Spetsifikatsiya_TM: null,
          Op_470_Dop_Upakovka: null,
          
          // Дополнительные поля
          Mesto: null,
          Vlozhennost: null,
          Pallet_No: null,
          Upakovka_v_Gofro: null,
          Upakovka_v_PE_Paket: null,
          
          // Характеристики товара
          Ne_Sortiruemyi_Tovar: null,
          Produkty: null,
          Opasnyi_Tovar: null,
          Op_468_Proverka_SHK: null,
          Krupnogabaritnyi_Tovar: null,
          Yuvelirnye_Izdelia: null,
          PriznakSortirovki: null,
          
          // Дополнительные операции
          Vlozhit_v_upakovku_pechatnyi_material: null,
          Izmerenie_VGH_i_peredacha_informatsii: null,
          Indeks_za_srochnost_koeff_1_5: null,
          Prochie_raboty_vklyuchaya_ustranenie_anomalii: null,
          Sborka_naborov_ot_2_shtuk_raznykh_tovarov: null,
          Upakovka_tovara_v_gofromeyler: null,
          Khranenie_tovara: null,
          vp: null,
          Plan_Otkaz: null
        }

        // Обрабатываем каждую колонку из Excel
        for (const [key, value] of Object.entries(row)) {
          // Получаем английское название колонки
          const englishKey = reverseUploadColumnMappings[key] || key
          
          // Пропускаем исключенные колонки
          if (EXCLUDED_COLUMNS.includes(englishKey)) {
            continue
          }
          
          // Пропускаем пустые значения
          if (value === null || value === undefined || value === '' || 
              String(value).trim() === '' || String(value) === 'NaN') {
            continue
          }
          
          // Обрабатываем числовые поля
          if (['Artikul', 'Artikul_Syrya', 'SHK', 'SHK_Syrya', 'SHK_SPO', 'Kol_vo_Syrya', 'Itog_Zakaz', 'Vlozhennost', 'Plan_Otkaz'].includes(englishKey)) {
            const numValue = Number(value)
            processedRow[englishKey] = !isNaN(numValue) ? numValue : null
          }
          // Обрабатываем значения операций
          else if (englishKey.startsWith('Op_') || 
              ['Ne_Sortiruemyi_Tovar', 'Opasnyi_Tovar', 
               'Krupnogabaritnyi_Tovar', 'Yuvelirnye_Izdelia', 'Produkty', 
               'Zakrytaya_Zona', 'PriznakSortirovki'].includes(englishKey)) {
            processedRow[englishKey] = processOpColumnValue(value)
          } 
          // Специальная обработка для поля Upakovka_v_Gofro - оставляем как строку
          else if (englishKey === 'Upakovka_v_Gofro') {
            processedRow[englishKey] = String(value)
          } 
          // Для остальных полей оставляем как строку
          else {
            processedRow[englishKey] = String(value)
          }
        }

        return processedRow as UploadData
      })

      return processedData
    } catch (error) {
      console.error('Ошибка обработки Excel файла:', error)
      throw new Error('Не удалось обработать Excel файл')
    }
  }, [selectedWarehouse])

  const uploadFile = useCallback(async (file: File) => {
    if (!selectedWarehouse) {
      toast.error('Пожалуйста, выберите склад')
      return
    }

    try {
      const data = await processExcelData(file)
      
      setUploadProgress({
        isUploading: true,
        progress: 0,
        total: data.length,
        currentRow: 0
      })

      for (let i = 0; i < data.length; i++) {
        let success = false
        while (!success) {
          try {
            // Логируем данные перед отправкой для отладки
            if (i === 0) {
              console.log('Отправляем данные на сервер:', data[i])
              console.log('Ключи объекта:', Object.keys(data[i]))
            }
            
            await uploadRowData(data[i])
            success = true
            
            setUploadProgress(prev => ({
              ...prev,
              currentRow: i + 1,
              progress: Math.round(((i + 1) / data.length) * 100)
            }))
          } catch (error: any) {
            console.error(`Error uploading row ${i + 1}:`, error)
            
            // Дополнительное логирование для диагностики
            if (error.response?.data) {
              console.error('Server response:', error.response.data)
            }
            if (error.response?.status) {
              console.error('HTTP status:', error.response.status)
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }
      }

      setUploadProgress(prev => ({ ...prev, isUploading: false }))
      toast.success('Файл успешно загружен!')
      setUploadedFile(null)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Ошибка при загрузке файла')
      setUploadProgress(prev => ({ ...prev, isUploading: false }))
    }
  }, [selectedWarehouse, processExcelData])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setUploadedFile(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  })

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Загрузка файлов</h1>
        <p className="text-lg text-gray-600">
          Выберите склад и загрузите Excel файл для обработки. Завершенные задания можно скачать в виде Excel файлов с данными о времени работы.
        </p>
      </motion.div>

      {/* Warehouse Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-soft border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Выбор склада</h3>
        
        {errorWarehouses ? (
          <div className="text-center py-8">
            <div className="text-danger-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ошибка загрузки складов</h3>
            <p className="text-gray-600 mb-4">
              Не удалось загрузить список складов. Проверьте подключение к серверу.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Попробовать снова
            </button>
          </div>
        ) : (
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="input w-full"
            disabled={loadingWarehouses}
          >
            <option value="">{loadingWarehouses ? 'Загрузка складов...' : 'Выберите склад...'}</option>
            {warehouses?.map((warehouse) => (
              <option key={warehouse} value={warehouse}>
                {warehouse}
              </option>
            ))}
          </select>
        )}
      </motion.div>

      {/* File Upload */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-soft border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Загрузка файла</h3>
        
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
            ${isDragActive 
              ? 'border-primary-400 bg-primary-50' 
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }
          `}
        >
          <input {...getInputProps()} />
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            {isDragActive ? 'Отпустите файл здесь' : 'Перетащите файл сюда'}
          </p>
          <p className="text-sm text-gray-600">
            или нажмите для выбора файла (только .xlsx)
          </p>
        </div>

        {/* Selected File */}
        <AnimatePresence>
          {uploadedFile && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <DocumentIcon className="h-8 w-8 text-primary-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                    <p className="text-sm text-gray-600">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setUploadedFile(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Button */}
        {uploadedFile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <button
              onClick={() => uploadFile(uploadedFile)}
              disabled={!selectedWarehouse || uploadProgress.isUploading}
              className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadProgress.isUploading ? 'Загрузка...' : 'Загрузить файл'}
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Upload Progress */}
      <AnimatePresence>
        {uploadProgress.isUploading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-xl shadow-soft border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Прогресс загрузки</h3>
              <span className="text-sm text-gray-600">
                {uploadProgress.currentRow} / {uploadProgress.total}
              </span>
            </div>
            
            <div className="bg-gray-200 rounded-full h-3 mb-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress.progress}%` }}
                className="bg-primary-600 h-3 rounded-full"
                transition={{ duration: 0.3 }}
              />
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Загружено строк: {uploadProgress.currentRow}</span>
              <span>{uploadProgress.progress}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Message */}
      <AnimatePresence>
        {!uploadProgress.isUploading && uploadProgress.progress === 100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-success-50 border border-success-200 rounded-xl p-6"
          >
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-success-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-success-900">Загрузка завершена!</h3>
                <p className="text-success-700">
                  Файл успешно обработан и загружен в систему
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-blue-50 border border-blue-200 rounded-xl p-6"
      >
        <div className="flex items-start space-x-3">
          <DocumentIcon className="h-6 w-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Информация о загрузке</h3>
            <div className="space-y-1 text-sm text-blue-800">
              <p>• Поддерживаются только Excel файлы (.xlsx)</p>
              <p>• Поле "Тип операции" принимает строковые значения (например: "Товар 18+", "Двойная упаковка")</p>
              <p>• Обязательно выберите склад перед загрузкой</p>
              <p>• Загрузка происходит построчно с автоматическими повторами при ошибках</p>
              <p>• Завершенные задания можно скачать в формате Excel (.xlsx)</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
} 