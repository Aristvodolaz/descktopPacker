import os
import sys
from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QProgressBar, QComboBox, \
    QLabel, QListWidget, QTabWidget, QFileDialog, QMessageBox, QListWidgetItem, QDialog
from PyQt5.QtCore import Qt, QPropertyAnimation, QRect, QThread, pyqtSignal
from PyQt5.QtGui import QFont, QColor
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
import logging

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')



class FileUploaderApp(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Packer Desktop")
        self.setGeometry(100, 100, 900, 750)
        self.setStyleSheet("""
            background-color: #ecf0f1;  # светлый фон
            color: #2c3e50;  # темный текст для контраста
            border-radius: 10px;
        """)

        self.init_ui()

    def init_ui(self):
        main_layout = QVBoxLayout()

        # Заголовок
        title_font = QFont('Verdana', 28, QFont.Bold)
        title_label = QLabel("Packer Desktop")
        title_label.setFont(title_font)
        title_label.setAlignment(Qt.AlignCenter)
        title_label.setStyleSheet("""
            color: #2980b9;  # синий для заголовка
            font-size: 28px; 
            font-weight: bold;
        """)
        main_layout.addWidget(title_label)

        # Описание
        description_label = QLabel("Выберите файл для загрузки")
        description_label.setFont(QFont('Verdana', 16))
        description_label.setAlignment(Qt.AlignCenter)
        description_label.setStyleSheet("color: #BDC3C7;")
        main_layout.addWidget(description_label)

        # Выпадающий список (ComboBox) для выбора склада
        self.sklad_label = QLabel("Выберите склад:")
        self.sklad_label.setFont(QFont('Verdana', 18, QFont.Bold))  # Используем более крупный и жирный шрифт
        self.sklad_label.setAlignment(Qt.AlignLeft)
        self.sklad_label.setStyleSheet("""
                    margin-top: 12px;
                   color: #2980b9;  
                   font-size: 18px;
                   font-weight: bold;  
                   text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);  
               
                   background-color: transparent;  
               """)
        self.sklad_combobox = QComboBox()
        # Стиль для выпадающего списка (ComboBox)
        self.sklad_combobox.setStyleSheet("""
            QComboBox {
            margin-bottom: 8px;
                 margin-top: 10px;
                background-color: #ffffff;
                color: #2c3e50;
                border: 1px solid #3498db;
                border-radius: 5px;
                padding: 5px 10px;
                font-size: 16px;
            }
            QComboBox:editable {
                background: #ffffff;
            }
            QComboBox:hover {
                border: 1px solid #2980b9;
            }
            QComboBox::drop-down {
                border: none;
            }
            QComboBox QAbstractItemView {
                background-color: #ecf0f1;
                border: 1px solid #2980b9;
                selection-background-color: #2980b9;
                color: #2c3e50;
            }
        """)



        self.load_sklad_options()

        sklad_layout = QHBoxLayout()
        sklad_layout.addWidget(self.sklad_label)
        sklad_layout.addWidget(self.sklad_combobox)
        main_layout.addLayout(sklad_layout)

        # Создаем вкладки
        self.tabs = QTabWidget()
        self.tabs.setStyleSheet("""
            QTabWidget::pane { 
                border: 1px solid #2980b9; 
                background: #ffffff;
            }
            QTabBar::tab { 
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #3498db, stop:1 #2980b9); 
                color: white; 
                padding: 16px 30px; 
                font-size: 16px;
                min-width: 120px;
                min-height: 24px;  
                box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1); 
            }
            QTabBar::tab:selected { 
                font-weight: bold;
                background:  #2980b9;
                box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.2); 
            }
            QTabBar::tab:hover { 
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #1abc9c, stop:1 #16a085); 
                box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);  
            }
        """)

        self.in_progress_tab = QWidget()
        self.completed_tab = QWidget()
        self.uploaded_tab = QWidget()

        self.tabs.addTab(self.in_progress_tab, "Выполняемые")
        self.tabs.addTab(self.completed_tab, "Завершенные")
        self.tabs.addTab(self.uploaded_tab, "Загруженные")

        # Создаем лейауты для вкладок
        self.in_progress_list = QListWidget()

        self.in_progress_list.setStyleSheet("""
            background-color: #ffffff;  
            color: #2c3e50;  
            padding: 2px; 
              border: none;
            border-radius: 8px;
        """)
        self.in_progress_tab.setLayout(QVBoxLayout())
        self.in_progress_tab.layout().addWidget(self.in_progress_list)

        self.completed_list = QListWidget()
        self.completed_list.setStyleSheet("""
            background-color: #ffffff;  
            color: #2c3e50;  
            padding: 2px; 
            border: none;
            border-radius: 8px;
        """)
        self.completed_tab.setLayout(QVBoxLayout())
        self.completed_tab.layout().addWidget(self.completed_list)

        self.uploaded_list = QListWidget()
        self.uploaded_list.setStyleSheet("""
            background-color: #ffffff;  
            color: #2c3e50;  
            padding: 2px; 
              border: none;
            border-radius: 8px;
        """)

        self.uploaded_tab.setLayout(QVBoxLayout())
        self.uploaded_tab.layout().addWidget(self.uploaded_list)

        main_layout.addWidget(self.tabs)

        # Кнопка для загрузки файла
        self.upload_button = self.create_button("Загрузить файл", "#3498db")
        self.upload_button.clicked.connect(self.upload_file)
        main_layout.addWidget(self.upload_button)

        # Кнопка для скачивания файла
        self.download_button = self.create_button("Скачать файл", "#e67e22")
        self.download_button.clicked.connect(self.download_file)
        main_layout.addWidget(self.download_button)

        # Прогресс бар
        self.progress_bar = QProgressBar()
        self.progress_bar.setMaximum(100)
        self.progress_bar.setStyleSheet(
            "QProgressBar { font-size: 16px; height: 25px; background: #ecf0f1; border-radius: 10px; }")
        main_layout.addWidget(self.progress_bar)

        self.setLayout(main_layout)

        # Привязываем вкладки к функциям
        self.tabs.currentChanged.connect(self.on_tab_change)
        self.load_in_progress_tasks()
        self.cancel_upload = False

    # Кнопки
    def create_button(self, text, color):
        """Создает кнопку с плавной анимацией и стильной цветовой схемой."""
        button = QPushButton(text)
        button.setStyleSheet(f"""
            background-color: {color}; 
            color: white; 
            padding: 15px 30px; 
            font-size: 18px; 
            border-radius: 10px;
            min-width: 200px;
               min-height: 36px;
        """)
        button.setFixedHeight(50)
        return button


    def load_sklad_options(self):
        """Запрос к серверу для получения списка складов и загрузка их в ComboBox."""
        try:
            logging.debug("Загружаем список складов...")
            response = requests.get('https://corrywilliams.ru/sklads')
            response.raise_for_status()  # Вызывает ошибку при неуспешном статусе
            sklads = response.json().get('sklads', [])
            if sklads:
                self.sklad_combobox.addItems(sklads)
                logging.info('Список складов успешно загружен.')
            else:
                logging.warning('Пустой список складов.')
                QMessageBox.warning(self, "Предупреждение", "Список складов пуст.")
        except requests.RequestException as e:
            logging.error(f'Ошибка при подключении к серверу: {e}')
            QMessageBox.critical(self, "Ошибка", f"Ошибка при подключении к серверу: {e}")

    def on_tab_change(self, index):
        """Обрабатывает смену вкладок."""
        if index == 0:
            logging.debug("Вкладка 'Выполняемые' выбрана")
            self.load_in_progress_tasks()
        elif index == 1:
            logging.debug("Вкладка 'Завершенные' выбрана")
            self.load_completed_tasks()
        elif index == 2:
            logging.debug("Вкладка 'Загруженные' выбрана")
            self.load_uploaded_tasks()

    def update_task_list(self, list_widget, tasks):
        """Обновляет содержимое списка заданий."""
        list_widget.clear()
        if tasks:
            for task in tasks:
                list_widget.addItem(f"{task}")
        else:
            list_widget.addItem("Нет заданий для отображения.")

    def load_in_progress_tasks(self):
        """Запрашивает список выполняемых заданий с сервера и обновляет список."""
        try:
            response = requests.get('https://corrywilliams.ru/tasks-in-progress')
            response.raise_for_status()
            tasks_in_progress = response.json().get('tasksInProgress', [])

            if tasks_in_progress:
                # Clear the current list first
                self.in_progress_list.clear()

                for task in tasks_in_progress:
                    task_name = task.get("Nazvanie_Zadaniya")
                    progress = float(task.get("Progress", 0))  # Convert progress to a float
                    total_tasks = task.get("TotalTasks", 0)
                    completed_tasks = task.get("CompletedTasks", 0)

                    # Creating the list item with the task name
                    item = f"{task_name} - Прогресс: {progress}% ({completed_tasks}/{total_tasks} выполнено)"
                    list_item = QListWidgetItem(item)

                    # Adding the item to the list widget
                    self.in_progress_list.addItem(list_item)

                    # Optionally, you can also add a progress bar for each task here


            else:
                self.in_progress_list.addItem("Нет выполняемых заданий.")

        except requests.RequestException as e:
            logging.error(f'Ошибка при загрузке выполняемых заданий: {e}')
            QMessageBox.critical(self, "Ошибка", f"Ошибка при загрузке выполняемых заданий: {e}")

    def load_completed_tasks(self):
        """Запрашивает список выполненных заданий с сервера и обновляет список."""
        try:
            response = requests.get('https://corrywilliams.ru/completed-tasks')
            response.raise_for_status()
            tasks = response.json().get('tasks', [])
            self.update_task_list(self.completed_list, tasks)
        except requests.RequestException as e:
            logging.error(f'Ошибка при загрузке выполненных заданий: {e}')
            QMessageBox.critical(self, "Ошибка", f"Ошибка при загрузке выполненных заданий: {e}")

    def get_column_names(self):
        """Return a dictionary for renaming columns to Russian."""
        return {
            "Nazvanie_Zadaniya": "Название задания", "Artikul": "Артикул", "Kolvo_Tovarov": "Количество товаров",
            "Pallet_No": "Паллет №", "Mesto": "Место", "Vlozhennost": "Вложенность", "SHK_WPS": "ШК WPS"
        }

    def load_uploaded_tasks(self):
        """Запрашивает список загруженных заданий с сервера и обновляет список."""
        try:
            response = requests.get('https://corrywilliams.ru/uploaded-tasks')
            response.raise_for_status()
            tasks = response.json().get('tasks', [])
            self.update_task_list(self.uploaded_list, tasks)
        except requests.RequestException as e:
            logging.error(f'Ошибка при загрузке загруженных заданий: {e}')
            QMessageBox.critical(self, "Ошибка", f"Ошибка при загрузке загруженных заданий: {e}")

    def process_op_column_value(self, value):
        """
        Обрабатывает значение ячейки:
        - Если значение число, возвращает его как есть.
        - Если значение равно 'V', возвращает 1.
        - Если значение текст и не равно 'V', возвращает 'V'.
        - Если значение пустое или None, возвращает None.
        """
        if value is not None:  # Если значение не пустое
            value_str = str(value).strip()  # Преобразуем в строку и удаляем пробелы
            if value_str.isdigit():  # Если это целое число
                return int(value_str)  # Возвращаем как целое число
            try:
                # Если это число с плавающей точкой
                float_value = float(value_str)
                return float_value
            except ValueError:
                pass
            if value_str == 'V':  # Если значение равно 'V'
                return 1
            return 'V'  # Если текст и не 'V', возвращаем 'V'
        return value  # Если значение пустое, возвращаем как есть

    def cancel_upload_process(self):
        """Обрабатывает отмену загрузки и удаляет загруженные файлы на бэке."""
        self.cancel_upload = True  # Флаг отмены загрузки
        self.progress_window.destroy()
        self.remove_uploaded_data()

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
        selected_sklad = self.sklad_combobox.currentText()
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
            # data = data.replace({np.nan: None, '': None, ' ': None})

            # # Замена всех типов данных float с 'NaN' и 'nan' на None с использованием NumPy
            for column in data.columns:
                data[column] = data[column].replace(
                    {np.nan: None, 'nan': None, 'NaN': None, '': None, ' ': None, '  ': None, '   ': None})

            # Отображение окна прогресса
            print(len(data))
            # self.progress_window = ProgressWindow(self, max_value=len(data))
            self.progress_window = ProgressWindow(self, max_value=len(data))
            self.progress_window.show()

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
                    'Op_1_Bl_1_Sht': self.process_op_column_value(row.get('Оп 1 бл. 1 шт')),
                    'Op_2_Bl_2_Sht': self.process_op_column_value(row.get('Оп 2 бл.2 шт')),
                    'Op_3_Bl_3_Sht': self.process_op_column_value(row.get('Оп 3 бл.3 шт')),
                    'Op_4_Bl_4_Sht': self.process_op_column_value(row.get('Оп 4 бл.4шт')),
                    'Op_5_Bl_5_Sht': self.process_op_column_value(row.get('Оп 5 бл.5 шт')),
                    'Op_6_Blis_6_10_Sht': self.process_op_column_value(row.get('Оп 6 блис.6-10шт')),
                    'Op_7_Pereschyot': self.process_op_column_value(row.get('Оп 7 пересчет')),
                    'Op_9_Fasovka_Sborka': self.process_op_column_value(row.get('Оп 9 фасовка/сборка')),
                    'Op_10_Markirovka_SHT': self.process_op_column_value(row.get('Оп 10 Маркировка ШТ')),
                    'Op_11_Markirovka_Prom': self.process_op_column_value(row.get('Оп 11 маркировка пром')),
                    'Op_13_Markirovka_Fabr': self.process_op_column_value(row.get('Оп 13 маркировка фабр')),
                    'Op_14_TU_1_Sht': self.process_op_column_value(row.get('Оп 14 ТУ 1 шт')),
                    'Op_15_TU_2_Sht': self.process_op_column_value(row.get('Оп 15 ТУ 2 шт')),
                    'Op_16_TU_3_5': self.process_op_column_value(row.get('Оп 16 ТУ 3-5')),
                    'Op_17_TU_6_8': self.process_op_column_value(row.get('Оп 17 ТУ 6-8')),
                    'Op_468_Proverka_SHK': self.process_op_column_value(row.get('Оп 468 проверка ШК')),
                    'Op_469_Spetsifikatsiya_TM': self.process_op_column_value(row.get('Оп 469 Спецификация ТМ')),
                    'Op_470_Dop_Upakovka': self.process_op_column_value(row.get('Оп 470 доп упаковка')),
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
                self.progress_window.update_progress(index+1)  # current_value - это текущий прогресс
                QApplication.processEvents()

            # Закрываем окно прогресса после завершения
            self.progress_window.close()
            messagebox.showinfo("Успех", "Файл успешно загружен построчно.")
        except Exception as e:
            logging.error(f'Ошибка при загрузке файла: {e}')
            messagebox.showerror("Ошибка", f"Ошибка при загрузке файла: {e}")

    def download_file(self):
        """Download data from the server and process for saving to Excel."""

        # Get the selected task from the QListWidget
        selected_item = self.uploaded_list.curr

        # Debugging: print the selected item to verify it is correct
        if selected_item:
            print(f"Selected item: {selected_item.text()}")
        else:
            print("No item selected!")

        if not selected_item:
            QMessageBox.warning(self, "Warning", "Please select a task.")
            return

        selected_task = selected_item.text()  # Get the task name

        # Debugging: confirm that the task is selected correctly
        print(f"Selected task: {selected_task}")  # You can remove this once it works

        # Ensure there's actually a valid task selected
        if selected_task.strip() == "":
            QMessageBox.warning(self, "Warning", "The selected task is empty or invalid.")
            return

        column_names = self.get_column_names()

        try:
            # Log the task being downloaded
            logging.debug(f"Downloading data for task: {selected_task}")
            response = requests.get(f'https://corrywilliams.ru/download?task={selected_task}', stream=True)

            # Check if the response is valid
            if response.status_code != 200:
                logging.error(f"Failed to download file for task {selected_task}: {response.status_code}")
                QMessageBox.showerror("Error", f"Failed to download the file. Server returned: {response.status_code}")
                return

            try:
                json_data = response.json()
            except ValueError as e:
                logging.error(f"Failed to parse JSON response: {e}")
                QMessageBox.showerror("Error",
                                      "Failed to parse the server response. The response is not in JSON format.")
                return

            # Process WB-specific data
            if "WB" in selected_task:
                data_set1 = pd.DataFrame(json_data.get('dataSet1', []))
                data_set2 = pd.DataFrame(json_data.get('dataSet2', []))

                # Check if data_set1 has required data
                if not data_set1.empty:
                    # Verify required columns before processing
                    required_columns = ['Artikul', 'Kolvo_Tovarov', 'Pallet_No']
                    missing_columns = [col for col in required_columns if col not in data_set1.columns]
                    if missing_columns:
                        logging.error(f"Missing required columns in data_set1: {missing_columns}")
                        QMessageBox.showerror("Error", f"Missing required columns in data_set1: {missing_columns}")
                        return

                    # Calculate full report
                    data_set2 = self.calculate_full_report(data_set1, data_set2)

                    # Save to Excel
                    self.save_multiple_sheets_to_excel(data_set1, data_set2, selected_task, column_names)
                else:
                    QMessageBox.warning(self, "Warning", "No data available.")
            else:
                # Handle non-WB tasks
                data_set1 = pd.DataFrame(json_data.get('dataSet1', []))
                if not data_set1.empty:
                    self.save_to_excel(data_set1, selected_task, column_names)
                else:
                    QMessageBox.warning(self, "Warning", "No data available.")

        except requests.RequestException as e:
            logging.error(f'Error downloading file: {e}')
            QMessageBox.showerror("Error", f"Error downloading file: {e}")

    def standardize_column_names(self, df, name_mappings):
        """Renames columns in a DataFrame based on a provided mapping."""
        # Rename columns based on the mappings
        for standard_name, possible_names in name_mappings.items():
            for name in possible_names:
                if name in df.columns:
                    df.rename(columns={name: standard_name}, inplace=True)
                    break  # Stop once a match is found

    def calculate_full_report(self, sheet1, sheet2):
        """Calculate and update the second sheet based on the first sheet's data, then remove redundant rows."""

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

        # Remove redundant rows: rows with empty Mesto, Vlozhennost, and Pallet_No
        # if the same Artikul already has non-empty values
        for artikul in sheet2['Artikul'].unique():
            # Check if there are both filled and empty rows for this Artikul
            rows_with_values = sheet2[(sheet2['Artikul'] == artikul) &
                                      sheet2[['Mesto', 'Vlozhennost', 'Pallet_No']].notna().all(axis=1)]
            rows_without_values = sheet2[(sheet2['Artikul'] == artikul) &
                                         sheet2[['Mesto', 'Vlozhennost', 'Pallet_No']].isna().all(axis=1)]

            # Drop rows without values if there are rows with values
            if not rows_with_values.empty and not rows_without_values.empty:
                sheet2.drop(rows_without_values.index, inplace=True)

        return sheet2

    def save_to_excel(self, data, task_name, column_names):
        """Save a DataFrame to an Excel file."""
        data.rename(columns=column_names, inplace=True)
        downloads_path = os.path.join(os.getenv('USERPROFILE') if os.name == 'nt' else os.path.expanduser('~'), 'Downloads')
        local_file_path = os.path.join(downloads_path, f"{task_name}")
        data.to_excel(local_file_path, index=False)
        messagebox.showinfo("Успешно", f"Файл успешно сохранен {local_file_path}.")
        logging.info(f'File saved at {local_file_path}.')

    def download_file(self):
        """Download data from the server and process for saving to Excel."""

        # Get the selected task from the QListWidget
        selected_item = self.completed_list.currentItem()
        if not selected_item:
            QMessageBox.warning(self, "Ошибка", "Пожалуйста, выберите задание!")
            return
        selected_task = selected_item.text()  # Get the task name

        column_names = self.get_column_names()

        try:
            # Log the task being downloaded
            logging.debug(f"Downloading data for task: {selected_task}")
            response = requests.get(f'https://corrywilliams.ru/download?task={selected_task}', stream=True)

            # Check if the response is valid
            if response.status_code != 200:
                logging.error(f"Failed to download file for task {selected_task}: {response.status_code}")
                QMessageBox.showerror("Ошибка", f"Ошибка в загрузке файла: {response.status_code}")
                return

            try:
                json_data = response.json()
            except ValueError as e:
                logging.error(f"Failed to parse JSON response: {e}")
                QMessageBox.showerror("Ошибка",
                                      "Ошибка получения ответа от сервера, проблема JSON формата")
                return

            # Process WB-specific data
            if "WB" in selected_task:
                data_set1 = pd.DataFrame(json_data.get('dataSet1', []))
                data_set2 = pd.DataFrame(json_data.get('dataSet2', []))

                # Check if data_set1 has required data
                if not data_set1.empty:
                    # Verify required columns before processing
                    required_columns = ['Artikul', 'Kolvo_Tovarov', 'Pallet_No']
                    missing_columns = [col for col in required_columns if col not in data_set1.columns]
                    if missing_columns:
                        logging.error(f"Missing required columns in data_set1: {missing_columns}")
                        QMessageBox.showerror("Error", f"Missing required columns in data_set1: {missing_columns}")
                        return

                    # Calculate full report
                    data_set2 = self.calculate_full_report(data_set1, data_set2)

                    # Save to Excel
                    self.save_multiple_sheets_to_excel(data_set1, data_set2, selected_task, column_names)
                else:
                    QMessageBox.warning(self, "Warning", "No data available.")
            else:
                # Handle non-WB tasks
                data_set1 = pd.DataFrame(json_data.get('dataSet1', []))
                if not data_set1.empty:
                    self.save_to_excel(data_set1, selected_task, column_names)
                else:
                    QMessageBox.warning(self, "Warning", "No data available.")

        except requests.RequestException as e:
            logging.error(f'Error downloading file: {e}')
            QMessageBox.showerror("Ошибка", f"Ошибка скачивания файла: {e}")

    def save_multiple_sheets_to_excel(self, data_set1, data_set2, task_name, column_names):
        """Save two DataFrames into an Excel file on separate sheets, filtering out rows with missing data on the first sheet."""

        # Переименуем столбцы для первого и второго листов
        data_set1.rename(columns=column_names, inplace=True)
        data_set2.rename(columns=column_names, inplace=True)

        # Удаляем строки на первом листе, где отсутствуют значения в "Количество товаров" и "Паллет №"
        filtered_data_set1 = data_set1.dropna(subset=["Количество товаров", "Паллет №"])

        # Определяем путь для сохранения файла
        downloads_path = os.path.join(os.getenv('USERPROFILE') if os.name == 'nt' else os.path.expanduser('~'),
                                      'Downloads')
        local_file_path = os.path.join(downloads_path, f"{task_name}")

        # Записываем данные в Excel с двумя листами
        with pd.ExcelWriter(local_file_path, engine='xlsxwriter') as writer:
            filtered_data_set1.to_excel(writer, sheet_name='Краткий отчет', index=False)
            data_set2.to_excel(writer, sheet_name='Полный отчет', index=False)

        # Информация о завершении
        messagebox.showinfo("Успешно", f"Файл сохранен {local_file_path}.")
        logging.info(f'File saved at {local_file_path}.')



class ProgressWindow(QDialog):
    def __init__(self, parent, max_value):
        super().__init__(parent)
        self.setWindowTitle("Загрузка данных")
        self.setGeometry(100, 100, 300, 150)

        self.layout = QVBoxLayout()

        self.progress_label = QLabel("Загрузка, пожалуйста, подождите...")
        self.layout.addWidget(self.progress_label)

        self.progress_bar = QProgressBar(self)
        self.progress_bar.setMaximum(max_value)
        self.progress_bar.setValue(0)
        self.layout.addWidget(self.progress_bar)

        # self.cancel_button = QPushButton("Отменить", self)
        # self.cancel_button.clicked.connect(self.cancel_upload_process)
        # self.layout.addWidget(self.cancel_button)

        self.setLayout(self.layout)
        self.setWindowModality(Qt.ApplicationModal)

    def update_progress(self, value):
        """Обновление прогресса."""
        self.progress_bar.setValue(value)

    def cancel_upload_process(self):
        """Отменяет процесс загрузки."""
        self.close()

    def cancel_upload_process(self, pref, nazvanie):


        url = "https://corrywilliams.ru/delete-uploaded-data"
        data = {
            "pref": pref,
            "Nazvanie_Zadaniya": nazvanie
        }

        try:
            response = requests.post(url, json=data)

            if response.status_code == 200:
                QMessageBox.information(self, "Успех", "Данные успешно удалены.")
            else:
                QMessageBox.warning(self, "Ошибка", response.json().get('message', 'Не удалось удалить данные.'))

        except requests.RequestException as e:
            QMessageBox.critical(self, "Ошибка", f"Ошибка при удалении данных: {e}")
# Запуск приложения
if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = FileUploaderApp()
    window.show()
    sys.exit(app.exec_())
