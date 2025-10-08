@echo off
REM 配置 drone-analyzer-nextjs Python 虚拟环境
echo ===== 配置 drone-analyzer-nextjs Python 虚拟环境 =====

REM 检查当前目录
echo 当前目录: %CD%
if not exist "python" (
    echo 错误: 请在 drone-analyzer-nextjs 根目录运行此脚本
    pause
    exit /b 1
)

REM 激活虚拟环境
if exist ".venv\Scripts\activate.bat" (
    echo 激活虚拟环境...
    call .venv\Scripts\activate.bat
) else (
    echo 错误: 虚拟环境未找到，请先运行 create_venv.bat
    pause
    exit /b 1
)

REM 检查网络连接
echo 检查网络连接...
ping -n 1 pypi.org >nul 2>&1
if errorlevel 1 (
    echo 警告: 无法连接到 PyPI，将使用离线模式
    echo 请确保网络连接正常，或手动下载 wheel 文件
    pause
) else (
    echo 网络连接正常
)

REM 升级 pip
echo 升级 pip...
python -m pip install --upgrade pip

REM 安装核心依赖
echo 安装核心依赖...
pip install numpy opencv-python

REM 安装AI相关依赖
echo 安装AI相关依赖...
pip install dashscope

REM 安装无人机控制依赖
echo 安装无人机控制依赖...
pip install djitellopy

REM 安装其他依赖
echo 安装其他依赖...
pip install websockets aiohttp pillow pandas python-dateutil jsonschema psutil pyserial loguru scipy scikit-learn requests python-dotenv pyzbar

echo ===== 虚拟环境配置完成 =====
echo 要激活虚拟环境，请运行: .venv\Scripts\activate.bat
echo 要测试Python环境，请运行: python python/test_env.py
pause