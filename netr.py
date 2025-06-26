import os
import time
import logging
import numpy as np
import pandas as pd
import requests
import sys

from PyQt5 import QtWidgets, QtGui, QtCore
from PyQt5.QtWidgets import QApplication, QFileDialog, QMessageBox, QWidget, QHBoxLayout, QLabel, QVBoxLayout
from PyQt5.QtCore import Qt, pyqtSignal

from test import ProgressWindow  # Импортируем класс окна прогресса


class TaskItemWidget(QWidget):
    hide_clicked = pyqtSignal(str)
    
    def __init__(self, task_name, parent=None):
        super().__init__(parent)
        self.task_name = task_name
        
        # Устанавливаем фон для элемента списка
        self.setAutoFillBackground(True)
        self.setObjectName("taskItem")
        self.setStyleSheet("""
            #taskItem {
                background-color: white;
                border: 1px solid #dee2e6;
                border-radius: 4px;
            }
            #taskItem:hover {
                background-color: #f8f9fa;
                border: 1px solid #ced4da;
            }
        """)
        
        # Основной макет
        layout = QHBoxLayout()
        layout.setContentsMargins(5, 5, 5, 5)
        layout.setSpacing(10)
        
        # Иконка документа
        self.doc_icon = QLabel("📄")
        self.doc_icon.setStyleSheet("""
            font-size: 16px;
            color: #495057;
        """)
        
        # Текст задания
        self.label = QLabel(task_name)
        self.label.setStyleSheet("""
            color: #495057;
            font-size: 14px;
        """)
        
        # Кнопка скрытия (серый крестик)
        self.hide_button = QtWidgets.QPushButton("✖")
        self.hide_button.setFixedSize(24, 24)
        self.hide_button.setStyleSheet("""
            QPushButton {
                background-color: #adb5bd;
                color: white;
                border: none;
                border-radius: 2px;
                font-size: 12px;
                padding: 0;
            }
            QPushButton:hover {
                background-color: #6c757d;
            }
        """)
        self.hide_button.clicked.connect(self._on_hide_clicked)
        
        # Добавляем элементы в макет
        layout.addWidget(self.doc_icon)
        layout.addWidget(self.label, stretch=1)
        layout.addWidget(self.hide_button)
        
        self.setLayout(layout)
        
    def _on_hide_clicked(self):
        self.hide_clicked.emit(self.task_name)

class TaskManagerApp(QtWidgets.QWidget):
    def __init__(self):
        super().__init__()
        self.tasks = []
        self.initUI()

    def initUI(self):
        # Устанавливаем светло-серый фон для основного окна
        self.setStyleSheet("""
            QWidget {
                background-color: #f1f3f5;
                color: #495057;
                font-family: 'Segoe UI', Arial;
                font-size: 14px;
            }
        """)

        # Главный макет
        main_layout = QtWidgets.QVBoxLayout()
        main_layout.setSpacing(10)
        main_layout.setContentsMargins(20, 10, 20, 20)

        # ЗАГОЛОВОК
        header_card = QWidget()
        header_card.setObjectName("headerCard")
        header_card.setStyleSheet("""
            #headerCard {
                background-color: white;
                border: 1px solid #dee2e6;
                border-radius: 10px;
            }
        """)
        header_layout = QHBoxLayout(header_card)
        header_layout.setContentsMargins(20, 15, 20, 15)
        
        # Иконка и заголовок
        icon_label = QLabel("📋")
        icon_label.setStyleSheet("font-size: 24px; margin-right: 10px;")
        
        title_label = QLabel("Менеджер заданий")
        title_label.setStyleSheet("""
            font-size: 24px;
            font-weight: bold;
            color: #495057;
        """)
        
        header_layout.addStretch()
        header_layout.addWidget(icon_label)
        header_layout.addWidget(title_label)
        header_layout.addStretch()
        
        main_layout.addWidget(header_card)

        # ПОИСК
        search_card = QWidget()
        search_card.setObjectName("searchCard")
        search_card.setStyleSheet("""
            #searchCard {
                background-color: white;
                border: 1px solid #dee2e6;
                border-radius: 10px;
            }
        """)
        search_layout = QHBoxLayout(search_card)
        search_layout.setContentsMargins(20, 15, 20, 15)
        
        # Иконка поиска
        search_icon = QLabel("🔍")
        search_icon.setStyleSheet("""
            font-size: 16px;
            color: #6C757D;
            padding: 0 10px 0 0;
        """)
        
        # Поле поиска
        self.search_field = QtWidgets.QLineEdit()
        self.search_field.setPlaceholderText("Поиск по названию задания...")
        self.search_field.textChanged.connect(self.filter_list)
        self.search_field.setStyleSheet("""
            QLineEdit {
                border: 1px solid #ced4da;
                border-radius: 20px;
                padding: 8px 15px;
                background-color: white;
                color: #495057;
            }
            QLineEdit:focus {
                border: 1px solid #6c757d;
            }
        """)
        
        search_layout.addWidget(search_icon)
        search_layout.addWidget(self.search_field)
        main_layout.addWidget(search_card)

        # СПИСОК ЗАДАНИЙ
        task_card = QWidget()
        task_card.setObjectName("taskCard")
        task_card.setStyleSheet("""
            #taskCard {
                background-color: white;
                border: 1px solid #dee2e6;
                border-radius: 10px;
            }
        """)
        task_layout = QVBoxLayout(task_card)
        task_layout.setContentsMargins(20, 15, 20, 15)
        
        # Заголовок списка
        list_header = QLabel("Список доступных заданий:")
        list_header.setStyleSheet("""
            font-size: 14px;
            font-weight: bold;
            color: #495057;
            background-color: #f8f9fa;
            padding: 5px 10px;
            border-radius: 4px;
        """)
        task_layout.addWidget(list_header)
        
        # Список заданий
        self.task_list = QtWidgets.QListWidget()
        self.task_list.setStyleSheet("""
            QListWidget {
                border: none;
                background-color: white;
            }
            QListWidget::item {
                padding: 5px;
                margin: 1px 0;
            }
            QListWidget::item:selected {
                background-color: transparent;
            }
            QScrollBar:vertical {
                border: none;
                background: #f8f9fa;
                width: 12px;
                margin: 0;
                border-radius: 6px;
            }
            QScrollBar::handle:vertical {
                background: #ced4da;
                border-radius: 6px;
                min-height: 30px;
            }
            QScrollBar::handle:vertical:hover {
                background: #adb5bd;
            }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
                height: 0px;
            }
            QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical {
                background: none;
            }
        """)
        
        task_layout.addWidget(self.task_list)
        main_layout.addWidget(task_card, 1)  # 1 = stretch factor

        # КНОПКИ
        button_card = QWidget()
        button_card.setObjectName("buttonCard")
        button_card.setStyleSheet("""
            #buttonCard {
                background-color: white;
                border: 1px solid #dee2e6;
                border-radius: 10px;
            }
        """)
        button_layout = QHBoxLayout(button_card)
        button_layout.setContentsMargins(20, 15, 20, 15)
        
        # Кнопка загрузки задания
        self.load_task_btn = QtWidgets.QPushButton("📂 Загрузить задание")
        self.load_task_btn.setStyleSheet("""
            QPushButton {
                background-color: #adb5bd;
                color: white;
                border: none;
                border-radius: 5px;
                padding: 10px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #868e96;
            }
        """)
        
        # Кнопка загрузки ВПС
        self.load_vps_btn = QtWidgets.QPushButton("📥 Загрузить ВПС")
        self.load_vps_btn.setStyleSheet("""
            QPushButton {
                background-color: #868e96;
                color: white;
                border: none;
                border-radius: 5px;
                padding: 10px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #6c757d;
            }
        """)
        
        # Кнопка скачивания задания
        self.download_task_btn = QtWidgets.QPushButton("⬇️ Скачать задание")
        self.download_task_btn.setStyleSheet("""
            QPushButton {
                background-color: #6c757d;
                color: white;
                border: none;
                border-radius: 5px;
                padding: 10px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #495057;
            }
        """)
        
        # Добавляем кнопки в макет
        button_layout.addWidget(self.load_task_btn)
        button_layout.addWidget(self.load_vps_btn)
        button_layout.addWidget(self.download_task_btn)
        
        # Привязываем обработчики событий
        self.load_task_btn.clicked.connect(self.load_task)
        self.load_vps_btn.clicked.connect(self.load_vps)
        self.download_task_btn.clicked.connect(self.download_task)
        
        main_layout.addWidget(button_card)

        # СТАТУС БАР
        status_card = QWidget()
        status_card.setObjectName("statusCard")
        status_card.setStyleSheet("""
            #statusCard {
                background-color: white;
                border: 1px solid #dee2e6;
                border-radius: 10px;
            }
        """)
        status_layout = QHBoxLayout(status_card)
        status_layout.setContentsMargins(20, 10, 20, 10)
        
        # Иконка информации
        info_icon = QLabel("ℹ️")
        info_icon.setStyleSheet("""
            font-size: 14px;
            margin-right: 5px;
        """)
        
        # Метка статуса
        self.status_label = QLabel("Загружено заданий: 0")
        self.status_label.setStyleSheet("""
            color: #6c757d;
            font-size: 14px;
        """)
        
        status_layout.addWidget(info_icon)
        status_layout.addWidget(self.status_label, 1)
        main_layout.addWidget(status_card)

        # Устанавливаем основной макет
        self.setLayout(main_layout)
        self.setWindowTitle("Менеджер заданий")
        self.setMinimumSize(850, 650)
        
        # Загружаем данные
        self.load_initial_data()

    def has_single_sheet(self, file_path):
        try:
            xl = pd.ExcelFile(file_path)
            return len(xl.sheet_names) == 1
        except Exception as e:
            logging.error(f"Ошибка при проверке файла: {e}")
            return False

    def load_initial_data(self):
        """Загружает список заданий с сервера и заполняет QListWidget."""
        self.task_list.clear()
        self.tasks.clear()
        self.status_label.setText("Загрузка данных...")

        try:
            response = requests.get("http://10.171.12.36:3005/distinctName", timeout=10)

            if response.status_code != 200:
                logging.error(f"Ошибка при загрузке списка заданий: {response.status_code}")
                QMessageBox.critical(self, "Ошибка", f"Ошибка сервера: {response.status_code}")
                self.status_label.setText("Ошибка загрузки данных")
                return

            data = response.json()

            if not data.get("success") or not data.get("data"):
                logging.warning("Сервер вернул пустой список заданий.")
                QMessageBox.warning(self, "Предупреждение", "Нет доступных заданий.")
                self.status_label.setText("Нет доступных заданий")
                return

            # Добавляем задания в список
            self.tasks = data["data"]
            self.update_task_list()
            logging.info("Список заданий успешно загружен.")
            self.status_label.setText(f"Загружено заданий: {len(self.tasks)}")

        except requests.RequestException as e:
            logging.error(f"Ошибка сети при загрузке списка заданий: {e}")
            QMessageBox.critical(self, "Ошибка", f"Ошибка сети: {e}")
            self.status_label.setText("Ошибка сети при загрузке")

    def update_task_list(self):
        """Обновляет отображение списка заданий"""
        self.task_list.clear()
        for i, task in enumerate(self.tasks):
            item = QtWidgets.QListWidgetItem()
            item.setSizeHint(QtCore.QSize(0, 40))
            self.task_list.addItem(item)
            
            # Создаем виджет для элемента списка с номером
            task_widget = TaskItemWidget(f"{i+1}. {task}")
            task_widget.hide_clicked.connect(self.hide_task)
            self.task_list.setItemWidget(item, task_widget)

    def filter_list(self):
        """Фильтрует список заданий по поисковому запросу"""
        search_text = self.search_field.text().lower()
        self.task_list.clear()
        
        filtered_tasks = [(i, task) for i, task in enumerate(self.tasks) if search_text in task.lower()]
        for i, task in filtered_tasks:
            item = QtWidgets.QListWidgetItem()
            item.setSizeHint(QtCore.QSize(0, 40))
            self.task_list.addItem(item)
            
            task_widget = TaskItemWidget(f"{i+1}. {task}")
            task_widget.hide_clicked.connect(self.hide_task)
            self.task_list.setItemWidget(item, task_widget)
            
        self.status_label.setText(f"Найдено: {len(filtered_tasks)} из {len(self.tasks)}")

    def hide_task(self, task_name):
        """Скрывает задание, отправляя запрос на сервер"""
        # Извлекаем оригинальное название задания без префикса с номером
        original_task_name = task_name.split('. ', 1)[1] if '. ' in task_name else task_name
        
        try:
            reply = QMessageBox()
            reply.setWindowTitle("Подтверждение")
            reply.setText(f"Вы действительно хотите скрыть задание?")
            reply.setInformativeText(f"Задание: '{original_task_name}'")
            reply.setIcon(QMessageBox.Question)
            reply.setStandardButtons(QMessageBox.Yes | QMessageBox.No)
            reply.setDefaultButton(QMessageBox.No)
            
            if reply.exec_() == QMessageBox.No:
                return
                
            self.status_label.setText(f"Скрытие задания: {original_task_name}...")
            
            # Формируем правильное тело запроса с параметром nazvanie_zdaniya
            payload = {
                "nazvanie_zdaniya": original_task_name
            }
            
            response = requests.post("http://10.171.12.36:3005/hideTask", 
                                  json=payload,
                                  timeout=10)
            
            if response.status_code == 200:
                # Удаляем задание из списка
                self.tasks.remove(original_task_name)
                self.update_task_list()
                logging.info(f"Задание {original_task_name} успешно скрыто")
                self.status_label.setText(f"Задание скрыто")
            else:
                logging.error(f"Ошибка при скрытии задания: {response.status_code}")
                QMessageBox.critical(self, "Ошибка", "Не удалось скрыть задание")
                self.status_label.setText("Ошибка скрытия задания")
                
        except requests.RequestException as e:
            logging.error(f"Ошибка сети при скрытии задания: {e}")
            QMessageBox.critical(self, "Ошибка", f"Ошибка сети: {e}")
            self.status_label.setText("Ошибка сети при скрытии задания")

    def load_vps(self):
        file_path, _ = QFileDialog.getOpenFileName(self, "Выберите файл ВПС", "", "Excel файлы (*.xlsx)")
        if not file_path:
            QMessageBox.warning(self, "Ошибка", "Файл не выбран!")
            return

        if not self.has_single_sheet(file_path):
            QMessageBox.critical(self, "Ошибка",
                                 "Файл содержит несколько листов. Пожалуйста, загрузите файл только с одним листом!")
            return

        url = "http://10.171.12.36:3005/uploadWPS"

        try:
            # Читаем Excel-файл
            data = pd.read_excel(file_path)

            if data.empty:
                QMessageBox.warning(self, "Ошибка", "Файл пустой!")
                return

            # Отображаем прогресс загрузки
            self.progress_window = ProgressWindow(self, max_value=len(data))
            self.progress_window.show()

            for index, row in data.iterrows():
                # Формируем payload для отправки строки на сервер
                payload = {
                    'nazvanie_zdaniya': str(row.get('Название задания', '')),
                    'artikul': str(row.get('Артикул', '')),
                    'shk': str(row.get('Штрих-код', '')).rstrip('.0') if isinstance(row.get('Штрих-код', ''),
                                                                                    (int, float)) else str(
                        row.get('Штрих-код', '')),
                    'mesto': str(row.get('Место', '')),
                    'vlozhennost': str(row.get('Вложенность', '')),
                    'pallet': str(row.get('Паллет', '')),
                    'size_vps': str(row.get('Размер ВПС', '')),
                    'vp': str(row.get('ВП', '')),
                    'itog_zakaza': row.get('Итог заказа'),  # Без преобразования в строку
                    'shk_wps': str(row.get('ШК ВПС', ''))
                }
                logging.info(payload)

                try:
                    response = requests.post(url, json=payload, timeout=30)

                    if response.status_code == 200:
                        logging.info(f"✅ Строка {index + 1}/{len(data)} успешно загружена.")
                    else:
                        logging.error(f"❌ Ошибка при загрузке строки {index + 1}: {response.text}")

                except requests.RequestException as e:
                    logging.error(f"⛔ Ошибка сети при загрузке строки {index + 1}: {e}")
                    continue

                # Обновляем прогресс
                self.progress_window.update_progress(index + 1)
                QApplication.processEvents()

            self.progress_window.close()
            QMessageBox.information(self, "Успех", "Все строки успешно обработаны!")

        except Exception as e:
            logging.error(f"Ошибка при обработке файла: {e}")
            QMessageBox.critical(self, "Ошибка", f"Ошибка при обработке файла: {e}")

    def load_task(self):
        file_path, _ = QFileDialog.getOpenFileName(self, "Выберите файл", "", "Excel файлы (*.xlsx)")
        if not file_path:
            return

        if not self.has_single_sheet(file_path):
            QMessageBox.critical(self, "Ошибка",
                                 "Файл содержит несколько листов. Пожалуйста, загрузите файл только с одним листом!")
            return

        file_name = os.path.basename(file_path)
        pref = file_name.split(' ')[0]  # Получаем префикс из названия файла

        try:
            data = pd.read_excel(file_path)
            if data.empty:
                QMessageBox.warning(self, "Предупреждение", "Файл пустой.")
                return

            # Очистка данных
            data = data.replace({np.nan: None, '': None, ' ': None, 'nan': None, 'NaN': None})

            self.progress_window = ProgressWindow(self, max_value=len(data))
            self.progress_window.show()

            url = "http://10.171.12.36:3005/uploadData"

            for index, row in data.iterrows():
                payload = {
                    'Artikul': row.get('Артикул'),
                    'Nazvanie_Tovara': row.get('Название товара'),
                    'SHK': row.get('ШК'),
                    'Nomenklatura': row.get('Номенклатура'),
                    'Itog_Zakaz': row.get('Итог Заказ'),
                    'Srok_Godnosti': row.get('Срок Годности'),
                    'pref': pref,
                    'Status': 0,
                    'Status_Zadaniya': 0,
                    'Nazvanie_Zadaniya': file_name,
                    'vp': row.get('ВП'),
                }
                logging.debug(f"[{index + 1}/{len(data)}] Payload: {payload}")
                success = False
                while not success:
                    try:
                        response = requests.post(url, json=payload, timeout=75)
                        if response.status_code == 200:
                            logging.info(f'✅ {index + 1}/{len(data)} - Успешно загружено: {payload}')
                            success = True
                        else:
                            logging.error(f'❌ Ошибка при загрузке {index + 1}: {response.text}')
                            time.sleep(2)  # Повтор через 2 секунды
                    except requests.exceptions.RequestException as e:
                        logging.error(f'⛔ Ошибка сети при загрузке {index + 1}: {e}')
                        time.sleep(2)

                self.progress_window.update_progress(index + 1)
                QApplication.processEvents()

            self.progress_window.close()
            QMessageBox.information(self, "Успех", "Файл успешно загружен построчно.")

        except Exception as e:
            logging.error(f'❗ Ошибка при обработке файла: {e}')
            QMessageBox.critical(self, "Ошибка", f"Ошибка при загрузке файла: {e}")

    def download_task(self):
        """Скачивает данные с сервера и сохраняет их в Excel."""
        # Получаем выбранный элемент из списка
        current_item = self.task_list.currentItem()
        if not current_item:
            QMessageBox.warning(self, "Ошибка", "Пожалуйста, выберите задание из списка!")
            return

        # Получаем виджет элемента и его текст
        item_widget = self.task_list.itemWidget(current_item)
        if not item_widget:
            QMessageBox.warning(self, "Ошибка", "Ошибка получения данных задания!")
            return

        # Извлекаем оригинальное название задания без номера
        task_name = item_widget.task_name
        original_task_name = task_name.split('. ', 1)[1] if '. ' in task_name else task_name

        try:
            self.status_label.setText(f"Скачивание задания: {original_task_name}...")
            
            # Формируем URL с параметром task
            url = f'http://10.171.12.36:3005/downloadData'
            params = {'task': original_task_name}
            
            response = requests.get(url, params=params, timeout=30)

            if response.status_code != 200:
                logging.error(f"Ошибка скачивания файла: {response.status_code}")
                QMessageBox.critical(self, "Ошибка", f"Сервер вернул ошибку: {response.status_code}")
                self.status_label.setText("Ошибка скачивания")
                return

            # Декодируем JSON
            data = response.json()
            if not data.get("success") or not data.get("data"):
                logging.warning(f"Нет данных для задания {original_task_name}")
                QMessageBox.warning(self, "Предупреждение", "Нет данных для скачивания.")
                self.status_label.setText("Нет данных для скачивания")
                return

            # Преобразуем JSON-ответ в DataFrame
            df = pd.DataFrame(data["data"])

            # Удаляем поле ID если оно есть
            if 'id' in df.columns:
                df.drop(columns=['id'], inplace=True)

            # Русифицируем заголовки колонок
            column_mapping = {
                "nazvanie_zdaniya": "Название задания",
                "vp": "ВП",
                "artikul": "Артикул",
                "nazvanie_tovara": "Название товара",
                "shk": "Штрих-код",
                "srok_godnosti": "Срок годности",
                "vlozhennost": "Вложенность",
                "pallet": "Паллет",
                "shk_wps": "ШК ВПС",
                "size_vps": "Размер ВПС",
                "itog_zakaza": "Итог заказа",
                "Nomenklatura": "Номенклатура"
            }

            df.rename(columns=column_mapping, inplace=True)

            # Открываем диалог для сохранения файла
            save_path, _ = QFileDialog.getSaveFileName(
                self,
                "Сохранить как",
                f"{original_task_name}.xlsx",
                "Excel файлы (*.xlsx)"
            )
            
            if not save_path:
                self.status_label.setText("Скачивание отменено")
                return

            # Сохраняем в Excel
            df.to_excel(save_path, index=False)
            
            self.status_label.setText(f"Файл успешно сохранён: {os.path.basename(save_path)}")
            logging.info(f"Файл успешно сохранён: {save_path}")
            QMessageBox.information(self, "Успех", f"Файл успешно сохранён")

        except requests.RequestException as e:
            logging.error(f"Ошибка сети при скачивании файла: {e}")
            QMessageBox.critical(self, "Ошибка", f"Ошибка сети: {e}")
            self.status_label.setText("Ошибка сети при скачивании")

        except Exception as e:
            logging.error(f"Ошибка при скачивании файла: {e}")
            QMessageBox.critical(self, "Ошибка", f"Ошибка при скачивании: {e}")
            self.status_label.setText("Ошибка при скачивании")


if __name__ == "__main__":
    app = QApplication(sys.argv)
    main_window = TaskManagerApp()
    main_window.show()
    sys.exit(app.exec_())
