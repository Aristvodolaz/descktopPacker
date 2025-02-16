import os
import time
import logging
import numpy as np
import pandas as pd
import requests
import sys

from PyQt5 import QtWidgets, QtGui, QtCore
from PyQt5.QtWidgets import QApplication, QFileDialog, QMessageBox

from test import ProgressWindow  # Импортируем класс окна прогресса


class TaskManagerApp(QtWidgets.QWidget):
    def __init__(self):
        super().__init__()
        self.initUI()

    def initUI(self):
        self.setStyleSheet("""
            QWidget {
                background-color: #2E3440;
                color: #D8DEE9;
                font-family: Arial;
                font-size: 14px;
            }
            QLineEdit {
                border: 2px solid #88C0D0;
                border-radius: 5px;
                padding: 5px;
                background-color: #3B4252;
                color: #ECEFF4;
            }
            QListWidget {
                border: 2px solid #5E81AC;
                border-radius: 5px;
                background-color: #434C5E;
                color: #ECEFF4;
            }
            QPushButton {
                background-color: #5E81AC;
                border-radius: 5px;
                padding: 10px;
                color: white;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #81A1C1;
            }
            QPushButton:pressed {
                background-color: #4C566A;
            }
        """)

        layout = QtWidgets.QVBoxLayout()

        # Поле поиска
        self.search_field = QtWidgets.QLineEdit(self)
        self.search_field.setPlaceholderText("🔍 Поиск по названию")
        self.search_field.textChanged.connect(self.filter_list)
        layout.addWidget(self.search_field)

        # Список заданий
        self.task_list = QtWidgets.QListWidget(self)
        layout.addWidget(self.task_list)


        # Кнопки
        self.load_task_btn = QtWidgets.QPushButton("📂 Загрузить задание", self)
        self.load_vps_btn = QtWidgets.QPushButton("📥 Загрузить ВПС", self)
        self.download_task_btn = QtWidgets.QPushButton("⬇️ Скачать задание", self)

        self.load_task_btn.clicked.connect(self.load_task)
        self.load_vps_btn.clicked.connect(self.load_vps)
        self.download_task_btn.clicked.connect(self.download_task)

        layout.addWidget(self.load_task_btn)
        layout.addWidget(self.load_vps_btn)
        layout.addWidget(self.download_task_btn)

        self.setLayout(layout)
        self.setWindowTitle("Менеджер заданий")
        self.setGeometry(100, 100, 400, 500)

        self.load_initial_data()

    import requests

    def load_initial_data(self):
        """Загружает список заданий с сервера и заполняет QListWidget."""
        self.task_list.clear()  # Очищаем список перед загрузкой новых данных

        try:
            response = requests.get("https://corrywilliams.ru/distinctName", timeout=10)

            if response.status_code != 200:
                logging.error(f"Ошибка при загрузке списка заданий: {response.status_code}")
                QMessageBox.critical(self, "Ошибка", f"Ошибка сервера: {response.status_code}")
                return

            data = response.json()

            if not data.get("success") or not data.get("data"):
                logging.warning("Сервер вернул пустой список заданий.")
                QMessageBox.warning(self, "Предупреждение", "Нет доступных заданий.")
                return

            # Добавляем задания в список
            for task_name in data["data"]:
                self.task_list.addItem(task_name)

            logging.info("Список заданий успешно загружен.")

        except requests.RequestException as e:
            logging.error(f"Ошибка сети при загрузке списка заданий: {e}")
            QMessageBox.critical(self, "Ошибка", f"Ошибка сети: {e}")

    def update_task_list(self):
        self.task_list.clear()
        for task in self.tasks:
            self.task_list.addItem(task)

    def filter_list(self):
        search_text = self.search_field.text().lower()
        self.task_list.clear()
        for task in self.tasks:
            if search_text in task.lower():
                self.task_list.addItem(task)

    def load_vps(self):
        """Загружает файл ВПС построчно на сервер."""
        file_path, _ = QFileDialog.getOpenFileName(self, "Выберите файл ВПС", "", "Excel файлы (*.xlsx)")
        if not file_path:
            QMessageBox.warning(self, "Ошибка", "Файл не выбран!")
            return

        url = "https://corrywilliams.ru/uploadWPS"

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
        """Загрузка Excel-файла и отправка данных построчно на сервер"""
        file_path, _ = QFileDialog.getOpenFileName(self, "Выберите файл", "", "Excel файлы (*.xlsx)")
        if not file_path:
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

            url = "https://corrywilliams.ru/uploadData"

            for index, row in data.iterrows():
                payload = {
                    'Artikul': row.get('Артикул'),
                    'Nazvanie_Tovara': row.get('Название товара'),
                    'SHK': row.get('ШК'),
                    'Itog_Zakaz': row.get('Итог Заказ'),
                    'Srok_Godnosti': row.get('Срок Годности'),
                    'pref': pref,
                    'Status': 0,
                    'Status_Zadaniya': 0,
                    'Nazvanie_Zadaniya': file_name,
                    'vp': row.get('ВП')
                }

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
        """Скачивает данные с сервера и сохраняет их в Excel с русскими заголовками, без поля ID."""

        # Получаем выбранный элемент из списка
        selected_item = self.task_list.currentItem()

        if selected_item is None:
            QMessageBox.warning(self, "Ошибка", "Пожалуйста, выберите задание из списка!")
            return

        selected_task = selected_item.text().strip()

        if not selected_task:
            QMessageBox.warning(self, "Ошибка", "Название задачи пустое или некорректное.")
            return

        logging.debug(f"Скачивание данных для задания: {selected_task}")

        try:
            # Отправляем запрос на сервер
            url = f'https://corrywilliams.ru/downloadData?task={selected_task}'
            response = requests.get(url, timeout=30)

            if response.status_code != 200:
                logging.error(f"Ошибка скачивания файла {selected_task}: {response.status_code}")
                QMessageBox.critical(self, "Ошибка", f"Сервер вернул ошибку: {response.status_code}")
                return

            # Декодируем JSON
            data = response.json()
            if not data.get("success") or not data.get("data"):
                logging.warning(f"Нет данных для задания {selected_task}")
                QMessageBox.warning(self, "Предупреждение", "Нет данных для скачивания.")
                return

            # Преобразуем JSON-ответ в DataFrame
            df = pd.DataFrame(data["data"])

            # Удаляем поле ID
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
            }

            df.rename(columns=column_mapping, inplace=True)

            # Открываем диалог для сохранения файла
            save_path, _ = QFileDialog.getSaveFileName(self, "Сохранить как", f"{selected_task}.xlsx",
                                                       "Excel файлы (*.xlsx)")
            if not save_path:
                return  # Пользователь отменил сохранение

            # Сохраняем в Excel
            df.to_excel(save_path, index=False)

            logging.info(f"Файл успешно сохранён: {save_path}")
            QMessageBox.information(self, "Успех", f"Файл успешно сохранён в: {save_path}")

        except requests.RequestException as e:
            logging.error(f"Ошибка сети при скачивании файла: {e}")
            QMessageBox.critical(self, "Ошибка", f"Ошибка сети: {e}")

        except Exception as e:
            logging.error(f"Ошибка обработки данных: {e}")
            QMessageBox.critical(self, "Ошибка", f"Ошибка при обработке данных: {e}")


if __name__ == "__main__":
    app = QApplication(sys.argv)
    main_window = TaskManagerApp()
    main_window.show()
    sys.exit(app.exec_())
