@echo off
echo 启动Tello无人机多模型检测系统...
cd /d "%~dp0"
python tello_multi_detector_backend.py
pause
