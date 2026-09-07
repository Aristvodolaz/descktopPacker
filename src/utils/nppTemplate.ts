// Шаблон «Заявка НПП» (лист «Лист1») — тот же список, что и в service-komus/utils/lduTemplate.js.
// Отсюда берутся заголовки на загрузке заявки и на выгрузке отчёта.

export type TemplateColumnType = 'int' | 'text' | 'flag' | 'string';

export interface TemplateColumn {
  header: string;
  field: string;
  type: TemplateColumnType;
}

export const TEMPLATE_COLUMNS: TemplateColumn[] = [
  { header: 'ВП', field: 'vp', type: 'flag' },
  { header: 'Артикул', field: 'Artikul', type: 'int' },
  { header: 'Артикул Сырья', field: 'Artikul_Syrya', type: 'text' },
  { header: 'Название товара', field: 'Nazvanie_Tovara', type: 'text' },
  { header: 'ШК', field: 'SHK', type: 'text' },
  { header: 'ШК Сырья', field: 'SHK_Syrya', type: 'text' },
  { header: 'Номенклатура', field: 'Nomenklatura', type: 'text' },
  { header: 'Кол-во сырья', field: 'Kol_vo_Syrya', type: 'int' },
  { header: 'Итог Заказ', field: 'Itog_Zakaz', type: 'int' },
  { header: 'СОХ', field: 'SOH', type: 'text' },
  { header: 'Срок Годности', field: 'Srok_Godnosti', type: 'text' },
  { header: 'Проверка ШК', field: 'Primeryka_SHK', type: 'flag' },
  { header: 'Проверка срока годности', field: 'Proverka_Sroka_Godnosti', type: 'flag' },
  { header: 'Упаковка товара в п/э пакет', field: 'Upakovka_v_PE_Paket', type: 'flag' },
  { header: 'Упаковка в бабл - пленку', field: 'Upakovka_v_Babl_Plenku', type: 'flag' },
  { header: 'Упаковка товара в индивидуальный короб', field: 'Upakovka_v_Ind_Korob', type: 'flag' },
  { header: 'Маркировка товара (стикером, ЧЗ, противокражной этикеткой)', field: 'Markirovka_Tovara_Stiker_CHZ', type: 'flag' },
  { header: 'Фасовка/сборка товара в короб', field: 'Upakovka_v_Gofro', type: 'flag' },
  { header: 'Удаление стикера/маркировки с товара', field: 'Udalenie_Stikera_Markirovki', type: 'flag' },
  { header: 'Дополнительная защита товара', field: 'Dopolnitelnaya_Zashchita_Tovara', type: 'flag' },
  { header: 'Маркировка транспортного короба', field: 'Markirovka_Transportnogo_Koroba', type: 'flag' },
  { header: 'Спецификация транспортного короба', field: 'Spetsifikatsiya_TM', type: 'flag' },
  { header: 'Формирование наборов (комплектов) от 2-х ед. товара', field: 'Sborka_naborov_ot_2_shtuk_raznykh_tovarov', type: 'flag' },
  { header: 'Формирование транспортного паллета для отгрузки', field: 'Formirovanie_Pallet_Otgruzki', type: 'flag' },
  { header: 'Вложить печатный материал', field: 'Vlozhit_v_upakovku_pechatnyi_material', type: 'flag' },
  { header: 'Сортировка товара по признаку', field: 'PriznakSortirovki', type: 'flag' },
  { header: 'Маркировка паллета (транспортного модуля)', field: 'Markirovka_Palleta_TM', type: 'flag' },
  { header: 'Раскомплект заказа (полный/частичный)', field: 'Raskomplekt_Zakaza', type: 'flag' },
  { header: 'Термоупаковка', field: 'Termoupakovka', type: 'flag' },
  { header: 'Тип операции', field: 'Tip_Operatsii_LDU', type: 'string' },
  { header: 'Сортируемый товар', field: 'Sortiruemyi_Tovar', type: 'flag' },
  { header: 'Не сортируемый товар', field: 'Ne_Sortiruemyi_Tovar', type: 'flag' },
  { header: 'Продукты', field: 'Produkty', type: 'flag' },
  { header: 'Опасный товар', field: 'Opasnyi_Tovar', type: 'flag' },
  { header: 'Закрытая зона', field: 'Zakrytaya_Zona', type: 'flag' },
  { header: 'Крупногабаритный товар', field: 'Krupnogabaritnyi_Tovar', type: 'flag' },
  { header: 'Ювелирные изделия', field: 'Yuvelirnye_Izdelia', type: 'flag' },
  { header: 'Место', field: 'Mesto', type: 'int' },
  { header: 'Вложенность', field: 'Vlozhennost', type: 'int' },
  { header: 'Паллет №', field: 'Pallet_No', type: 'int' },
];

// Заголовки прошлых шаблонов — принимаем на загрузке, чтобы не ломать уже сформированные файлы.
export const HEADER_ALIASES: Record<string, string> = {
  'Примерка ШК': 'Primeryka_SHK',
  'Проверка штрих-кода / срока годности': 'Proverka_Sroka_Godnosti',
  'Упаковка в бабл пленку': 'Upakovka_v_Babl_Plenku',
  'Фасовка / сборка товара в короб': 'Upakovka_v_Gofro',
  'Фасовка/сборка монотовара в короб': 'Upakovka_v_Gofro',
  'Маркировка товара стикером': 'Markirovka_Tovara_Stiker_CHZ',
  'Спецификация ТМ': 'Spetsifikatsiya_TM',
  'Спецификация ТМ (для маркеплейсов)': 'Spetsifikatsiya_TM',
  'Спецификация транспортного паллета (для маркеплейсов)': 'Spetsifikatsiya_TM',
  'Спецификация транспортной единицы (для маркетплейсов)': 'Spetsifikatsiya_TM',
  'Формирование паллет для отгрузки': 'Formirovanie_Pallet_Otgruzki',
  'Формирование паллета для отгрузки': 'Formirovanie_Pallet_Otgruzki',
  'Подготовка транспортного паллета к отгрузке': 'Formirovanie_Pallet_Otgruzki',
  'Сборка наборов (комплектов) от 2-х штук разных товаров': 'Sborka_naborov_ot_2_shtuk_raznykh_tovarov',
  'Вложить в упаковку печатный материал': 'Vlozhit_v_upakovku_pechatnyi_material',
  'Термоупаковка товара': 'Termoupakovka',
  'Итог заказ': 'Itog_Zakaz',
  'Итог заказа': 'Itog_Zakaz',
  // Колонки прежних шаблонов, которых в «Заявке НПП» уже нет, но данные из них ещё принимаем.
  'ШК СПО': 'SHK_SPO',
  'Тип поставки': 'Tip_Postavki',
  'Замороженная зона': 'Zamorozhennaya_Zona',
  'Упаковочный материал': 'Upakovochnyi_Material',
  'Планируемое кол-во': 'Plan_Otkaz',
  'Итог МП': 'Itog_MP',
};

// Служебные колонки отчёта — идут после колонок шаблона.
export const REPORT_EXTRA_COLUMNS: Array<{ header: string; field: string }> = [
  { header: 'Название задания', field: 'Nazvanie_Zadaniya' },
  { header: 'Изначальный ШК', field: 'SHK_Original' },
  { header: 'Измененный ШК', field: 'SHK_Changed' },
  { header: 'Фактическое количество', field: 'Fakticheskoe_Kol_vo' },
  { header: 'Убрано из заказа', field: 'Ubrano_iz_Zakaza' },
  { header: 'Исполнитель', field: 'Ispolnitel' },
  { header: 'ШК WPS', field: 'SHK_WPS' },
  { header: 'Причина', field: 'reason' },
  { header: 'Комментарий', field: 'comment' },
  { header: 'Начало', field: 'Time_Start' },
  { header: 'Окончание', field: 'Time_End' },
];

// Заголовки Excel приходят с разным регистром, «ё», двойными и хвостовыми пробелами.
export const normalizeHeader = (header: unknown): string => {
  if (header === null || header === undefined) return '';
  return String(header)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
};

const HEADER_TO_FIELD = new Map<string, string>();
TEMPLATE_COLUMNS.forEach(col => HEADER_TO_FIELD.set(normalizeHeader(col.header), col.field));
Object.entries(HEADER_ALIASES).forEach(([header, field]) => HEADER_TO_FIELD.set(normalizeHeader(header), field));

/** Поле Test_MP по заголовку колонки Excel (null — такой колонки в шаблоне нет). */
export const headerToField = (header: unknown): string | null =>
  HEADER_TO_FIELD.get(normalizeHeader(header)) || null;

/** Заголовок шаблона по полю Test_MP (для выгрузки отчёта). */
export const FIELD_TO_HEADER: Record<string, string> = {};
TEMPLATE_COLUMNS.forEach(col => {
  FIELD_TO_HEADER[col.field] = col.header;
});
REPORT_EXTRA_COLUMNS.forEach(col => {
  FIELD_TO_HEADER[col.field] = col.header;
});

/**
 * Значение операции: число -> целое строкой, «V» -> «1», прочий текст -> «V», пусто -> null.
 */
export const normalizeFlagValue = (value: any): string | null => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (str === '') return null;
  const upper = str.toUpperCase();
  if (upper === 'V' || upper === 'X' || upper === 'Х') return '1';
  const num = Number(str.replace(',', '.'));
  if (!Number.isNaN(num)) return String(Math.floor(num));
  return 'V';
};

/** Строка листа «Лист1» -> объект с полями Test_MP (значения операций нормализованы). */
export const mapTemplateRow = (row: Record<string, any>): Record<string, any> => {
  const byField: Record<string, any> = {};

  Object.entries(row || {}).forEach(([key, value]) => {
    const field = headerToField(key);
    if (!field) return;
    const current = byField[field];
    if (current === undefined || current === null || current === '') byField[field] = value;
  });

  const out: Record<string, any> = {};
  TEMPLATE_COLUMNS.forEach(col => {
    const value = byField[col.field];
    out[col.field] = col.type === 'flag' ? normalizeFlagValue(value) : (value ?? undefined);
  });

  // Колонки, ушедшие из шаблона, но ещё встречающиеся в старых файлах.
  ['SHK_SPO', 'Tip_Postavki', 'Zamorozhennaya_Zona', 'Upakovochnyi_Material', 'Plan_Otkaz', 'Itog_MP'].forEach(field => {
    if (byField[field] !== undefined) out[field] = byField[field];
  });

  return out;
};
