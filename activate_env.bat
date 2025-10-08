@echo off
REM 激活 drone-analyzer-nextjs 虚拟环境

echo ===== 激活 Python 虚拟环境 =====

if exist ".venv\Scripts\activate.bat" (
    echo 激活虚拟环境...
    call .venv\Scripts\activate.bat
    echo.
    echo ✅ 虚拟环境已激活
    echo 💡 使用 deactivate 命令退出虚拟环境
    echo 🔧 运行 python python/test_env.py 测试环境
    echo.
) else (
    echo ❌ 虚拟环境未找到
    echo 请先运行 setup_python_env.bat 创建虚拟环境
    pause
)