@echo off
REM 无人机智能分析平台 - 一键环境配置脚本
REM 适用于Windows系统
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║              无人机智能分析平台 - 一键环境配置               ║
echo ║                                                              ║
echo ║  此脚本将自动配置项目所需的所有环境                          ║
echo ║  包括: Node.js依赖、Python环境、AI服务                      ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM 检查是否在正确目录
if not exist "package.json" (
    echo ❌ 错误: 请在项目根目录运行此脚本
    echo 💡 提示: 请确保当前目录包含package.json文件
    pause
    exit /b 1
)

echo 检查系统环境...

REM 检查Node.js
echo.
echo ═══════════════════════════════════════════════════════════════
echo 📦 第一步: 检查Node.js环境
echo ═══════════════════════════════════════════════════════════════
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js未安装或未添加到PATH
    echo 📥 请从以下地址下载安装Node.js 18或更高版本:
    echo    https://nodejs.org/zh-cn/download/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo ✅ Node.js已安装: %NODE_VERSION%
)

REM 检查npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm未安装
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo ✅ npm已安装: %NPM_VERSION%
)

REM 检查Python
echo.
echo ═══════════════════════════════════════════════════════════════
echo 🐍 第二步: 检查Python环境
echo ═══════════════════════════════════════════════════════════════
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python未安装或未添加到PATH
    echo 📥 请从以下地址下载安装Python 3.8或更高版本:
    echo    https://www.python.org/downloads/
    echo 💡 安装时请勾选"Add Python to PATH"选项
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
    echo ✅ Python已安装: %PYTHON_VERSION%
)

echo.
echo ═══════════════════════════════════════════════════════════════
echo 📦 第三步: 安装前端依赖
echo ═══════════════════════════════════════════════════════════════
echo 正在安装Node.js依赖...
echo 这可能需要几分钟时间，请耐心等待...
npm install
if errorlevel 1 (
    echo ❌ npm install失败
    echo 💡 尝试清理缓存后重新安装...
    npm cache clean --force
    if exist node_modules rmdir /s /q node_modules
    if exist package-lock.json del package-lock.json
    npm install
    if errorlevel 1 (
        echo ❌ 前端依赖安装失败，请检查网络连接
        pause
        exit /b 1
    )
)
echo ✅ 前端依赖安装完成

echo.
echo ═══════════════════════════════════════════════════════════════
echo 🐍 第四步: 配置Python虚拟环境
echo ═══════════════════════════════════════════════════════════════

REM 创建虚拟环境
if not exist ".venv" (
    echo 创建Python虚拟环境...
    python -m venv .venv
    if errorlevel 1 (
        echo ❌ 虚拟环境创建失败
        pause
        exit /b 1
    )
    echo ✅ 虚拟环境创建成功
) else (
    echo ✅ 虚拟环境已存在
)

REM 激活虚拟环境
echo 激活虚拟环境...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo ❌ 虚拟环境激活失败
    pause
    exit /b 1
)

REM 升级pip
echo 升级pip...
python -m pip install --upgrade pip

REM 安装Python依赖
echo 安装Python依赖...
echo 这可能需要几分钟时间，特别是OpenCV等大型库...
pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ Python依赖安装失败
    echo 💡 尝试使用国内镜像源...
    pip install -i https://pypi.tuna.tsinghua.edu.cn/simple/ -r requirements.txt
    if errorlevel 1 (
        echo ❌ Python依赖安装失败，请检查网络连接
        pause
        exit /b 1
    )
)
echo ✅ Python依赖安装完成

echo.
echo ═══════════════════════════════════════════════════════════════
echo 🧪 第五步: 环境测试
echo ═══════════════════════════════════════════════════════════════
echo 测试Python环境...
python python/test_env.py
if errorlevel 1 (
    echo ⚠️ 环境测试发现问题，但核心功能可能仍可正常使用
) else (
    echo ✅ 环境测试通过
)

echo.
echo ═══════════════════════════════════════════════════════════════
echo 🤖 第六步: AI服务配置（可选）
echo ═══════════════════════════════════════════════════════════════
echo.
echo AI服务配置是可选的，即使不配置AI，系统核心功能仍可正常使用
echo.
set /p SETUP_AI="是否要配置本地AI服务？(y/n): "
if /i "%SETUP_AI%"=="y" (
    echo.
    echo 检查Ollama安装状态...
    ollama --version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Ollama未安装
        echo 📥 请从以下地址下载安装Ollama:
        echo    https://ollama.ai/download
        echo.
        echo 安装完成后请：
        echo 1. 重新运行此脚本
        echo 2. 或手动执行: ollama serve 和 ollama pull qwen2.5-vl:7b
        echo.
    ) else (
        echo ✅ Ollama已安装
        echo.
        echo 启动Ollama服务...
        start /b ollama serve
        timeout /t 5 /nobreak >nul
        
        echo 下载AI模型 qwen2.5-vl:7b...
        echo 这是一个约4GB的模型，下载可能需要较长时间...
        ollama pull qwen2.5-vl:7b
        if errorlevel 1 (
            echo ⚠️ 模型下载失败，可能是网络问题
            echo 💡 可以稍后手动执行: ollama pull qwen2.5-vl:7b
        ) else (
            echo ✅ AI模型下载完成
        )
        
        echo 运行AI服务诊断...
        powershell -ExecutionPolicy Bypass -File "diagnose_ollama.ps1"
    )
) else (
    echo 跳过AI服务配置
    echo 系统将使用后备建议功能，核心功能不受影响
)

echo.
echo ═══════════════════════════════════════════════════════════════
echo 📝 第七步: 创建配置文件
echo ═══════════════════════════════════════════════════════════════

REM 创建 .env.local 文件
if not exist ".env.local" (
    echo 创建环境配置文件...
    (
        echo # 无人机智能分析平台配置文件
        echo.
        echo # AI模型配置
        echo QWEN_BASE_URL=http://localhost:11434/v1
        echo QWEN_MODEL=qwen2.5-vl:7b
        echo.
        echo # 无人机配置
        echo DRONE_WEBSOCKET_URL=ws://localhost:8765
        echo.
        echo # API配置
        echo NEXT_PUBLIC_API_URL=http://localhost:3000/api
        echo.
        echo # 可选：阿里云AI服务
        echo # DASHSCOPE_API_KEY=your_api_key_here
    ) > .env.local
    echo ✅ 环境配置文件创建完成
) else (
    echo ✅ 环境配置文件已存在
)

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                        🎉 配置完成！                        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo ✅ 前端环境: Node.js + npm 依赖已安装
echo ✅ 后端环境: Python 虚拟环境和依赖已配置
echo ✅ 配置文件: .env.local 已创建
if /i "%SETUP_AI%"=="y" (
    echo ✅ AI服务: Ollama 和模型已配置
) else (
    echo ⏭️ AI服务: 已跳过（可稍后配置）
)
echo.
echo ═══════════════════════════════════════════════════════════════
echo 🚀 启动项目
echo ═══════════════════════════════════════════════════════════════
echo.
echo 现在你可以启动项目了：
echo.
echo 启动前端:
echo    npm run dev
echo.
echo 启动后端:
echo    start_python_backend.bat
echo    或: python python/drone_backend.py
echo.
echo 如果配置了AI服务:
echo    ollama serve
echo.
echo 前端访问地址: http://localhost:3000
echo 后端WebSocket: ws://localhost:8765
echo AI服务地址: http://localhost:11434
echo.
echo ═══════════════════════════════════════════════════════════════
echo 📚 重要文件
echo ═══════════════════════════════════════════════════════════════
echo.
echo 新手入门指南.md - 详细使用说明
echo TROUBLESHOOTING.md - 故障排除指南
echo README_CN.md - 项目详细文档
echo.
echo ═══════════════════════════════════════════════════════════════
echo 💡 下一步建议
echo ═══════════════════════════════════════════════════════════════
echo.
echo 1. 阅读 "新手入门指南.md" 了解详细使用方法
echo 2. 启动前端: npm run dev
echo 3. 启动后端: start_python_backend.bat
echo 4. 连接DJI Tello无人机进行测试
echo 5. 如遇问题，查看 TROUBLESHOOTING.md
echo.
set /p START_NOW="是否现在启动前端开发服务器？(y/n): "
if /i "%START_NOW%"=="y" (
    echo.
    echo 启动前端开发服务器...
    echo 请在新的命令行窗口运行 start_python_backend.bat 启动后端
    echo.
    npm run dev
) else (
    echo.
    echo 配置完成！请随时运行 npm run dev 启动项目
)

echo.
echo 感谢使用无人机智能分析平台！
pause