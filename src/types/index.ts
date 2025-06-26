export interface Task {
  id: string
  Nazvanie_Zadaniya: string
  Progress?: number
  TotalTasks?: number
  CompletedTasks?: number
  Status: number
  Status_Zadaniya: number
  createdAt: string
  updatedAt?: string
}

export interface TaskInProgress extends Task {
  Progress: number
  TotalTasks: number
  CompletedTasks: number
}

export interface WarehouseOption {
  id: string
  name: string
}

export interface UploadData {
  Artikul?: string
  Artikul_Syrya?: string
  Nomenklatura?: string
  Nazvanie_Tovara?: string
  SHK?: string
  SHK_Syrya?: string
  SHK_SPO?: string
  Kol_vo_Syrya?: number
  Itog_Zakaz?: number
  SOH?: number
  Tip_Postavki?: string
  Srok_Godnosti?: string
  
  // Operations
  Op_1_Bl_1_Sht?: string
  Op_2_Bl_2_Sht?: string
  Op_3_Bl_3_Sht?: string
  Op_4_Bl_4_Sht?: string
  Op_5_Bl_5_Sht?: string
  Op_6_Blis_6_10_Sht?: string
  Op_7_Pereschyot?: string
  Op_9_Fasovka_Sborka?: string
  Op_10_Markirovka_SHT?: string
  Op_11_Markirovka_Prom?: string
  Op_13_Markirovka_Fabr?: string
  Op_16_TU_3_5?: string
  Op_17_TU_6_8?: string
  Zakrytaya_Zona?: string
  Op_469_Spetsifikatsiya_TM?: string
  Op_470_Dop_Upakovka?: string
  
  Mesto?: string
  Vlozhennost?: number
  Pallet_No?: string
  pref: string
  Scklad_Pref: string
  Status: number
  Status_Zadaniya: number
  Nazvanie_Zadaniya: string
  Upakovka_v_Gofro?: string
  Upakovka_v_PE_Paket?: string
  
  // Product characteristics
  Sortiruemyi_Tovar?: string
  Ne_Sortiruemyi_Tovar?: string
  Produkty?: string
  Opasnyi_Tovar?: string
  Op_468_Proverka_SHK?: string
  Krupnogabaritnyi_Tovar?: string
  Yuvelirnye_Izdelia?: string
  Pechat_Etiketki_s_SHK?: string
  Pechat_Etiketki_s_Opisaniem?: string
  PriznakSortirovki?: string
  
  // Additional operations
  Vlozhit_v_upakovku_pechatnyi_material?: string
  Izmerenie_VGH_i_peredacha_informatsii?: string
  Indeks_za_srochnost_koeff_1_5?: string
  Prochie_raboty_vklyuchaya_ustranenie_anomalii?: string
  Sborka_naborov_ot_2_shtuk_raznykh_tovarov?: string
  Upakovka_tovara_v_gofromeyler?: string
  Khranenie_tovara?: string
  vp?: string
  Plan_Otkaz?: number
}

export interface ExpiryData {
  Artikul: string
  ExpiryDate: string
}

export interface ProgressUpdate {
  current: number
  total: number
  percentage: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface ColumnMapping {
  [key: string]: string
}

export interface UploadProgress {
  isUploading: boolean
  progress: number
  total: number
  currentRow: number
}

export interface DownloadData {
  dataSet1?: any[]
  dataSet2?: any[]
}

export interface TimeInfo {
  startTime?: string
  endTime?: string
  duration?: string
  taskName: string
} 