#!/usr/bin/env python3
"""
CrazyGift Project Launcher
Запуск полного функционала проекта (Frontend + Backend)
"""

import os
import sys
import time
import subprocess
import threading
import webbrowser
from pathlib import Path

# Конфигурация
BACKEND_PORT = 8000
FRONTEND_PORT = 3000
PROJECT_ROOT = Path(__file__).parent

class ProjectLauncher:
    def __init__(self):
        self.backend_process = None
        self.frontend_process = None
        
    def check_dependencies(self):
        """Проверка зависимостей"""
        print("🔍 Проверка зависимостей...")
        
        # Проверка Python
        if sys.version_info < (3, 8):
            print("❌ Требуется Python 3.8+")
            return False
            
        # Проверка pip
        try:
            subprocess.run(['pip', '--version'], check=True, capture_output=True)
        except:
            print("❌ pip не найден")
            return False
            
        # Проверка Node.js (опционально)
        try:
            subprocess.run(['python', '-m', 'http.server', '--help'], check=True, capture_output=True)
        except:
            print("⚠️ http.server недоступен, используем альтернативный метод")
            
        print("✅ Зависимости проверены")
        return True
        
    def setup_backend(self):
        """Настройка бэкенда"""
        backend_path = PROJECT_ROOT / "backend"
        
        if not backend_path.exists():
            print("❌ Папка backend не найдена")
            return False
            
        print("🔧 Настройка бэкенда...")
        
        # Создание .env если не существует
        env_file = backend_path / ".env"
        if not env_file.exists():
            env_content = f"""# CrazyGift Backend Configuration
DATABASE_URL=sqlite:///./crazygift.db
SECRET_KEY=crazygift_secret_key_2025
CORS_ORIGINS=http://localhost:{FRONTEND_PORT},http://127.0.0.1:{FRONTEND_PORT},file://
TELEGRAM_BOT_TOKEN=your_bot_token_here

# TON Blockchain
TON_WALLET_ADDRESS=your_ton_wallet
TON_PRIVATE_KEY=your_ton_private_key

# Development
DEBUG=true
PORT={BACKEND_PORT}
"""
            with open(env_file, 'w', encoding='utf-8') as f:
                f.write(env_content)
            print("✅ Создан .env файл")
            
        # Установка зависимостей
        requirements_file = backend_path / "requirements.txt"
        if requirements_file.exists():
            print("📦 Установка Python зависимостей...")
            try:
                subprocess.run([
                    sys.executable, '-m', 'pip', 'install', '-r', str(requirements_file)
                ], check=True, cwd=backend_path)
                print("✅ Python зависимости установлены")
            except subprocess.CalledProcessError:
                print("⚠️ Ошибка установки зависимостей, продолжаем...")
                
        return True
        
    def setup_frontend(self):
        """Настройка фронтенда"""
        frontend_path = PROJECT_ROOT / "frontend"
        
        if not frontend_path.exists():
            print("❌ Папка frontend не найдена")
            return False
            
        print("🎨 Настройка фронтенда...")
        
        # Проверка структуры
        required_files = ['index.html', 'js', 'styles', 'assets']
        for file in required_files:
            if not (frontend_path / file).exists():
                print(f"⚠️ Отсутствует {file}")
                
        print("✅ Фронтенд готов")
        return True
        
    def start_backend(self):
        """Запуск бэкенда"""
        backend_path = PROJECT_ROOT / "backend"
        run_file = backend_path / "run.py"
        
        if not run_file.exists():
            print("❌ run.py не найден в backend/")
            return False
            
        print(f"🚀 Запуск бэкенда на порту {BACKEND_PORT}...")
        
        try:
            self.backend_process = subprocess.Popen([
                sys.executable, 'run.py'
            ], cwd=backend_path)
            
            # Ждем запуска
            time.sleep(3)
            
            # Проверяем что процесс работает
            if self.backend_process.poll() is None:
                print(f"✅ Бэкенд запущен (PID: {self.backend_process.pid})")
                return True
            else:
                print("❌ Бэкенд не запустился")
                return False
                
        except Exception as e:
            print(f"❌ Ошибка запуска бэкенда: {e}")
            return False
            
    def start_frontend(self):
        """Запуск фронтенда"""
        frontend_path = PROJECT_ROOT / "frontend"
        
        print(f"🎨 Запуск фронтенда на порту {FRONTEND_PORT}...")
        
        try:
            # Используем встроенный HTTP сервер Python
            self.frontend_process = subprocess.Popen([
                sys.executable, '-m', 'http.server', str(FRONTEND_PORT)
            ], cwd=frontend_path)
            
            # Ждем запуска
            time.sleep(2)
            
            if self.frontend_process.poll() is None:
                print(f"✅ Фронтенд запущен (PID: {self.frontend_process.pid})")
                return True
            else:
                print("❌ Фронтенд не запустился")
                return False
                
        except Exception as e:
            print(f"❌ Ошибка запуска фронтенда: {e}")
            return False
            
    def open_browser(self):
        """Открытие браузера"""
        url = f"http://localhost:{FRONTEND_PORT}"
        print(f"🌐 Открытие браузера: {url}")
        
        def open_delayed():
            time.sleep(2)
            try:
                webbrowser.open(url)
            except:
                print(f"⚠️ Не удалось открыть браузер автоматически")
                print(f"Откройте вручную: {url}")
                
        threading.Thread(target=open_delayed, daemon=True).start()
        
    def show_status(self):
        """Показать статус сервисов"""
        print("\n" + "="*50)
        print("🎰 CrazyGift Project Status")
        print("="*50)
        print(f"🔧 Backend:  http://localhost:{BACKEND_PORT}")
        print(f"🎨 Frontend: http://localhost:{FRONTEND_PORT}")
        print(f"📚 API Docs: http://localhost:{BACKEND_PORT}/docs")
        print("="*50)
        print("🔥 Проект запущен успешно!")
        print("Нажмите Ctrl+C для остановки")
        print("="*50 + "\n")
        
    def cleanup(self):
        """Очистка процессов"""
        print("\n🛑 Остановка сервисов...")
        
        if self.backend_process:
            self.backend_process.terminate()
            try:
                self.backend_process.wait(timeout=5)
                print("✅ Бэкенд остановлен")
            except:
                self.backend_process.kill()
                print("🔨 Бэкенд принудительно остановлен")
                
        if self.frontend_process:
            self.frontend_process.terminate()
            try:
                self.frontend_process.wait(timeout=5)
                print("✅ Фронтенд остановлен")
            except:
                self.frontend_process.kill()
                print("🔨 Фронтенд принудительно остановлен")
                
    def run(self):
        """Главная функция запуска"""
        print("🎰 CrazyGift Project Launcher")
        print("=" * 30)
        
        try:
            # Проверки
            if not self.check_dependencies():
                return False
                
            # Настройка
            if not self.setup_backend():
                return False
                
            if not self.setup_frontend():
                return False
                
            # Запуск бэкенда
            if not self.start_backend():
                return False
                
            # Запуск фронтенда
            if not self.start_frontend():
                self.cleanup()
                return False
                
            # Открытие браузера
            self.open_browser()
            
            # Показать статус
            self.show_status()
            
            # Ожидание
            try:
                while True:
                    time.sleep(1)
                    # Проверяем что процессы живы
                    if self.backend_process.poll() is not None:
                        print("❌ Бэкенд упал!")
                        break
                    if self.frontend_process.poll() is not None:
                        print("❌ Фронтенд упал!")
                        break
                        
            except KeyboardInterrupt:
                print("\n👋 Получен сигнал остановки")
                
            return True
            
        except Exception as e:
            print(f"💥 Критическая ошибка: {e}")
            return False
            
        finally:
            self.cleanup()

def main():
    """Точка входа"""
    launcher = ProjectLauncher()
    
    try:
        success = launcher.run()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n👋 До свидания!")
        sys.exit(0)
    except Exception as e:
        print(f"💥 Неожиданная ошибка: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()