@echo off
REM 启动 drone-analyzer-nextjs Python 后端服务

echo ===== 启动 Python 后端服务 =====

REM 检查虚拟环境
if not exist ".venv\Scripts\activate.bat" (
    echo ❌ 虚拟环境未找到
    echo 请先运行 setup_python_env.bat 创建并配置虚拟环境
    pause
    exit /b 1
)

REM 激活虚拟环境
echo 激活虚拟环境...
call .venv\Scripts\activate.bat

REM 检查Python文件
if not exist "python\drone_backend.py" (
    echo ❌ 后端服务文件未找到: python\drone_backend.py
    pause
    exit /b 1
)

echo ✅ 虚拟环境已激活
echo 🚀 启动无人机后端服务...
echo.
echo 💡 使用 Ctrl+C 停止服务
echo 🌐 WebSocket 服务通常运行在 ws://localhost:8765
echo 📱 HTTP API 服务通常运行在 http://localhost:8766
echo.

REM 启动后端服务
python python\drone_backend.py

echo.
echo 🛑 后端服务已停止
pause