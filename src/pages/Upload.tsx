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
import { getWarehouses, uploadRowData, checkTaskExists, updateShkCoroba } from '../utils/api'
import { UploadData, UploadProgress } from '../types'
import { processOpColumnValue, reverseUploadColumnMappings, omitEmptyUploadFields } from '../utils/columnMappings'
import { processUploadedExcel, processShkCorobaExcel, ShkCorobaData } from '../utils/excelProcessor'

// Тип для вкладок
type TabType = 'tasks' | 'shkCoroba'

// Тип поставки (колонка) и BIT-поля tipPostavki / Mono — в JSON должны присутствовать (см. service-komus)
const TIP_POSTAVKI_MONO_FIELDS = ['Tip_Postavki', 'tipPostavki', 'Mono']

const LDU_FLAG_FIELDS = [
  'Sortiruemyi_Tovar',
  'Ne_Sortiruemyi_Tovar',
  'Produkty',
  'Opasnyi_Tovar',
  'Zakrytaya_Zona',
  'Krupnogabaritnyi_Tovar',
  'Yuvelirnye_Izdelia',
  'Pechat_Etiketki_s_SHK',
  'Pechat_Etiketki_s_Opisaniem',
  'PriznakSortirovki',
  'Upakovka_v_Gofro',
  'Upakovka_v_PE_Paket',
  'Vlozhit_v_upakovku_pechatnyi_material',
  'Izmerenie_VGH_i_peredacha_informatsii',
  'Indeks_za_srochnost_koeff_1_5',
  'Kompleksnaya_priemka_tovara',
  'Priemka_tovara_v_transportnykh_korobakh',
  'Priemka_tovara_palletnaya',
  'Prochie_raboty_vklyuchaya_ustranenie_anomalii',
  'Razbrakovka_tovara',
  'Sborka_naborov_ot_2_shtuk_raznykh_tovarov',
  'Upakovka_tovara_v_gofromeyler',
  'Khranenie_tovara',
  'Primeryka_SHK',
  'Proverka_Sroka_Godnosti',
  'Upakovka_v_Babl_Plenku',
  'Upakovka_v_Ind_Korob',
  'Markirovka_Tovara_Stiker_CHZ',
  'Udalenie_Stikera_Markirovki',
  'Dopolnitelnaya_Zashchita_Tovara',
  'Markirovka_Transportnogo_Koroba',
  'Formirovanie_Pallet_Otgruzki',
  'Upakovochnyi_Material',
  'Markirovka_Palleta_TM',
  'Raskomplekt_Zakaza',
  'Zamorozhennaya_Zona',
  'Spetsifikatsiya_TM'
]

export default function Upload() {
  const [activeTab, setActiveTab] = useState<TabType>('tasks')
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    isUploading: false,
    progress: 0,
    total: 0,
    currentRow: 0
  })
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // Состояние для привязки ШК к коробам
  const [shkCorobaFile, setShkCorobaFile] = useState<File | null>(null)
  const [shkCorobaProgress, setShkCorobaProgress] = useState<UploadProgress>({
    isUploading: false,
    progress: 0,
    total: 0,
    currentRow: 0
  })

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
      
      // Список исключенных колонок для загрузки в БД
      const EXCLUDED_COLUMNS = [
        // Старые тарифные поля больше не используем в мобильном клиенте
        'Op_1_Bl_1_Sht',
        'Op_2_Bl_2_Sht',
        'Op_3_Bl_3_Sht',
        'Op_4_Bl_4_Sht',
        'Op_5_Bl_5_Sht',
        'Op_6_Blis_6_10_Sht',
        'Op_7_Pereschyot',
        'Op_9_Fasovka_Sborka',
        'Op_10_Markirovka_SHT',
        'Op_11_Markirovka_Prom',
        'Op_13_Markirovka_Fabr',
        'Op_14_TU_1_Sht',
        'Op_15_TU_2_Sht',
        'Op_16_TU_3_5',
        'Op_17_TU_6_8',
        'Op_468_Proverka_SHK',
        'Op_469_Spetsifikatsiya_TM',
        'Op_470_Dop_Upakovka'
      ]
      
      // Преобразуем данные в нужный формат
      const processedData: UploadData[] = rawData.map((row: any) => {
        // Создаем базовую структуру с актуальными полями API/БД
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
          tipPostavki: null,
          Mono: null,
          Srok_Godnosti: null,
          
          // Дополнительные поля
          Mesto: null,
          Vlozhennost: null,
          Pallet_No: null,
          Upakovka_v_Gofro: null,
          Upakovka_v_PE_Paket: null,
          Tip_Operatsii_LDU: null,
          Spetsifikatsiya_TM: null,
          
          // Поля нового шаблона ЛДУ
          Sortiruemyi_Tovar: null,
          Ne_Sortiruemyi_Tovar: null,
          Produkty: null,
          Opasnyi_Tovar: null,
          Zakrytaya_Zona: null,
          Krupnogabaritnyi_Tovar: null,
          Yuvelirnye_Izdelia: null,
          Pechat_Etiketki_s_SHK: null,
          Pechat_Etiketki_s_Opisaniem: null,
          PriznakSortirovki: null,
          Kompleksnaya_priemka_tovara: null,
          Priemka_tovara_v_transportnykh_korobakh: null,
          Priemka_tovara_palletnaya: null,
          Vlozhit_v_upakovku_pechatnyi_material: null,
          Izmerenie_VGH_i_peredacha_informatsii: null,
          Indeks_za_srochnost_koeff_1_5: null,
          Prochie_raboty_vklyuchaya_ustranenie_anomalii: null,
          Razbrakovka_tovara: null,
          Sborka_naborov_ot_2_shtuk_raznykh_tovarov: null,
          Upakovka_tovara_v_gofromeyler: null,
          Khranenie_tovara: null,
          Primeryka_SHK: null,
          Proverka_Sroka_Godnosti: null,
          Upakovka_v_Babl_Plenku: null,
          Upakovka_v_Ind_Korob: null,
          Markirovka_Tovara_Stiker_CHZ: null,
          Udalenie_Stikera_Markirovki: null,
          Dopolnitelnaya_Zashchita_Tovara: null,
          Markirovka_Transportnogo_Koroba: null,
          Formirovanie_Pallet_Otgruzki: null,
          Upakovochnyi_Material: null,
          Markirovka_Palleta_TM: null,
          Raskomplekt_Zakaza: null,
          Zamorozhennaya_Zona: null,
          vp: null,
          Plan_Otkaz: null
        }

        // Обрабатываем каждую колонку из Excel
        for (const [key, value] of Object.entries(row)) {
          const colKey = typeof key === 'string' ? key.trim() : key
          // Получаем английское название колонки
          const englishKey = reverseUploadColumnMappings[colKey] || colKey
          
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
          if (['Kol_vo_Syrya', 'Itog_Zakaz', 'Vlozhennost', 'Plan_Otkaz'].includes(englishKey)) {
            const numValue = Number(value)
            processedRow[englishKey] = !isNaN(numValue) ? numValue : null
          }
          // Обрабатываем поля, которые должны быть строками
          else if (['Artikul', 'Artikul_Syrya', 'SHK', 'SHK_Syrya', 'SHK_SPO'].includes(englishKey)) {
            processedRow[englishKey] = value ? String(value).trim() : null
          }
          // Флаги ЛДУ приводим к 0/1-совместимому виду
          else if (LDU_FLAG_FIELDS.includes(englishKey)) {
            processedRow[englishKey] = processOpColumnValue(value)
          }
          // Тип поставки (колонка), tipPostavki, Mono — строки 0/1 как на бэкенде
          else if (TIP_POSTAVKI_MONO_FIELDS.includes(englishKey)) {
            processedRow[englishKey] = processOpColumnValue(value)
          }
          // Тип операции в ЛДУ оставляем строкой
          else if (englishKey === 'Tip_Operatsii_LDU') {
            processedRow[englishKey] = String(value).trim()
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
      // Проверяем, существует ли уже задание с таким названием
      const taskName = file.name
      const taskExists = await checkTaskExists(taskName)
      
      if (taskExists) {
        toast.error(`Задание "${taskName}" уже было загружено ранее. Повторная загрузка запрещена.`)
        return
      }

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
            
            await uploadRowData(
              omitEmptyUploadFields(data[i], TIP_POSTAVKI_MONO_FIELDS) as unknown as UploadData
            )
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

  // Функция для загрузки данных привязки ШК к коробам
  const uploadShkCorobaFile = useCallback(async (file: File) => {
    try {
      // Обрабатываем Excel файл
      const data: ShkCorobaData[] = await processShkCorobaExcel(file)
      
      if (data.length === 0) {
        toast.error('Файл не содержит данных для обработки')
        return
      }
      
      setShkCorobaProgress({
        isUploading: true,
        progress: 0,
        total: data.length,
        currentRow: 0
      })

      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < data.length; i++) {
        let success = false
        let attempts = 0
        const maxAttempts = 3

        while (!success && attempts < maxAttempts) {
          try {
            await updateShkCoroba(data[i].shk_wps, data[i].shk_coroba)
            success = true
            successCount++
            
            setShkCorobaProgress(prev => ({
              ...prev,
              currentRow: i + 1,
              progress: Math.round(((i + 1) / data.length) * 100)
            }))
          } catch (error: any) {
            attempts++
            console.error(`Ошибка при обработке строки ${i + 1} (попытка ${attempts}/${maxAttempts}):`, error)
            
            if (attempts >= maxAttempts) {
              errorCount++
              console.error(`Не удалось обработать строку ${i + 1} после ${maxAttempts} попыток`)
              
              // Продолжаем со следующей строкой
              setShkCorobaProgress(prev => ({
                ...prev,
                currentRow: i + 1,
                progress: Math.round(((i + 1) / data.length) * 100)
              }))
            } else {
              // Пауза перед повторной попыткой
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
          }
        }
      }

      setShkCorobaProgress(prev => ({ ...prev, isUploading: false }))
      
      if (errorCount === 0) {
        toast.success(`Все данные успешно загружены! Обработано строк: ${successCount}`)
      } else {
        toast.success(`Загрузка завершена! Успешно: ${successCount}, Ошибок: ${errorCount}`)
      }
      
      setShkCorobaFile(null)
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Ошибка при загрузке файла')
      setShkCorobaProgress(prev => ({ ...prev, isUploading: false }))
    }
  }, [])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setUploadedFile(file)
    }
  }, [])

  const onDropShkCoroba = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setShkCorobaFile(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  })

  const { 
    getRootProps: getRootPropsShkCoroba, 
    getInputProps: getInputPropsShkCoroba, 
    isDragActive: isDragActiveShkCoroba 
  } = useDropzone({
    onDrop: onDropShkCoroba,
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
          Выберите тип загрузки и загрузите Excel файл для обработки.
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-soft border border-gray-200 p-2"
      >
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'tasks'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Загрузка заданий
          </button>
          <button
            onClick={() => setActiveTab('shkCoroba')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'shkCoroba'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Привязка ШК к коробам
          </button>
        </div>
      </motion.div>

      {/* Content for "Загрузка заданий" tab */}
      {activeTab === 'tasks' && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-4"
          >
            <p className="text-sm text-blue-800">
              <strong>Важно:</strong> Повторная загрузка файлов с одинаковыми названиями запрещена. 
              Каждое задание может быть загружено только один раз.
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
        </>
      )}

      {/* Content for "Привязка ШК к коробам" tab */}
      {activeTab === 'shkCoroba' && (
        <>
          {/* Info Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-4"
          >
            <p className="text-sm text-blue-800">
              <strong>Информация:</strong> Загрузите Excel файл с колонками "ШК WPS" и "SHK_Coroba" для привязки штрих-кодов к коробам.
            </p>
          </motion.div>

          {/* File Upload */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-soft border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Загрузка файла</h3>
            
            <div
              {...getRootPropsShkCoroba()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
                ${isDragActiveShkCoroba 
                  ? 'border-primary-400 bg-primary-50' 
                  : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                }
              `}
            >
              <input {...getInputPropsShkCoroba()} />
              <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isDragActiveShkCoroba ? 'Отпустите файл здесь' : 'Перетащите файл сюда'}
              </p>
              <p className="text-sm text-gray-600">
                или нажмите для выбора файла (только .xlsx)
              </p>
            </div>

            {/* Selected File */}
            <AnimatePresence>
              {shkCorobaFile && (
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
                        <p className="font-medium text-gray-900">{shkCorobaFile.name}</p>
                        <p className="text-sm text-gray-600">
                          {(shkCorobaFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShkCorobaFile(null)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upload Button */}
            {shkCorobaFile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <button
                  onClick={() => uploadShkCorobaFile(shkCorobaFile)}
                  disabled={shkCorobaProgress.isUploading}
                  className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {shkCorobaProgress.isUploading ? 'Загрузка...' : 'Загрузить файл'}
                </button>
              </motion.div>
            )}
          </motion.div>

          {/* Upload Progress */}
          <AnimatePresence>
            {shkCorobaProgress.isUploading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-xl shadow-soft border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Прогресс загрузки</h3>
                  <span className="text-sm text-gray-600">
                    {shkCorobaProgress.currentRow} / {shkCorobaProgress.total}
                  </span>
                </div>
                
                <div className="bg-gray-200 rounded-full h-3 mb-4">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${shkCorobaProgress.progress}%` }}
                    className="bg-primary-600 h-3 rounded-full"
                    transition={{ duration: 0.3 }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Обработано строк: {shkCorobaProgress.currentRow}</span>
                  <span>{shkCorobaProgress.progress}%</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Message */}
          <AnimatePresence>
            {!shkCorobaProgress.isUploading && shkCorobaProgress.progress === 100 && (
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
                      Все данные успешно обработаны и отправлены на сервер
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info Block */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-6"
          >
            <div className="flex items-start space-x-3">
              <DocumentIcon className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Формат Excel файла</h3>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>• Файл должен содержать колонку "ШК WPS" (варианты: SHK_WPS, SHK WPS, ШК_WPS)</p>
                  <p>• Файл должен содержать колонку "SHK_Coroba" (варианты: SHK Coroba, ШК Короба)</p>
                  <p>• Поиск колонок происходит без учета регистра, пробелов и подчеркиваний</p>
                  <p>• Поддерживаются только Excel файлы формата .xlsx</p>
                  <p>• Каждая строка обрабатывается отдельно с автоматическими повторами при ошибках</p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
} 