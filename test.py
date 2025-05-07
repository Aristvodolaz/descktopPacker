import sys
from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QProgressBar, QComboBox, \
    QLabel, QListWidget, QTabWidget, QMessageBox, QListWidgetItem, QDialog, QLineEdit
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont
import os
from tkinter import filedialog, messagebox
import requests
import pandas as pd
import numpy as np
import time
import logging

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')



class FileUploaderApp(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Packer Desktop")
        self.setGeometry(100, 100, 900, 750)
        self.setStyleSheet("""
            background-color: #ecf0f1;  
            color: #2c3e50;  
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
            color: #2980b9;  
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

        self.in_progress_tab = self.create_tab_with_search("Выполняемые")
        self.completed_tab = self.create_tab_with_search("Завершенные")
        self.uploaded_tab = self.create_tab_with_search("Загруженные")

        # Добавляем виджеты вкладок в QTabWidget
        self.tabs.addTab(self.in_progress_tab["widget"], "Выполняемые")
        self.tabs.addTab(self.completed_tab["widget"], "Завершенные")
        self.tabs.addTab(self.uploaded_tab["widget"], "Загруженные")

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

    def init_expiry_tab(self):
        """Инициализация вкладки для сроков годности."""
        layout = QVBoxLayout()

        # Поле для ввода артикула
        self.artikul_input = QLineEdit()
        self.artikul_input.setPlaceholderText("Введите артикул")
        self.artikul_input.setStyleSheet("""
            QLineEdit {
                background-color: #ffffff;
                border: 1px solid #3498db;
                border-radius: 5px;
                padding: 5px;
                font-size: 16px;
            }
        """)
        layout.addWidget(self.artikul_input)

        # Кнопка для поиска
        self.search_button = QPushButton("Найти")
        self.search_button.setStyleSheet("""
            background-color: #3498db;
            color: white;
            padding: 10px 20px;
            font-size: 16px;
            border-radius: 5px;
        """)
        self.search_button.clicked.connect(self.fetch_expiry_data)
        layout.addWidget(self.search_button)

        # Список для отображения сроков годности
        self.expiry_list = QListWidget()
        self.expiry_list.setStyleSheet("""
            background-color: #ffffff;
            border: 1px solid #3498db;
            border-radius: 5px;
            padding: 5px;
            font-size: 16px;
        """)
        layout.addWidget(self.expiry_list)

        self.expiry_tab.setLayout(layout)

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

    def create_tab_with_search(self, label):
        """Создает вкладку с полем поиска и списком."""
        tab_widget = QWidget()
        tab_layout = QVBoxLayout()

        # Добавляем поле для поиска
        search_layout = QHBoxLayout()
        search_input = QLineEdit()
        search_input.setPlaceholderText(f"Поиск по названию в '{label}'")
        search_button = QPushButton("Поиск")

        search_layout.addWidget(search_input)
        search_layout.addWidget(search_button)
        tab_layout.addLayout(search_layout)

        # Список заданий
        task_list = QListWidget()
        task_list.itemClicked.connect(self.on_completed_task_selected)  # Подключение сигнала
        tab_layout.addWidget(task_list)

        tab_widget.setLayout(tab_layout)

        # Подключение функции поиска
        search_button.clicked.connect(lambda: self.search_in_list(search_input, task_list))

        return {"widget": tab_widget, "search_input": search_input, "task_list": task_list}

    def search_in_list(self, search_input, task_list):
        """Фильтрует список по введенному тексту."""
        query = search_input.text().lower().strip()
        for i in range(task_list.count()):
            item = task_list.item(i)
            item.setHidden(query not in item.text().lower())

    def load_sklad_options(self):
        """Запрос к серверу для получения списка складов и загрузка их в ComboBox."""
        try:
            logging.debug("Загружаем список складов...")
            response = requests.get('http://10.171.12.36:3005/sklads')
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
        try:
            if index == 0:
                logging.debug("Вкладка 'Выполняемые' выбрана")
                self.load_in_progress_tasks()
            elif index == 1:
                logging.debug("Вкладка 'Завершенные' выбрана")
                self.load_completed_tasks()
            elif index == 2:
                logging.debug("Вкладка 'Загруженные' выбрана")
                self.load_uploaded_tasks()
            elif index == 3:
                logging.debug("Вкладка 'Срок годности' выбрана")
                # Инициализация вкладки "Срок годности"
                self.init_expiry_tab()
        except Exception as e:
            logging.error(f"Ошибка при переключении вкладки: {e}")
            QMessageBox.critical(self, "Ошибка", f"Ошибка при переключении вкладки: {e}")

    def fetch_expiry_data(self):
        """Получение данных о сроках годности по артикулу."""
        artikul = self.artikul_input.text().strip()
        if not artikul:
            QMessageBox.warning(self, "Ошибка", "Пожалуйста, введите артикул.")
            return

        try:
            response = requests.get(f'http://10.171.12.36:3005/expiry-data?artikul={artikul}')
            response.raise_for_status()
            data = response.json().get('expiryData', [])

            self.expiry_list.clear()
            if data:
                for item in data:
                    expiry_info = f"Артикул: {item.get('Artikul', 'N/A')} \nСрок годности: {item.get('ExpiryDate', 'N/A')}"
                    self.expiry_list.addItem(expiry_info)
            else:
                self.expiry_list.addItem("Нет данных для отображения.")
        except requests.RequestException as e:
            logging.error(f"Ошибка при получении данных о сроках годности: {e}")
            QMessageBox.critical(self, "Ошибка", "Ошибка при подключении к серверу.")

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
            response = requests.get('http://10.171.12.36:3005/tasks-in-progress')
            response.raise_for_status()
            tasks_in_progress = response.json().get('tasksInProgress', [])

            # Получаем список задач из вкладки
            task_list = self.in_progress_tab["task_list"]
            task_list.clear()

            if tasks_in_progress:
                for task in tasks_in_progress:
                    task_name = task.get("Nazvanie_Zadaniya")
                    progress = float(task.get("Progress", 0))  # Convert progress to a float
                    total_tasks = task.get("TotalTasks", 0)
                    completed_tasks = task.get("CompletedTasks", 0)

                    # Creating the list item with the task name
                    item = f"{task_name} - Прогресс: {progress}% ({completed_tasks}/{total_tasks} выполнено)"
                    list_item = QListWidgetItem(item)

                    # Adding the item to the list widget
                    task_list.addItem(list_item)
            else:
                task_list.addItem("Нет выполняемых заданий.")
        except requests.RequestException as e:
            logging.error(f'Ошибка при загрузке выполняемых заданий: {e}')
            QMessageBox.critical(self, "Ошибка", f"Ошибка при загрузке выполняемых заданий: {e}")

    def on_completed_task_selected(self, item):
        try:
            selected_task = item.text()
            logging.debug(f"Выбранное задание: {selected_task}")
            QMessageBox.information(self, "Выбор задания", f"Вы выбрали задание: {selected_task}")
            self.download_file(selected_task)  # Передача задания для скачивания
        except Exception as e:
            logging.error(f"Ошибка в обработчике выбора задания: {e}")
            QMessageBox.critical(self, "Ошибка", f"Ошибка: {e}")

    def load_completed_tasks(self):
        """Запрашивает список выполненных заданий с сервера и обновляет список."""
        try:
            response = requests.get('http://10.171.12.36:3005/completed-tasks')
            response.raise_for_status()
            tasks = response.json().get('tasks', [])

            # Доступ к списку через словарь
            task_list = self.completed_tab["task_list"]
            task_list.clear()

            if tasks:
                for task in tasks:
                    list_item = QListWidgetItem(task)  # Добавляем задание как текст
                    task_list.addItem(list_item)
            else:
                task_list.addItem("Нет выполненных заданий.")
        except requests.RequestException as e:
            logging.error(f'Ошибка при загрузке выполненных заданий: {e}')
            QMessageBox.critical(self, "Ошибка", f"Ошибка при загрузке выполненных заданий: {e}")

    def get_column_names(self):

        return {
            'Sortiruemyi_Tovar': 'Печать этикетки с ШК',
            'Ne_Sortiruemyi_Tovar': 'Не сортируемый товар',
            'Op_16_TU_3_5': 'Упаковка в пакет с клеевым слоем',
            'Opasnyi_Tovar': 'Упаковка в пакет с замком Zip Lock',
            'Op_468_Proverka_SHK': 'Упаковка в бабл - пленку',
            'Op_1_Bl_1_Sht': 'Упаковка товара в индивидуальный короб',
            'Op_2_Bl_2_Sht': 'Пересчет товара',
            'Op_3_Bl_3_Sht': 'Фасовка/сборка монотовара в короб',
            'Op_4_Bl_4_Sht': 'Маркировка товара стикером',
            'Op_5_Bl_5_Sht': 'Маркировка транспортного короба',
            'Op_6_Blis_6_10_Sht': 'Маркировка паллета (транспортного модуля)',
            'Op_7_Pereschyot': 'Удаление стикера/маркировки с товара',
            'Op_9_Fasovka_Sborka': 'Термоупаковка товара',
            'Op_10_Markirovka_SHT': 'Разбор товара (для маркетплейсов)',
            'Op_11_Markirovka_Prom': 'Подготовка транспортного паллета к отгрузке',
            'Op_13_Markirovka_Fabr': 'Раскомплект заказа (полный/частичный)',
            'Produkty': 'Продукты',
            'Op_17_TU_6_8': 'Опасный товар',
            'Zakrytaya_Zona': 'Закрытая зона',
            'Op_469_Spetsifikatsiya_TM': 'Спецификация ТМ (для маркетплейсов)',
            'Op_470_Dop_Upakovka': 'Проверка штрих-кода / срока годности',
            'Krupnogabaritnyi_Tovar': 'Крупногабаритный товар',
            'Yuvelirnye_Izdelia': 'Ювелирные изделия',
            'Upakovka_v_Gofro': 'Тип операции',
            'Upakovka_v_PE_Paket': 'Упаковка товара в п/э пакет',
            'PriznakSortirovki': 'Сортируемый товар',
            'Nomenklatura': 'Номенклатура',
            'Nazvanie_Zadaniya': 'Название задания',
            'Vlozhit_v_upakovku_pechatnyi_material': 'Вложить в упаковку печатный материал',
            'Izmerenie_VGH_i_peredacha_informatsii': 'Измерение ВГХ и передача информации',
            'Indeks_za_srochnost_koeff_1_5': 'Индекс за срочность (коэффициент 1,5)',
            'Prochie_raboty_vklyuchaya_ustranenie_anomalii': 'Прочие работы (в т.ч. устранение аномалий)',
            'Sborka_naborov_ot_2_shtuk_raznykh_tovarov': 'Сборка наборов (комплектов) от 2-х штук разных товаров',
            'Upakovka_tovara_v_gofromeyler': 'Упаковка товара в гофромейлер',
            'Khranenie_tovara': 'Хранение товара',
            'Artikul': 'Артикул',
            'Kolvo_Tovarov': 'Количество товаров',
            'Pallet_No': 'Паллет №',
            'Mesto': 'Место',
            'Vlozhennost': 'Вложенность',
            'SHK_WPS': 'ШК WPS'
        }

    def get_download_column_names(self):
        return {
            "vp": "ВП",
            "Nazvanie_Zadaniya": "Название задания",
            "Artikul": "Артикул",
            "Artikul_Syrya": "Артикул Сырья",
            "Nazvanie_Tovara": "Название товара",
            "SHK": "ШК",
            "SHK_Syrya": "ШК Сырья",
            "Kol_vo_Syrya": "Кол-во сырья",
            "Itog_Zakaz": "Итог Заказ",
            "Itog_MP": "Итог МП",
            "SOH": "СОХ",
            "Srok_Godnosti": "Срок Годности",
            'Sortiruemyi_Tovar': 'Печать этикетки с ШК',
            'Ne_Sortiruemyi_Tovar': 'Не сортируемый товар',
            "Opasnyi_Tovar": "Упаковка в пакет с замком Zip Lock",
            "Op_468_Proverka_SHK": "Упаковка в бабл - пленку",
            "Krupnogabaritnyi_Tovar": "Крупногабаритный товар",
            "Yuvelirnye_Izdelia": "Ювелирные изделия",
            "Fakticheskoe_Kol_vo": "Фактическое количество",
            "Ubrano_iz_Zakaza": "Убрано из заказа",
            "Op_1_Bl_1_Sht": "Упаковка товара в индивидуальный короб",
            "Op_2_Bl_2_Sht": "Пересчет товара",
            "Op_3_Bl_3_Sht": "Фасовка/сборка монотовара в короб",
            "Op_4_Bl_4_Sht": "Маркировка товара стикером",
            "Op_5_Bl_5_Sht": "Маркировка транспортного короба",
            "Op_6_Blis_6_10_Sht": "Маркировка паллета (транспортного модуля)",
            "Op_7_Pereschyot": "Удаление стикера/маркировки с товара",
            "Op_9_Fasovka_Sborka": "Термоупаковка товара",
            "Op_10_Markirovka_SHT": "Разбор товара (для маркетплейсов)",
            "Op_11_Markirovka_Prom": "Подготовка транспортного паллета к отгрузке",
            "Op_13_Markirovka_Fabr": "Раскомплект заказа (полный/частичный)",
            'Op_16_TU_3_5': 'Упаковка в пакет с клеевым слоем',
            "Op_17_TU_6_8": "Опасный товар",
            "Zakrytaya_Zona": "Закрытая зона",
            "Op_469_Spetsifikatsiya_TM": "Спецификация ТМ",
            "Op_470_Dop_Upakovka": "Проверка штрих-кода / срока годности",
            "Pechat_Etiketki_s_SHK": "Печать этикетки с ШК",
            "Pechat_Etiketki_s_Opisaniem": "Спецификация ТМ (для маркеплейсов)",
            "Produkty": "Продукты",
            "Upakovka_v_Gofro": "Тип операции",
            'Vlozhit_v_upakovku_pechatnyi_material': 'Вложить в упаковку печатный материал',
            'Izmerenie_VGH_i_peredacha_informatsii': 'Измерение ВГХ и передача информации',
            'Indeks_za_srochnost_koeff_1_5': 'Индекс за срочность (коэффициент 1,5)',
            'Prochie_raboty_vklyuchaya_ustranenie_anomalii': 'Прочие работы (в т.ч. устранение аномалий)',
            'Sborka_naborov_ot_2_shtuk_raznykh_tovarov': 'Сборка наборов (комплектов) от 2-х штук разных товаров',
            'Upakovka_tovara_v_gofromeyler': 'Упаковка товара в гофромейлер',
            'Khranenie_tovara': 'Хранение товара',
            'PriznakSortirovki': 'Сортируемый товар',
            'Mesto': 'Место',
            'Vlozhennost': 'Вложенность',
            "Pallet №": "Паллет №",
            "Ispolnitel": "Исполнитель",
            "SHK_WPS": "ШК WPS",
            "reason": "Причина",
            "comment": "Комментарий",
            "Time_Start": "Начало",
            "Time_End": "Окончание",

        }

    def load_uploaded_tasks(self):
        """Запрашивает список загруженных заданий с сервера и обновляет список."""
        try:
            response = requests.get('http://10.171.12.36:3005/uploaded-tasks')
            response.raise_for_status()
            tasks = response.json().get('tasks', [])

            # Доступ к списку через словарь
            task_list = self.uploaded_tab["task_list"]
            task_list.clear()

            if tasks:
                for task in tasks:
                    list_item = QListWidgetItem(task)
                    task_list.addItem(list_item)
            else:
                task_list.addItem("Нет загруженных заданий.")
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

            # Проверяем сначала конкретные значения
            if value_str == 'V':  # Если значение равно 'V'
                return '1'  # Возвращаем '1'

            try:
                # Преобразуем значение в float и затем в целое число
                float_value = float(value_str)
                return str(int(float_value))  # Возвращаем целое число без точки
            except ValueError:
                # Если это не число, возвращаем 'V'
                return 'V'

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

            # Замена всех типов данных float с 'NaN' и 'nan' на None с использованием NumPy
            for column in data.columns:
                data[column] = data[column].replace(
                    {np.nan: None, 'nan': None, 'NaN': None, '': None, ' ': None, '  ': None, '   ': None})

            # Отображение окна прогресса
            print(len(data))
            self.progress_window = ProgressWindow(self, max_value=len(data))
            self.progress_window.show()

            url = "http://10.171.12.36:3005/upload-data-new"

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

                # Получаем значение для Upakovka_v_Gofro без обработки process_op_column_value
                upakovka_v_gofro = str(row.get('Тип операции')) if pd.notna(row.get('Тип операции')) else None

                payload = {
                    'Artikul': row.get('Артикул'),
                    'Artikul_Syrya': artikul_syrya,
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

                    # Переименованные операции
                    'Op_1_Bl_1_Sht': self.process_op_column_value(row.get('Упаковка товара в индивидуальный короб')),
                    'Op_2_Bl_2_Sht': self.process_op_column_value(row.get('Пересчет товара')),
                    'Op_3_Bl_3_Sht': self.process_op_column_value(row.get('Фасовка/сборка монотовара в короб')),
                    'Op_4_Bl_4_Sht': self.process_op_column_value(row.get('Маркировка товара стикером')),
                    'Op_5_Bl_5_Sht': self.process_op_column_value(row.get('Маркировка транспортного короба')),
                    'Op_6_Blis_6_10_Sht': self.process_op_column_value(
                        row.get('Маркировка паллета (транспортного модуля)')),
                    'Op_7_Pereschyot': self.process_op_column_value(row.get('Удаление стикера/маркировки с товара')),
                    'Op_9_Fasovka_Sborka': self.process_op_column_value(row.get('Термоупаковка товара')),
                    'Op_10_Markirovka_SHT': self.process_op_column_value(row.get('Разбор товара (для маркетплейсов)')),
                    'Op_11_Markirovka_Prom': self.process_op_column_value(
                        row.get('Подготовка транспортного паллета к отгрузке')),
                    'Op_13_Markirovka_Fabr': self.process_op_column_value(
                        row.get('Раскомплект заказа (полный/частичный)')),
                    'Op_16_TU_3_5': self.process_op_column_value(row.get('Упаковка в пакет с клеевым слоем')),
                    'Op_17_TU_6_8': self.process_op_column_value(row.get('Опасный товар')),
                    'Zakrytaya_Zona': self.process_op_column_value(row.get('Закрытая зона')),
                    'Op_469_Spetsifikatsiya_TM': self.process_op_column_value(
                        row.get('Спецификация ТМ (для маркетплейсов)')),
                    'Op_470_Dop_Upakovka': self.process_op_column_value(
                        row.get('Проверка штрих-кода / срока годности')),

                    'Mesto': row.get('Место'),
                    'Vlozhennost': row.get('Вложенность'),
                    'Pallet_No': row.get('Паллет №'),
                    'pref': pref,
                    'Scklad_Pref': selected_sklad,
                    'Status': 0,
                    'Status_Zadaniya': 0,
                    'Nazvanie_Zadaniya': file_name,
                    'Upakovka_v_Gofro': upakovka_v_gofro,  # Используем необработанное значение
                    'Upakovka_v_PE_Paket': self.process_op_column_value(row.get('Упаковка товара в п/э пакет')),
                    # Переименованные признаки
                    'Sortiruemyi_Tovar': self.process_op_column_value(row.get('Печать этикетки с ШК')),
                    'Ne_Sortiruemyi_Tovar': self.process_op_column_value(row.get('Не сортируемый товар')),
                    'Produkty': self.process_op_column_value(row.get('Продукты')),
                    'Opasnyi_Tovar': self.process_op_column_value(row.get('Упаковка в пакет с замком Zip Lock')),
                    'Op_468_Proverka_SHK': self.process_op_column_value(row.get('Упаковка в бабл - пленку')),
                    'Krupnogabaritnyi_Tovar': self.process_op_column_value(row.get('Крупногабаритный товар')),
                    'Yuvelirnye_Izdelia': self.process_op_column_value(row.get('Ювелирные изделия')),
                    'Pechat_Etiketki_s_SHK': self.process_op_column_value(row.get('Печать этикетки с ШК')),
                    'Pechat_Etiketki_s_Opisaniem': self.process_op_column_value(row.get('Спецификация ТМ (для маркеплейсов)')),
                    'PriznakSortirovki': self.process_op_column_value(row.get('Сортируемый товар')),
                    'Vlozhit_v_upakovku_pechatnyi_material': self.process_op_column_value(
                        row.get('Вложить в упаковку печатный материал')),
                    'Izmerenie_VGH_i_peredacha_informatsii': self.process_op_column_value(
                        row.get('Измерение ВГХ и передача информации')),
                    'Indeks_za_srochnost_koeff_1_5': self.process_op_column_value(
                        row.get('Индекс за срочность (коэффициент 1,5)')),
                    'Prochie_raboty_vklyuchaya_ustranenie_anomalii': self.process_op_column_value(
                        row.get('Прочие работы (в т.ч. устранение аномалий)')),
                    'Sborka_naborov_ot_2_shtuk_raznykh_tovarov': self.process_op_column_value(
                        row.get('Сборка наборов (комплектов) от 2-х штук разных товаров')),
                    'Upakovka_tovara_v_gofromeyler': self.process_op_column_value(
                        row.get('Упаковка товара в гофромейлер')),
                    'Khranenie_tovara': self.process_op_column_value(row.get('Хранение товара')),
                    'vp': row.get('ВП'),
                    'Plan_Otkaz': row.get('Планируемое кол-во')
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
                            logging.error(f'Ошибка при загрузке строки {index + 1}: {response.text} {payload}')
                            time.sleep(2)  # Ожидание перед повтором

                    except requests.exceptions.RequestException as e:
                        logging.error(f'Ошибка при загрузке строки {index + 1}: {e} {response.text}')
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

    def download_file(self, task_name=None):
        """Download data from the server and process for saving to Excel."""
        if not task_name:
            QMessageBox.warning(self, "Ошибка", "Задание для скачивания не указано!")
            return
        # Get the selected task from the QListWidget
        # Получаем выбранный элемент из вкладки "Завершенные"
        selected_item = self.completed_tab["task_list"].currentItem()

        if selected_item is None:
            QMessageBox.warning(self, "Ошибка", "Пожалуйста, выберите задание!")
            return

        if not selected_item:
            QMessageBox.warning(self, "Ошибка", "Пожалуйста, выберите задание!")
            return

        # Получаем название задачи
        selected_task = selected_item.text()

        if not selected_task.strip():
            QMessageBox.warning(self, "Ошибка", "Название задачи пустое или некорректное.")
            return

        logging.debug(f"Selected task: {selected_task}")

        # Debugging: confirm that the task is selected correctly
        # print(f"Selected task: {selected_task}")  # You can remove this once it works

        # Ensure there's actually a valid task selected
        if selected_task.strip() == "":
            QMessageBox.warning(self, "Warning", "The selected task is empty or invalid.")
            return

        column_names = self.get_download_column_names()

        try:
            # Log the task being downloaded
            logging.debug(f"Downloading data for task: {selected_task}")
            response = requests.get(f'http://10.171.12.36:3005/download?task={selected_task}', stream=True)

            # Check if the response is valid
            if response.status_code != 200:
                logging.error(f"Failed to download file for task {selected_task}: {response.status_code}")
                QMessageBox.critical(self, "Ошибка",
                                     f"Не удалось загрузить файл. Сервер вернул: {response.status_code}")
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
        try:
            # Логгируем информацию о структуре данных для отладки
            logging.info(f"Колонки в данных: {data.columns.tolist()}")
            
            # Переименуем колонки
            data.rename(columns=column_names, inplace=True)
            logging.info(f"Колонки после переименования: {data.columns.tolist()}")
            
            # Преобразуем ШК в текстовый формат
            if 'ШК' in data.columns:
                data['ШК'] = data['ШК'].astype(str)
            
            # Получаем информацию о времени работы
            time_info = [
                ["Информация о времени работы с заданием"],
                ["Название задания:", task_name]
            ]
            
            # Проверяем, есть ли колонки с датами (разные возможные имена)
            time_start_col = None
            time_end_col = None
            
            for col in data.columns:
                if col.lower() in ['начало', 'time_start', 'time start']:
                    time_start_col = col
                elif col.lower() in ['окончание', 'time_end', 'time end']:
                    time_end_col = col
            
            logging.info(f"Найдены колонки с датами: начало={time_start_col}, окончание={time_end_col}")
            
            if time_start_col and time_end_col:
                # Проверяем формат дат и логгируем для отладки
                sample_start = data[time_start_col].iloc[0] if not data[time_start_col].isna().all() else None
                sample_end = data[time_end_col].iloc[0] if not data[time_end_col].isna().all() else None
                logging.info(f"Примеры дат: начало={sample_start}, окончание={sample_end}")
                
                try:
                    # Функция для преобразования российского формата даты "HH:MM:SS DD.MM.YYYY"
                    def parse_russian_datetime(date_str):
                        if pd.isna(date_str):
                            return pd.NaT
                        try:
                            # Разделяем время и дату
                            parts = date_str.strip().split()
                            if len(parts) == 2:
                                time_part, date_part = parts
                                
                                # Разбираем компоненты времени
                                hours, minutes, seconds = map(int, time_part.split(':'))
                                
                                # Разбираем компоненты даты
                                day, month, year = map(int, date_part.split('.'))
                                
                                return pd.Timestamp(year, month, day, hours, minutes, seconds)
                            return pd.NaT
                        except:
                            return pd.NaT
                    
                    # Проверяем, содержат ли данные российский формат даты
                    if sample_start and ':' in str(sample_start) and '.' in str(sample_start):
                        # Применяем наш парсер
                        data[time_start_col] = data[time_start_col].apply(parse_russian_datetime)
                        data[time_end_col] = data[time_end_col].apply(parse_russian_datetime)
                        logging.info("Применен парсер для российского формата даты")
                    else:
                        # Пробуем стандартные форматы дат
                        date_formats = [
                            '%m-%d-%Y %H:%M:%S',  # MM-DD-YYYY HH:MM:SS
                            '%d-%m-%Y %H:%M:%S',  # DD-MM-YYYY HH:MM:SS
                            '%Y-%m-%d %H:%M:%S',  # YYYY-MM-DD HH:MM:SS
                            '%H:%M:%S %d.%m.%Y',  # HH:MM:SS DD.MM.YYYY
                            '%d.%m.%Y %H:%M:%S'   # DD.MM.YYYY HH:MM:SS
                        ]
                        
                        for date_format in date_formats:
                            try:
                                data[time_start_col] = pd.to_datetime(data[time_start_col], format=date_format, errors='coerce')
                                data[time_end_col] = pd.to_datetime(data[time_end_col], format=date_format, errors='coerce')
                                
                                # Если даты успешно преобразованы, прерываем цикл
                                if not data[time_start_col].isna().all() and not data[time_end_col].isna().all():
                                    logging.info(f"Успешно преобразованы даты с форматом: {date_format}")
                                    break
                            except:
                                continue
                        
                        # Если формат не подошел, пробуем без формата
                        if data[time_start_col].isna().all() or data[time_end_col].isna().all():
                            data[time_start_col] = pd.to_datetime(data[time_start_col], errors='coerce')
                            data[time_end_col] = pd.to_datetime(data[time_end_col], errors='coerce')
                            logging.info("Преобразование дат без формата")
                    
                    # Получаем минимальное и максимальное значение времени
                    start_time = data[time_start_col].min()
                    end_time = data[time_end_col].max()
                    
                    logging.info(f"Временные метки: начало={start_time}, окончание={end_time}")
                    
                    if pd.notna(start_time) and pd.notna(end_time):
                        # Добавляем информацию о времени
                        time_info.extend([
                            ["Начало работы:", start_time.strftime("%d.%m.%Y %H:%M:%S")],
                            ["Окончание работы:", end_time.strftime("%d.%m.%Y %H:%M:%S")],
                            ["Общее время работы:", str(end_time - start_time)]
                        ])
                        logging.info("Успешно сформирована информация о времени")
                    else:
                        # Если не удалось определить даты, добавляем "Нет данных"
                        time_info.extend([
                            ["Начало работы:", "Нет данных"],
                            ["Окончание работы:", "Нет данных"],
                            ["Общее время работы:", "Нет данных"]
                        ])
                except Exception as e:
                    logging.error(f"Ошибка при обработке дат: {e}")
                    import traceback
                    logging.error(traceback.format_exc())
                    # В случае ошибки, добавляем "Нет данных"
                    time_info.extend([
                        ["Начало работы:", "Нет данных"],
                        ["Окончание работы:", "Нет данных"],
                        ["Общее время работы:", "Нет данных"]
                    ])
            else:
                # Если колонки с датами не найдены
                time_info.extend([
                    ["Начало работы:", "Нет данных"],
                    ["Окончание работы:", "Нет данных"],
                    ["Общее время работы:", "Нет данных"]
                ])
            
            # Удаляем строки, где Вложенность == 0 и reason пустой
            if 'Вложенность' in data.columns and 'Причина' in data.columns:
                # Преобразуем Вложенность в числовой формат для корректного сравнения
                data['Вложенность'] = pd.to_numeric(data['Вложенность'], errors='coerce')
                filtered_data = data[~((data['Вложенность'] == 0) & (
                            data['Причина'].isna() | (data['Причина'].astype(str).str.strip() == '')))]
                
                if len(filtered_data) < len(data):
                    logging.info(f"Отфильтровано {len(data) - len(filtered_data)} строк по условию Вложенность==0 и пустой Причине")
                    data = filtered_data
            
            downloads_path = os.path.join(os.getenv('USERPROFILE') if os.name == 'nt' else os.path.expanduser('~'), 'Downloads')
            local_file_path = os.path.join(downloads_path, f"{task_name}")
            
            # Записываем данные в Excel
            with pd.ExcelWriter(local_file_path, engine='xlsxwriter') as writer:
                # Записываем информацию о времени на отдельный лист (первым)
                time_df = pd.DataFrame(time_info)
                time_df.to_excel(writer, sheet_name='Время работы', index=False, header=False)
                logging.info("Сохранен лист с информацией о времени")
                
                # Записываем основные данные
                data = self.reorder_columns_by_template(data)
                data.to_excel(writer, sheet_name='Отчет', index=False)
                logging.info("Сохранен лист с данными")
            
            QMessageBox.information(self, "Успех", f"Файл успешно сохранен: {local_file_path}")
            logging.info(f'Файл сохранен: {local_file_path}')
            
        except Exception as e:
            logging.error(f"Ошибка при сохранении файла: {e}")
            import traceback
            logging.error(traceback.format_exc())
            QMessageBox.critical(self, "Ошибка", f"Ошибка при сохранении файла: {e}")

    def reorder_columns_by_template(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        desired_order = [
            "Артикул", "Артикул Сырья", "Название товара", "ШК", "ШК Сырья", "Номенклатура", "Кол-во сырья",
            "Итог Заказ",
            "СОХ", "Срок Годности", "Упаковка в пакет с клеевым слоем", "Упаковка в пакет с замком Zip Lock",
            "Упаковка товара в гофромейлер", "Упаковка товара в п/э пакет", "Упаковка в бабл - пленку",
            "Упаковка товара в индивидуальный короб", "Пересчет товара", "Фасовка/сборка монотовара в короб",
            "Маркировка товара стикером", "Маркировка транспортного короба",
            "Маркировка паллета (транспортного модуля)",
            "Удаление стикера/маркировки с товара", "Термоупаковка товара", "Проверка штрих-кода / срока годности",
            "Спецификация ТМ (для маркеплейсов)", "Разбор товара (для маркетплейсов)",
            "Подготовка транспортного паллета к отгрузке", "Раскомплект заказа (полный/частичный)",
         "Сборка наборов (комплектов) от 2-х штук разных товаров",
            "Вложить в упаковку печатный материал", "Сортируемый товар",  "Хранение товара",
            "Измерение ВГХ и передача информации", "Индекс за срочность (коэффициент 1,5)",
            "Прочие работы (в т.ч. устранение аномалий)", "Не сортируемый товар", "Тип операции","Продукты", "Опасный товар",
            "Закрытая зона",
            "Крупногабаритный товар", "Ювелирные изделия", "Место", "Вложенность", "Pallet_No",
        "Исполнитель", "Причина", "Комментарий", "Начало", "Окончание"


        ]
        for col in desired_order:
            if col not in df.columns:
                df[col] = None
        return df[desired_order]

    def save_multiple_sheets_to_excel(self, data_set1, data_set2, task_name, column_names):
        """Save two DataFrames into an Excel file on separate sheets, filtering out rows with missing data on the first sheet."""

        try:
            # Переименуем столбцы для первого и второго листов
            data_set1.rename(columns=column_names, inplace=True)
            data_set2.rename(columns=column_names, inplace=True)

            # Преобразуем ШК в текстовый формат для обоих датафреймов
            if 'ШК' in data_set1.columns:
                data_set1['ШК'] = data_set1['ШК'].astype(str)
            if 'ШК' in data_set2.columns:
                data_set2['ШК'] = data_set2['ШК'].astype(str)

            # Проверяем наличие необходимых колонок
            required_columns = ["Kolvo_Tovarov", "Pallet_No"]
            missing_columns = [col for col in required_columns if col not in data_set1.columns]
            
            if missing_columns:
                logging.error(f"Отсутствуют необходимые колонки: {missing_columns}")
                QMessageBox.warning(self, "Предупреждение", f"Отсутствуют необходимые колонки: {missing_columns}")
                return

            # Удаляем строки на первом листе, где отсутствуют значения в "Количество товаров" и "Паллет №"
            filtered_data_set1 = data_set1.dropna(subset=required_columns)

            # Удаляем строки из полного отчета, где Вложенность == 0 и reason пустой
            if 'Вложенность' in data_set2.columns and 'Причина' in data_set2.columns:
                # Преобразуем Вложенность в числовой формат для корректного сравнения
                data_set2['Вложенность'] = pd.to_numeric(data_set2['Вложенность'], errors='coerce')
                data_set2 = data_set2[~((data_set2['Вложенность'] == 0) & (
                            data_set2['Причина'].isna() | (data_set2['Причина'].astype(str).str.strip() == '')))]

            # Создаем базовую информацию о времени работы
            time_info = [
                ["Информация о времени работы с заданием"],
                ["Название задания:", task_name]
            ]

            # Проверяем, есть ли колонки с датами
            time_start_col = None
            time_end_col = None
            
            for col in data_set2.columns:
                if col.lower() in ['начало', 'time_start', 'time start']:
                    time_start_col = col
                elif col.lower() in ['окончание', 'time_end', 'time end']:
                    time_end_col = col
                    
            if time_start_col and time_end_col:
                try:
                    # Преобразуем время в datetime с правильным форматом
                    data_set2[time_start_col] = pd.to_datetime(data_set2[time_start_col], format='%m-%d-%Y %H:%M:%S', errors='coerce')
                    data_set2[time_end_col] = pd.to_datetime(data_set2[time_end_col], format='%m-%d-%Y %H:%M:%S', errors='coerce')
                    
                    start_time = data_set2[time_start_col].min()
                    end_time = data_set2[time_end_col].max()
                    
                    if pd.notna(start_time) and pd.notna(end_time):
                        # Добавляем информацию о времени, если удалось определить даты
                        time_info.extend([
                            ["Начало работы:", start_time.strftime("%d.%m.%Y %H:%M:%S")],
                            ["Окончание работы:", end_time.strftime("%d.%m.%Y %H:%M:%S")],
                            ["Общее время работы:", str(end_time - start_time)]
                        ])
                    else:
                        # Если не удалось определить даты, добавляем "Нет данных"
                        time_info.extend([
                            ["Начало работы:", "Нет данных"],
                            ["Окончание работы:", "Нет данных"],
                            ["Общее время работы:", "Нет данных"]
                        ])
                except Exception as e:
                    logging.error(f"Ошибка при обработке дат: {e}")
                    # В случае ошибки, добавляем "Нет данных"
                    time_info.extend([
                        ["Начало работы:", "Нет данных"],
                        ["Окончание работы:", "Нет данных"],
                        ["Общее время работы:", "Нет данных"]
                    ])
            else:
                # Если колонки с датами не найдены
                time_info.extend([
                    ["Начало работы:", "Нет данных"],
                    ["Окончание работы:", "Нет данных"],
                    ["Общее время работы:", "Нет данных"]
                ])

            # Определяем путь для сохранения файла
            downloads_path = os.path.join(os.getenv('USERPROFILE') if os.name == 'nt' else os.path.expanduser('~'),
                                          'Downloads')
            local_file_path = os.path.join(downloads_path, f"{task_name}")

            # Записываем данные в Excel с двумя листами
            with pd.ExcelWriter(local_file_path, engine='xlsxwriter') as writer:
                # Записываем информацию о времени на отдельный лист (первым)
                time_df = pd.DataFrame(time_info)
                time_df.to_excel(writer, sheet_name='Время работы', index=False, header=False)
                logging.info("Сохранен лист с информацией о времени")
                
                filtered_data_set1.to_excel(writer, sheet_name='Краткий отчет', index=False)
                data_set2 = self.reorder_columns_by_template(data_set2)
                data_set2.to_excel(writer, sheet_name='Полный отчет', index=False)

            # Информация о завершении
            QMessageBox.information(self, "Успех", f"Файл успешно сохранен: {local_file_path}")
            logging.info(f'Файл сохранен: {local_file_path}')

        except Exception as e:
            logging.error(f"Ошибка при сохранении файла: {e}")
            QMessageBox.critical(self, "Ошибка", f"Ошибка при сохранении файла: {e}")



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


        url = "http://10.171.12.36:3005/delete-uploaded-data"
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
