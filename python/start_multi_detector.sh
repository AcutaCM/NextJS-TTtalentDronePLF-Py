#!/bin/bash
echo "启动Tello无人机多模型检测系统..."
cd "$(dirname "$0")"
python3 tello_multi_detector_backend.py
