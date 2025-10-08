#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tello智能代理后端服务
集成Azure OpenAI实现自然语言控制无人机
基于Tello-Drone-Agent项目进行集成
"""

import sys
import os
import json
import asyncio
import threading
import time
import argparse
from datetime import datetime
import traceback
import base64
import numpy as np
from collections import deque
from concurrent.futures import ThreadPoolExecutor
import queue
import weakref
import gc
from typing import Dict, List, Optional, Tuple, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
import logging

# 设置控制台编码为UTF-8
if sys.platform.startswith('win'):
    try:
        if hasattr(sys.stdout, 'reconfigure') and callable(getattr(sys.stdout, 'reconfigure', None)):
            sys.stdout.reconfigure(encoding='utf-8')
        if hasattr(sys.stderr, 'reconfigure') and callable(getattr(sys.stderr, 'reconfigure', None)):
            sys.stderr.reconfigure(encoding='utf-8')
    except:
        pass

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# WebSocket导入
try:
    import websockets
    from websockets.server import serve
    WEBSOCKETS_AVAILABLE = True
    logger.info("✅ websockets库加载成功")
except ImportError as e:
    WEBSOCKETS_AVAILABLE = False
    logger.error(f"✗ websockets库导入失败: {e}")

# DJI Tello导入
try:
    from djitellopy import Tello
    TELLO_AVAILABLE = True
    logger.info("✅ djitellopy库加载成功")
except ImportError as e:
    TELLO_AVAILABLE = False
    logger.error(f"✗ djitellopy库导入失败: {e}")

# OpenCV导入
try:
    import cv2
    CV2_AVAILABLE = True
    logger.info("✅ OpenCV库加载成功")
except ImportError as e:
    CV2_AVAILABLE = False
    logger.error(f"✗ OpenCV库导入失败: {e}")

# Azure OpenAI导入
try:
    from openai import AzureOpenAI
    AZURE_OPENAI_AVAILABLE = True
    logger.info("✅ Azure OpenAI库加载成功")
except ImportError as e:
    AZURE_OPENAI_AVAILABLE = False
    logger.error(f"✗ Azure OpenAI库导入失败: {e}")

# 已剥离 Azure Vision：移除相关导入
# try:
#     from azure.ai.vision.imageanalysis import ImageAnalysisClient
#     from azure.ai.vision.imageanalysis.models import VisualFeatures
#     from azure.core.credentials import AzureKeyCredential
#     AZURE_VISION_AVAILABLE = True
#     logger.info("✅ Azure Vision库加载成功")
# except ImportError as e:
#     AZURE_VISION_AVAILABLE = False
#     logger.error(f"✗ Azure Vision库导入失败: {e}")


@dataclass
class TelloAgentConfig:
    """Tello智能代理配置"""
    # WebSocket配置
    ws_host: str = "localhost"
    ws_port: int = 3004
    
    # Azure OpenAI配置
    azure_openai_endpoint: str = ""
    azure_openai_key: str = ""
    azure_openai_deployment: str = "gpt-4"
    azure_openai_api_version: str = "2024-02-15-preview"
    
    # 已剥离 Azure Vision：移除视觉配置
    # azure_vision_endpoint: str = ""
    # azure_vision_key: str = ""
    
    # Tello配置
    tello_ip: str = "192.168.10.1"
    tello_port: int = 8889
    
    # 视频流配置
    video_enabled: bool = True
    video_quality: str = "medium"  # low, medium, high
    
    # 安全配置
    max_flight_height: int = 300  # cm
    min_battery_level: int = 20   # %
    emergency_land_on_low_battery: bool = True


class TelloAgentState(Enum):
    """Tello代理状态"""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    FLYING = "flying"
    LANDING = "landing"
    ERROR = "error"


@dataclass
class DroneStatus:
    """无人机状态"""
    connected: bool = False
    flying: bool = False
    battery: int = 0
    temperature: int = 0
    height: int = 0
    speed: Dict[str, float] = field(default_factory=lambda: {"x": 0, "y": 0, "z": 0})
    position: Dict[str, float] = field(default_factory=lambda: {"x": 0, "y": 0, "z": 0})
    wifi_signal: int = 0
    flight_time: int = 0


class TelloIntelligentAgent:
    """Tello智能代理主类"""
    
    def __init__(self, config: TelloAgentConfig):
        self.config = config
        self.state = TelloAgentState.DISCONNECTED
        self.drone_status = DroneStatus()
        
        # Tello无人机实例
        self.tello = None
        
        # Azure客户端
        self.azure_openai_client = None
        # 已剥离 Azure Vision：移除客户端
        # self.azure_vision_client = None
        
        # WebSocket连接管理
        self.websocket_clients = set()
        
        # 视频流管理
        self.video_thread = None
        self.video_running = False
        self.current_frame = None
        
        # 命令队列
        self.command_queue = asyncio.Queue()
        self.command_processor_task = None
        
        # 日志记录
        self.logger = logging.getLogger(f"{__name__}.TelloAgent")
        
        # 初始化Azure客户端
        self._init_azure_clients()

    def _init_azure_clients(self):
        """初始化Azure客户端"""
        try:
            if AZURE_OPENAI_AVAILABLE and self.config.azure_openai_endpoint and self.config.azure_openai_key:
                self.azure_openai_client = AzureOpenAI(
                    azure_endpoint=self.config.azure_openai_endpoint,
                    api_key=self.config.azure_openai_key,
                    api_version=self.config.azure_openai_api_version
                )
                self.logger.info("Azure OpenAI客户端初始化成功")
            
            # 已剥离 Azure Vision：不再初始化视觉客户端
            # if AZURE_VISION_AVAILABLE and self.config.azure_vision_endpoint and self.config.azure_vision_key:
            #     self.azure_vision_client = ImageAnalysisClient(
            #         endpoint=self.config.azure_vision_endpoint,
            #         credential=AzureKeyCredential(self.config.azure_vision_key)
            #     )
            #     self.logger.info("Azure Vision客户端初始化成功")
                
        except Exception as e:
            self.logger.error(f"Azure客户端初始化失败: {e}")
    
    async def connect_tello(self) -> bool:
        """连接Tello无人机"""
        try:
            if not TELLO_AVAILABLE:
                self.logger.error("djitellopy库不可用")
                return False
            
            self.state = TelloAgentState.CONNECTING
            self.logger.info("正在连接Tello无人机...")
            
            self.tello = Tello()
            self.tello.connect()
            
            # 获取基本状态
            battery = self.tello.get_battery()
            temperature = self.tello.get_temperature()
            
            self.drone_status.connected = True
            self.drone_status.battery = battery
            self.drone_status.temperature = temperature
            
            self.state = TelloAgentState.CONNECTED
            self.logger.info(f"Tello连接成功 - 电池: {battery}%, 温度: {temperature}°C")
            
            # 启动视频流
            if self.config.video_enabled:
                await self.start_video_stream()
            
            # 广播连接状态
            await self.broadcast_status()
            
            return True
            
        except Exception as e:
            self.logger.error(f"Tello连接失败: {e}")
            self.state = TelloAgentState.ERROR
            self.drone_status.connected = False
            await self.broadcast_status()
            return False
    
    async def disconnect_tello(self):
        """断开Tello连接"""
        try:
            if self.tello:
                if self.drone_status.flying:
                    self.logger.warning("无人机仍在飞行中，执行紧急降落")
                    await self.emergency_land()
                
                await self.stop_video_stream()
                self.tello.end()
                self.tello = None
            
            self.state = TelloAgentState.DISCONNECTED
            self.drone_status = DroneStatus()
            
            await self.broadcast_status()
            self.logger.info("Tello连接已断开")
            
        except Exception as e:
            self.logger.error(f"断开Tello连接时出错: {e}")
    
    async def start_video_stream(self):
        """启动视频流"""
        try:
            if not self.tello or not CV2_AVAILABLE:
                return
            
            self.tello.streamon()
            self.video_running = True
            
            # 启动视频处理线程
            self.video_thread = threading.Thread(target=self._video_stream_worker, daemon=True)
            self.video_thread.start()
            
            self.logger.info("视频流已启动")
            
        except Exception as e:
            self.logger.error(f"启动视频流失败: {e}")
    
    async def stop_video_stream(self):
        """停止视频流"""
        try:
            self.video_running = False
            
            if self.video_thread and self.video_thread.is_alive():
                self.video_thread.join(timeout=2)
            
            if self.tello:
                self.tello.streamoff()
            
            self.logger.info("视频流已停止")
            
        except Exception as e:
            self.logger.error(f"停止视频流失败: {e}")
    
    def _video_stream_worker(self):
        """视频流工作线程"""
        try:
            while self.video_running and self.tello:
                frame = self.tello.get_frame_read().frame
                if frame is not None:
                    self.current_frame = frame
                    # 这里可以添加视频帧处理逻辑
                time.sleep(0.033)  # ~30 FPS
                
        except Exception as e:
            self.logger.error(f"视频流处理错误: {e}")
    
    async def process_natural_language_command(self, command: str) -> Dict[str, Any]:
        """处理自然语言命令"""
        try:
            if not self.azure_openai_client:
                return {"success": False, "error": "Azure OpenAI客户端未配置"}
            
            # 构建系统提示
            system_prompt = """你是一个专业的无人机控制AI助手。你的任务是将用户的自然语言指令转换为具体的无人机控制命令。

支持的命令类型：
1. 基础飞行：takeoff(起飞), land(降落), emergency(紧急停止)
2. 移动控制：move_up(上升), move_down(下降), move_left(左移), move_right(右移), move_forward(前进), move_back(后退)
3. 旋转控制：rotate_clockwise(顺时针旋转), rotate_counter_clockwise(逆时针旋转)
4. 翻滚动作：flip_forward(前翻), flip_back(后翻), flip_left(左翻), flip_right(右翻)
5. 状态查询：get_battery(查询电池), get_temperature(查询温度), get_height(查询高度)

请将用户指令转换为JSON格式，包含以下字段：
- action: 动作类型
- parameters: 参数（如距离、角度等）
- description: 动作描述

示例：
用户："起飞然后向前飞行50厘米"
回复：[
  {"action": "takeoff", "parameters": {}, "description": "无人机起飞"},
  {"action": "move_forward", "parameters": {"distance": 50}, "description": "向前飞行50厘米"}
]"""

            # 调用Azure OpenAI
            response = self.azure_openai_client.chat.completions.create(
                model=self.config.azure_openai_deployment,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": command}
                ],
                temperature=0.3,
                max_tokens=1000
            )
            
            # 解析响应
            ai_response = response.choices[0].message.content
            self.logger.info(f"AI响应: {ai_response}")
            
            # 尝试解析JSON
            try:
                commands = json.loads(ai_response)
                if not isinstance(commands, list):
                    commands = [commands]
                
                return {
                    "success": True,
                    "commands": commands,
                    "raw_response": ai_response
                }
                
            except json.JSONDecodeError:
                return {
                    "success": False,
                    "error": "AI响应格式错误",
                    "raw_response": ai_response
                }
            
        except Exception as e:
            self.logger.error(f"处理自然语言命令失败: {e}")
            return {"success": False, "error": str(e)}
    
    async def execute_drone_command(self, action: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """执行无人机命令"""
        try:
            if not self.tello or not self.drone_status.connected:
                return {"success": False, "error": "无人机未连接"}
            
            if parameters is None:
                parameters = {}
            
            result = {"success": True, "action": action, "message": ""}
            
            # 基础飞行命令
            if action == "takeoff":
                if self.drone_status.battery < self.config.min_battery_level:
                    return {"success": False, "error": f"电池电量过低({self.drone_status.battery}%)，无法起飞"}
                
                self.tello.takeoff()
                self.drone_status.flying = True
                self.state = TelloAgentState.FLYING
                result["message"] = "起飞成功"
                
            elif action == "land":
                self.tello.land()
                self.drone_status.flying = False
                self.state = TelloAgentState.CONNECTED
                result["message"] = "降落成功"
                
            elif action == "emergency":
                self.tello.emergency()
                self.drone_status.flying = False
                self.state = TelloAgentState.CONNECTED
                result["message"] = "紧急停止执行"
            
            # 移动命令
            elif action == "move_up":
                distance = parameters.get("distance", 20)
                self.tello.move_up(distance)
                result["message"] = f"上升{distance}厘米"
                
            elif action == "move_down":
                distance = parameters.get("distance", 20)
                self.tello.move_down(distance)
                result["message"] = f"下降{distance}厘米"
                
            elif action == "move_left":
                distance = parameters.get("distance", 20)
                self.tello.move_left(distance)
                result["message"] = f"左移{distance}厘米"
                
            elif action == "move_right":
                distance = parameters.get("distance", 20)
                self.tello.move_right(distance)
                result["message"] = f"右移{distance}厘米"
                
            elif action == "move_forward":
                distance = parameters.get("distance", 20)
                self.tello.move_forward(distance)
                result["message"] = f"前进{distance}厘米"
                
            elif action == "move_back":
                distance = parameters.get("distance", 20)
                self.tello.move_back(distance)
                result["message"] = f"后退{distance}厘米"
            
            # 旋转命令
            elif action == "rotate_clockwise":
                degrees = parameters.get("degrees", 90)
                self.tello.rotate_clockwise(degrees)
                result["message"] = f"顺时针旋转{degrees}度"
                
            elif action == "rotate_counter_clockwise":
                degrees = parameters.get("degrees", 90)
                self.tello.rotate_counter_clockwise(degrees)
                result["message"] = f"逆时针旋转{degrees}度"
            
            # 翻滚命令
            elif action in ["flip_forward", "flip_back", "flip_left", "flip_right"]:
                direction = action.split("_")[1]
                self.tello.flip(direction[0])  # f, b, l, r
                result["message"] = f"{direction}方向翻滚"
            
            # 状态查询
            elif action == "get_battery":
                battery = self.tello.get_battery()
                self.drone_status.battery = battery
                result["message"] = f"电池电量: {battery}%"
                result["data"] = {"battery": battery}
                
            elif action == "get_temperature":
                temperature = self.tello.get_temperature()
                self.drone_status.temperature = temperature
                result["message"] = f"温度: {temperature}°C"
                result["data"] = {"temperature": temperature}
                
            elif action == "get_height":
                height = self.tello.get_height()
                self.drone_status.height = height
                result["message"] = f"高度: {height}厘米"
                result["data"] = {"height": height}
            
            else:
                return {"success": False, "error": f"未知命令: {action}"}
            
            # 更新状态并广播
            await self.update_drone_status()
            await self.broadcast_status()
            
            return result
            
        except Exception as e:
            self.logger.error(f"执行无人机命令失败: {e}")
            return {"success": False, "error": str(e)}
    
    async def emergency_land(self):
        """紧急降落"""
        try:
            if self.tello and self.drone_status.flying:
                self.tello.emergency()
                self.drone_status.flying = False
                self.state = TelloAgentState.CONNECTED
                await self.broadcast_status()
                self.logger.info("执行紧急降落")
        except Exception as e:
            self.logger.error(f"紧急降落失败: {e}")
    
    async def update_drone_status(self):
        """更新无人机状态"""
        try:
            if self.tello and self.drone_status.connected:
                self.drone_status.battery = self.tello.get_battery()
                self.drone_status.temperature = self.tello.get_temperature()
                self.drone_status.height = self.tello.get_height()
                
                # 检查低电量
                if (self.drone_status.battery < self.config.min_battery_level and 
                    self.config.emergency_land_on_low_battery and 
                    self.drone_status.flying):
                    self.logger.warning(f"电池电量过低({self.drone_status.battery}%)，执行紧急降落")
                    await self.emergency_land()
                    
        except Exception as e:
            self.logger.error(f"更新无人机状态失败: {e}")
    
    async def broadcast_status(self):
        """广播状态到所有WebSocket客户端"""
        if not self.websocket_clients:
            return
        
        status_message = {
            "type": "drone_status",
            "data": {
                "state": self.state.value,
                "connected": self.drone_status.connected,
                "flying": self.drone_status.flying,
                "battery": self.drone_status.battery,
                "temperature": self.drone_status.temperature,
                "height": self.drone_status.height,
                "timestamp": datetime.now().isoformat()
            }
        }
        
        # 发送给所有连接的客户端
        disconnected_clients = set()
        for client in self.websocket_clients:
            try:
                await client.send(json.dumps(status_message))
            except:
                disconnected_clients.add(client)
        
        # 清理断开的连接
        self.websocket_clients -= disconnected_clients
    
    async def handle_websocket_message(self, websocket, message_data: Dict[str, Any]):
        """处理WebSocket消息"""
        try:
            message_type = message_data.get("type", "")
            data = message_data.get("data", {})
            
            response = {"type": f"{message_type}_response", "success": False}
            
            if message_type == "connect_drone":
                success = await self.connect_tello()
                response["success"] = success
                response["message"] = "连接成功" if success else "连接失败"
                
            elif message_type == "disconnect_drone":
                await self.disconnect_tello()
                response["success"] = True
                response["message"] = "断开连接成功"
                
            elif message_type == "natural_language_command":
                command = data.get("command", "")
                if command:
                    # 处理自然语言命令
                    ai_result = await self.process_natural_language_command(command)
                    
                    if ai_result["success"]:
                        # 执行解析出的命令
                        execution_results = []
                        for cmd in ai_result["commands"]:
                            result = await self.execute_drone_command(
                                cmd["action"], 
                                cmd.get("parameters", {})
                            )
                            execution_results.append(result)
                        
                        response["success"] = True
                        response["ai_analysis"] = ai_result
                        response["execution_results"] = execution_results
                        response["message"] = "命令执行完成"
                    else:
                        response["error"] = ai_result.get("error", "AI处理失败")
                        response["ai_analysis"] = ai_result
                else:
                    response["error"] = "命令不能为空"
                    
            elif message_type == "drone_command":
                action = data.get("action", "")
                parameters = data.get("parameters", {})
                
                if action:
                    result = await self.execute_drone_command(action, parameters)
                    response.update(result)
                else:
                    response["error"] = "动作不能为空"
                    
            elif message_type == "get_status":
                await self.update_drone_status()
                response["success"] = True
                response["data"] = {
                    "state": self.state.value,
                    "drone_status": {
                        "connected": self.drone_status.connected,
                        "flying": self.drone_status.flying,
                        "battery": self.drone_status.battery,
                        "temperature": self.drone_status.temperature,
                        "height": self.drone_status.height
                    }
                }
            
            else:
                response["error"] = f"未知消息类型: {message_type}"
            
            # 发送响应
            await websocket.send(json.dumps(response))
            
        except Exception as e:
            self.logger.error(f"处理WebSocket消息失败: {e}")
            error_response = {
                "type": f"{message_data.get('type', 'unknown')}_response",
                "success": False,
                "error": str(e)
            }
            try:
                await websocket.send(json.dumps(error_response))
            except:
                pass
    
    async def websocket_handler(self, websocket, path):
        """WebSocket连接处理器"""
        self.websocket_clients.add(websocket)
        self.logger.info(f"新的WebSocket连接: {websocket.remote_address}")
        
        try:
            # 发送当前状态
            await self.broadcast_status()
            
            async for message in websocket:
                try:
                    message_data = json.loads(message)
                    await self.handle_websocket_message(websocket, message_data)
                except json.JSONDecodeError:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "success": False,
                        "error": "无效的JSON格式"
                    }))
                except Exception as e:
                    self.logger.error(f"处理消息时出错: {e}")
                    
        except Exception as e:
            self.logger.error(f"WebSocket连接错误: {e}")
        finally:
            self.websocket_clients.discard(websocket)
            self.logger.info(f"WebSocket连接断开: {websocket.remote_address}")
    
    async def start_server(self):
        """启动WebSocket服务器"""
        try:
            if not WEBSOCKETS_AVAILABLE:
                self.logger.error("websockets库不可用，无法启动服务器")
                return
            
            self.logger.info(f"启动Tello智能代理服务器: {self.config.ws_host}:{self.config.ws_port}")
            
            async with serve(
                self.websocket_handler,
                self.config.ws_host,
                self.config.ws_port
            ):
                self.logger.info("Tello智能代理服务器已启动")
                await asyncio.Future()  # 保持运行
                
        except Exception as e:
            self.logger.error(f"启动服务器失败: {e}")
    
    async def shutdown(self):
        """关闭服务"""
        try:
            self.logger.info("正在关闭Tello智能代理服务...")
            
            # 断开无人机连接
            await self.disconnect_tello()
            
            # 关闭所有WebSocket连接
            for client in self.websocket_clients.copy():
                try:
                    await client.close()
                except:
                    pass
            
            self.logger.info("Tello智能代理服务已关闭")
            
        except Exception as e:
            self.logger.error(f"关闭服务时出错: {e}")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="Tello智能代理后端服务")
    parser.add_argument("--host", default="localhost", help="WebSocket服务器主机")
    parser.add_argument("--port", type=int, default=3004, help="WebSocket服务器端口")
    parser.add_argument("--azure-openai-endpoint", help="Azure OpenAI端点")
    parser.add_argument("--azure-openai-key", help="Azure OpenAI密钥")
    
    args = parser.parse_args()
    
    # 创建配置
    config = TelloAgentConfig(
        ws_host=args.host,
        ws_port=args.port,
        azure_openai_endpoint=args.azure_openai_endpoint or os.getenv("AZURE_OPENAI_ENDPOINT", ""),
        azure_openai_key=args.azure_openai_key or os.getenv("AZURE_OPENAI_KEY", "")
    )
    
    # 创建代理实例
    agent = TelloIntelligentAgent(config)
    
    # 设置信号处理
    def signal_handler(signum, frame):
        logger.info("接收到退出信号，正在关闭服务...")
        asyncio.create_task(agent.shutdown())
        sys.exit(0)
    
    import signal
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # 启动服务
    try:
        asyncio.run(agent.start_server())
    except KeyboardInterrupt:
        logger.info("用户中断，正在关闭服务...")
    except Exception as e:
        logger.error(f"服务运行错误: {e}")
    finally:
        asyncio.run(agent.shutdown())


if __name__ == "__main__":
    main()