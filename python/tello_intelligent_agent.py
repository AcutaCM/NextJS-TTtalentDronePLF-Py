#!/usr/bin/env python3
"""
Tello智能代理后端服务
集成自然语言处理和无人机控制功能
"""

import asyncio
import json
import logging
import os
import sys
import time
import traceback
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
import websockets
from websockets.server import WebSocketServerProtocol
import cv2
import numpy as np
from djitellopy import Tello
import threading
from queue import Queue, Empty
import base64
import httpx

# AI 服务支持
try:
    from openai import OpenAI, AzureOpenAI
    # 已剥离 Azure Vision 相关库
    AZURE_OPENAI_AVAILABLE = True
    OPENAI_AVAILABLE = True
except ImportError as e:
    AZURE_OPENAI_AVAILABLE = False
    OPENAI_AVAILABLE = False
    print(f"警告: AI SDK未安装，AI功能将不可用: {e}")

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('tello_agent.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class TelloIntelligentAgent:
    """Tello智能代理主类"""
    
    def __init__(self):
        self.tello = None
        self.connected = False
        self.flying = False
        self.video_enabled = False
        self.video_thread = None
        self.video_queue = Queue(maxsize=10)
        self.current_frame = None
        # 全局执行锁：保证所有无人机动作串行执行
        self.execution_lock = asyncio.Lock()
        
        # WebSocket连接管理
        self.websocket_clients = set()
        
        # AI 客户端配置
        self.ai_provider = None  # 'azure', 'ollama', 'openai'
        self.openai_client = None
        # 已剥离 Azure Vision：移除 vision_client
        # self.vision_client = None
        self.model_name = None
        self._init_ai_clients()
        
        # 状态信息
        self.drone_status = {
            'connected': False,
            'flying': False,
            'battery': 0,
            'temperature': 0,
            'height': 0,
            'speed': {'x': 0, 'y': 0, 'z': 0},
            'position': {'x': 0, 'y': 0, 'z': 0},
            'wifi_signal': 0,
            'flight_time': 0
        }
        
        # 命令映射
        self.command_mapping = {
            'takeoff': self._takeoff,
            'land': self._land,
            'emergency': self._emergency,
            'move_forward': self._move_forward,
            'move_back': self._move_back,
            'move_left': self._move_left,
            'move_right': self._move_right,
            'move_up': self._move_up,
            'move_down': self._move_down,
            'rotate_clockwise': self._rotate_clockwise,
            'rotate_counter_clockwise': self._rotate_counter_clockwise,
            'get_battery': self._get_battery,
            'get_status': self._get_status,
            'hover': self._hover
        }
    
    def _init_ai_clients(self):
        """初始化AI客户端"""
        if not OPENAI_AVAILABLE:
            logger.warning("OpenAI SDK不可用，跳过AI客户端初始化")
            return
            
        try:
            # 获取AI提供商配置
            self.ai_provider = os.getenv('AI_PROVIDER', 'azure').lower()
            
            if self.ai_provider == 'ollama':
                self._init_ollama_client()
            elif self.ai_provider == 'openai':
                self._init_openai_client()
            elif self.ai_provider == 'azure':
                self._init_azure_openai_client()
            else:
                logger.warning(f"不支持的AI提供商: {self.ai_provider}")
                
            # 已剥离 Azure Vision：不再初始化视觉客户端
            # if AZURE_AVAILABLE:
            #     self._init_azure_vision_client()
                
        except Exception as e:
            logger.error(f"AI客户端初始化失败: {e}")
    
    def _init_ollama_client(self):
        """初始化Ollama客户端"""
        ollama_base_url = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434/v1')
        ollama_model = os.getenv('OLLAMA_MODEL', 'llama3.1:8b')
        
        # 记录原生端点（去掉 /v1 以便调用 /api/chat）
        self.ollama_native_base_url = ollama_base_url[:-3] if ollama_base_url.endswith('/v1') else ollama_base_url
        
        self.openai_client = OpenAI(
            base_url=ollama_base_url,
            api_key="ollama"  # Ollama不需要真实的API key
        )
        self.model_name = ollama_model
        logger.info(f"Ollama客户端初始化成功 - 端点: {ollama_base_url}, 模型: {ollama_model}")
    
    def _init_openai_client(self):
        """初始化标准OpenAI客户端"""
        openai_api_key = os.getenv('OPENAI_API_KEY')
        openai_base_url = os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        openai_model = os.getenv('OPENAI_MODEL', 'gpt-4')
        
        if not openai_api_key:
            logger.warning("OpenAI API Key未配置")
            return
            
        self.openai_client = OpenAI(
            api_key=openai_api_key,
            base_url=openai_base_url
        )
        self.model_name = openai_model
        logger.info(f"OpenAI客户端初始化成功 - 模型: {openai_model}")
    
    def _init_azure_openai_client(self):
        """初始化Azure OpenAI客户端"""
        if not AZURE_OPENAI_AVAILABLE:
            logger.warning("Azure OpenAI SDK不可用")
            return
        azure_openai_endpoint = os.getenv('AZURE_OPENAI_ENDPOINT')
        azure_openai_key = os.getenv('AZURE_OPENAI_KEY')
        azure_openai_deployment = os.getenv('AZURE_OPENAI_DEPLOYMENT', 'gpt-4')
        if azure_openai_endpoint and azure_openai_key:
            self.openai_client = AzureOpenAI(
                azure_endpoint=azure_openai_endpoint,
                api_key=azure_openai_key,
                api_version="2024-02-15-preview"
            )
            self.model_name = azure_openai_deployment
            logger.info("Azure OpenAI客户端初始化成功")
        else:
            logger.warning("Azure OpenAI配置不完整，AI功能将不可用")
    
    def _init_azure_vision_client(self):
        """已剥离Azure Vision，跳过视觉初始化"""
        logger.info("已剥离Azure Vision，跳过视觉初始化")

    def _update_ai_settings(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        """根据前端传入的设置动态更新AI提供商与模型，支持本地模型（Ollama）"""
        try:
            provider = (settings.get('provider') or settings.get('ai_provider') or self.ai_provider or 'azure').lower()
            if provider == 'ollama':
                base_url = settings.get('base_url') or settings.get('endpoint') or os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434/v1')
                model = settings.get('model') or os.getenv('OLLAMA_MODEL', 'llama3.1:8b')
                api_key = settings.get('api_key') or 'ollama'
                self.openai_client = OpenAI(base_url=base_url, api_key=api_key)
                self.model_name = model
                self.ai_provider = 'ollama'
                # 记录原生端点（优先根据传入的 base_url 推导）
                self.ollama_native_base_url = base_url[:-3] if base_url.endswith('/v1') else base_url
            elif provider == 'openai':
                base_url = settings.get('base_url') or os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')
                api_key = settings.get('api_key') or os.getenv('OPENAI_API_KEY')
                model = settings.get('model') or os.getenv('OPENAI_MODEL', 'gpt-4')
                if not api_key:
                    return {'success': False, 'error': '缺少 OpenAI API Key'}
                self.openai_client = OpenAI(api_key=api_key, base_url=base_url)
                self.model_name = model
                self.ai_provider = 'openai'
            elif provider == 'azure':
                if not AZURE_OPENAI_AVAILABLE:
                    return {'success': False, 'error': 'Azure OpenAI SDK不可用'}
                endpoint = settings.get('endpoint') or settings.get('azure_endpoint') or os.getenv('AZURE_OPENAI_ENDPOINT')
                api_key = settings.get('api_key') or os.getenv('AZURE_OPENAI_KEY')
                deployment = settings.get('deployment') or settings.get('model') or os.getenv('AZURE_OPENAI_DEPLOYMENT', 'gpt-4')
                if not (endpoint and api_key):
                    return {'success': False, 'error': 'Azure OpenAI 配置不完整'}
                self.openai_client = AzureOpenAI(azure_endpoint=endpoint, api_key=api_key, api_version="2024-02-15-preview")
                self.model_name = deployment
                self.ai_provider = 'azure'
            else:
                return {'success': False, 'error': f'不支持的AI提供商: {provider}'}
            logger.info(f"AI设置更新成功 -> provider: {self.ai_provider}, model: {self.model_name}")
            return {'success': True, 'message': 'AI设置已更新', 'ai_provider': self.ai_provider, 'model': self.model_name}
        except Exception as e:
            logger.error(f"更新AI设置失败: {e}")
            return {'success': False, 'error': f'更新AI设置失败: {str(e)}'}

    def _get_current_ai_settings(self) -> Dict[str, Any]:
        return {
            'ai_provider': self.ai_provider,
            'model': self.model_name
        }
    async def connect_drone(self) -> Dict[str, Any]:
        """连接无人机"""
        try:
            if self.connected:
                return {'success': True, 'message': '无人机已连接'}
            
            logger.info("正在连接Tello无人机...")
            self.tello = Tello()
            self.tello.connect()
            
            # 检查连接状态
            battery = self.tello.get_battery()
            if battery > 0:
                self.connected = True
                self.drone_status['connected'] = True
                self.drone_status['battery'] = battery
                
                # 启动状态更新线程
                threading.Thread(target=self._status_update_loop, daemon=True).start()
                
                logger.info(f"Tello无人机连接成功，电池电量: {battery}%")
                return {
                    'success': True, 
                    'message': f'无人机连接成功，电池电量: {battery}%',
                    'battery': battery
                }
            else:
                raise Exception("无法获取无人机状态")
                
        except Exception as e:
            logger.error(f"连接无人机失败: {e}")
            self.connected = False
            self.drone_status['connected'] = False
            return {'success': False, 'error': f'连接失败: {str(e)}'}
    
    async def disconnect_drone(self) -> Dict[str, Any]:
        """断开无人机连接"""
        try:
            if not self.connected:
                return {'success': True, 'message': '无人机未连接'}
            
            # 如果正在飞行，先降落
            if self.flying:
                await self._land()
            
            # 停止视频流
            if self.video_enabled:
                self._stop_video_stream()
            
            # 断开连接
            if self.tello:
                self.tello.end()
            
            self.connected = False
            self.flying = False
            self.drone_status['connected'] = False
            self.drone_status['flying'] = False
            
            logger.info("无人机连接已断开")
            return {'success': True, 'message': '无人机连接已断开'}
            
        except Exception as e:
            logger.error(f"断开连接失败: {e}")
            return {'success': False, 'error': f'断开连接失败: {str(e)}'}
    
    async def process_natural_language_command(self, command: str) -> Dict[str, Any]:
        """处理自然语言命令"""
        try:
            # 允许在未连接无人机时进行AI解析，但不执行动作
            can_execute = self.connected
            
            if not self.openai_client:
                return {'success': False, 'error': 'AI服务不可用'}
            
            logger.info(f"处理自然语言命令: {command}")
            
            # 使用AI分析命令
            ai_analysis = await self._analyze_command_with_ai(command)
            
            if not ai_analysis['success']:
                return ai_analysis
            
            # 根据连接状态决定是否执行命令
            execution_results = []
            if can_execute:
                # 串行执行整段命令序列，等待前一条完成再执行下一条
                async with self.execution_lock:
                    for drone_command in ai_analysis['commands']:
                        result = await self._execute_drone_command(
                            drone_command['action'], 
                            drone_command.get('parameters', {})
                        )
                        execution_results.append(result)
                        
                        # 如果命令执行失败，停止后续命令
                        if not result['success']:
                            break
                        
                        # 命令间延迟
                        await asyncio.sleep(2.0)
                message_text = '自然语言命令处理完成'
            else:
                message_text = 'AI解析完成（无人机未连接，未执行动作）'
            
            return {
                'success': True,
                'message': message_text,
                'ai_analysis': ai_analysis,
                'execution_results': execution_results
            }
            
        except Exception as e:
            logger.error(f"处理自然语言命令失败: {e}")
            return {'success': False, 'error': f'命令处理失败: {str(e)}'}
    
    async def _analyze_command_with_ai(self, command: str) -> Dict[str, Any]:
        """使用AI分析自然语言命令"""
        try:
            system_prompt = """
你是一个专业的无人机控制AI助手。你的任务是将用户的自然语言指令转换为具体的无人机控制命令。

可用的无人机命令：
1. takeoff - 起飞
2. land - 降落
3. emergency - 紧急停止
4. move_forward - 向前移动，参数: distance (厘米)
5. move_back - 向后移动，参数: distance (厘米)
6. move_left - 向左移动，参数: distance (厘米)
7. move_right - 向右移动，参数: distance (厘米)
8. move_up - 向上移动，参数: distance (厘米)
9. move_down - 向下移动，参数: distance (厘米)
10. rotate_clockwise - 顺时针旋转，参数: degrees (度数)
11. rotate_counter_clockwise - 逆时针旋转，参数: degrees (度数)
12. get_battery - 获取电池电量
13. get_status - 获取无人机状态
14. hover - 悬停

请将用户指令转换为JSON格式的命令列表，格式如下：
{
  "commands": [
    {
      "action": "命令名称",
      "parameters": {"参数名": 参数值},
      "description": "命令描述"
    }
  ]
}

注意事项：
- 如果没有指定距离，默认使用30厘米
- 如果没有指定角度，默认使用90度
- 确保命令顺序合理，例如起飞后才能移动
- 如果指令不清楚或不安全，返回错误信息
- 你可以添加解释，但必须包含完整的JSON格式输出。
"""
            
            # 对 Ollama 使用原生 /api/chat，其他 provider 使用 OpenAI 兼容层
            if self.ai_provider == 'ollama':
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": command}
                ]
                ai_response = await self._ollama_chat(messages)
            else:
                response = self.openai_client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": command}
                    ],
                    temperature=0.1,
                    max_tokens=1000
                )
                ai_response = response.choices[0].message.content
            
            logger.info(f"AI分析结果: {ai_response}")
            
            # 解析AI响应（增强容错处理）
            def try_parse_json(text: str):
                try:
                    # 去除首尾空白和换行符
                    text = text.strip()
                    return json.loads(text)
                except Exception:
                    return None
            
            # 首先尝试直接解析
            parsed = try_parse_json(ai_response)
            
            if parsed is None:
                # 尝试从代码块提取JSON（支持各种markdown代码块）
                import re
                patterns = [
                    r"```(?:json)?\s*([\s\S]*?)\s*```",  # 标准代码块
                    r"```\s*([\s\S]*?)\s*```",           # 无语言标识的代码块
                    r"`([\s\S]*?)`"                      # 单行代码块
                ]
                
                for pattern in patterns:
                    matches = re.findall(pattern, ai_response)
                    for match in matches:
                        parsed = try_parse_json(match)
                        if parsed is not None and 'commands' in parsed:
                            break
                    if parsed is not None and 'commands' in parsed:
                        break
            
            if parsed is None:
                # 尝试查找JSON对象（寻找大括号包围的内容）
                import re
                json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
                matches = re.findall(json_pattern, ai_response, re.DOTALL)
                
                for match in matches:
                    # 找到最完整的JSON对象（包含"commands"的）
                    if '"commands"' in match:
                        parsed = try_parse_json(match)
                        if parsed is not None and 'commands' in parsed:
                            break
            
            if parsed is None:
                # 最后尝试：寻找所有可能的JSON结构
                start_positions = []
                end_positions = []
                
                for i, char in enumerate(ai_response):
                    if char == '{':
                        start_positions.append(i)
                    elif char == '}':
                        end_positions.append(i)
                
                # 尝试各种start和end的组合
                for start in start_positions:
                    for end in reversed(end_positions):
                        if end > start:
                            candidate = ai_response[start:end+1]
                            if '"commands"' in candidate:
                                parsed = try_parse_json(candidate)
                                if parsed is not None and 'commands' in parsed:
                                    break
                    if parsed is not None and 'commands' in parsed:
                        break
            
            # 验证解析结果
            if parsed is not None and isinstance(parsed, dict) and 'commands' in parsed:
                commands = parsed.get('commands', [])
                if isinstance(commands, list):
                    # 规范化每条命令的字段：将 params 映射为 parameters，并做类型规整
                    normalized = []
                    for cmd in commands:
                        if not isinstance(cmd, dict):
                            continue
                        action = cmd.get('action')
                        params = cmd.get('parameters')
                        # 兼容返回中的 "params" 字段
                        if params is None and isinstance(cmd.get('params'), dict):
                            params = cmd.get('params')
                        # 规整类型
                        if not isinstance(action, str):
                            action = str(action) if action is not None else ''
                        if not isinstance(params, dict):
                            params = {}
                        normalized.append({
                            'action': action,
                            'parameters': params,
                            'description': cmd.get('description', '')
                        })
                    return {
                        'success': True,
                        'commands': normalized,
                        'raw_response': ai_response
                    }
            
            # 如果所有解析尝试都失败了
            return {
                'success': False,
                'error': f'AI响应格式无法解析为有效JSON。请检查AI服务配置。原始响应: {ai_response[:200]}...',
                'raw_response': ai_response
            }
                
        except Exception as e:
            logger.error(f"AI命令分析失败: {e}")
            return {'success': False, 'error': f'AI分析失败: {str(e)}'}
    
    async def _execute_drone_command(self, action: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """执行无人机命令"""
        try:
            if action not in self.command_mapping:
                return {'success': False, 'action': action, 'error': f'未知命令: {action}'}
            
            command_func = self.command_mapping[action]
            
            if parameters:
                result = await command_func(**parameters)
            else:
                result = await command_func()
            
            return {
                'success': True,
                'action': action,
                'message': f'命令 {action} 执行成功',
                'data': result
            }
            
        except Exception as e:
            logger.error(f"执行命令 {action} 失败: {e}")
            return {
                'success': False,
                'action': action,
                'error': f'命令执行失败: {str(e)}'
            }
    
    # 无人机控制命令实现
    async def _takeoff(self) -> Dict[str, Any]:
        """起飞"""
        if self.flying:
            return {'message': '无人机已在飞行中'}
        
        self.tello.takeoff()
        self.flying = True
        self.drone_status['flying'] = True
        return {'message': '起飞成功'}
    
    async def _land(self) -> Dict[str, Any]:
        """降落"""
        if not self.flying:
            return {'message': '无人机未在飞行中'}
        
        self.tello.land()
        self.flying = False
        self.drone_status['flying'] = False
        return {'message': '降落成功'}
    
    async def _emergency(self) -> Dict[str, Any]:
        """紧急停止"""
        self.tello.emergency()
        self.flying = False
        self.drone_status['flying'] = False
        return {'message': '紧急停止执行'}
    
    async def _move_forward(self, distance: int = 30) -> Dict[str, Any]:
        """向前移动"""
        distance = max(20, min(500, distance))  # 限制距离范围
        self.tello.move_forward(distance)
        return {'message': f'向前移动 {distance} 厘米'}
    
    async def _move_back(self, distance: int = 30) -> Dict[str, Any]:
        """向后移动"""
        distance = max(20, min(500, distance))
        self.tello.move_back(distance)
        return {'message': f'向后移动 {distance} 厘米'}
    
    async def _move_left(self, distance: int = 30) -> Dict[str, Any]:
        """向左移动"""
        distance = max(20, min(500, distance))
        self.tello.move_left(distance)
        return {'message': f'向左移动 {distance} 厘米'}
    
    async def _move_right(self, distance: int = 30) -> Dict[str, Any]:
        """向右移动"""
        distance = max(20, min(500, distance))
        self.tello.move_right(distance)
        return {'message': f'向右移动 {distance} 厘米'}
    
    async def _move_up(self, distance: int = 30) -> Dict[str, Any]:
        """向上移动"""
        distance = max(20, min(500, distance))
        self.tello.move_up(distance)
        return {'message': f'向上移动 {distance} 厘米'}
    
    async def _move_down(self, distance: int = 30) -> Dict[str, Any]:
        """向下移动"""
        distance = max(20, min(500, distance))
        self.tello.move_down(distance)
        return {'message': f'向下移动 {distance} 厘米'}
    
    async def _rotate_clockwise(self, degrees: int = 90) -> Dict[str, Any]:
        """顺时针旋转"""
        degrees = max(1, min(360, degrees))
        self.tello.rotate_clockwise(degrees)
        return {'message': f'顺时针旋转 {degrees} 度'}
    
    async def _rotate_counter_clockwise(self, degrees: int = 90) -> Dict[str, Any]:
        """逆时针旋转"""
        degrees = max(1, min(360, degrees))
        self.tello.rotate_counter_clockwise(degrees)
        return {'message': f'逆时针旋转 {degrees} 度'}
    
    async def _get_battery(self) -> Dict[str, Any]:
        """获取电池电量"""
        battery = self.tello.get_battery()
        self.drone_status['battery'] = battery
        return {'message': f'电池电量: {battery}%', 'battery': battery}
    
    async def _get_status(self) -> Dict[str, Any]:
        """获取无人机状态"""
        if not self.connected:
            return {'message': '无人机未连接'}
        
        try:
            battery = self.tello.get_battery()
            temperature = self.tello.get_temperature()
            height = self.tello.get_height()
            
            self.drone_status.update({
                'battery': battery,
                'temperature': temperature,
                'height': height
            })
            
            return {
                'message': '状态获取成功',
                'status': self.drone_status
            }
        except Exception as e:
            return {'message': f'状态获取失败: {str(e)}'}
    
    async def _hover(self) -> Dict[str, Any]:
        """悬停"""
        # Tello会自动悬停，这里只是确认状态
        return {'message': '无人机悬停中'}
    
    def _status_update_loop(self):
        """状态更新循环"""
        while self.connected:
            try:
                if self.tello:
                    battery = self.tello.get_battery()
                    temperature = self.tello.get_temperature()
                    height = self.tello.get_height()
                    
                    self.drone_status.update({
                        'battery': battery,
                        'temperature': temperature,
                        'height': height,
                        'connected': self.connected,
                        'flying': self.flying
                    })
                    
                    # 广播状态更新
                    asyncio.create_task(self._broadcast_status())
                    
            except Exception as e:
                logger.error(f"状态更新失败: {e}")
            
            time.sleep(2)  # 每2秒更新一次状态
    
    async def _broadcast_status(self):
        """广播状态更新到所有WebSocket客户端"""
        if self.websocket_clients:
            message = {
                'type': 'drone_status',
                'data': self.drone_status
            }
            
            # 创建要移除的客户端列表
            clients_to_remove = []
            
            for client in self.websocket_clients.copy():
                try:
                    await client.send(json.dumps(message))
                except websockets.exceptions.ConnectionClosed:
                    clients_to_remove.append(client)
                except Exception as e:
                    logger.error(f"广播状态失败: {e}")
                    clients_to_remove.append(client)
            
            # 移除断开的客户端
            for client in clients_to_remove:
                self.websocket_clients.discard(client)

    async def _broadcast_event(self, event_type: str, payload: Dict[str, Any]):
        """广播任意事件到所有WebSocket客户端"""
        if not self.websocket_clients:
            return
        message = {
            'type': event_type,
            'data': payload
        }
        clients_to_remove = []
        for client in self.websocket_clients.copy():
            try:
                await client.send(json.dumps(message))
            except websockets.exceptions.ConnectionClosed:
                clients_to_remove.append(client)
            except Exception as e:
                logger.error(f"广播事件失败({event_type}): {e}")
                clients_to_remove.append(client)
        for client in clients_to_remove:
            self.websocket_clients.discard(client)
    
    def _start_video_stream(self):
        """启动视频流"""
        if not self.connected or self.video_enabled:
            return
        
        try:
            self.tello.streamon()
            self.video_enabled = True
            self.video_thread = threading.Thread(target=self._video_stream_loop, daemon=True)
            self.video_thread.start()
            logger.info("视频流启动成功")
        except Exception as e:
            logger.error(f"启动视频流失败: {e}")
    
    def _stop_video_stream(self):
        """停止视频流"""
        if not self.video_enabled:
            return
        
        try:
            self.video_enabled = False
            if self.tello:
                self.tello.streamoff()
            logger.info("视频流已停止")
        except Exception as e:
            logger.error(f"停止视频流失败: {e}")
    
    def _video_stream_loop(self):
        """视频流处理循环"""
        while self.video_enabled and self.connected:
            try:
                frame = self.tello.get_frame_read().frame
                if frame is not None:
                    # 压缩图像
                    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                    frame_base64 = base64.b64encode(buffer).decode('utf-8')
                    self.current_frame = f"data:image/jpeg;base64,{frame_base64}"
                    
                    # 将帧放入队列
                    try:
                        self.video_queue.put_nowait(self.current_frame)
                    except:
                        pass  # 队列满时忽略
                        
            except Exception as e:
                logger.error(f"视频流处理错误: {e}")
                time.sleep(0.1)
            
            time.sleep(1/30)  # 30 FPS
    
    async def handle_websocket_message(self, websocket: WebSocketServerProtocol, message: Dict[str, Any]):
        """处理WebSocket消息"""
        try:
            message_type = message.get('type')
            data = message.get('data', {})
            
            response = {'type': f'{message_type}_response'}
            
            if message_type == 'connect_drone':
                result = await self.connect_drone()
                response.update(result)
                
            elif message_type == 'disconnect_drone':
                result = await self.disconnect_drone()
                response.update(result)
                
            elif message_type == 'natural_language_command':
                command = data.get('command', '')
                result = await self.process_natural_language_command(command)
                response.update(result)
                
            elif message_type == 'drone_command':
                action = data.get('action')
                parameters = data.get('parameters', {})
                # 单条命令也串行化，避免与其他来源并发
                async with self.execution_lock:
                    result = await self._execute_drone_command(action, parameters)
                response.update(result)
                
            elif message_type == 'get_status':
                result = await self._get_status()
                response.update(result)
                
            elif message_type == 'start_video':
                self._start_video_stream()
                response.update({'success': True, 'message': '视频流已启动'})
                
            elif message_type == 'stop_video':
                self._stop_video_stream()
                response.update({'success': True, 'message': '视频流已停止'})

            elif message_type == 'update_ai_settings':
                result = self._update_ai_settings(data)
                response.update(result)

            elif message_type == 'get_ai_settings':
                response.update({'success': True, 'settings': self._get_current_ai_settings()})
                
            else:
                response.update({'success': False, 'error': f'未知消息类型: {message_type}'})
            
            await websocket.send(json.dumps(response))
            # 将关键响应广播给所有客户端，便于3002桥接接收AI分析与执行反馈
            resp_type = response.get('type')
            if resp_type in ('natural_language_command_response', 'drone_command_response'):
                try:
                    await self._broadcast_event(resp_type, response)
                except Exception as be:
                    logger.error(f"广播响应失败({resp_type}): {be}")
            
        except Exception as e:
            logger.error(f"处理WebSocket消息失败: {e}")
            error_response = {
                'type': 'error',
                'success': False,
                'error': f'消息处理失败: {str(e)}'
            }
            try:
                await websocket.send(json.dumps(error_response))
            except:
                pass
    
    async def _ollama_chat(self, messages: List[Dict[str, str]]) -> str:
        """
        使用 Ollama 原生 /api/chat 生成回复，返回 content 文本。
        增强：加入重试与回退到 /api/generate，提升在 5xx 场景下的稳定性。
        """
        base = getattr(self, 'ollama_native_base_url', 'http://localhost:11434')
        chat_url = f"{base}/api/chat"
        gen_url = f"{base}/api/generate"
        payload_chat = {
            "model": self.model_name,
            "messages": messages,
            "stream": False
        }
        # 构造回退 prompt（将 system 与 user 合并）
        try:
            system_parts = [m.get('content', '') for m in messages if m.get('role') == 'system']
            user_parts = [m.get('content', '') for m in messages if m.get('role') == 'user']
            merged_prompt = (("\n\n".join(system_parts)).strip() + "\n\n用户指令：\n" + ("\n\n".join(user_parts)).strip()).strip()
        except Exception:
            merged_prompt = "\n\n".join([m.get('content', '') for m in messages])
        payload_generate = {
            "model": self.model_name,
            "prompt": merged_prompt,
            "stream": False
        }
        # 指数退避重试
        backoffs = [0.3, 0.8, 1.5]
        last_error: Optional[Exception] = None
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(45.0), headers={"Connection": "keep-alive"}) as client:
                for i, delay in enumerate(backoffs):
                    try:
                        resp = await client.post(chat_url, json=payload_chat)
                        resp.raise_for_status()
                        data = resp.json()
                        # 解析返回
                        if isinstance(data, dict):
                            if 'message' in data and isinstance(data['message'], dict):
                                return data['message'].get('content', '')
                            if 'content' in data:
                                return data.get('content', '')
                        if isinstance(data, list) and data:
                            last = data[-1]
                            if isinstance(last, dict):
                                msg = last.get('message', {})
                                if isinstance(msg, dict):
                                    return msg.get('content', '')
                        # 若解析失败，返回空字符串
                        return ""
                    except httpx.HTTPStatusError as he:
                        last_error = he
                        status = he.response.status_code if he.response else None
                        logger.error(f"Ollama /api/chat 调用失败，状态码: {status}，第 {i+1} 次尝试")
                        if status and status >= 500:
                            await asyncio.sleep(delay)
                            continue
                        # 对于非 5xx，直接回退
                        break
                    except Exception as e:
                        last_error = e
                        logger.error(f"Ollama /api/chat 异常：{e}，第 {i+1} 次尝试")
                        await asyncio.sleep(delay)
                        continue
                # 回退到 /api/generate
                try:
                    resp2 = await client.post(gen_url, json=payload_generate)
                    resp2.raise_for_status()
                    data2 = resp2.json()
                    # /api/generate 常返回 {response: "..."} 或 content 字段
                    if isinstance(data2, dict):
                        if 'response' in data2:
                            return data2.get('response', '')
                        if 'content' in data2:
                            return data2.get('content', '')
                    return ""
                except Exception as ge:
                    logger.error(f"Ollama /api/generate 回退失败：{ge}")
                    # 将最后错误抛出，交由上层处理
                    raise last_error or ge
        except Exception as e:
            logger.error(f"Ollama 原生聊天调用失败: {e}")
            raise

    async def websocket_handler(self, websocket: WebSocketServerProtocol, path: str):
        """WebSocket连接处理器"""
        self.websocket_clients.add(websocket)
        logger.info(f"新的WebSocket连接: {websocket.remote_address}")
        
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self.handle_websocket_message(websocket, data)
                except json.JSONDecodeError:
                    await websocket.send(json.dumps({
                        'type': 'error',
                        'success': False,
                        'error': '无效的JSON格式'
                    }))
                except Exception as e:
                    logger.error(f"处理消息失败: {e}")
                    await websocket.send(json.dumps({
                        'type': 'error',
                        'success': False,
                        'error': str(e)
                    }))
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"WebSocket连接关闭: {websocket.remote_address}")
        except Exception as e:
            logger.error(f"WebSocket处理错误: {e}")
        finally:
            self.websocket_clients.discard(websocket)
    
    async def start_server(self, host: str = 'localhost', port: int = 3004):
        """启动WebSocket服务器"""
        logger.info(f"启动Tello智能代理服务器: {host}:{port}")
        
        server = await websockets.serve(
            self.websocket_handler,
            host,
            port,
            ping_interval=20,
            ping_timeout=10
        )
        
        logger.info("Tello智能代理服务器启动成功")
        return server

async def main():
    """主函数"""
    # 加载环境变量（可选）
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except Exception as e:
        logger.warning(f"未加载 .env（可忽略）：{e}")
    
    # 创建智能代理实例
    agent = TelloIntelligentAgent()
    
    # 启动服务器（支持通过环境变量指定端口）
    port = int(os.getenv('AGENT_PORT', os.getenv('TELLO_AGENT_PORT', '3004')))
    server = await agent.start_server(port=port)
    
    try:
        # 保持服务器运行，使用 asyncio.Future 来永远等待
        await asyncio.Future()  # 这会一直阻塞直到被中断
    except KeyboardInterrupt:
        logger.info("收到中断信号，正在关闭服务器...")
        
        # 断开无人机连接
        if agent.connected:
            await agent.disconnect_drone()
        
        # 关闭服务器
        server.close()
        await server.wait_closed()
        logger.info("服务器已关闭")

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n程序被用户中断")
    except Exception as e:
        logger.error(f"程序运行错误: {e}")
        traceback.print_exc()