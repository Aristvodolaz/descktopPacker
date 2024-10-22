import os
import tkinter as tk
from tkinter import filedialog, messagebox, font, ttk
import requests
import pandas as pd
import logging
from io import StringIO
import numpy as np
import time

# Настройка логирования
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')


class FileUploaderApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Packer Desktop")
        self.root.geometry("900x750")
        self.root.configure(bg='#f0f0f0')

        # Настройка шрифтов
        self.title_font = font.Font(family="Helvetica Neue", size=24, weight="bold")
        self.button_font = font.Font(family="Helvetica Neue", size=14)
        self.label_font = font.Font(family="Helvetica Neue", size=16)

        # Заголовок
        self.title_label = tk.Label(root, text="Загрузить файл", font=self.title_font, bg='#f0f0f0', fg='#333333')
        self.title_label.pack(pady=20)

        # Описание
        self.description_label = tk.Label(root, text="Выберите файл для загрузки", font=self.label_font, bg='#f0f0f0', fg='#666666')
        self.description_label.pack(pady=5)

        # Кнопка для загрузки файла
        self.upload_button = tk.Button(root, text="Загрузить файл", font=self.button_font, command=self.upload_file, bg='#4CAF50', fg='white', relief='raised', height=2, bd=1, activebackground='#66bb6a', activeforeground='white')
        self.upload_button.pack(pady=10, padx=20, fill=tk.X)

        # Кнопка для списка выполненных файлов
        self.list_files_button = tk.Button(root, text="Список выполненных", font=self.button_font, command=self.load_completed_tasks, bg='#1976D2', fg='white', relief='raised', height=2, bd=1, activebackground='#42a5f5', activeforeground='white')
        self.list_files_button.pack(pady=10, padx=20, fill=tk.X)

        # Выпадающий список (ComboBox) для выбора склада
        self.sklad_label = tk.Label(root, text="Выберите склад:", font=self.label_font, bg='#f0f0f0', fg='#666666')
        self.sklad_label.pack(pady=10)

        self.sklad_combobox = ttk.Combobox(root, state="readonly", font=self.button_font)
        self.sklad_combobox.pack(pady=5, padx=20, fill=tk.X)

        # Список файлов
        self.files_listbox = tk.Listbox(root, width=50, height=10, bg='#ffffff', font=self.button_font, fg='#333333', selectbackground='#1976D2', selectforeground='white', bd=1, relief='groove', highlightthickness=1, highlightcolor='#1976D2')
        self.files_listbox.pack(pady=10, padx=20, fill=tk.X)

        # Кнопка для скачивания файла
        self.download_button = tk.Button(root, text="Скачать файл", font=self.button_font, command=self.download_file, bg='#FFB300', fg='black', relief='raised', height=2, bd=1, activebackground='#FFC107', activeforeground='black')
        self.download_button.pack(pady=10, padx=20, fill=tk.X)

        # Загрузить список складов
        self.load_sklad_options()

    def load_sklad_options(self):
        """Запрос к серверу для получения списка складов и загрузка их в ComboBox."""
        try:
            response = requests.get('https://corrywilliams.ru/sklads')
            response.raise_for_status()  # Вызывает ошибку при неуспешном статусе
            sklads = response.json().get('sklads', [])
            if sklads:
                self.sklad_combobox['values'] = sklads
                self.sklad_combobox.current(0)  # Устанавливаем первое значение по умолчанию
                logging.info('Список складов успешно загружен.')
            else:
                logging.warning('Пустой список складов.')
                messagebox.showwarning("Предупреждение", "Список складов пуст.")
        except requests.RequestException as e:
            logging.error(f'Ошибка при подключении к серверу: {e}')
            messagebox.showerror("Ошибка", f"Ошибка при подключении к серверу: {e}")

    def show_progress_window(self, max_value):
        """Отображает окно прогресса."""
        self.progress_window = tk.Toplevel(self.root)
        self.progress_window.title("Загрузка данных")
        self.progress_window.geometry("300x100")
        self.progress_label = tk.Label(self.progress_window, text="Загрузка, пожалуйста, подождите...")
        self.progress_label.pack(pady=10)
        self.progress_bar = ttk.Progressbar(self.progress_window, length=250, mode='determinate', maximum=max_value)
        self.progress_bar.pack(pady=10)
        self.progress_window.transient(self.root)
        self.progress_window.grab_set()

    def update_progress(self, value):
        """Обновление прогресс-бара."""
        self.progress_bar['value'] = value
        self.progress_window.update()

    def upload_file(self):
        """Открывает диалог выбора файла, читает его и отправляет данные на сервер построчно."""
        file_path = filedialog.askopenfilename(filetypes=[("Excel файлы", "*.xlsx")])
        if not file_path:
            return

        # Получаем имя файла без пути
        file_name = os.path.basename(file_path)

        # Извлекаем pref до пробела в названии файла
        pref = file_name.split(' ')[0]

        # Проверка, выбран ли склад
        selected_sklad = self.sklad_combobox.get()
        if not selected_sklad:
            messagebox.showwarning("Предупреждение", "Пожалуйста, выберите склад.")
            return

        try:
            # Чтение данных из Excel-файла
            data = pd.read_excel(file_path)

            # Проверка, что файл содержит данные
            if data.empty:
                messagebox.showwarning("Предупреждение", "Файл пустой.")
                return

            # Замена NaN, пустых строк и некорректных значений на None
            data = data.where(pd.notnull(data), None)

            # Замена всех типов данных float с 'NaN' и 'nan' на None с использованием NumPy
            for column in data.columns:
                data[column] = data[column].replace({np.nan: None, 'nan': None, 'NaN': None, '': None})

            # Отображение окна прогресса
            self.show_progress_window(len(data))

            # Подготовка данных для загрузки
            url = "https://corrywilliams.ru/upload-data"
            for index, row in data.iterrows():
                # Преобразуем строку в JSON-совместимый формат, добавляем 'pref' в данные
                payload = {
                    'Artikul': row.get('Артикул'),
                    'Artikul_Syrya': row.get('Артикул Сырья'),
                    'Nomenklatura': row.get('Номенклатура'),
                    'Nazvanie_Tovara': row.get('Название товара'),
                    'SHK': row.get('ШК'),
                    'SHK_Syrya': row.get('ШК Сырья'),
                    'SHK_SPO': row.get('ШК СПО'),
                    'Kol_vo_Syrya': row.get('Кол-во сырья'),
                    'Itog_Zakaz': row.get('Итог Заказ'),
                    'SOH': row.get('СОХ'),
                    'Tip_Postavki': row.get('тип поставки'),
                    'Srok_Godnosti': row.get('Срок Годности'),
                    'Op_1_Bl_1_Sht': row.get('Оп 1 бл. 1 шт'),
                    'Op_2_Bl_2_Sht': row.get('Оп 2 бл.2 шт'),
                    'Op_3_Bl_3_Sht': row.get('Оп 3 бл.3 шт'),
                    'Op_4_Bl_4_Sht': row.get('Оп 4 бл.4шт'),
                    'Op_5_Bl_5_Sht': row.get('Оп 5 бл.5 шт'),
                    'Op_6_Blis_6_10_Sht': row.get('Оп 6 блис.6-10шт'),
                    'Op_7_Pereschyot': row.get('Оп 7 пересчет'),
                    'Op_9_Fasovka_Sborka': row.get('Оп 9 фасовка/сборка'),
                    'Op_10_Markirovka_SHT': row.get('Оп 10 Маркировка ШТ'),
                    'Op_11_Markirovka_Prom': row.get('Оп 11 маркировка пром'),
                    'Op_13_Markirovka_Fabr': row.get('Оп 13 маркировка фабр'),
                    'Op_14_TU_1_Sht': row.get('Оп 14 ТУ 1 шт'),
                    'Op_15_TU_2_Sht': row.get('Оп 15 ТУ 2 шт'),
                    'Op_16_TU_3_5': row.get('Оп 16 ТУ 3-5'),
                    'Op_17_TU_6_8': row.get('Оп 17 ТУ 6-8'),
                    'Op_468_Proverka_SHK': row.get('Оп 468 проверка ШК'),
                    'Op_469_Spetsifikatsiya_TM': row.get('Оп 469 Спецификация ТМ'),
                    'Op_470_Dop_Upakovka': row.get('Оп 470 доп упаковка'),
                    'Mesto': row.get('Место'),
                    'Vlozhennost': row.get('Вложенность'),
                    'Pallet_No': row.get('Паллет №'),
                    'pref': pref,  # Передаем извлеченный pref
                    'Scklad_Pref': selected_sklad,  # Передаем склад
                    'Status': 0,
                    'Status_Zadaniya': 0,
                    'Nazvanie_Zadaniya': file_name
                }

                # Логирование отправляемой строки
                logging.info(f'Отправка строки {index + 1}: {payload}')

                try:
                    response = requests.post(url, json=payload, timeout=30, verify=False)

                    if response.status_code == 200:
                        logging.info(f'Строка {index + 1} успешно загружена.')
                    else:
                        logging.error(f'Ошибка при загрузке строки {index + 1}: {response.text}')
                        messagebox.showerror("Ошибка", f"Ошибка при загрузке строки {index + 1}: {response.text}")
                except requests.exceptions.RequestException as e:
                    logging.error(f'Ошибка при загрузке строки {index + 1}: {e}')
                    messagebox.showerror("Ошибка", f"Ошибка при загрузке строки {index + 1}: {e}")

                # Обновляем прогресс
                self.update_progress(index + 1)
                time.sleep(0.2)

            # Закрываем окно прогресса после завершения
            self.progress_window.destroy()
            messagebox.showinfo("Успех", "Файл успешно загружен построчно.")
        except Exception as e:
            logging.error(f'Ошибка при загрузке файла: {e}')
            messagebox.showerror("Ошибка", f"Ошибка при загрузке файла: {e}")

    def load_completed_tasks(self):
        """Загружает список выполненных задач с сервера и отображает их в списке."""
        try:
            response = requests.get('https://corrywilliams.ru/completed-tasks')
            response.raise_for_status()
            tasks = response.json().get('tasks', [])
            self.update_task_listbox(tasks)
            logging.info(f'Список выполненных задач загружен: {tasks}')
        except requests.RequestException as e:
            logging.error(f'Ошибка при загрузке списка выполненных задач: {e}')
            messagebox.showerror("Ошибка", f"Ошибка при загрузке списка выполненных задач: {e}")

    def update_task_listbox(self, tasks):
        """Обновляет содержимое listbox с задачами."""
        self.files_listbox.delete(0, tk.END)
        if tasks:
            for task in tasks:
                self.files_listbox.insert(tk.END, task)
        else:
            self.files_listbox.insert(tk.END, "Нет выполненных задач")

    def download_file(self):
        """Скачивает данные построчно с сервера и формирует Excel файл с русскими названиями столбцов."""
        selected_task = self.files_listbox.get(tk.ACTIVE)
        if not selected_task:
            messagebox.showwarning("Предупреждение", "Пожалуйста, выберите задание.")
            return

        column_names = self.get_column_names()
        try:
            response = requests.get(f'https://corrywilliams.ru/download?task={selected_task}', stream=True)
            response.raise_for_status()
            data = self.process_streaming_data(response)

            if not data.empty:
                self.save_to_excel(data, selected_task, column_names)
            else:
                messagebox.showwarning("Предупреждение", "Данные отсутствуют.")

        except requests.RequestException as e:
            logging.error(f'Ошибка при скачивании файла: {e}')
            messagebox.showerror("Ошибка", f"Ошибка при скачивании файла: {e}")

    def get_column_names(self):
        """Возвращает словарь для переименования столбцов на русский."""
        return {
            "Nazvanie_Zadaniya": "Название задания", "Artikul": "Артикул", "Artikul_Syrya": "Артикул сырья",
            "Nazvanie_Tovara": "Название товара", "SHK": "ШК", "SHK_Syrya": "ШК сырья",
            "Kol_vo_Syrya": "Количество сырья", "Itog_Zakaz": "Итог заказа", "Itog_MP": "Итог MП", "SOH": "СОХ",
            "Srok_Godnosti": "Срок годности", "Op_1_Bl_1_Sht": "Оп 1 бл. 1 шт", "Op_2_Bl_2_Sht": "Оп 2 бл. 2 шт",
            "Op_3_Bl_3_Sht": "Оп 3 бл. 3 шт", "Op_4_Bl_4_Sht": "Оп 4 бл. 4 шт", "Op_5_Bl_5_Sht": "Оп 5 бл. 5 шт",
            "Op_6_Blis_6_10_Sht": "Оп 6 блис.6-10шт", "Op_7_Pereschyot": "Оп 7 пересчет",
            "Op_9_Fasovka_Sborka": "Оп 9 фасовка/сборка", "Op_10_Markirovka_SHT": "Оп 10 Маркировка ШТ",
            "Op_11_Markirovka_Prom": "Оп 11 маркировка пром", "Op_13_Markirovka_Fabr": "Оп 13 маркировка фабр",
            "Op_14_TU_1_Sht": "Оп 14 ТУ 1шт", "Op_15_TU_2_Sht": "Оп 15 ТУ 2 шт", "Op_16_TU_3_5": "Оп 16 ТУ 3-5",
            "Op_17_TU_6_8": "Оп 17 ТУ 6-8", "Op_468_Proverka_SHK": "Оп 468 проверка ШК", "Op_469_Spetsifikatsiya_TM": "Оп 469 Спецификация ТМ",
            "Op_470_Dop_Upakovka": "Оп 470 доп упаковка", "Mesto": "Место", "Vlozhennost": "Вложенность", "Pallet_No": "Паллет №", "Ispolnitel": "Исполнитель",
            "SHK_WPS": "ШК WPS"
        }

    def process_streaming_data(self, response):
        """Обрабатывает данные, поступающие из потока, и возвращает DataFrame."""
        data = []
        for line in response.iter_lines():
            if line:
                row = pd.read_json(StringIO(line.decode('utf-8')), lines=True)
                data.append(row)
        if data:
            return pd.concat(data, ignore_index=True).fillna("")
        return pd.DataFrame()

    def save_to_excel(self, data, task_name, column_names):
        """Сохраняет DataFrame в Excel файл."""
        data.rename(columns=column_names, inplace=True)
        downloads_path = os.path.join(os.getenv('USERPROFILE') if os.name == 'nt' else os.path.expanduser('~'), 'Downloads')
        local_file_path = os.path.join(downloads_path, f"{task_name}.xlsx")
        data.to_excel(local_file_path, index=False)
        messagebox.showinfo("Успех", f"Файл успешно скачан в {local_file_path}.")
        logging.info(f'Файл {local_file_path} успешно скачан.')


# Запуск приложения
if __name__ == "__main__":
    root = tk.Tk()
    app = FileUploaderApp(root)
    root.mainloop()
