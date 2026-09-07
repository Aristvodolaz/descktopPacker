import { TEMPLATE_COLUMNS, HEADER_ALIASES, headerToField, normalizeFlagValue } from './nppTemplate'

// Заголовки колонок шаблона «Заявка НПП» — единый источник правды (см. ./nppTemplate).
const templateHeaders: Record<string, string> = Object.fromEntries(
  TEMPLATE_COLUMNS.map(col => [col.field, col.header])
)

// Маппинг колонок для загрузки (английские названия -> русские подписи Excel)
// Совпадает с utils/lduTemplate.js на service-komus (applyLduExcelHeaders)
const uploadColumnMappingsBase: Record<string, string> = {
  // Поля шаблона «Заявка НПП»
  'Sortiruemyi_Tovar': 'Сортируемый товар',
  'Ne_Sortiruemyi_Tovar': 'Не сортируемый товар',
  'Produkty': 'Продукты',
  'Opasnyi_Tovar': 'Опасный товар',
  'Zakrytaya_Zona': 'Закрытая зона',
  'Krupnogabaritnyi_Tovar': 'Крупногабаритный товар',
  'Yuvelirnye_Izdelia': 'Ювелирные изделия',
  'Pechat_Etiketki_s_SHK': 'Печать этикетки с ШК',
  'Pechat_Etiketki_s_Opisaniem': 'Печать этикетки с описанием',
  'PriznakSortirovki': 'Сортировка товара по признаку',
  /** Каноническое поле БД; в WB для той же сущности колонка «Фасовка/сборка товара в короб» — см. reverse */
  'Upakovka_v_Gofro': 'Фасовка/сборка товара в короб',
  'Upakovka_v_PE_Paket': 'Упаковка товара в п/э пакет',
  'Spetsifikatsiya_TM': 'Спецификация ТМ',
  'Vlozhit_v_upakovku_pechatnyi_material': 'Вложить в упаковку печатный материал',
  'Izmerenie_VGH_i_peredacha_informatsii': 'Измерение ВГХ и передача информации',
  'Indeks_za_srochnost_koeff_1_5': 'Индекс за срочность (коэффициент 1,5)',
  'Kompleksnaya_priemka_tovara': 'Комплексная приёмка товара',
  'Priemka_tovara_v_transportnykh_korobakh': 'Приёмка в транспортных коробах',
  'Priemka_tovara_palletnaya': 'Паллетная приёмка',
  'Prochie_raboty_vklyuchaya_ustranenie_anomalii': 'Прочие работы включая устранение аномалий',
  'Razbrakovka_tovara': 'Разбраковка товара',
  'Sborka_naborov_ot_2_shtuk_raznykh_tovarov':
    'Формирование наборов (комплектов) от 2-х ед. товара',
  'Upakovka_tovara_v_gofromeyler': 'Упаковка товара в гофромейлер',
  'Khranenie_tovara': 'Хранение товара',
  'Primeryka_SHK': 'Примерка ШК',
  'Proverka_Sroka_Godnosti': 'Проверка срока годности',
  'Upakovka_v_Babl_Plenku': 'Упаковка в бабл пленку',
  'Upakovka_v_Ind_Korob': 'Упаковка товара в индивидуальный короб',
  'Markirovka_Tovara_Stiker_CHZ':
    'Маркировка товара (стикером, ЧЗ, противокражной этикеткой)',
  'Udalenie_Stikera_Markirovki': 'Удаление стикера/маркировки с товара',
  'Dopolnitelnaya_Zashchita_Tovara': 'Дополнительная защита товара',
  'Markirovka_Transportnogo_Koroba': 'Маркировка транспортного короба',
  'Formirovanie_Pallet_Otgruzki': 'Формирование паллет для отгрузки',
  'Upakovochnyi_Material': 'Упаковочный материал',
  'Markirovka_Palleta_TM': 'Маркировка паллета (транспортного модуля)',
  'Raskomplekt_Zakaza': 'Раскомплект заказа (полный/частичный)',
  'Tip_Operatsii_LDU': 'Тип операции',
  'Zamorozhennaya_Zona': 'Замороженная зона',

  // Основные поля
  'Artikul': 'Артикул',
  'Artikul_Syrya': 'Артикул Сырья',
  'Nomenklatura': 'Номенклатура',
  'Nazvanie_Tovara': 'Название товара',
  'SHK': 'ШК',
  'SHK_Syrya': 'ШК Сырья',
  'Kol_vo_Syrya': 'Кол-во сырья',
  'Itog_Zakaz': 'Итог Заказ',
  'SOH': 'СОХ',
  'Tip_Postavki': 'тип поставки',
  'tipPostavki': 'tipPostavki',
  'Mono': 'Mono',
  'Srok_Godnosti': 'Срок Годности',
  'vp': 'ВП',
  'Mesto': 'Место',
  'Vlozhennost': 'Вложенность',
  'Pallet_No': 'Паллет №',

  // Дополнительные поля для времени и комментариев
  'reason': 'Причина',
  'comment': 'Комментарий',
  'Time_Start': 'Начало',
  'Time_End': 'Окончание',
  'time_start': 'Начало',
  'time_end': 'Окончание',
  'SHK_Original': 'Исходный ШК',
  'SHK_Changed': 'Измененный ШК'
}

// Заголовки колонок шаблона всегда берём из nppTemplate, остальные — из списка выше.
export const uploadColumnMappings: Record<string, string> = {
  ...uploadColumnMappingsBase,
  ...templateHeaders
}

// Маппинг колонок для скачивания (английские названия -> русские)
const downloadColumnMappingsBase: Record<string, string> = {
  'Op_1_Bl_1_Sht': 'Упаковка товара в индивидуальный короб',
  'Op_2_Bl_2_Sht': 'Пересчет товара',
  'Op_3_Bl_3_Sht': 'Фасовка/сборка монотовара в короб',
  'Op_4_Bl_4_Sht': 'Маркировка товара стикером',
  'Op_5_Bl_5_Sht': 'Маркировка транспортного короба',
  'Op_6_Blis_6_10_Sht': 'Маркировка паллета (транспортного модуля)',
  'Op_7_Pereschyot': 'Удаление стикера/маркировки с товара',
  'Op_9_Fasovka_Sborka': 'Термоупаковка товара',
  'Op_10_Markirovka_SHT': 'Разбор товара (для маркетплейсов)',
  'Op_469_Spetsifikatsiya_TM': 'Спецификация ТМ (для маркетплейсов)',
  'Op_11_Markirovka_Prom': 'Подготовка транспортного паллета к отгрузке',
  'Op_13_Markirovka_Fabr': 'Раскомплект заказа (полный/частичный)',
  'Ne_Sortiruemyi_Tovar': 'Не сортируемый товар',
  'Produkty': 'Продукты',
  'Opasnyi_Tovar': 'Опасный товар',
  'Zakrytaya_Zona': 'Закрытая зона',
  'Op_470_Dop_Upakovka': 'Проверка штрих-кода / срока годности',
  'Krupnogabaritnyi_Tovar': 'Крупногабаритный товар',
  'Yuvelirnye_Izdelia': 'Ювелирные изделия',
  'Op_16_TU_3_5': 'Упаковка в пакет с клеевым слоем',
  'Op_17_TU_6_8': 'Упаковка в пакет с замком Zip Lock',
  'Op_468_Proverka_SHK': 'Упаковка в бабл - пленку',
  'Upakovka_v_Gofro': 'Фасовка/сборка товара в короб',
  'PriznakSortirovki': 'Сортируемый товар',
  'Vlozhit_v_upakovku_pechatnyi_material': 'Вложить в упаковку печатный материал',
  'Izmerenie_VGH_i_peredacha_informatsii': 'Измерение ВГХ и передача информации',
  'Indeks_za_srochnost_koeff_1_5': 'Индекс за срочность (коэффициент 1,5)',
  'Prochie_raboty_vklyuchaya_ustranenie_anomalii': 'Прочие работы (в т.ч. устранение аномалий)',
  'Sborka_naborov_ot_2_shtuk_raznykh_tovarov': 'Сборка наборов (комплектов) от 2-х штук разных товаров',
  'Upakovka_tovara_v_gofromeyler': 'Упаковка товара в гофромейлер',
  'Khranenie_tovara': 'Хранение товара',
  // Технические ключи полного отчета -> русские заголовки (по эталону)
  'Primeryka_SHK': 'Проверка ШК',
  'Proverka_Sroka_Godnosti': 'Проверка срока годности',
  'Upakovka_v_Babl_Plenku': 'Упаковка в бабл - пленку',
  'Upakovka_v_Ind_Korob': 'Упаковка товара в индивидуальный короб',
  'Markirovka_Tovara_Stiker_CHZ': 'Маркировка товара (стикером, ЧЗ, противокражной этикеткой)',
  'Udalenie_Stikera_Markirovki': 'Удаление стикера/маркировки с товара',
  'Dopolnitelnaya_Zashchita_Tovara': 'Дополнительная защита товара',
  'Markirovka_Transportnogo_Koroba': 'Маркировка транспортного короба',
  'Spetsifikatsiya_TM': 'Спецификация транспортного паллета (для маркеплейсов)',
  'Formirovanie_Pallet_Otgruzki': 'Формирование транспортного паллета для отгрузки',
  'Upakovochnyi_Material': 'Упаковочный материал',
  'Markirovka_Palleta_TM': 'Маркировка паллета (транспортного модуля)',
  'Raskomplekt_Zakaza': 'Раскомплект заказа (полный/частичный)',
  'Tip_Operatsii_LDU': 'Тип операции',
  'Zamorozhennaya_Zona': 'Замороженная зона',
  
  
  // Основные поля
  'Artikul': 'Артикул',
  'Artikul_Syrya': 'Артикул Сырья',
  'Nomenklatura': 'Номенклатура',
  'Nazvanie_Tovara': 'Название товара',
  'SHK': 'ШК',
  'SHK_Syrya': 'ШК Сырья',
  'Kol_vo_Syrya': 'Кол-во сырья',
  'Itog_Zakaz': 'Итог Заказ',
  'SOH': 'СОХ',
  'Srok_Godnosti': 'Срок Годности',
  'Upakovka_v_PE_Paket': 'Упаковка товара в п/э пакет',
  
  // Дополнительные поля
  'Nazvanie_Zadaniya': 'Название задания',
  'Scklad_Pref': 'Склад',
  'pref': 'Префикс',
  'Pallet_No': 'Паллет №',
  'Mesto': 'Место',
  'Ispolnitel': 'Исполнитель',
  'Vlozhennost': 'Вложенность',
  'Kolvo_Tovarov': 'Количество товаров',
  'SHK_WPS': 'ШК WPS',
  'vp': 'ВП',
  
  // Дополнительные поля для времени и комментариев
  'reason': 'Причина',
  'comment': 'Комментарий',
  'Time_Start': 'Начало',
  'Time_End': 'Окончание',
  'time_start': 'Начало',
  'time_end': 'Окончание',
  'SHK_Original': 'Исходный ШК',
  'SHK_Changed': 'Измененный ШК'
}

export const downloadColumnMappings: Record<string, string> = {
  ...downloadColumnMappingsBase,
  ...templateHeaders
}

// Обратный маппинг для загрузки (русские названия -> английские)
export const reverseUploadColumnMappings: Record<string, string> = Object.fromEntries(
  Object.entries(uploadColumnMappings).map(([key, value]) => [value, key])
)

// Заголовки шаблона «Заявка НПП» и алиасы прошлых шапок (см. HEADER_ALIASES в ./nppTemplate).
for (const [header, field] of Object.entries(HEADER_ALIASES)) {
  reverseUploadColumnMappings[header] = field
}
for (const col of TEMPLATE_COLUMNS) {
  reverseUploadColumnMappings[col.header] = col.field
}

// Варианты заголовков из старых шаблонов Excel (не перезаписывают канонические ключи выше)
reverseUploadColumnMappings['Упаковка в ПЭ пакет'] = 'Upakovka_v_PE_Paket'
reverseUploadColumnMappings['Упаковка в п/э пакет'] = 'Upakovka_v_PE_Paket'
reverseUploadColumnMappings['Упаковка в бабл-плёнку'] = 'Upakovka_v_Babl_Plenku'
reverseUploadColumnMappings['Упаковка в инд. короб'] = 'Upakovka_v_Ind_Korob'
reverseUploadColumnMappings['Сборка наборов от 2 штук разных товаров'] =
  'Sborka_naborov_ot_2_shtuk_raznykh_tovarov'
reverseUploadColumnMappings['Маркировка товара (стикер, ЧЗ и т.п.)'] =
  'Markirovka_Tovara_Stiker_CHZ'
reverseUploadColumnMappings['Удаление стикера/маркировки'] = 'Udalenie_Stikera_Markirovki'
reverseUploadColumnMappings['Раскомплект заказа'] = 'Raskomplekt_Zakaza'
reverseUploadColumnMappings['Маркировка паллета (ТМ)'] = 'Markirovka_Palleta_TM'
// Тип поставки / моно (русские и латинские заголовки)
reverseUploadColumnMappings['тип поставки'] = 'Tip_Postavki'
reverseUploadColumnMappings['МОНО'] = 'Mono'
reverseUploadColumnMappings['Моно'] = 'Mono'

// Шаблон WB (в т.ч. «Южный кластер»): подписи столбцов отличаются от канонических
reverseUploadColumnMappings['Приемка в транспортных коробах'] =
  'Priemka_tovara_v_transportnykh_korobakh'
reverseUploadColumnMappings['Паллетная приемка'] = 'Priemka_tovara_palletnaya'
reverseUploadColumnMappings['Прочие работы (в т.ч. устранение аномалий)'] =
  'Prochie_raboty_vklyuchaya_ustranenie_anomalii'

/**
 * Поле Test_MP по заголовку колонки Excel. Сначала точное совпадение, затем
 * нормализованный поиск по шаблону (регистр, «ё», двойные и хвостовые пробелы).
 */
export const resolveUploadField = (header: string): string | null =>
  reverseUploadColumnMappings[header] ?? headerToField(header)

/** Убирает null/undefined из объекта перед POST — чтобы сработали дефолты сервера (upload-data-new). */
export function omitEmptyUploadFields(
  row: object,
  /** Ключи, которые всегда должны попасть в JSON (в т.ч. как null) */
  alwaysIncludeKeys?: string[]
): Record<string, unknown> {
  const always = new Set(alwaysIncludeKeys ?? [])
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (v !== null && v !== undefined) {
      out[k] = v
    } else if (always.has(k)) {
      out[k] = null
    }
  }
  for (const k of always) {
    if (!(k in out)) {
      out[k] = null
    }
  }
  return out
}

// Порядок колонок для отчета (соответствует изображению)
export const desiredColumnOrder: string[] = [
  // Полный отчёт: порядок колонок A..AN листа «Лист1» шаблона «Заявка НПП»
  ...TEMPLATE_COLUMNS.map(col => col.header)
]

// Значение операции: число -> целое строкой, «V» -> «1», прочий текст -> «V», пусто -> null
export const processOpColumnValue = normalizeFlagValue

// Для обратной совместимости
export const getColumnNames = () => uploadColumnMappings
export const getDownloadColumnNames = () => downloadColumnMappings 