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

        # Переменная для контроля отмены
        self.cancel_upload = False

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
        """Отображает окно прогресса с кнопкой отмены."""
        self.progress_window = tk.Toplevel(self.root)
        self.progress_window.title("Загрузка данных")
        self.progress_window.geometry("300x150")
        self.progress_label = tk.Label(self.progress_window, text="Загрузка, пожалуйста, подождите...")
        self.progress_label.pack(pady=10)
        self.progress_bar = ttk.Progressbar(self.progress_window, length=250, mode='determinate', maximum=max_value)
        self.progress_bar.pack(pady=10)

        # Кнопка "Отменить"
        self.cancel_button = tk.Button(self.progress_window, text="Отменить", command=self.cancel_upload_process)
        self.cancel_button.pack(pady=10)

        self.progress_window.transient(self.root)
        self.progress_window.grab_set()

    def cancel_upload_process(self):
        """Обрабатывает отмену загрузки и удаляет загруженные файлы на бэке."""
        self.cancel_upload = True  # Флаг отмены загрузки
        self.progress_window.destroy()
        self.remove_uploaded_data()

    def update_progress(self, value):
        """Обновление прогресс-бара."""
        self.progress_bar['value'] = value
        self.progress_window.update()

    def remove_uploaded_data(self):
        """Удаляет ранее отправленные данные с сервера."""
        try:
            payload = {'pref': self.current_pref, 'Nazvanie_Zadaniya': self.current_task_name}
            response = requests.post('https://corrywilliams.ru/delete-uploaded-data', json=payload)
            if response.status_code == 200:
                logging.info('Ранее отправленные данные успешно удалены.')
            else:
                logging.error(f'Ошибка при удалении данных: {response.text}')
                messagebox.showerror("Ошибка", f"Ошибка при удалении данных: {response.text}")
        except requests.RequestException as e:
            logging.error(f'Ошибка при удалении данных: {e}')
            messagebox.showerror("Ошибка", f"Ошибка при удалении данных: {e}")

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
            data = data.replace({np.nan: None, '': None, ' ': None})

            # # Замена всех типов данных float с 'NaN' и 'nan' на None с использованием NumPy
            # for column in data.columns:
            #     data[column] = data[column].replace({np.nan: None, 'nan': None, 'NaN': None, '': None})

            # Отображение окна прогресса
            self.show_progress_window(len(data))

            url = "https://corrywilliams.ru/upload-data"

            # Обработка каждой строки
            for index, row in data.iterrows():
                artikul_syrya_value = row.get('Артикул Сырья')
                if pd.notna(artikul_syrya_value):
                    # Проверяем, является ли значение числом с плавающей точкой
                    if isinstance(artikul_syrya_value, float) and artikul_syrya_value.is_integer():
                        artikul_syrya = str(int(artikul_syrya_value))  # Убираем .0 и преобразуем в строку
                    else:
                        artikul_syrya = str(artikul_syrya_value)  # Преобразуем в строку
                else:
                    artikul_syrya = None  # Если значение пустое, ставим None для отправки как NULL
                payload = {
                    'Artikul': row.get('Артикул'),
                    'Artikul_Syrya': artikul_syrya,  # None если отсутствует
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
                    'Op_1_Bl_1_Sht': row.get('Оп 1 бл. 1 шт') or None,
                    'Op_2_Bl_2_Sht': row.get('Оп 2 бл.2 шт') or None,
                    'Op_3_Bl_3_Sht': row.get('Оп 3 бл.3 шт') or None,
                    'Op_4_Bl_4_Sht': row.get('Оп 4 бл.4шт') or None,
                    'Op_5_Bl_5_Sht': row.get('Оп 5 бл.5 шт') or None,
                    'Op_6_Blis_6_10_Sht': row.get('Оп 6 блис.6-10шт') or None,
                    'Op_7_Pereschyot': 'V' if row.get('Оп 7 пересчет') == 'V' else None,
                    'Op_9_Fasovka_Sborka': 'V' if row.get('Оп 9 фасовка/сборка') == 'V' else None,
                    'Op_10_Markirovka_SHT': row.get('Оп 10 Маркировка ШТ') or None,
                    'Op_11_Markirovka_Prom': row.get('Оп 11 маркировка пром') or None,
                    'Op_13_Markirovka_Fabr': row.get('Оп 13 маркировка фабр') or None,
                    'Op_14_TU_1_Sht': row.get('Оп 14 ТУ 1 шт') or None,
                    'Op_15_TU_2_Sht': row.get('Оп 15 ТУ 2 шт') or None,
                    'Op_16_TU_3_5': row.get('Оп 16 ТУ 3-5') or None,
                    'Op_17_TU_6_8': row.get('Оп 17 ТУ 6-8') or None,
                    'Op_468_Proverka_SHK': 'V' if row.get('Оп 468 проверка ШК') == 'V' else None,
                    'Op_469_Spetsifikatsiya_TM': 'V' if row.get('Оп 469 Спецификация ТМ') == 'V' else None,
                    'Op_470_Dop_Upakovka': row.get('Оп 470 доп упаковка') or None,
                    'Mesto': row.get('Место'),
                    'Vlozhennost': row.get('Вложенность'),
                    'Pallet_No': row.get('Паллет №'),
                    'pref': pref,
                    'Scklad_Pref': selected_sklad,
                    'Status': 0,
                    'Status_Zadaniya': 0,
                    'Nazvanie_Zadaniya': file_name
                }

                # Пытаемся отправить строку на сервер до успешного завершения
                success = False
                while not success:
                    try:
                        response = requests.post(url, json=payload, timeout=75, verify=True)
                        if response.status_code == 200:
                            logging.info(f'Строка {index + 1} успешно загружена.')
                            logging.info(f'{payload}')

                            success = True  # Успешная отправка
                        else:
                            logging.error(f'Ошибка при загрузке строки {index + 1}: {response.text}')
                            time.sleep(2)  # Ожидание перед повтором

                    except requests.exceptions.RequestException as e:
                        logging.error(f'Ошибка при загрузке строки {index + 1}: {e}')
                        time.sleep(2)  # Ожидание перед повтором

                # Обновляем прогресс
                self.update_progress(index + 1)
                time.sleep(0.5)

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
        """Download data from the server and process for saving to Excel."""
        selected_task = self.files_listbox.get(tk.ACTIVE)
        if not selected_task:
            messagebox.showwarning("Warning", "Please select a task.")
            return

        column_names = self.get_column_names()

        try:
            response = requests.get(f'https://corrywilliams.ru/download?task={selected_task}', stream=True)
            response.raise_for_status()

            # Process WB-specific data
            if "WB" in selected_task:
                json_data = response.json()
                data_set1 = pd.DataFrame(json_data.get('dataSet1', []))
                data_set2 = pd.DataFrame(json_data.get('dataSet2', []))

                # Check if data_set1 has required data
                if not data_set1.empty:
                    # Check column names before processing
                    print("Columns in data_set1:", data_set1.columns.tolist())
                    # Calculate full report
                    data_set2 = self.calculate_full_report(data_set1, data_set2)

                    # Save to Excel
                    self.save_multiple_sheets_to_excel(data_set1, data_set2, selected_task, column_names)
                else:
                    messagebox.showwarning("Warning", "No data available.")
            else:
                # Handle non-WB tasks
                json_data = response.json()
                data_set1 = pd.DataFrame(json_data.get('dataSet1', []))
                if not data_set1.empty:
                    self.save_to_excel(data_set1, selected_task, column_names)
                else:
                    messagebox.showwarning("Warning", "No data available.")

        except requests.RequestException as e:
            logging.error(f'Error downloading file: {e}')
            messagebox.showerror("Error", f"Error downloading file: {e}")

    def standardize_column_names(self, df, name_mappings):
        """Renames columns in a DataFrame based on a provided mapping."""
        # Rename columns based on the mappings
        for standard_name, possible_names in name_mappings.items():
            for name in possible_names:
                if name in df.columns:
                    df.rename(columns={name: standard_name}, inplace=True)
                    break  # Stop once a match is found

    def calculate_full_report(self, sheet1, sheet2):
        """Calculate and update the second sheet based on the first sheet's data."""

        # Define mappings for standardized column names
        column_mappings = {
            'Artikul': ['Артикул', 'Artikul'],
            'Kolvo_Tovarov': ['Kolvo_Tovarov', 'Количество товаров'],
            'Pallet_No': ['Паллет №', 'Pallet_No'],
            'Vlozhennost': ['Вложенность'],
            'Mesto': ['Место']
        }

        # Standardize column names in both sheets
        self.standardize_column_names(sheet1, column_mappings)
        self.standardize_column_names(sheet2, column_mappings)

        # Verify required columns in both sheets
        required_columns = ['Artikul', 'Kolvo_Tovarov', 'Pallet_No']
        missing_columns = [col for col in required_columns if col not in sheet1.columns]

        if missing_columns:
            logging.error(f"Missing columns in sheet1 after renaming: {missing_columns}")
            messagebox.showerror("Error", f"Missing columns in sheet1: {missing_columns}")
            return sheet2  # Return unmodified sheet2 if there are missing columns

        # Group by standardized column names
        grouped_data = sheet1.groupby(['Artikul', 'Kolvo_Tovarov', 'Pallet_No']).size().reset_index(
            name='Количество записей')

        new_rows = []
        for _, row in grouped_data.iterrows():
            arkt = row['Artikul']
            kolvo = row['Kolvo_Tovarov']
            mesto = row['Количество записей']
            pallet = row['Pallet_No']

            # Check for existing matches in standardized sheet2
            matches = sheet2[(sheet2['Artikul'] == arkt) & (sheet2['Vlozhennost'] == kolvo)]
            if not matches.empty:
                # Update existing row
                sheet2.loc[(sheet2['Artikul'] == arkt) & (sheet2['Vlozhennost'] == kolvo), ['Mesto', 'Pallet_No']] = [
                    mesto, pallet]
            else:
                # Add new rows for unmatched items
                matches_for_copy = sheet2[sheet2['Artikul'] == arkt]
                if not matches_for_copy.empty:
                    for _, match in matches_for_copy.iterrows():
                        new_row = match.copy()
                        new_row['Vlozhennost'] = kolvo
                        new_row['Mesto'] = mesto
                        new_row['Pallet_No'] = pallet
                        new_rows.append(new_row)

        # Append new rows if there are any
        if new_rows:
            sheet2 = pd.concat([sheet2, pd.DataFrame(new_rows)], ignore_index=True)
        return sheet2

    def save_multiple_sheets_to_excel(self, data_set1, data_set2, task_name, column_names):
        """Save two DataFrames into an Excel file on separate sheets."""
        data_set1.rename(columns=column_names, inplace=True)
        data_set2.rename(columns=column_names, inplace=True)

        downloads_path = os.path.join(os.getenv('USERPROFILE') if os.name == 'nt' else os.path.expanduser('~'), 'Downloads')
        local_file_path = os.path.join(downloads_path, f"{task_name}.xlsx")

        with pd.ExcelWriter(local_file_path, engine='xlsxwriter') as writer:
            data_set1.to_excel(writer, sheet_name='Краткий отчет', index=False)
            data_set2.to_excel(writer, sheet_name='Полный отчет', index=False)

        messagebox.showinfo("Success", f"File saved to {local_file_path}.")
        logging.info(f'File saved at {local_file_path}.')

    def get_column_names(self):
        """Return a dictionary for renaming columns to Russian."""
        return {
            "Nazvanie_Zadaniya": "Название задания", "Artikul": "Артикул", "Kolvo_Tovarov": "Количество товаров",
            "Pallet_No": "Паллет №", "Mesto": "Место", "Vlozhennost": "Вложенность", "SHK_WPS": "ШК WPS"
        }

    def save_to_excel(self, data, task_name, column_names):
        """Save a DataFrame to an Excel file."""
        data.rename(columns=column_names, inplace=True)
        downloads_path = os.path.join(os.getenv('USERPROFILE') if os.name == 'nt' else os.path.expanduser('~'), 'Downloads')
        local_file_path = os.path.join(downloads_path, f"{task_name}.xlsx")
        data.to_excel(local_file_path, index=False)
        messagebox.showinfo("Success", f"File saved to {local_file_path}.")
        logging.info(f'File saved at {local_file_path}.')


# Запуск приложения
if __name__ == "__main__":
    root = tk.Tk()
    app = FileUploaderApp(root)
    root.mainloop()
