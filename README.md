<p align="center"><h1>Drone Analyzer Next.js</h1></p>  

> 智慧农业多模态平台前端（基于 DJI Tello 无人机 · Next.js + Python 后端集成）
> 
<img width="544" height="96" alt="image" src="https://github.com/user-attachments/assets/3083ee25-d9ba-4bc2-b95e-2737490deb64" />


[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Ant Design](https://img.shields.io/badge/Ant%20Design-5.0-blue?logo=antdesign)](https://ant.design/)
[![Python](https://img.shields.io/badge/Python-3.10+-yellow?logo=python)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Drone Ready](https://img.shields.io/badge/Drone-Tello-blueviolet?logo=dji)]()
[![Vision Model](https://img.shields.io/badge/AI-UniPixel--3B-orange?logo=huggingface)]()

---

##  目录

- [项目简介](#-项目简介)
- [功能亮点](#-功能亮点)
- [技术栈与架构](#-技术栈与架构)
- [项目结构](#-项目结构)
- [核心模块说明](#-核心模块说明)
- [快速开始](#️-快速开始)
- [后端接口说明](#-后端接口说明)
- [环境变量](#-环境变量)
- [开发与贡献](#-开发与贡献)
- [创新价值](#-创新价值)
- [许可证](#-许可证)
- [致谢](#-致谢)

---

##  项目简介

**Drone Analyzer Next.js** 是一个基于 **Next.js + Python WebSocket 后端** 的  
**多模态农业无人机智能分析平台前端**。

平台集成了：

-  AI 助手与多模型聊天
-  作物病害视觉识别（UniPixel-3B）
-  DJI Tello 无人机自然语言控制
-  模型市场与智能分析报表  
-  可视化布局、拖拽组件与动态动画

致力于通过 AI 与无人机结合，赋能农业巡检、作物健康评估与精准病虫害防治。

---

##  功能亮点

| 模块                     | 描述                                                         |
| ------------------------ | ------------------------------------------------------------ |
| 🤖 **多模型聊天系统**     | 支持 OpenAI、Gemini、Qwen、DeepSeek、Ollama、Groq、Anthropic 等主流服务；流式输出与高亮渲染。 |
| 🧑‍🌾 **AI 助手市场**       | 自定义提示词、角色与模型参数；可激活无人机智能代理。         |
| 🌾 **视觉识别与病害分析** | 使用 UniPixel-3B 模型完成图像分割、作物健康评分与病虫害检测。 |
| 🚁 **无人机自然语言控制** | 语音 / 文本 → 控制 Tello 飞行、拍照、回传视频并分析。        |
| 🧭 **智能前端交互**       | 消息吸底、动态打字动画、可折叠布局、Markdown 支持与状态追踪。 |

---

##  技术栈与架构

| 层级     | 技术                                 |
| -------- | ------------------------------------ |
| 前端框架 | Next.js 14 (React 18 + TypeScript)   |
| UI 设计  | Ant Design + Emotion                 |
| 状态管理 | React Context + Hooks                |
| 通信协议 | REST + WebSocket                     |
| 后端接口 | Python (FastAPI / WebSocket Gateway) |
| 视觉模型 | UniPixel-3B / HuggingFace API        |
| 运行环境 | Node.js ≥ 18 / Vercel / Docker       |

---

##  项目结构

```bash
release/drone-analyzer-nextjs/
├── components/
│   ├── ChatbotChat/              # 多模态聊天核心
│   ├── DroneControlPanel.tsx     # 无人机飞行控制
│   ├── TelloIntelligentAgent.tsx # 自然语言控制接口
│   ├── AIAnalysisPanel.tsx       # AI 视觉分析
│   ├── layout/                   # 动态布局系统
│   └── ui/                       # 通用 UI 与动画组件
├── app/ 或 pages/                 # 页面入口
├── public/                        # 静态资源
├── styles/                        # 全局样式
└── package.json
```

---

##  核心模块说明

###  ChatbotChat / Assistant Manager  

- 多模型聊天主界面  
- 助手个性化配置与上下文保存  
- 支持 SSE 流式响应、Markdown、高亮语法

###  DroneControlPanel / TelloAgent  

- 提供自然语言指令解析 → Tello SDK 控制  
- 实现起飞、降落、旋转、拍照、任务识别等功能  
- 通过 WebSocket `ws://127.0.0.1:3004` 实时通信

###  AIAnalysisPanel  

- 作物视觉分割与健康报告生成  
- 调用 UniPixel-3B 模型端点（本地或云端）  
- 输出病害检测热力图与健康评分

---

## ️ 快速开始

###  前置依赖

- Node.js ≥ 18
- npm ≥ 9（或使用 yarn/pnpm）

###  启动项目

```bash
git clone https://github.com/AcutaCM/NextJS-TTtalentDronePLF-Py.git
cd release/drone-analyzer-nextjs
npm install
npm run dev
```

访问：http://localhost:3000

###  构建生产版本

```bash
npm run build
npm run start
```

>  提示：若出现内存不足，可执行：
>
> ```bash
> set NODE_OPTIONS=--max_old_space_size=4096
> ```
# Unipixel+WSL配置指南

### 1.在Ubuntu22.04中安装miniconda

运行以下四个命令，下载并安装适用于您选择的芯片架构的最新 Linux 安装程序。逐行，这些命令：

- 在主目录中创建一个名为“miniconda3”的新目录。
- 下载适用于您选择的芯片架构的 Linux Miniconda 安装脚本，并将脚本保存为 miniconda3 目录。`miniconda.sh`
- 使用 bash 在静默模式下运行安装脚本。`miniconda.sh`
- 安装完成后删除安装脚本文件。`miniconda.sh`

```
mkdir -p ~/miniconda3
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O ~/miniconda3/miniconda.sh
bash ~/miniconda3/miniconda.sh -b -u -p ~/miniconda3
rm ~/miniconda3/miniconda.sh
```

1. 安装后，关闭并重新打开终端应用程序或通过运行以下命令刷新它：

   ```
   source ~/miniconda3/bin/activate
   ```

2. 然后，通过运行以下命令在所有可用的 shell 上初始化 conda：

   ```
   conda init --all
   ```

   使用 会修改某些 shell 配置文件，例如 或 。要测试哪些文件将在您的系统上修改，请运行带有标志的命令。`conda init``.bash_profile``.zshrc``conda init``--dry-run`

   ```
   conda init --all --dry-run
   ```

   包括可防止 conda 进行任何实际文件更新。`--dry-run`

### 2.安裝環境

1. 從 GitHub 複製該倉庫。

```shell
git clone https://github.com/PolyU-ChenLab/UniPixel.git
cd UniPixel
```

2. 設定虛擬環境以及安装依赖

```shell
conda create -n unipixel python=3.12 -y
conda activate unipixel

pip install torch==2.7.1 torchvision==0.22.1 --index-url https://download.pytorch.org/whl/cu128

pip install flash_attn==2.8.2 --no-build-isolation 
```

3. 安裝依賴項。

```shell
pip install -r requirements.txt
```

對於 NPU 用戶，請安裝 CPU 版本的 PyTorch [`torch_npu`](https://github.com/Ascend/pytorch)。

### 3. 安装FASTAPI环境

```bash
pip install fastapi
```

### 4. 复制开放服务脚本`service.py`到Unipixel-3B文件夹下

```
cp ./service.py ./Unipixel-3B
```

### 5.运行脚本

```
conda activate unipixel
python service.py
```

等待脚本下载完模型文件即可使用对应端口传递的数据
---

##  后端接口说明（简要）

| 模块     | 路径                   | 功能                        |
| -------- | ---------------------- | --------------------------- |
| Auth     | `/api/auth/current`    | 用户身份与凭证管理          |
| Chat     | `/api/chat-proxy`      | 流式多模型聊天代理          |
| Vision   | `/api/vision/analyze`  | 图像识别与病害分析          |
| UniPixel | `/api/vision/unipixel` | 图像分割端点                |
| Drone    | `/api/drone/connect`   | 无人机控制通道（WebSocket） |

---

##  环境变量

| Key               | 用途                 |
| ----------------- | -------------------- |
| `chat.apiKey.*`   | 各模型服务商 API Key |
| `chat.apiBase.*`  | 各模型 API Base URL  |
| `tello.ip`        | 无人机 IP 地址       |
| `tello.ws`        | WebSocket 通信地址   |
| `NEXTAUTH_SECRET` | 登录安全密钥         |
| `.env.local`      | 本地环境配置         |

---

##  开发与贡献

欢迎开发者参与改进与扩展本平台：

```bash
# 代码风格
npm run lint

# 格式化
npm run format
```

 **规范约定：**

- Commit 规范：`feat:`、`fix:`、`docs:`、`chore:` 等  
- 组件优先函数化，Hooks 管理状态  
- 所有副作用需手动清理（SSE / WebSocket）

---

##  创新价值

- **智慧农业升级**：从巡检到诊断的智能自动化闭环  
- **多模态 AI 融合**：语言、视觉与动作一体化  
- **模块化架构**：支持不同模型或无人机品牌接入  
- **科研与教学价值**：高校 AI + 农业信息化实训平台  

---

##  许可证

本项目基于 [MIT License](LICENSE) 开源。  
如涉及商业部署，请遵循各第三方模型服务商的使用条款。

---

##  致谢

感谢以下项目与社区提供的开源支持：

- [Next.js](https://nextjs.org/)  
- [Ant Design](https://ant.design/)  
- [Ollama](https://ollama.ai/)  
- [UniPixel-3B](https://huggingface.co/PolyU-ChenLab/UniPixel)  
- 智慧农业与开源 AI 社区开发者

---
