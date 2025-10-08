# Tello无人机多模型检测系统

## 概述

基于YOLOv11的Tello无人机多模型检测系统，支持成熟度检测和病害检测。

## 主要特性

- 🎯 **多模型检测**: 同时支持成熟度和病害检测
- 🚁 **Tello集成**: 完整的无人机控制和视频流
- ⚡ **性能优化**: 智能跟踪和帧率控制
- 🌐 **WebSocket通信**: 实时双向通信

## 快速开始

```bash
# 1. 安装依赖
pip install -r requirements_multi_model.txt

# 2. 运行安装脚本
python setup_multi_model.py

# 3. 启动系统
python tello_multi_detector_backend.py
```

## 模型配置

### 成熟度检测 (best.pt)
- 类别: ripe, semi_ripe, unripe
- 置信度阈值: 0.2

### 病害检测 (disease.pt)  
- 类别: healthy, leaf_spot, powdery_mildew, rust, blight, mosaic_virus
- 置信度阈值: 0.25

## WebSocket API

连接地址: `ws://localhost:3003`

### 主要消息类型
- `drone_connect`: 连接无人机
- `drone_takeoff`: 起飞
- `enable_maturity_detection`: 启用成熟度检测
- `enable_disease_detection`: 启用病害检测

## 故障排除

1. **模型加载失败**: 检查models/目录下的.pt文件
2. **无人机连接失败**: 确认WiFi连接和无人机状态
3. **性能问题**: 调整检测参数和硬件配置

更多详细信息请查看源码注释。