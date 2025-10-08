# Tello 智能代理使用说明

## 概述

Tello智能代理是一个基于自然语言的无人机控制系统，支持通过自然语言指令控制DJI Tello无人机，并可灵活接入多种AI模型（本地Ollama、标准OpenAI、Azure OpenAI）。

## 功能特性

### 🚁 无人机控制
- 基础飞行: 起飞、降落、紧急停止
- 方向控制: 前进、后退、左移、右移、上升、下降
- 旋转控制: 顺时针、逆时针旋转
- 特技动作: 翻滚动作（前翻、后翻、左翻、右翻）

### 🤖 AI智能功能
- 自然语言理解: 通过所选AI提供商（支持本地Ollama）理解用户指令
- 智能决策: 基于环境和状态做出飞行决策

### 📡 实时通信
- WebSocket连接: 实时双向通信
- 视频流: 实时视频传输和显示
- 状态监控: 电池、高度、温度等状态实时监控

### 🛡️ 安全保护
- 电池监控: 低电量自动警告和紧急降落
- 飞行限制: 最大高度和距离限制
- 紧急停止: 一键紧急停止功能

## 安装配置

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并配置以下参数：

```bash
cp .env.example .env
```

编辑 `.env` 文件（根据你的AI提供商选择相应配置）：

```env
# AI 提供商配置 (azure, openai, ollama)
AI_PROVIDER=ollama

# Azure OpenAI 配置（如使用Azure）
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT=gpt-4

# 标准 OpenAI 配置（如使用OpenAI）
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4

# Ollama 本地模型配置（推荐本地使用）
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.1:8b

# WebSocket 服务器配置（可通过环境变量覆盖）
AGENT_PORT=3004
```

### 3. 启动服务

```bash
python tello_intelligent_agent.py
```

服务将在 `localhost:3004` 或你设置的 `AGENT_PORT` 启动WebSocket服务器。

## 使用方法

### 1. 连接无人机

确保你的设备连接到Tello无人机的WiFi网络（通常名为 `TELLO-XXXXXX`）。

### 2. 打开前端界面

在浏览器中访问 `http://localhost:3000`，在组件选择器中添加"Tello智能代理"组件。

### 3. 自然语言控制

在智能代理界面中，你可以使用自然语言指令控制无人机：

#### 基础指令示例：
- "起飞" / "takeoff"
- "降落" / "land"
- "紧急停止" / "emergency"
- "向前飞行2米" / "fly forward 2 meters"
- "向左转90度" / "turn left 90 degrees"
- "查看电池状态" / "check battery"

#### 高级指令示例：
- "飞到2米高度然后向前飞行"
- "绕圈飞行一周"
- "如果电池低于20%就降落"

### 4. 手动控制

除了自然语言控制，界面还提供手动控制按钮：
- 连接/断开连接
- 起飞/降落
- 方向控制（前后左右上下）
- 旋转控制
- 紧急停止

## WebSocket API

### 消息格式（客户端 → 服务器）

- 连接无人机
```json
{"type":"connect_drone"}
```

- 断开无人机
```json
{"type":"disconnect_drone"}
```

- 自然语言指令
```json
{"type":"natural_language_command","data":{"command":"起飞并向前飞行两米"}}
```

- 执行具体无人机命令
```json
{"type":"drone_command","data":{"action":"move_forward","parameters":{"distance":50}}}
```

- 更新AI设置（动态切换到本地模型）
```json
{"type":"update_ai_settings","data":{"provider":"ollama","base_url":"http://localhost:11434/v1","model":"llama3.1:8b"}}
```

- 获取当前AI设置
```json
{"type":"get_ai_settings"}
```

### 返回消息（服务器 → 客户端）

```json
{"type":"<请求类型>_response","success":true,"message":"...","data":{}}
```

## 故障排除

1. 无法连接无人机：检查WiFi、无人机电源、重启无人机和应用。
2. AI功能不可用：检查所选AI提供商的配置（尤其是OpenAI的API Key或Azure的部署）。
3. 视频流无法显示：确保无人机已连接、检查防火墙、尝试重启视频流。

## 安全注意事项

- 飞行环境安全
- 电池监控与低电量降落
- 遵守无人机相关法规
- 人员与障碍物安全距离

## 技术支持

如遇到问题，请查看日志 `tello_agent.log`、网络连接状态以及AI提供商配置。