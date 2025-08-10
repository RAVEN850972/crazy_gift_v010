#!/bin/bash

# Скрипт для запуска тестов CrazyGift API
# Использование: ./run_tests.sh [module_name]

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода цветного текста
print_colored() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Проверка что сервер запущен
check_server() {
    print_colored $BLUE "Checking if API server is running..."
    
    if curl -s http://localhost:8000/health > /dev/null; then
        print_colored $GREEN "✓ API server is running on localhost:8000"
        return 0
    else
        print_colored $RED "✗ API server is not running on localhost:8000"
        print_colored $YELLOW "Please start the server with: python3 backend/run.py"
        return 1
    fi
}

# Функция запуска отдельного теста
run_single_test() {
    local test_name=$1
    local test_file="test_${test_name}.py"
    
    if [ ! -f "$test_file" ]; then
        print_colored $RED "✗ Test file $test_file not found"
        return 1
    fi
    
    print_colored $BLUE "Running $test_name tests..."
    
    if python3 "$test_file"; then
        print_colored $GREEN "✓ $test_name tests completed successfully"
        return 0
    else
        print_colored $RED "✗ $test_name tests failed"
        return 1
    fi
}

# Функция запуска всех тестов
run_all_tests() {
    print_colored $BLUE "Running comprehensive test suite..."
    
    if python3 test_complete.py; then
        print_colored $GREEN "✓ All tests completed successfully"
        return 0
    else
        print_colored $RED "✗ Some tests failed"
        return 1
    fi
}

# Функция показа помощи
show_help() {
    echo "CrazyGift API Test Runner"
    echo ""
    echo "Usage: $0 [module_name]"
    echo ""
    echo "Available modules:"
    echo "  system     - Test system health and basic endpoints"
    echo "  auth       - Test user authentication and profiles"
    echo "  cases      - Test case management and opening"
    echo "  payments   - Test payment system (TON and Stars)"
    echo "  inventory  - Test inventory management"
    echo "  all        - Run all tests (default)"
    echo ""
    echo "Examples:"
    echo "  $0              # Run all tests"
    echo "  $0 all          # Run all tests"
    echo "  $0 system       # Run only system tests"
    echo "  $0 auth         # Run only authentication tests"
    echo ""
}

# Основная логика
main() {
    local module_name=${1:-"all"}
    
    # Показываем помощь если запрошено
    if [[ "$module_name" == "help" || "$module_name" == "-h" || "$module_name" == "--help" ]]; then
        show_help
        exit 0
    fi
    
    print_colored $BLUE "CrazyGift API Test Runner"
    print_colored $BLUE "========================="
    
    # Проверяем что сервер запущен
    if ! check_server; then
        exit 1
    fi
    
    echo ""
    
    # Запускаем тесты
    case $module_name in
        "system"|"auth"|"cases"|"payments"|"inventory")
            run_single_test "$module_name"
            ;;
        "all")
            run_all_tests
            ;;
        *)
            print_colored $RED "Unknown module: $module_name"
            echo ""
            show_help
            exit 1
            ;;
    esac
    
    local exit_code=$?
    
    echo ""
    if [ $exit_code -eq 0 ]; then
        print_colored $GREEN "All requested tests completed successfully!"
    else
        print_colored $RED "Some tests failed. Check the output above for details."
    fi
    
    exit $exit_code
}

# Запускаем основную функцию
main "$@"