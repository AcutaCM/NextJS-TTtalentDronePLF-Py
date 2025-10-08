#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
专用QR码检测的无人机后端服务
"""

import sys
import os
import json
from typing import Any, Dict
import asyncio
import threading
import time
import argparse
from datetime import datetime
import traceback
import base64
import numpy as np

# 设置控制台编码为UTF-8
if sys.platform.startswith('win'):
    try:
        # 检查是否支持reconfigure方法
        if hasattr(sys.stdout, 'reconfigure') and callable(getattr(sys.stdout, 'reconfigure', None)):
            sys.stdout.reconfigure(encoding='utf-8')
        if hasattr(sys.stderr, 'reconfigure') and callable(getattr(sys.stderr, 'reconfigure', None)):
            sys.stderr.reconfigure(encoding='utf-8')
    except:
        pass

# DJI Tello导入
try:
    from djitellopy import Tello
    TELLO_AVAILABLE = True
    print("✓ djitellopy库加载成功")
except ImportError as e:
    TELLO_AVAILABLE = False
    print(f"✗ djitellopy库导入失败: {e}")

# QR码检测库导入
try:
    # 优先使用OpenCV进行QR码检测
    import cv2
    QR_DETECTOR_AVAILABLE = True
    QR_DETECTOR_TYPE = "opencv"
    print("✓ OpenCV QR码检测库加载成功")
except ImportError:
    QR_DETECTOR_AVAILABLE = False
    QR_DETECTOR_TYPE = None
    print("✗ OpenCV库未安装！")

# 备用：pyzbar检测
try:
    from pyzbar import pyzbar
    PYZBAR_AVAILABLE = True
    if not QR_DETECTOR_AVAILABLE:
        QR_DETECTOR_AVAILABLE = True
        QR_DETECTOR_TYPE = "pyzbar"
        print("✓ pyzbar QR码检测库加载成功")
except ImportError:
    PYZBAR_AVAILABLE = False
    if not QR_DETECTOR_AVAILABLE:
        print("✗ 没有可用的QR码检测库！")
        print("请运行: pip install opencv-python")

# AI分析器导入
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from crop_analyzer_dashscope import CropAnalyzer
    ANALYZER_AVAILABLE = True
    print("✓ AI分析器模块加载成功")
except ImportError as e:
    ANALYZER_AVAILABLE = False
    print(f"✗ AI分析器模块导入失败: {e}")

# 导入挑战卡巡航控制器
try:
    from mission_controller import MissionController
    MISSION_CONTROLLER_AVAILABLE = True
    print("✓ 挑战卡巡航控制器加载成功")
except ImportError as e:
    MISSION_CONTROLLER_AVAILABLE = False
    print(f"✗ 挑战卡巡航控制器导入失败: {e}")

# 导入草莓检测器
try:
    from strawberry_maturity_analyzer import StrawberryMaturityAnalyzer
    STRAWBERRY_ANALYZER_AVAILABLE = True
    print("✓ 草莓检测器模块加载成功")
except ImportError as e:
    STRAWBERRY_ANALYZER_AVAILABLE = False
    print(f"✗ 草莓检测器模块导入失败: {e}")

# 条件导入websockets（仅在需要时导入）
websockets = None
try:
    import websockets
except ImportError:
    print("⚠️ websockets库未安装，WebSocket功能将不可用")


class DroneControllerAdapter:
    """无人机控制器适配器，为MissionController提供统一接口"""
    
    def __init__(self, tello_drone):
        self.tello = tello_drone
        self._mission_pad_id = -1
        self._is_connected = False
        self._is_flying = False
        
    @property
    def is_connected(self):
        return self._is_connected and self.tello is not None
        
    @property
    def is_flying(self):
        return self._is_flying
        
    @property
    def mission_pad_id(self):
        """获取当前检测到的任务垫ID"""
        if self.tello:
            try:
                # djitellopy中正确的方法是get_mission_pad_id()
                # 但需要先启用mission pad检测
                pad_id = self.tello.get_mission_pad_id()
                if pad_id and pad_id > 0:
                    self._mission_pad_id = pad_id
                return self._mission_pad_id
            except Exception as e:
                print(f"获取任务垫ID失败: {e}")
                return self._mission_pad_id
        return -1
        
    def takeoff(self):
        """起飞"""
        try:
            if self.tello and not self._is_flying:
                self.tello.takeoff()
                self._is_flying = True
                return True
        except Exception as e:
            print(f"起飞失败: {e}")
        return False
        
    def land(self):
        """降落"""
        try:
            if self.tello and self._is_flying:
                self.tello.land()
                self._is_flying = False
                return True
        except Exception as e:
            print(f"降落失败: {e}")
        return False
        
    def set_height(self, height_cm):
        """设置飞行高度"""
        try:
            if self.tello:
                current_height = self.tello.get_height()
                diff = height_cm - current_height
                if abs(diff) > 10:  # 只有差异大于10cm才调整
                    if diff > 0:
                        self.tello.move_up(abs(diff))
                    else:
                        self.tello.move_down(abs(diff))
                return True
        except Exception as e:
            print(f"设置高度失败: {e}")
        return False
        
    def rotate(self, degrees):
        """旋转"""
        try:
            if self.tello:
                if degrees > 0:
                    self.tello.rotate_clockwise(degrees)
                else:
                    self.tello.rotate_counter_clockwise(abs(degrees))
                return True
        except Exception as e:
            print(f"旋转失败: {e}")
        return False
        
    def manual_control(self, left_right, forward_backward, up_down, yaw):
        """手动控制"""
        try:
            if self.tello:
                # djitellopy参数范围限制: -100到100，必须是整数
                left_right = max(-100, min(100, int(left_right)))
                forward_backward = max(-100, min(100, int(forward_backward)))
                up_down = max(-100, min(100, int(up_down)))
                yaw = max(-100, min(100, int(yaw)))
                
                # 使用djitellopy的正确方法
                self.tello.send_rc_control(left_right, forward_backward, up_down, yaw)
                return True
        except Exception as e:
            print(f"手动控制失败: {e}")
        return False
        
    def move_to_mission_pad(self, pad_id, x, y, z, speed):
        """移动到指定任务垫位置"""
        try:
            if self.tello:
                # 启用任务垫检测
                self.tello.enable_mission_pads()
                time.sleep(0.5)
                # 检查参数范围 - djitellopy对参数有严格限制
                x = max(-500, min(500, x))  # 限制在-500到500cm
                y = max(-500, min(500, y))
                z = max(20, min(500, z))    # 高度最低20cm
                speed = max(10, min(100, speed))  # 速度10-100cm/s
                
                # 移动到任务垫 - 使用正确的参数顺序
                self.tello.go_xyz_speed_mid(x, y, z, speed, pad_id)
                return True
        except Exception as e:
            print(f"移动到任务垫失败: {e}")
        return False
        
    def update_connection_status(self, connected):
        """更新连接状态"""
        self._is_connected = connected


class QRDroneBackendService:
    """专用QR码检测的无人机后端服务"""

    def __init__(self, ws_port=3002):
        self.ws_port = ws_port
        # 智能代理桥接配置：启用后与3004端口的智能代理同步状态
        self.use_agent_mode = (os.getenv('USE_INTELLIGENT_AGENT', '1') == '1')
        self.agent_url = os.getenv('TELLO_AGENT_WS', 'ws://localhost:3004')
        self.agent_ws = None
        self.agent_connected = False

        self.drone = None
        self.drone_adapter = None
        self.mission_controller = None
        self.crop_analyzer = None
        self.video_thread = None
        self.is_running = True
        # Track connected websocket clients
        self.connected_clients = set()
        self.drone_state = {
            'flying': False,
            'battery': 0,
            'mission_active': False,
            'challenge_cruise_active': False,  # 新增挑战卡巡航状态
            'wifi_signal': 0,
            'temperature': 0,
            'connected': False
        }

        # 视频和检测状态
        self.video_streaming = False
        self.qr_detection_enabled = True
        self.strawberry_detection_enabled = False  # 草莓检测状态
        self.ai_analysis_enabled = False  # AI分析状态
        self.processed_qr_data = set()
        self.frame_count = 0
        self.last_fps_time = time.time()
        self.fps = 0

        # 命令串行执行锁，确保来自智能代理或本地的动作不会并发
        self.command_lock = asyncio.Lock()

        # QR码检测相关
        self.detection_cooldown = {}
        self.cooldown_duration = 3.0  # 减少冷却时间到3秒
        self.last_detection_time = 0
        self.detection_interval = 0.5
        
        # 初始化QR码检测器
        self.qr_detector = None
        self.init_qr_detector()

        # 初始化AI分析器
        self.init_ai_analyzer()
        
        # 初始化草莓检测器
        self.init_strawberry_analyzer()
    
    def init_qr_detector(self):
        """初始化QR码检测器"""
        try:
            if QR_DETECTOR_TYPE == "opencv":
                if 'cv2' in globals():
                    self.qr_detector = cv2.QRCodeDetector()
                    print("✅ OpenCV QR码检测器初始化成功")
                else:
                    print("❌ OpenCV库未正确导入，无法初始化QR码检测器")
            elif QR_DETECTOR_TYPE == "pyzbar":
                print("✅ pyzbar QR码检测器就绪")
            else:
                print("⚠️ 没有可用的QR码检测器")
        except Exception as e:
            print(f"❌ QR码检测器初始化失败: {e}")

    def init_ai_analyzer(self):
        """初始化AI分析器"""
        try:
            if not ANALYZER_AVAILABLE:
                print("⚠️ AI分析器模块不可用")
                return

            # 从环境变量或配置文件获取API配置
            api_key = os.getenv('DASHSCOPE_API_KEY')
            app_id = os.getenv('DASHSCOPE_APP_ID')

            if not api_key or not app_id:
                config_path = os.path.join(os.path.dirname(__file__), 'config.json')
                if os.path.exists(config_path):
                    with open(config_path, 'r', encoding='utf-8') as f:
                        config = json.load(f)
                        api_key = api_key or config.get('dashscope_api_key')
                        app_id = app_id or config.get('dashscope_app_id')

            if api_key and app_id:
                if 'CropAnalyzer' in globals():
                    self.crop_analyzer = CropAnalyzer(api_key=api_key, app_id=app_id)
                    print("✅ AI分析器初始化成功")
                else:
                    print("❌ CropAnalyzer未正确导入，无法初始化AI分析器")
                    self.crop_analyzer = None
            else:
                print("⚠️ 未找到有效的AI API配置")
        except Exception as e:
            print(f"❌ AI分析器初始化失败: {e}")
            self.crop_analyzer = None
    
    def init_strawberry_analyzer(self):
        """初始化草莓检测器"""
        try:
            if not STRAWBERRY_ANALYZER_AVAILABLE:
                print("⚠️ 草莓检测器模块不可用")
                self.strawberry_analyzer = None
                return

            model_path = os.path.join(os.path.dirname(__file__), 'models', 'best.pt')
            if os.path.exists(model_path):
                if 'StrawberryMaturityAnalyzer' in globals():
                    self.strawberry_analyzer = StrawberryMaturityAnalyzer(model_path)
                    print("✅ 草莓检测器初始化成功")
                else:
                    print("❌ StrawberryMaturityAnalyzer未正确导入，无法初始化草莓检测器")
                    self.strawberry_analyzer = None
            else:
                print(f"❌ 草莓模型文件不存在: {model_path}")
                self.strawberry_analyzer = None
        except Exception as e:
            print(f"❌ 草莓检测器初始化失败: {e}")
            self.strawberry_analyzer = None

    async def start_websocket_server(self):
        """启动WebSocket服务器"""
        print(f"🚀 启动专用QR码检测WebSocket服务器，端口: {self.ws_port}")

        # 保存主事件循环引用
        self.main_loop = asyncio.get_event_loop()

        async def handle_client(websocket, path=None):
            client_ip = websocket.remote_address[0] if websocket.remote_address else "unknown"
            print(f"🔌 客户端连接: {client_ip}")
            self.connected_clients.add(websocket)

            # 检查是否是有效的WebSocket连接
            if not websocket.subprotocol:
                print(f"⚠️ 客户端 {client_ip} 未能完成WebSocket握手，可能是非WebSocket请求。")
                # 可以选择关闭连接或记录更多信息
                # await websocket.close()
                # return

            try:
                # 发送连接确认
                await websocket.send(json.dumps({
                    'type': 'connection_established',
                    'data': {
                        'server_time': datetime.now().isoformat(),
                        'qr_detection_available': QR_DETECTOR_AVAILABLE,
                        'qr_detector_type': QR_DETECTOR_TYPE,
                        'message': 'QR码专用检测服务已就绪'
                    },
                    'timestamp': datetime.now().isoformat()
                }, ensure_ascii=False))

                async for message in websocket:
                    await self.handle_websocket_message(websocket, message)
            except AttributeError:
                # websockets可能未导入
                print(f"⚠️ WebSocket库未安装，无法处理连接关闭: {client_ip}")
            except Exception:
                # 如果websockets已导入，使用其特定异常
                if websockets and hasattr(websockets.exceptions, 'ConnectionClosed'):
                    try:
                        raise
                    except websockets.exceptions.ConnectionClosed:
                        print(f"📴 客户端断开连接: {client_ip}")
                else:
                    print(f"📴 客户端断开连接: {client_ip}")
            except Exception as e:
                print(f"❌ WebSocket处理错误: {e}")
                traceback.print_exc()
            finally:
                self.connected_clients.discard(websocket)

        # 启动服务器
        if websockets is not None:
            server = await websockets.serve(handle_client, "localhost", self.ws_port)
            print(f"✅ QR码检测WebSocket服务器已启动: ws://localhost:{self.ws_port}")

            # 启动智能代理桥接（连接到3004端口）
            if self.use_agent_mode and websockets is not None:
                try:
                    asyncio.create_task(self.start_agent_bridge())
                    print(f"🔗 已启动智能代理桥接，目标: {self.agent_url}")
                except Exception as e:
                    print(f"⚠️ 启动智能代理桥接失败: {e}")

            return server
        else:
            print("❌ WebSocket服务器启动失败：websockets库未安装")
            return None

    def video_stream_worker(self):
        """视频流工作线程 - 集成QR码检测、草莓检测和AI分析"""
        print("📹 多功能检测视频流已启动")

        frame_retry_count = 0
        max_retry = 10
        connection_retry_count = 0
        max_connection_retry = 3
        last_strawberry_detection = 0
        strawberry_detection_interval = 1.0  # 草莓检测间隔

        while self.video_streaming and self.drone:
            try:
                # 检查无人机连接状态
                if not self.drone_state.get('connected', False):
                    print("⚠️ 无人机连接已断开，停止视频流")
                    break
                    
                # djitellopy正确的视频帧获取方式
                try:
                    frame_read = self.drone.get_frame_read()
                    if frame_read is None:
                        connection_retry_count += 1
                        if connection_retry_count > max_connection_retry:
                                print("❌ 视频流连接失败次数过多，尝试重新初始化")
                                try:
                                    self.drone.streamoff()
                                    time.sleep(1)
                                    self.drone.streamon()
                                    time.sleep(2)  # 等待视频流稳定
                                    connection_retry_count = 0
                                    print("✅ 视频流重新初始化完成")
                                except Exception as e:
                                    print(f"❌ 重新初始化视频流失败: {e}")
                                    if self.main_loop and not self.main_loop.is_closed():
                                        try:
                                            future = asyncio.run_coroutine_threadsafe(
                                                self.broadcast_message('video_stream_error', {
                                                    'message': f'视频流重新初始化失败: {e}',
                                                    'error_type': 'reconnection_failed'
                                                }),
                                                self.main_loop
                                            )
                                            future.result(timeout=0.1)
                                        except Exception:
                                            pass
                                    break
                        time.sleep(0.5)
                        continue
                    
                    connection_retry_count = 0
                    # 安全获取视频帧
                    frame = frame_read.frame
                    # 保持BGR格式进行检测处理，稍后转换为RGB用于显示
                    
                except Exception as e:
                    print(f"❌ 获取视频流失败: {e}")
                    frame = None
                
                if frame is None:
                    frame_retry_count += 1
                    if frame_retry_count > max_retry:
                        print("⚠️ 视频帧获取失败次数过多")
                        # 发送错误状态到前端
                        if self.main_loop and not self.main_loop.is_closed():
                            try:
                                future = asyncio.run_coroutine_threadsafe(
                                    self.broadcast_message('video_stream_error', {
                                        'message': '视频帧获取失败，检查无人机连接',
                                        'retry_count': frame_retry_count,
                                        'error_type': 'frame_grab_failed'
                                    }),
                                    self.main_loop
                                )
                                future.result(timeout=0.1)
                            except Exception:
                                pass
                        frame_retry_count = 0
                    time.sleep(0.1)
                    continue

                frame_retry_count = 0
                self.update_fps_stats()
                current_time = time.time()

                # 执行检测处理 - 根据不同模式控制检测行为
                should_detect_qr = self.ai_analysis_enabled and (current_time - self.last_detection_time) >= self.detection_interval
                should_detect_strawberry = (self.strawberry_detection_enabled or self.drone_state.get('challenge_cruise_active', False)) and (current_time - last_strawberry_detection) >= strawberry_detection_interval

                # 处理帧（包含QR码检测、草莓检测和AI分析）
                processed_frame = self.process_integrated_detection(
                    frame, should_detect_qr, should_detect_strawberry
                )

                if should_detect_qr:
                    self.last_detection_time = current_time
                if should_detect_strawberry:
                    last_strawberry_detection = current_time

                # 编码并发送视频帧（OpenCV的imencode会自动处理RGB到BGR的转换）
                _, buffer = cv2.imencode('.jpg', processed_frame,
                                         [cv2.IMWRITE_JPEG_QUALITY, 85])
                frame_b64 = base64.b64encode(buffer).decode('utf-8')

                if self.main_loop and not self.main_loop.is_closed():
                    try:
                        future = asyncio.run_coroutine_threadsafe(
                            self.broadcast_message('video_frame', {
                                'frame': f'data:image/jpeg;base64,{frame_b64}',
                                'fps': self.fps,
                                'timestamp': datetime.now().isoformat(),
                                'file_mode': False,
                                'detection_status': {
                                    'qr_enabled': self.qr_detection_enabled,
                                    'strawberry_enabled': self.strawberry_analyzer is not None,
                                    'ai_enabled': self.crop_analyzer is not None
                                }
                            }),
                            self.main_loop
                        )
                        future.result(timeout=0.1)
                    except Exception:
                        pass

                time.sleep(0.033)  # 约30fps

            except Exception as e:
                print(f"❌ 视频流处理错误: {e}")
                # 发送详细错误信息到前端
                if self.main_loop and not self.main_loop.is_closed():
                    try:
                        future = asyncio.run_coroutine_threadsafe(
                            self.broadcast_message('video_stream_error', {
                                'message': f'视频流处理错误: {str(e)}',
                                'error_type': type(e).__name__,
                                'timestamp': datetime.now().isoformat()
                            }),
                            self.main_loop
                        )
                        future.result(timeout=0.1)
                    except Exception:
                        pass
                time.sleep(0.5)

        print("📹 多功能检测视频流已停止")

    def process_integrated_detection(self, frame, should_detect_qr=True, should_detect_strawberry=True, file_mode=False):
        """集成处理：QR码检测 → 草莓检测 - 修复：不再在帧上绘制覆盖层，避免重复绘制"""
        try:
            # 不再修改原帧，直接在原帧上检测
            processed_frame = frame.copy()
            detected_qr_info = None
            strawberry_detections = []

            # 1. QR码检测
            if (should_detect_qr and
                    self.qr_detection_enabled and
                    QR_DETECTOR_AVAILABLE):

                detected_qrs = self.detect_qr_codes(frame)  # 在原始帧上检测

                for qr_info in detected_qrs:
                    qr_data = qr_info['data']
                    current_time = time.time()

                    # 检查冷却时间
                    if qr_data in self.detection_cooldown:
                        if current_time - self.detection_cooldown[qr_data] < self.cooldown_duration:
                            # 还在冷却期，不绘制边框
                            continue

                    # 新检测到的QR码
                    self.detection_cooldown[qr_data] = current_time
                    detected_qr_info = qr_info

                    # 在帧上绘制QR码检测框
                    self.draw_qr_detection(processed_frame, qr_info, color=(0, 255, 0))

                    # 处理QR码检测结果
                    self.handle_qr_detection(frame, qr_info)
                    break  # 只处理第一个新检测到的QR码，避免重复检测

            # 2. 草莓成熟度检测
            if (should_detect_strawberry and 
                    self.strawberry_analyzer is not None and 
                    STRAWBERRY_ANALYZER_AVAILABLE):
                try:
                    # 执行草莓检测，传入QR码ID用于关联
                    qr_id = detected_qr_info.get('id') if detected_qr_info else None
                    strawberry_detections = self.strawberry_analyzer.detect_strawberries(
                        frame, qr_id=qr_id  # 在原始帧上检测
                    )
                    
                    if strawberry_detections:
                        # 在帧上绘制草莓检测结果
                        processed_frame = self.strawberry_analyzer.draw_detections(
                            processed_frame, strawberry_detections
                        )
                        
                        # 过滤出检测结果用于广播（降低稳定性要求）
                        stable_detections = []
                        current_time = time.time()
                        for det in strawberry_detections:
                            if (det.track_id and det.track_id in self.strawberry_analyzer.tracked_strawberries):
                                tracked = self.strawberry_analyzer.tracked_strawberries[det.track_id]
                                # 降低广播要求，让成熟计数器能正常工作
                                if (tracked.update_count >= 1 or 
                                    (current_time - tracked.first_detected) > 0.2):
                                    stable_detections.append(det)
                        
                        # 获取成熟度统计信息（基于稳定检测）
                        summary = self.strawberry_analyzer.get_maturity_summary(stable_detections)
                        
                        # 只有稳定检测结果才广播
                        if stable_detections and self.main_loop and not self.main_loop.is_closed():
                            try:
                                future = asyncio.run_coroutine_threadsafe(
                                    self.broadcast_message('strawberry_detection', {
                                        'qr_id': qr_id,
                                        'detections': [{
                                            'x': det.bbox[0],
                                            'y': det.bbox[1], 
                                            'w': det.bbox[2] - det.bbox[0],
                                            'h': det.bbox[3] - det.bbox[1],
                                            'maturity': det.maturity_level,
                                            'confidence': det.maturity_confidence
                                        } for det in stable_detections],
                                        'summary': summary,
                                        'timestamp': datetime.now().isoformat()
                                    }),
                                    self.main_loop
                                )
                                future.result(timeout=0.01)
                            except Exception:
                                pass
                                
                        print(f"🍓 检测到 {len(strawberry_detections)} 个草莓，成熟度分布: {summary}")
                        
                        # 3. 如果检测到QR码和草莓，触发AI分析
                        if detected_qr_info and self.crop_analyzer:
                            self.trigger_comprehensive_analysis(frame, detected_qr_info, strawberry_detections)
                                    
                except Exception as e:
                    print(f"❌ 草莓检测错误: {e}")

            # 仅在文件模式下添加覆盖信息，实时模式保持干净的图像
            if file_mode:
                self.add_frame_overlay(processed_frame, strawberry_count=len(strawberry_detections))

            # 转换为RGB格式用于前端显示
            if len(processed_frame.shape) == 3 and processed_frame.shape[2] == 3:
                processed_frame = cv2.cvtColor(processed_frame, cv2.COLOR_BGR2RGB)
            
            return processed_frame

        except Exception as e:
            print(f"❌ 集成检测处理错误: {e}")
            return frame

    def trigger_comprehensive_analysis(self, frame, qr_info, strawberry_detections):
        """触发综合分析：拍照 + AI分析"""
        try:
            plant_id = qr_info.get('id', 'Unknown')
            
            def comprehensive_analysis_worker():
                try:
                    print(f"📸 开始综合分析植株 {plant_id}...")
                    
                    # 保存当前帧作为分析图片
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    image_filename = f"plant_{plant_id}_{timestamp}.jpg"
                    image_path = os.path.join(os.path.dirname(__file__), 'images', image_filename)
                    
                    # 确保images目录存在
                    os.makedirs(os.path.dirname(image_path), exist_ok=True)
                    
                    # 保存图片
                    cv2.imwrite(image_path, frame)
                    print(f"📸 已保存分析图片: {image_filename}")
                    
                    # 执行AI分析
                    result = self.crop_analyzer.analyze_crop_health(frame)
                    
                    if result['status'] == 'ok':
                        # 准备综合分析结果
                        comprehensive_result = {
                            'plant_id': plant_id,
                            'timestamp': datetime.now().isoformat(),
                            'image_filename': image_filename,
                            'qr_info': qr_info,
                            'strawberry_analysis': {
                                'total_strawberries': len(strawberry_detections),
                                'maturity_distribution': self.strawberry_analyzer.get_maturity_summary(strawberry_detections),
                                'detections': [{
                                    'maturity_level': det.maturity_level,
                                    'maturity_confidence': det.maturity_confidence,
                                    'center': det.center,
                                    'area': det.area,
                                    'track_id': det.track_id,
                                    'last_seen': det.last_seen
                                } for det in strawberry_detections]
                            },
                            'ai_analysis': result
                        }
                        
                        # 发送综合分析结果
                        if self.main_loop and not self.main_loop.is_closed():
                            try:
                                future = asyncio.run_coroutine_threadsafe(
                                    self.broadcast_message('comprehensive_analysis_complete', comprehensive_result),
                                    self.main_loop
                                )
                                future.result(timeout=2.0)
                            except Exception as e:
                                print(f"❌ 发送综合分析结果失败: {e}")
                        
                        health_score = result.get('health_score', 0)
                        print(f"✅ 植株 {plant_id} 综合分析完成")
                        print(f"   - 草莓数量: {len(strawberry_detections)}")
                        print(f"   - AI健康评分: {health_score}/100")
                        print(f"   - 图片已保存: {image_filename}")
                    else:
                        print(f"❌ 植株 {plant_id} AI分析失败: {result.get('message')}")
                        
                except Exception as e:
                    print(f"❌ 综合分析执行错误: {e}")
            
            # 在单独线程中运行综合分析
            analysis_thread = threading.Thread(target=comprehensive_analysis_worker)
            analysis_thread.daemon = True
            analysis_thread.start()
            
        except Exception as e:
            print(f"❌ 触发综合分析错误: {e}")

    def detect_qr_codes(self, frame):
        """检测QR码 - 支持OpenCV和pyzbar"""
        detected_codes = []

        if not QR_DETECTOR_AVAILABLE:
            return detected_codes

        try:
            # 转换为灰度图
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            # 图像预处理 - 提高检测成功率
            # 1. 高斯模糊去噪
            gray = cv2.GaussianBlur(gray, (3, 3), 0)

            # 2. 对比度增强
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            gray = clahe.apply(gray)

            if QR_DETECTOR_TYPE == "opencv":
                # 使用OpenCV检测QR码
                qr_detector = cv2.QRCodeDetector()
                data, bbox, _ = qr_detector.detectAndDecode(gray)
                
                if data:
                    # 转换bbox格式以匹配原有代码
                    if bbox is not None:
                        bbox = bbox[0].astype(int)
                        
                        # 计算矩形边界
                        x_coords = bbox[:, 0]
                        y_coords = bbox[:, 1]
                        left = int(min(x_coords))
                        top = int(min(y_coords))
                        width = int(max(x_coords) - min(x_coords))
                        height = int(max(y_coords) - min(y_coords))
                        
                        # 计算中心点
                        center_x = left + width // 2
                        center_y = top + height // 2
                        
                        # 角点坐标
                        corners = [[int(p[0]), int(p[1])] for p in bbox]
                        
                        # 解析植物ID
                        plant_id = self.parse_plant_id(data)
                        
                        detected_codes.append({
                            'type': 'qr',
                            'id': plant_id,
                            'data': data,
                            'corners': corners,
                            'center': (center_x, center_y),
                            'confidence': 0.9,
                            'rect': (left, top, width, height),
                            'quality': 100
                        })
            
            elif QR_DETECTOR_TYPE == "pyzbar":
                # 使用pyzbar检测QR码（原有逻辑）
                qr_codes = pyzbar.decode(gray)

                for qr in qr_codes:
                    try:
                        # 解码数据
                        data = qr.data.decode('utf-8')

                        # 获取边界框
                        rect = qr.rect

                        # 计算角点
                        if hasattr(qr, 'polygon') and qr.polygon:
                            corners = [[p.x, p.y] for p in qr.polygon]
                        else:
                            corners = [
                                [rect.left, rect.top],
                                [rect.left + rect.width, rect.top],
                                [rect.left + rect.width, rect.top + rect.height],
                                [rect.left, rect.top + rect.height]
                            ]

                        # 计算中心点
                        center_x = rect.left + rect.width // 2
                        center_y = rect.top + rect.height // 2

                        # 解析植物ID
                        plant_id = self.parse_plant_id(data)

                        detected_codes.append({
                            'type': 'qr',
                            'id': plant_id,
                            'data': data,
                            'corners': corners,
                            'center': (center_x, center_y),
                            'confidence': 0.9,
                            'rect': (rect.left, rect.top, rect.width, rect.height),
                            'quality': qr.quality if hasattr(qr, 'quality') else 100
                        })

                    except UnicodeDecodeError:
                        print(f"⚠️ QR码数据解码失败，可能包含非UTF-8字符")
                        continue
                    except Exception as e:
                        print(f"⚠️ 处理QR码时出错: {e}")
                        continue

        except Exception as e:
            print(f"❌ QR码检测错误: {e}")

        return detected_codes

    def parse_plant_id(self, data):
        """从QR码数据中解析植物ID"""
        try:
            # 1. 尝试JSON格式
            if data.strip().startswith('{'):
                parsed = json.loads(data)
                if 'id' in parsed:
                    return parsed['id']
                elif 'plant_id' in parsed:
                    return parsed['plant_id']
                elif 'plantId' in parsed:
                    return parsed['plantId']

            # 2. 尝试plant_数字格式
            if 'plant_' in data.lower():
                import re
                match = re.search(r'plant[_-]?(\d+)', data.lower())
                if match:
                    return int(match.group(1))

            # 3. 尝试纯数字
            if data.strip().isdigit():
                return int(data.strip())

            # 4. 尝试提取任何数字
            import re
            numbers = re.findall(r'\d+', data)
            if numbers:
                return int(numbers[0])

            # 5. 使用数据内容作为ID
            return data.strip()[:20]  # 限制长度

        except Exception as e:
            print(f"❌ 解析植物ID失败: {e}")
            return data.strip()[:20]

    def draw_qr_detection(self, frame, qr_info, color=(0, 255, 0)):
        """绘制QR码检测结果"""
        try:
            corners = qr_info.get('corners', [])
            center = qr_info.get('center', (0, 0))
            qr_id = qr_info.get('id', 'Unknown')
            data = qr_info.get('data', '')

            # 绘制边框
            if len(corners) >= 4:
                points = np.array(corners, dtype=np.int32)
                cv2.polylines(frame, [points], True, color, 3)
            else:
                # 使用矩形边框作为备选
                rect = qr_info.get('rect')
                if rect:
                    x, y, w, h = rect
                    cv2.rectangle(frame, (x, y), (x + w, y + h), color, 3)

            # 绘制中心点
            cv2.circle(frame, center, 5, color, -1)

            # 绘制文本信息
            # 优先显示植物ID，如果没有则显示数据的前几个字符
            if isinstance(qr_id, (int, float)):
                text = f'植株: {qr_id}'
            else:
                text = f'QR: {str(qr_id)[:10]}'

            text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)[0]

            # 计算文本位置
            text_x = max(5, center[0] - text_size[0] // 2)
            text_y = max(25, center[1] - 20)

            # 绘制文本背景
            cv2.rectangle(frame,
                          (text_x - 5, text_y - text_size[1] - 5),
                          (text_x + text_size[0] + 5, text_y + 5),
                          color, -1)

            # 绘制文本
            cv2.putText(frame, text, (text_x, text_y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

            # 如果有质量信息，显示
            quality = qr_info.get('quality')
            if quality and quality < 80:
                quality_text = f'质量: {quality}'
                cv2.putText(frame, quality_text, (text_x, text_y + 25),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)

        except Exception as e:
            print(f"❌ 绘制QR检测结果错误: {e}")

    def handle_qr_detection(self, frame, qr_info):
        """处理QR码检测结果"""
        try:
            qr_id = qr_info.get('id', 'Unknown')
            qr_data = qr_info.get('data', '')

            print(f"🔍 检测到QR码: ID={qr_id}, 数据='{qr_data[:30]}{'...' if len(qr_data) > 30 else ''}'")

            # 发送检测事件到前端
            if self.main_loop and not self.main_loop.is_closed():
                try:
                    future = asyncio.run_coroutine_threadsafe(
                        self.broadcast_message('qr_detected', {
                            'qr_info': qr_info,
                            'timestamp': datetime.now().isoformat()
                        }),
                        self.main_loop
                    )
                    future.result(timeout=0.1)
                except Exception as e:
                    print(f"❌ 发送QR检测事件失败: {e}")

            # 进行AI分析
            if self.crop_analyzer:
                self.analyze_plant_ai(frame, qr_info)
            else:
                print("⚠️ AI分析器不可用，跳过分析")

        except Exception as e:
            print(f"❌ 处理QR检测结果错误: {e}")

    def analyze_plant_ai(self, frame, qr_info):
        """AI分析植物"""
        try:
            plant_id = qr_info.get('id', 'Unknown')

            def ai_analysis_worker():
                try:
                    print(f"🤖 开始AI分析植株 {plant_id}...")

                    result = self.crop_analyzer.analyze_crop_health(frame)

                    if result['status'] == 'ok':
                        if self.main_loop and not self.main_loop.is_closed():
                            try:
                                future = asyncio.run_coroutine_threadsafe(
                                    self.broadcast_message('ai_analysis_complete', {
                                        'plant_id': plant_id,
                                        'timestamp': datetime.now().isoformat(),
                                        'analysis': result,
                                        'qr_info': qr_info
                                    }),
                                    self.main_loop
                                )
                                future.result(timeout=2.0)
                            except Exception as e:
                                print(f"❌ 发送AI分析结果失败: {e}")

                        health_score = result.get('health_score', 0)
                        print(f"✅ 植株 {plant_id} AI分析完成，健康评分: {health_score}/100")
                    else:
                        print(f"❌ 植株 {plant_id} AI分析失败: {result.get('message')}")

                except Exception as e:
                    print(f"❌ AI分析执行错误: {e}")

            # 在单独线程中运行AI分析
            ai_thread = threading.Thread(target=ai_analysis_worker)
            ai_thread.daemon = True
            ai_thread.start()

        except Exception as e:
            print(f"❌ AI分析启动错误: {e}")

    def add_frame_overlay(self, frame, strawberry_count=0):
        """添加帧覆盖信息"""
        try:
            # 时间戳
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cv2.putText(frame, timestamp, (10, frame.shape[0] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

            # FPS
            cv2.putText(frame, f'FPS: {self.fps}', (frame.shape[1] - 80, 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

            # 状态信息
            status_text = []
            if self.drone_state['connected']:
                status_text.append('CONNECTED')
            if self.drone_state['flying']:
                status_text.append('FLYING')
            if self.drone_state['mission_active']:
                status_text.append('MISSION')
            if self.qr_detection_enabled and QR_DETECTOR_AVAILABLE:
                status_text.append(f'QR_{QR_DETECTOR_TYPE.upper()}')
            if self.strawberry_analyzer is not None:
                status_text.append('STRAWBERRY')

            if status_text:
                cv2.putText(frame, ' | '.join(status_text), (10, 25),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

            # QR检测统计
            detected_count = len(self.detection_cooldown)
            if detected_count > 0:
                cv2.putText(frame, f'QR Detected: {detected_count}', (10, 50),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

            # 草莓检测统计
            if strawberry_count > 0:
                cv2.putText(frame, f'Strawberries: {strawberry_count}', (10, 75),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 100, 100), 1)

            # 检测状态
            y_offset = 100
            if not QR_DETECTOR_AVAILABLE:
                cv2.putText(frame, 'QR DETECTION DISABLED - NO DETECTOR', (10, y_offset),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
            elif QR_DETECTOR_TYPE:
                cv2.putText(frame, f'QR DETECTOR: {QR_DETECTOR_TYPE.upper()}', (10, y_offset),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

            # AI分析器状态
            if self.crop_analyzer is not None:
                cv2.putText(frame, 'AI ANALYZER: READY', (10, y_offset + 25),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

        except Exception as e:
            print(f"❌ 添加帧覆盖错误: {e}")

    def update_fps_stats(self):
        """更新FPS统计"""
        self.frame_count += 1
        current_time = time.time()

        if current_time - self.last_fps_time >= 1.0:
            self.fps = self.frame_count
            self.frame_count = 0
            self.last_fps_time = current_time

    # WebSocket消息处理方法
    async def handle_websocket_message(self, websocket, message):
        """处理WebSocket消息"""
        try:
            data = json.loads(message)
            message_type = data.get('type')
            message_data = data.get('data', {})
            # Normalize cruise aliases
            if message_type == 'cruise_start':
                message_type = 'challenge_cruise_start'
            elif message_type == 'cruise_stop':
                message_type = 'challenge_cruise_stop'

            print(f"收到消息: {message_type}")

            if message_type == 'drone_connect':
                await self.handle_drone_connect(websocket, message_data)
            elif message_type == 'drone_disconnect':
                await self.handle_drone_disconnect(websocket, message_data)
            elif message_type == 'drone_takeoff':  # 新增起飞处理
                await self.handle_drone_takeoff(websocket, message_data)
            elif message_type == 'drone_land':  # 新增降落处理
                await self.handle_drone_land(websocket, message_data)
            elif message_type == 'mission_start':
                # 将“开始任务”直接映射到挑战卡巡航流程，保证自动起飞并执行任务
                await self.handle_challenge_cruise_start(websocket, message_data)
            elif message_type == 'mission_stop':
                await self.handle_mission_stop(websocket, message_data)
            elif message_type == 'challenge_cruise_start':  # 新增挑战卡巡航开始
                await self.handle_challenge_cruise_start(websocket, message_data)
            elif message_type == 'challenge_cruise_stop':   # 新增挑战卡巡航停止
                await self.handle_challenge_cruise_stop(websocket, message_data)
            elif message_type == 'qr_reset':
                await self.handle_qr_reset(websocket, message_data)
            elif message_type == 'ai_test':
                await self.handle_ai_test(websocket, message_data)
            elif message_type == 'config_update':  # 新增配置更新处理
                await self.handle_config_update(websocket, message_data)
            elif message_type == 'heartbeat':
                await self.handle_heartbeat(websocket, message_data)
            elif message_type == 'manual_control':
                await self.handle_manual_control(websocket, message_data)
            elif message_type == 'start_video_streaming':
                await self.handle_start_video_streaming(websocket, message_data)
            elif message_type == 'stop_video_streaming':
                await self.handle_stop_video_streaming(websocket, message_data)
            elif message_type == 'start_qr_detection':
                await self.handle_start_qr_detection(websocket, message_data)
            elif message_type == 'stop_qr_detection':
                await self.handle_stop_qr_detection(websocket, message_data)
            elif message_type == 'mission_pause':
                await self.handle_mission_pause(websocket, message_data)
            elif message_type == 'mission_resume':
                await self.handle_mission_resume(websocket, message_data)
            elif message_type == 'emergency_stop':
                await self.handle_emergency_stop(websocket, message_data)
            elif message_type == 'move':
                await self.handle_move(websocket, message_data)
            elif message_type == 'rotate':
                await self.handle_rotate(websocket, message_data)
            elif message_type == 'flip':
                await self.handle_flip(websocket, message_data)
            elif message_type == 'connection_test':
                await self.handle_connection_test(websocket, message_data)
            elif message_type == 'simulate_detection':  # 新增模拟检测
                await self.handle_simulate_detection(websocket, message_data)
            elif message_type == 'analyze_uploaded_frame':  # 新增上传帧分析
                await self.handle_analyze_uploaded_frame(websocket, message_data)
            elif message_type == 'start_strawberry_detection':  # 开始草莓检测
                await self.handle_start_strawberry_detection(websocket, message_data)
            elif message_type == 'stop_strawberry_detection':   # 停止草莓检测
                await self.handle_stop_strawberry_detection(websocket, message_data)
            elif message_type == 'start_ai_analysis':           # 开始AI分析
                await self.handle_start_ai_analysis(websocket, message_data)
            elif message_type == 'stop_ai_analysis':            # 停止AI分析
                await self.handle_stop_ai_analysis(websocket, message_data)
            else:
                print(f"未知消息类型: {message_type}")

        except json.JSONDecodeError:
            print("WebSocket消息JSON解析失败")
            await self.send_error(websocket, "消息格式错误")
        except Exception as e:
            print(f"处理WebSocket消息失败: {e}")
            await self.send_error(websocket, str(e))

    async def handle_simulate_detection(self, websocket, data):
        """处理模拟检测请求"""
        try:
            if not ANALYZER_AVAILABLE:
                await self.send_error(websocket, "AI分析器未安装")
                return
                
            if not self.crop_analyzer:
                await self.send_error(websocket, "AI分析器未初始化")
                return

            # 获取base64图片数据
            image_data = data.get('image_data')
            image_name = data.get('image_name', 'uploaded_image')
            
            if not image_data:
                await self.send_error(websocket, "未提供图片数据")
                return

            def simulation_worker():
                try:
                    print(f"🖼️ 开始模拟检测图片: {image_name}")
                    
                    # 解码base64图片
                    try:
                        # 移除data:image/...;base64,前缀
                        if ',' in image_data:
                            base64_data = image_data.split(',')[1]
                        else:
                            base64_data = image_data
                            
                        # 解码图片
                        img_bytes = base64.b64decode(base64_data)
                        nparr = np.frombuffer(img_bytes, np.uint8)
                        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                        
                        if frame is None:
                            raise ValueError("图片解码失败")
                            
                    except Exception as e:
                        print(f"❌ 图片解码失败: {e}")
                        if self.main_loop and not self.main_loop.is_closed():
                            asyncio.run_coroutine_threadsafe(
                                self.send_error(websocket, f"图片解码失败: {str(e)}"),
                                self.main_loop
                            )
                        return

                    # 执行YOLO检测（如果可用）
                    yolo_detections = []
                    processed_frame = frame.copy()
                    
                    if self.strawberry_analyzer and self.strawberry_analyzer.model:
                        try:
                            # 执行草莓检测
                            yolo_detections = self.strawberry_analyzer.detect_strawberries(frame)
                            
                            # 在图像上绘制检测框
                            if yolo_detections:
                                # self.strawberry_analyzer.draw_detections(processed_frame, yolo_detections)
                                print(f"🎯 检测到 {len(yolo_detections)} 个草莓目标")
                            
                            # 获取检测统计
                            maturity_summary = self.strawberry_analyzer.get_maturity_summary(yolo_detections)
                            
                        except Exception as e:
                            print(f"❌ YOLO检测失败: {e}")
                    
                    # 执行AI分析
                    result = self.crop_analyzer.analyze_crop_health(frame)
                    
                    # 将处理后的图像（带检测框）转换为base64
                    processed_image_base64 = None
                    if yolo_detections:
                        try:
                            _, buffer = cv2.imencode('.jpg', processed_frame)
                            processed_image_base64 = base64.b64encode(buffer).decode('utf-8')
                        except Exception as e:
                            print(f"❌ 处理图像编码失败: {e}")

                    if result['status'] == 'ok':
                        # 合并YOLO检测结果和AI分析结果
                        enhanced_result = result.copy()
                        enhanced_result['yolo_detections'] = {
                            'detections': [{
                                'bbox': det.bbox,
                                'confidence': det.confidence,
                                'maturity_level': det.maturity_level,
                                'maturity_confidence': det.maturity_confidence,
                                'center': det.center,
                                'area': det.area
                            } for det in yolo_detections],
                            'summary': maturity_summary if yolo_detections else {},
                            'count': len(yolo_detections)
                        }
                        
                        # 发送分析结果
                        if self.main_loop and not self.main_loop.is_closed():
                            try:
                                future = asyncio.run_coroutine_threadsafe(
                                    self.broadcast_message('simulation_analysis_complete', {
                                        'image_name': image_name,
                                        'timestamp': datetime.now().isoformat(),
                                        'analysis': enhanced_result,
                                        'processed_image': processed_image_base64,  # 带检测框的图像
                                        'simulation': True
                                    }),
                                    self.main_loop
                                )
                                future.result(timeout=2.0)
                            except Exception as e:
                                print(f"❌ 发送模拟分析结果失败: {e}")

                        health_score = result.get('health_score', 0)
                        yolo_count = len(yolo_detections)
                        print(f"✅ 模拟检测完成 {image_name}，健康评分: {health_score}/100，检测到 {yolo_count} 个目标")
                    else:
                        print(f"❌ 模拟检测失败 {image_name}: {result.get('message')}")
                        if self.main_loop and not self.main_loop.is_closed():
                            asyncio.run_coroutine_threadsafe(
                                self.send_error(websocket, f"AI分析失败: {result.get('message')}"),
                                self.main_loop
                            )

                except Exception as e:
                    print(f"❌ 模拟检测执行错误: {e}")
                    if self.main_loop and not self.main_loop.is_closed():
                        asyncio.run_coroutine_threadsafe(
                            self.send_error(websocket, f"模拟检测失败: {str(e)}"),
                            self.main_loop
                        )

            # 在单独线程中运行模拟检测
            simulation_thread = threading.Thread(target=simulation_worker)
            simulation_thread.daemon = True
            simulation_thread.start()
            
            # 发送开始处理的确认
            await websocket.send(json.dumps({
                'type': 'simulation_started',
                'data': {
                    'image_name': image_name,
                    'message': '开始模拟检测分析...'
                }
            }))

        except Exception as e:
            print(f"❌ 处理模拟检测请求失败: {e}")
            await self.send_error(websocket, str(e))

    async def handle_analyze_uploaded_frame(self, websocket, data):
        """处理上传帧分析请求"""
        try:
            # 获取base64图片数据
            frame_data = data.get('frame')
            timestamp = data.get('timestamp', datetime.now().isoformat())
            
            if not frame_data:
                await self.send_error(websocket, "未提供帧数据")
                return

            def frame_analysis_worker():
                try:
                    print(f"🖼️ 开始分析上传帧: {timestamp}")
                    
                    # 解码base64图片
                    try:
                        # 移除data:image/...;base64,前缀
                        if ',' in frame_data:
                            base64_data = frame_data.split(',')[1]
                        else:
                            base64_data = frame_data
                            
                        # 解码图片
                        img_bytes = base64.b64decode(base64_data)
                        nparr = np.frombuffer(img_bytes, np.uint8)
                        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                        
                        if frame is None:
                            raise ValueError("帧解码失败")
                            
                    except Exception as e:
                        print(f"❌ 帧解码失败: {e}")
                        if self.main_loop and not self.main_loop.is_closed():
                            asyncio.run_coroutine_threadsafe(
                                self.send_error(websocket, f"帧解码失败: {str(e)}"),
                                self.main_loop
                            )
                        return

                    # 执行综合检测（QR码 + 草莓检测），文件模式
                    processed_frame = self.process_integrated_detection(frame, True, True, file_mode=True)
                    
                    # 编码处理后的帧
                    _, buffer = cv2.imencode('.jpg', processed_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                    processed_frame_b64 = base64.b64encode(buffer).decode('utf-8')
                    
                    # 发送处理后的帧
                    if self.main_loop and not self.main_loop.is_closed():
                        try:
                            future = asyncio.run_coroutine_threadsafe(
                                self.broadcast_message('video_frame', {
                                    'frame': f'data:image/jpeg;base64,{processed_frame_b64}',
                                    'fps': 0,  # 文件模式不显示FPS
                                    'timestamp': timestamp,
                                    'file_mode': True,
                                    'detection_status': {
                                        'qr_enabled': self.qr_detection_enabled,
                                        'strawberry_enabled': self.strawberry_analyzer is not None,
                                        'ai_enabled': self.crop_analyzer is not None
                                    }
                                }),
                                self.main_loop
                            )
                            future.result(timeout=1.0)
                        except Exception as e:
                            print(f"❌ 发送处理帧失败: {e}")

                    print(f"✅ 上传帧分析完成: {timestamp}")

                except Exception as e:
                    print(f"❌ 上传帧分析执行错误: {e}")
                    if self.main_loop and not self.main_loop.is_closed():
                        asyncio.run_coroutine_threadsafe(
                            self.send_error(websocket, f"帧分析失败: {str(e)}"),
                            self.main_loop
                        )

            # 在单独线程中运行帧分析
            analysis_thread = threading.Thread(target=frame_analysis_worker)
            analysis_thread.daemon = True
            analysis_thread.start()

        except Exception as e:
            print(f"❌ 处理上传帧分析请求失败: {e}")
            await self.send_error(websocket, str(e))

    async def handle_config_update(self, websocket, data):
        """处理配置更新"""
        try:
            print("🔧 收到配置更新请求")
            
            # 获取新的API配置
            api_key = data.get('dashscope_api_key', '').strip()
            app_id = data.get('dashscope_app_id', '').strip()
            
            if not api_key or not app_id:
                await self.broadcast_message('config_updated', {
                    'success': False,
                    'message': 'API密钥或应用ID不能为空'
                })
                return
            
            # 重新初始化AI分析器
            try:
                if ANALYZER_AVAILABLE:
                    from crop_analyzer_dashscope import CropAnalyzer
                    self.crop_analyzer = CropAnalyzer(api_key=api_key, app_id=app_id)
                    print("✅ AI分析器重新初始化成功")
                    
                    # 测试连接
                    test_result = self.crop_analyzer.test_connection()
                    if test_result['status'] == 'ok':
                        await self.broadcast_message('config_updated', {
                            'success': True,
                            'message': 'AI配置更新成功'
                        })
                        await self.broadcast_message('ai_test_result', {
                            'success': True,
                            'message': test_result['message']
                        })
                    else:
                        await self.broadcast_message('config_updated', {
                            'success': False,
                            'message': f'AI配置测试失败: {test_result["message"]}'
                        })
                        await self.broadcast_message('ai_test_result', {
                            'success': False,
                            'message': test_result['message']
                        })
                else:
                    await self.broadcast_message('config_updated', {
                        'success': False,
                        'message': 'AI分析器模块不可用'
                    })
                    
            except Exception as ai_error:
                print(f"❌ AI分析器初始化失败: {ai_error}")
                await self.broadcast_message('config_updated', {
                    'success': False,
                    'message': f'AI分析器初始化失败: {str(ai_error)}'
                })
                
        except Exception as e:
            print(f"❌ 配置更新失败: {e}")
            await self.broadcast_message('config_updated', {
                'success': False,
                'message': f'配置更新失败: {str(e)}'
            })

    async def handle_challenge_cruise_start(self, websocket, data):
        """处理挑战卡巡航开始"""
        try:
            if not MISSION_CONTROLLER_AVAILABLE:
                await self.send_error(websocket, "挑战卡巡航控制器未安装")
                return
                
            if self.drone_state['challenge_cruise_active']:
                await self.send_error(websocket, "挑战卡巡航已在运行中")
                return

            # 自动连接无人机（如果未连接）
            if not self.drone_adapter or not self.drone_adapter.is_connected:
                await self.broadcast_message('status_update', '🔄 正在自动连接无人机...')
                await self.handle_drone_connect(websocket, {})
                
                # 等待连接完成
                await asyncio.sleep(2)
                
                if not self.drone_adapter or not self.drone_adapter.is_connected:
                    await self.send_error(websocket, "无人机自动连接失败")
                    return
            
            # 自动起飞（如果未起飞）
            if not self.drone_state['flying']:
                await self.broadcast_message('status_update', '🚁 正在自动起飞...')
                await self.handle_drone_takeoff(websocket, {})
                
                # 等待起飞完成
                await asyncio.sleep(3)
                
                if not self.drone_state['flying']:
                    await self.send_error(websocket, "无人机自动起飞失败")
                    return

            # 获取任务参数
            rounds = data.get('rounds', 3)
            height = data.get('height', 100)
            stay_duration = data.get('stay_duration', 3)
            
            # 验证参数
            rounds = max(1, min(10, rounds))
            height = max(40, min(300, height))
            stay_duration = max(0.5, min(30, stay_duration))
            
            # 初始化任务控制器
            if not self.mission_controller:
                self.mission_controller = MissionController(
                    self.drone_adapter,
                    status_callback=self.mission_status_callback,
                    position_callback=self.mission_position_callback
                )
                
                # 注册清理回调函数
                self.mission_controller.add_cleanup_callback(self.cleanup_video_resources)
                self.mission_controller.add_cleanup_callback(self.cleanup_ai_resources)
                self.mission_controller.add_cleanup_callback(self.cleanup_detection_resources)
                
                # 注册任务完成回调函数，用于重置后端状态
                self.mission_controller.mission_complete_callback = self.reset_challenge_cruise_state
            
            # 设置任务参数
            self.mission_controller.set_mission_rounds(rounds)
            self.mission_controller.set_mission_height(height)
            self.mission_controller.set_stay_duration(stay_duration)
            
            # 启动任务
            success = self.mission_controller.start_mission()
            
            if success:
                self.drone_state['challenge_cruise_active'] = True
                await self.broadcast_message('mission_status', {
                    'type': 'challenge_cruise_started',
                    'rounds': rounds,
                    'height': height,
                    'stay_duration': stay_duration
                })
                await self.broadcast_message('status_update', 
                    f'挑战卡巡航任务已启动 - 轮次: {rounds}, 高度: {height}cm, 停留: {stay_duration}秒')
            else:
                await self.send_error(websocket, "启动挑战卡巡航失败")
                
            await self.broadcast_drone_status()

        except Exception as e:
            print(f"启动挑战卡巡航失败: {e}")
            await self.send_error(websocket, f"启动挑战卡巡航失败: {str(e)}")

    async def handle_challenge_cruise_stop(self, websocket, data):
        """处理挑战卡巡航停止"""
        try:
            if self.mission_controller:
                self.mission_controller.stop_mission_execution()
                
            self.drone_state['challenge_cruise_active'] = False
            
            await self.broadcast_message('mission_status', {
                'type': 'challenge_cruise_stopped'
            })
            await self.broadcast_message('status_update', '挑战卡巡航任务已停止')
            await self.broadcast_drone_status()

        except Exception as e:
            print(f"停止挑战卡巡航失败: {e}")
            await self.send_error(websocket, f"停止挑战卡巡航失败: {str(e)}")

    def reset_challenge_cruise_state(self):
        """重置挑战卡巡航状态 - 任务完成回调函数"""
        try:
            print("🔄 正在重置挑战卡巡航状态...")
            
            # 重置挑战卡巡航状态
            self.drone_state['challenge_cruise_active'] = False
            
            # 广播状态更新
            if self.main_loop:
                asyncio.run_coroutine_threadsafe(
                    self.broadcast_message('mission_status', {
                        'type': 'challenge_cruise_completed',
                        'message': '挑战卡任务已完成，状态已重置'
                    }),
                    self.main_loop
                )
                
                asyncio.run_coroutine_threadsafe(
                    self.broadcast_message('status_update', '✅ 挑战卡任务完成，系统已重置，可以重新开始任务'),
                    self.main_loop
                )
                
                asyncio.run_coroutine_threadsafe(
                    self.broadcast_drone_status(),
                    self.main_loop
                )
            
            print("✅ 挑战卡巡航状态重置完成")
            
        except Exception as e:
            print(f"❌ 重置挑战卡巡航状态失败: {e}")

    def mission_status_callback(self, status_message):
        """任务状态回调函数"""
        try:
            # 在主事件循环中广播状态更新
            if self.main_loop:
                asyncio.run_coroutine_threadsafe(
                    self.broadcast_message('mission_status', {
                        'type': 'progress_update',
                        'message': status_message
                    }),
                    self.main_loop
                )
        except Exception as e:
            print(f"任务状态回调失败: {e}")

    def mission_position_callback(self, position_payload):
        """任务位置回调，将位置信息通过WebSocket广播到前端"""
        try:
            if not position_payload:
                return
            if self.main_loop:
                asyncio.run_coroutine_threadsafe(
                    self.broadcast_message('mission_position', position_payload),
                    self.main_loop
                )
        except Exception as e:
            print(f"任务位置回调失败: {e}")

    async def handle_qr_reset(self, websocket, data):
        """处理QR码检测重置"""
        try:
            self.processed_qr_data.clear()
            self.detection_cooldown.clear()
            await self.broadcast_message('status_update', '🔄 QR码检测已重置')
            print("✅ QR码检测状态已重置")
        except Exception as e:
            print(f"❌ 重置QR码检测失败: {e}")
            await self.send_error(websocket, f"重置失败: {str(e)}")

    async def handle_mission_start(self, websocket, data):
        """处理任务开始"""
        try:
            if not QR_DETECTOR_AVAILABLE:
                await self.send_error(websocket, "QR码检测库未安装，无法启动任务")
                return

            self.drone_state['mission_active'] = True
            self.qr_detection_enabled = True
            self.processed_qr_data.clear()
            self.detection_cooldown.clear()

            await self.broadcast_message('status_update', '🎯 QR码分析任务已启动')
            await self.broadcast_drone_status()

        except Exception as e:
            print(f"❌ 启动任务失败: {e}")
            await self.send_error(websocket, f"启动任务失败: {str(e)}")

    async def handle_ai_test(self, websocket, data):
        """处理AI测试"""
        try:
            if not self.crop_analyzer:
                await self.broadcast_message('ai_test_result', {
                    'success': False,
                    'message': 'AI分析器未初始化，请先保存API配置'
                })
                return

            # 创建测试图像
            test_image = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.circle(test_image, (320, 240), 100, (0, 150, 0), -1)

            await self.broadcast_message('status_update', '🧪 正在进行AI分析测试...')

            result = self.crop_analyzer.analyze_crop_health(test_image)

            if result['status'] == 'ok':
                health_score = result.get('health_score', 0)
                analysis_id = result.get('analysis_id', 'N/A')

                await self.broadcast_message('ai_test_result', {
                    'success': True,
                    'message': f'AI测试成功 - 评分: {health_score}/100 (ID: {analysis_id})'
                })

                await self.broadcast_message('ai_analysis_complete', {
                    'plant_id': 'TEST-QR',
                    'timestamp': datetime.now().isoformat(),
                    'analysis': result
                })
            else:
                await self.broadcast_message('ai_test_result', {
                    'success': False,
                    'message': f"AI测试失败: {result.get('message', '未知错误')}"
                })

        except Exception as e:
            print(f"❌ AI测试失败: {e}")
            await self.broadcast_message('ai_test_result', {
                'success': False,
                'message': f'AI测试异常: {str(e)}'
            })

    async def handle_start_strawberry_detection(self, websocket, data):
        """处理开始草莓检测"""
        try:
            self.strawberry_detection_enabled = True
            await self.broadcast_message('status_update', '🍓 草莓检测已启动')
            await self.broadcast_message('strawberry_detection_status', {
                'enabled': True,
                'message': '草莓检测已启动'
            })
            print("✅ 草莓检测已启动")
        except Exception as e:
            print(f"启动草莓检测失败: {e}")
            await self.send_error(websocket, f"启动草莓检测失败: {str(e)}")

    async def handle_stop_strawberry_detection(self, websocket, data):
        """处理停止草莓检测"""
        try:
            self.strawberry_detection_enabled = False
            await self.broadcast_message('status_update', '🍓 草莓检测已停止')
            await self.broadcast_message('strawberry_detection_status', {
                'enabled': False,
                'message': '草莓检测已停止'
            })
            print("⏹️ 草莓检测已停止")
        except Exception as e:
            print(f"停止草莓检测失败: {e}")
            await self.send_error(websocket, f"停止草莓检测失败: {str(e)}")

    async def handle_start_ai_analysis(self, websocket, data):
        """处理开始AI分析"""
        try:
            if not self.crop_analyzer:
                await self.send_error(websocket, "AI分析器未初始化，请先保存API配置")
                return
                
            self.ai_analysis_enabled = True
            await self.broadcast_message('status_update', '🤖 AI分析已启动')
            await self.broadcast_message('ai_analysis_status', {
                'enabled': True,
                'message': 'AI分析已启动'
            })
            print("✅ AI分析已启动")
        except Exception as e:
            print(f"启动AI分析失败: {e}")
            await self.send_error(websocket, f"启动AI分析失败: {str(e)}")

    async def handle_stop_ai_analysis(self, websocket, data):
        """处理停止AI分析"""
        try:
            self.ai_analysis_enabled = False
            await self.broadcast_message('status_update', '🤖 AI分析已停止')
            await self.broadcast_message('ai_analysis_status', {
                'enabled': False,
                'message': 'AI分析已停止'
            })
            print("⏹️ AI分析已停止")
        except Exception as e:
            print(f"停止AI分析失败: {e}")
            await self.send_error(websocket, f"停止AI分析失败: {str(e)}")

    # 其他必要的方法保持与原版相同，但移除所有ArUco相关代码
    async def handle_drone_connect(self, websocket, data):
        """处理无人机连接"""
        try:
            if not TELLO_AVAILABLE:
                await self.send_error(websocket, "djitellopy库未安装，无法连接无人机")
                return

            if self.drone is None:
                print("正在连接无人机...")
                await self.broadcast_message('status_update', '🔗 正在连接无人机...')
                
                self.drone = Tello()
                # djitellopy连接超时设置
                self.drone.RESPONSE_TIMEOUT = 10  # 设置响应超时为10秒
                self.drone.connect()

                await asyncio.sleep(2)

                try:
                    battery = self.drone.get_battery()
                    if battery < 0:  # 电池值异常表示连接可能有问题
                        raise Exception("无法获取有效的电池信息")
                    self.drone_state.update({
                        'connected': True,
                        'battery': battery,
                        'challenge_cruise_active': False  # 确保连接时挑战卡任务为禁用状态
                    })
                    print(f"✅ 无人机连接成功，电量: {battery}%")
                except Exception as e:
                    print(f"⚠️ 电池信息获取失败: {e}，使用默认值")
                    self.drone_state.update({
                        'connected': True,
                        'battery': 50
                    })
                    print("✅ 无人机连接成功，电量读取失败")

                await self.broadcast_drone_status() # 广播无人机状态，确保前端更新挑战卡任务状态

                # 创建无人机适配器
                self.drone_adapter = DroneControllerAdapter(self.drone)
                self.drone_adapter.update_connection_status(True)
                
                # 启用任务垫检测
                try:
                    self.drone.enable_mission_pads()
                    print("✅ 任务垫检测已启用")
                except Exception as e:
                    print(f"⚠️ 启用任务垫检测失败: {e}")

                # 启动视频流
                print("📹 启动视频流...")
                await self.broadcast_message('status_update', '📹 正在启动视频流...')
                
                # 启动视频流 - 添加重试机制
                video_retry = 0
                max_video_retry = 3
                video_stream_started = False
                
                while video_retry < max_video_retry and not video_stream_started:
                    try:
                        self.drone.streamon()
                        await asyncio.sleep(3)  # 等待视频流稳定
                        video_stream_started = True
                        print(f"✅ 视频流启动成功 (尝试 {video_retry + 1}/{max_video_retry})")
                    except Exception as e:
                        video_retry += 1
                        print(f"⚠️ 视频流启动失败 (尝试 {video_retry}/{max_video_retry}): {e}")
                        if video_retry < max_video_retry:
                            await asyncio.sleep(1)
                
                if video_stream_started:
                    # 测试视频流
                    test_attempts = 0
                    max_test_attempts = 5
                    video_ready = False
                    
                    while test_attempts < max_test_attempts and not video_ready:
                        try:
                            test_frame = self.drone.get_frame_read()
                            if test_frame is not None and test_frame.frame is not None:
                                print("✅ 视频流测试成功")
                                video_ready = True
                                break
                        except Exception:
                            pass
                        
                        test_attempts += 1
                        await asyncio.sleep(1)
                    
                    if video_ready:
                        await self.broadcast_message('status_update', '✅ 视频流初始化成功')
                        print("✅ 视频流初始化完成")
                    else:
                        await self.broadcast_message('status_update', '⚠️ 视频流初始化异常，但连接成功')
                        print("⚠️ 视频流初始化可能失败，但无人机已连接")
                else:
                    print("❌ 视频流启动失败")
                    await self.broadcast_message('status_update', '⚠️ 视频流启动失败')

                # 启动视频流处理线程
                self.start_video_streaming()
                
                await self.broadcast_message('status_update', '✅ 无人机连接完成，系统就绪')
                await self.broadcast_message('drone_connected', {
                    'success': True,
                    'battery': self.drone_state['battery'],
                    'capabilities': {
                        'qr_detection': QR_DETECTOR_AVAILABLE,
                        'strawberry_detection': STRAWBERRY_ANALYZER_AVAILABLE,
                        'ai_analysis': ANALYZER_AVAILABLE
                    },
                    'timestamp': datetime.now().isoformat()
                })
                await self.broadcast_drone_status()

            else:
                await self.send_error(websocket, "无人机已连接")

        except Exception as e:
            print(f"❌ 连接无人机失败: {e}")
            await self.send_error(websocket, f"连接失败: {str(e)}")
            await self.broadcast_message('drone_connected', {
                'success': False,
                'message': f'连接失败: {str(e)}',
                'timestamp': datetime.now().isoformat()
            })
            if self.drone:
                try:
                    self.drone.end()
                except:
                    pass
                self.drone = None
                self.drone_adapter = None

    def start_video_streaming(self):
        """启动视频流"""
        if self.video_thread is None or not self.video_thread.is_alive():
            self.video_streaming = True
            self.video_thread = threading.Thread(target=self.video_stream_worker)
            self.video_thread.daemon = True
            self.video_thread.start()
            print("📹 QR码检测视频流已启动")

    async def start_agent_bridge(self):
        """启动智能代理桥接：连接到3004端口并同步其状态到本服务"""
        if websockets is None:
            print("❌ 无法启动智能代理桥接：websockets库未安装")
            return

        print(f"🔗 正在连接智能代理 {self.agent_url} ...")
        while self.is_running and self.use_agent_mode:
            try:
                async with websockets.connect(self.agent_url, ping_interval=20, ping_timeout=10) as ws:
                    self.agent_ws = ws
                    self.agent_connected = True
                    print("✅ 已连接智能代理(3004)")
                    # 请求一次状态同步
                    await self._agent_send({'type': 'get_status', 'data': {}})

                    async for msg in ws:
                        try:
                            agent_msg = json.loads(msg)
                        except json.JSONDecodeError:
                            continue

                        mtype = agent_msg.get('type')
                        data = agent_msg.get('data') or agent_msg
                        # 调试日志：打印来自3004的消息类型，便于定位问题
                        try:
                            print(f"[Agent->Backend] 收到智能代理消息类型: {mtype}")
                        except Exception:
                            pass

                        if mtype == 'drone_status':
                            status = agent_msg.get('data') or {}
                            # 映射常用状态字段
                            if isinstance(status.get('connected'), bool):
                                self.drone_state['connected'] = status['connected']
                            if isinstance(status.get('flying'), bool):
                                self.drone_state['flying'] = status['flying']
                            if isinstance(status.get('battery'), int):
                                self.drone_state['battery'] = status['battery']
                            if isinstance(status.get('temperature'), (int, float)):
                                self.drone_state['temperature'] = int(status['temperature'])
                            if isinstance(status.get('height'), (int, float)):
                                self.drone_state['height'] = int(status['height'])
                            # 广播到3002的所有客户端
                            await self.broadcast_drone_status()
                        elif mtype == 'natural_language_command_response':
                            # 从智能代理获取AI解析结果并在本地执行（若已连接无人机）
                            # 兼容多种响应结构：顶层或data内
                            ai = agent_msg.get('ai_analysis') or data.get('ai_analysis') or agent_msg.get('data', {}).get('ai_analysis') or {}
                            cmds = []
                            # 优先commands数组
                            if isinstance(ai, dict):
                                cmds = ai.get('commands') or []
                            # 若AI未提供结构化commands但提供raw_response，可尝试容错解析
                            if not cmds and isinstance(ai, dict) and isinstance(ai.get('raw_response'), str):
                                try:
                                    parsed = json.loads(ai['raw_response'])
                                    if isinstance(parsed, dict):
                                        cmds = parsed.get('commands') or []
                                except Exception:
                                    pass

                            if cmds:
                                if self.drone_state.get('connected', False):
                                    # 加锁以保证整段指令顺序执行
                                    async with self.command_lock:
                                        for cmd in cmds:
                                            try:
                                                act = (cmd.get('action') or '').strip()
                                                params = cmd.get('parameters') or {}
                                                # 在执行前向3002前端广播一个“动作开始”事件，便于UI显示
                                                await self.broadcast_message('drone_command', {'action': act, 'parameters': params})
                                                res = await self._execute_local_drone_command(act, params)
                                                await self.broadcast_message('status_update', res.get('message', f'执行 {act}'))
                                                # 执行间隔
                                                await asyncio.sleep(0.5)
                                            except Exception as ex:
                                                await self.broadcast_message('status_update', f'命令执行失败: {str(ex)}')
                                                break
                                    # 执行完成后广播最新状态
                                    await self.broadcast_drone_status()
                                else:
                                    # 本地未连接时，仍将每条命令以drone_command形式广播，让前端有可见反馈
                                    for cmd in cmds:
                                        act = (cmd.get('action') or '').strip()
                                        params = cmd.get('parameters') or {}
                                        await self.broadcast_message('drone_command', {'action': act, 'parameters': params})
                                    await self.broadcast_message('status_update', 'AI解析完成，但本地无人机未连接，未执行动作')
                            # 同步将原始响应转发给前端以供查看
                            await self.broadcast_message('natural_language_command_response', agent_msg)
                        elif mtype == 'drone_command_response':
                            # 代理执行单条动作后的反馈，同步给前端
                            await self.broadcast_message('drone_command_response', data)
                        elif isinstance(data, dict) and (isinstance(data.get('commands'), list) or isinstance((data.get('ai_analysis') or {}).get('commands'), list)):
                            # 通用AI分析结果桥接：直接解析包含commands列表的结构并执行本地动作
                            cmds = data.get('commands') or ((data.get('ai_analysis') or {}).get('commands') or [])
                            if cmds:
                                if self.drone_state.get('connected', False):
                                    # 加锁确保来自不同消息的命令不会交叉执行
                                    async with self.command_lock:
                                        for cmd in cmds:
                                            try:
                                                act = (cmd.get('action') or '').strip()
                                                params = cmd.get('parameters') or {}
                                                # 广播动作开始，便于UI显示
                                                await self.broadcast_message('drone_command', {'action': act, 'parameters': params})
                                                res = await self._execute_local_drone_command(act, params)
                                                await self.broadcast_message('status_update', res.get('message', f'执行 {act}'))
                                                await asyncio.sleep(0.5)
                                            except Exception as ex:
                                                await self.broadcast_message('status_update', f'命令执行失败: {str(ex)}')
                                                break
                                    await self.broadcast_drone_status()
                                else:
                                    await self.broadcast_message('status_update', 'AI分析包含commands，但本地无人机未连接，未执行动作')
                            # 同步转发原始消息
                            await self.broadcast_message('ai_analysis_commands', data)
                        else:
                            # 其他消息直接桥接，保证反馈完整
                            await self.broadcast_message(mtype or 'agent_message', data)

                    # 循环结束视为断开
                    self.agent_connected = False
                    self.agent_ws = None
                    print("📴 智能代理连接已断开，准备重连...")
            except Exception as e:
                self.agent_connected = False
                self.agent_ws = None
                print(f"❌ 智能代理桥接错误/连接失败: {e}")
                await asyncio.sleep(2.0)

    async def _agent_send(self, payload: Dict[str, Any]):
        """向智能代理发送消息（预留，用于需要转发控制时）"""
        try:
            if self.agent_ws and self.agent_connected:
                await self.agent_ws.send(json.dumps(payload, ensure_ascii=False))
                return True
            else:
                print("⚠️ 智能代理未连接，发送被跳过")
                return False
        except Exception as e:
            print(f"❌ 发送到智能代理失败: {e}")
            return False

    async def _execute_local_drone_command(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """在本地无人机上执行从智能代理解析出的命令"""
        try:
            if not TELLO_AVAILABLE:
                return {'success': False, 'message': 'djitellopy未安装'}
            if not self.drone:
                return {'success': False, 'message': '无人机未连接'}

            # 基础命令
            if action == 'takeoff':
                if self.drone_adapter:
                    ok = self.drone_adapter.takeoff()
                else:
                    self.drone.takeoff()
                    ok = True
                if ok:
                    self.drone_state['flying'] = True
                    return {'success': True, 'message': '✅ 起飞成功'}
                return {'success': False, 'message': '起飞失败'}

            if action == 'land':
                if self.drone_adapter:
                    ok = self.drone_adapter.land()
                else:
                    self.drone.land()
                    ok = True
                if ok:
                    self.drone_state['flying'] = False
                    return {'success': True, 'message': '✅ 降落成功'}
                return {'success': False, 'message': '降落失败'}

            if action == 'emergency':
                try:
                    self.drone.emergency()
                except Exception:
                    pass
                self.drone_state['flying'] = False
                return {'success': True, 'message': '⛔ 紧急停止执行'}

            # 移动命令
            if action in ['move_forward','move_back','move_left','move_right','move_up','move_down']:
                dist = int(parameters.get('distance', 20))
                dist = max(20, min(500, dist))
                if action == 'move_forward':
                    self.drone.move_forward(dist)
                elif action == 'move_back':
                    self.drone.move_back(dist)
                elif action == 'move_left':
                    self.drone.move_left(dist)
                elif action == 'move_right':
                    self.drone.move_right(dist)
                elif action == 'move_up':
                    self.drone.move_up(dist)
                elif action == 'move_down':
                    self.drone.move_down(dist)
                return {'success': True, 'message': f'➡️ 移动完成 {action} {dist}cm'}

            # 旋转命令
            if action in ['rotate_clockwise','rotate_counter_clockwise']:
                deg = int(parameters.get('degrees', 90))
                deg = max(1, min(360, deg))
                if action == 'rotate_clockwise':
                    self.drone.rotate_clockwise(deg)
                else:
                    self.drone.rotate_counter_clockwise(deg)
                return {'success': True, 'message': f'🔄 旋转完成 {deg}°'}

            # 状态命令
            if action == 'get_battery':
                b = self.drone.get_battery()
                self.drone_state['battery'] = b
                return {'success': True, 'message': f'🔋 电池: {b}%'}

            if action == 'get_status':
                # 复用已有状态获取并广播
                await self.broadcast_drone_status()
                return {'success': True, 'message': '📡 已广播当前状态'}

            # 未知命令
            return {'success': False, 'message': f'未知命令: {action}'}
        except Exception as e:
            return {'success': False, 'message': f'命令执行异常: {str(e)}'}

    def stop_video_streaming(self):
        """停止视频流"""
        self.video_streaming = False
        if self.video_thread and self.video_thread.is_alive():
            self.video_thread.join(timeout=2)
        print("📹 QR码检测视频流已停止")

    async def handle_start_video_streaming(self, websocket, data):
        """处理开启视频流指令"""
        try:
            if self.drone:
                try:
                    self.drone.streamon()
                except Exception as e:
                    print(f"开启Tello视频失败(忽略继续): {e}")
            self.start_video_streaming()
            await self.broadcast_message('status_update', '视频流已开启')
            await self.broadcast_message('video_stream_status', {
                'enabled': True,
                'message': '视频流已开启'
            })
        except Exception as e:
            await self.send_error(websocket, f"开启视频流失败: {str(e)}")

    async def handle_stop_video_streaming(self, websocket, data):
        """处理停止视频流指令"""
        try:
            self.stop_video_streaming()
            if self.drone:
                try:
                    self.drone.streamoff()
                except Exception as e:
                    print(f"关闭Tello视频失败(忽略继续): {e}")
            await self.broadcast_message('status_update', '视频流已关闭')
            await self.broadcast_message('video_stream_status', {
                'enabled': False,
                'message': '视频流已关闭'
            })
        except Exception as e:
            await self.send_error(websocket, f"停止视频流失败: {str(e)}")

    async def handle_start_qr_detection(self, websocket, data):
        """处理开启QR检测指令"""
        try:
            self.qr_detection_enabled = True
            await self.broadcast_message('status_update', 'QR码检测已开启')
            await self.broadcast_message('qr_detection_status', {
                'enabled': True,
                'message': 'QR码检测已开启'
            })
        except Exception as e:
            await self.send_error(websocket, f"开启QR检测失败: {str(e)}")

    async def handle_stop_qr_detection(self, websocket, data):
        """处理停止QR检测指令"""
        try:
            self.qr_detection_enabled = False
            await self.broadcast_message('status_update', 'QR码检测已关闭')
            await self.broadcast_message('qr_detection_status', {
                'enabled': False,
                'message': 'QR码检测已关闭'
            })
        except Exception as e:
            await self.send_error(websocket, f"停止QR检测失败: {str(e)}")

    async def handle_mission_pause(self, websocket, data):
        """处理任务暂停（占位实现）"""
        try:
            await self.broadcast_message('mission_status', {
                'type': 'mission_paused',
                'message': '当前版本不支持任务暂停，已保持当前状态'
            })
        except Exception as e:
            await self.send_error(websocket, f"任务暂停失败: {str(e)}")

    async def handle_mission_resume(self, websocket, data):
        """处理任务恢复（占位实现）"""
        try:
            await self.broadcast_message('mission_status', {
                'type': 'mission_resumed',
                'message': '当前版本不支持任务暂停/恢复，保持原状态'
            })
        except Exception as e:
            await self.send_error(websocket, f"任务恢复失败: {str(e)}")

    async def handle_emergency_stop(self, websocket, data):
        """处理急停"""
        try:
            if not TELLO_AVAILABLE:
                await self.send_error(websocket, "djitellopy库未安装，无法控制无人机")
                return
            if not self.drone:
                await self.send_error(websocket, "无人机未连接")
                return
            try:
                self.drone.emergency()
            except Exception as e:
                print(f"执行急停失败(可能不支持): {e}")
            self.drone_state['flying'] = False
            await self.broadcast_message('status_update', '紧急停止命令已下达')
        except Exception as e:
            await self.send_error(websocket, f"急停失败: {str(e)}")

    async def handle_move(self, websocket, data):
        """处理位移移动指令"""
        try:
            if not TELLO_AVAILABLE:
                await self.send_error(websocket, "djitellopy库未安装，无法控制无人机")
                return
            if not self.drone:
                await self.send_error(websocket, "无人机未连接")
                return
            direction = (data.get('direction') or '').lower()
            distance = int(data.get('distance') or 20)
            distance = max(20, min(500, distance))
            if direction in ['forward','front','f']:
                self.drone.move_forward(distance)
            elif direction in ['back','backward','b']:
                self.drone.move_back(distance)
            elif direction in ['left','l']:
                self.drone.move_left(distance)
            elif direction in ['right','r']:
                self.drone.move_right(distance)
            elif direction == 'up':
                self.drone.move_up(distance)
            elif direction == 'down':
                self.drone.move_down(distance)
            else:
                await self.send_error(websocket, f"不支持的移动方向: {direction}")
                return
            await self.broadcast_message('status_update', f'移动 {direction} {distance}cm 完成')
        except Exception as e:
            await self.send_error(websocket, f"移动失败: {str(e)}")

    async def handle_rotate(self, websocket, data):
        """处理旋转指令"""
        try:
            if not TELLO_AVAILABLE:
                await self.send_error(websocket, "djitellopy库未安装，无法控制无人机")
                return
            if not self.drone:
                await self.send_error(websocket, "无人机未连接")
                return
            direction = (data.get('direction') or '').lower()
            degrees = int(data.get('degrees') or 90)
            degrees = max(1, min(360, degrees))
            if direction in ['cw','clockwise']:
                self.drone.rotate_clockwise(degrees)
            elif direction in ['ccw','counterclockwise']:
                self.drone.rotate_counter_clockwise(degrees)
            else:
                await self.send_error(websocket, f"不支持的旋转方向: {direction}")
                return
            await self.broadcast_message('status_update', f'旋转 {direction} {degrees}° 完成')
        except Exception as e:
            await self.send_error(websocket, f"旋转失败: {str(e)}")

    async def handle_flip(self, websocket, data):
        """处理翻转指令"""
        try:
            if not TELLO_AVAILABLE:
                await self.send_error(websocket, "djitellopy库未安装，无法控制无人机")
                return
            if not self.drone:
                await self.send_error(websocket, "无人机未连接")
                return
            direction = (data.get('direction') or '').lower()
            if direction not in ['l','r','f','b']:
                await self.send_error(websocket, f"不支持的翻转方向: {direction}")
                return
            self.drone.flip(direction)
            await self.broadcast_message('status_update', f'翻转 {direction} 完成')
        except Exception as e:
            await self.send_error(websocket, f"翻转失败: {str(e)}")

    async def handle_drone_takeoff(self, websocket, data):
        """处理无人机起飞"""
        try:
            if not TELLO_AVAILABLE:
                await self.send_error(websocket, "djitellopy库未安装，无法控制无人机")
                return
                
            if not self.drone:
                await self.send_error(websocket, "无人机未连接")
                return
                
            if self.drone_state.get('flying', False):
                await self.send_error(websocket, "无人机已在飞行中")
                return

            print("🚁 正在起飞...")
            await self.broadcast_message('status_update', '🚁 无人机正在起飞...')
            
            # 使用适配器起飞，带重试与连接刷新
            ok = False
            if self.drone_adapter:
                for attempt in range(4):
                    try:
                        if self.drone_adapter.takeoff():
                            ok = True
                            break
                    except Exception:
                        pass
                    try:
                        if self.drone:
                            self.drone.connect()
                    except Exception:
                        pass
                    await asyncio.sleep(2)
            if ok:
                self.drone_state['flying'] = True
                await self.broadcast_message('status_update', '✅ 无人机起飞成功')
                await self.broadcast_message('drone_takeoff_complete', {
                    'success': True,
                    'message': '无人机起飞成功',
                    'timestamp': datetime.now().isoformat()
                })
                await self.broadcast_drone_status()
            else:
                await self.send_error(websocket, "起飞失败")
                
        except Exception as e:
            print(f"❌ 起飞失败: {e}")
            await self.send_error(websocket, f"起飞失败: {str(e)}")
            await self.broadcast_message('drone_takeoff_complete', {
                'success': False,
                'message': f'起飞失败: {str(e)}',
                'timestamp': datetime.now().isoformat()
            })
            
    async def handle_drone_land(self, websocket, data):
        """处理无人机降落"""
        try:
            if not TELLO_AVAILABLE:
                await self.send_error(websocket, "djitellopy库未安装，无法控制无人机")
                return
                
            if not self.drone:
                await self.send_error(websocket, "无人机未连接")
                return
                
            if not self.drone_state.get('flying', False):
                await self.send_error(websocket, "无人机未在飞行中")
                return

            print("🛬 正在降落...")
            await self.broadcast_message('status_update', '🛬 无人机正在降落...')
            
            # 使用适配器降落
            if self.drone_adapter and self.drone_adapter.land():
                self.drone_state['flying'] = False
                await self.broadcast_message('status_update', '✅ 无人机降落成功')
                await self.broadcast_message('drone_land_complete', {
                    'success': True,
                    'message': '无人机降落成功',
                    'timestamp': datetime.now().isoformat()
                })
                await self.broadcast_drone_status()
            else:
                await self.send_error(websocket, "降落失败")
                
        except Exception as e:
            print(f"❌ 降落失败: {e}")
            await self.send_error(websocket, f"降落失败: {str(e)}")
            await self.broadcast_message('drone_land_complete', {
                'success': False,
                'message': f'降落失败: {str(e)}',
                'timestamp': datetime.now().isoformat()
            })

    # 保持其他必要的方法...
    async def handle_drone_disconnect(self, websocket, data):
        """处理无人机断开"""
        try:
            if self.drone:
                # 无人机断开连接时，确保挑战卡任务状态为禁用
                self.drone_state['challenge_cruise_active'] = False
                await self.broadcast_drone_status() # 广播无人机状态，确保前端更新挑战卡任务状态
                self.stop_video_streaming()
                try:
                    self.drone.streamoff()
                    await asyncio.sleep(0.5)
                    self.drone.end()
                except:
                    pass
                self.drone = None

                self.drone_state.update({
                    'connected': False,
                    'flying': False,
                    'battery': 0,
                    'mission_active': False
                })

                await self.broadcast_message('status_update', '📴 无人机已断开连接')
                await self.broadcast_drone_status()

        except Exception as e:
            await self.send_error(websocket, f"断开失败: {str(e)}")

    async def handle_mission_stop(self, websocket, data):
        """处理任务停止"""
        try:
            self.drone_state['mission_active'] = False
            self.qr_detection_enabled = False
            await self.broadcast_message('status_update', '⏹️ QR码分析任务已停止')
            await self.broadcast_drone_status()
        except Exception as e:
            await self.send_error(websocket, f"停止任务失败: {str(e)}")

    async def handle_heartbeat(self, websocket, data):
        """处理心跳"""
        try:
            await websocket.send(json.dumps({
                'type': 'heartbeat_ack',
                'data': {
                    'server_time': datetime.now().isoformat(),
                    'qr_detection_ready': QR_DETECTOR_AVAILABLE,
                    'qr_detector_type': QR_DETECTOR_TYPE
                }
            }, ensure_ascii=False))
        except Exception as e:
            print(f"❌ 处理心跳失败: {e}")

    async def handle_connection_test(self, websocket, data):
        """处理连接测试"""
        try:
            await websocket.send(json.dumps({
                'type': 'connection_test_ack',
                'data': {
                    'message': 'QR码检测服务连接正常',
                    'server_time': datetime.now().isoformat(),
                    'qr_detection_available': QR_DETECTOR_AVAILABLE,
                    'qr_detector_type': QR_DETECTOR_TYPE
                },
                'timestamp': datetime.now().isoformat()
            }, ensure_ascii=False))
        except Exception as e:
            print(f"❌ 连接测试失败: {e}")

    async def handle_manual_control(self, websocket, data):
        """处理手动控制"""
        try:
            if not self.drone_adapter or not self.drone_adapter.is_connected:
                await self.send_error(websocket, "无人机未连接")
                return
                
            if not self.drone_state['flying']:
                await self.send_error(websocket, "无人机未在飞行中")
                return

            # 获取控制参数
            left_right = data.get('left_right', 0)  # 左右移动 (-100 到 100)
            forward_backward = data.get('forward_backward', 0)  # 前后移动 (-100 到 100)
            up_down = data.get('up_down', 0)  # 上下移动 (-100 到 100)
            yaw = data.get('yaw', 0)  # 偏航旋转 (-100 到 100)
            
            # djitellopy参数范围限制和类型转换
            left_right = max(-100, min(100, int(left_right)))
            forward_backward = max(-100, min(100, int(forward_backward)))
            up_down = max(-100, min(100, int(up_down)))
            yaw = max(-100, min(100, int(yaw)))
            
            # 执行手动控制
            success = self.drone_adapter.manual_control(left_right, forward_backward, up_down, yaw)
            
            if success:
                await self.broadcast_message('manual_control_ack', {
                    'left_right': left_right,
                    'forward_backward': forward_backward,
                    'up_down': up_down,
                    'yaw': yaw
                })
            else:
                await self.send_error(websocket, "手动控制执行失败")
                
        except Exception as e:
            print(f"手动控制失败: {e}")
            await self.send_error(websocket, f"手动控制失败: {str(e)}")

    async def broadcast_message(self, message_type, data=None):
        """广播消息"""
        if not self.connected_clients:
            return

        message = {
            'type': message_type,
            'data': data,
            'timestamp': datetime.now().isoformat()
        }

        message_json = json.dumps(message, ensure_ascii=False)
        disconnected_clients = set()

        for client in self.connected_clients:
            try:
                await client.send(message_json)
            except:
                disconnected_clients.add(client)

        self.connected_clients -= disconnected_clients

    async def send_error(self, websocket, error_message):
        """发送错误消息"""
        try:
            await websocket.send(json.dumps({
                'type': 'error',
                'data': {'message': error_message},
                'timestamp': datetime.now().isoformat()
            }, ensure_ascii=False))
        except Exception as e:
            print(f"❌ 发送错误消息失败: {e}")

    async def broadcast_drone_status(self):
        """广播无人机状态"""
        await self.broadcast_message('drone_status', self.drone_state)

    def cleanup(self):
        """清理资源"""
        print("🧹 清理QR码检测服务资源...")
        self.is_running = False
        self.stop_video_streaming()

        if self.drone:
            try:
                self.drone.streamoff()
                self.drone.end()
            except:
                pass
            self.drone = None

        for client in self.connected_clients.copy():
            try:
                asyncio.create_task(client.close())
            except:
                pass
        self.connected_clients.clear()
        
    def cleanup_video_resources(self):
        """清理视频相关资源"""
        print("🧹 清理视频资源...")
        try:
            self.stop_video_streaming()
            if hasattr(self, 'video_thread') and self.video_thread:
                self.video_thread = None
            print("✅ 视频资源清理完成")
        except Exception as e:
            print(f"❌ 视频资源清理失败: {e}")
            
    def cleanup_ai_resources(self):
        """清理AI分析相关资源"""
        print("🧹 清理AI分析资源...")
        try:
            if hasattr(self, 'ai_analyzer') and self.ai_analyzer:
                # 如果AI分析器有清理方法，调用它
                if hasattr(self.ai_analyzer, 'cleanup'):
                    self.ai_analyzer.cleanup()
            if hasattr(self, 'strawberry_analyzer') and self.strawberry_analyzer:
                # 如果草莓分析器有清理方法，调用它
                if hasattr(self.strawberry_analyzer, 'cleanup'):
                    self.strawberry_analyzer.cleanup()
            print("✅ AI分析资源清理完成")
        except Exception as e:
            print(f"❌ AI分析资源清理失败: {e}")
            
    def cleanup_detection_resources(self):
        """清理检测相关资源"""
        print("🧹 清理检测资源...")
        try:
            # 重置检测状态
            self.qr_detection_enabled = False
            self.strawberry_detection_enabled = False
            self.ai_analysis_enabled = False
            
            # 清理检测缓存
            if hasattr(self, 'last_qr_detection'):
                self.last_qr_detection = None
            if hasattr(self, 'detection_cache'):
                self.detection_cache = {}
                
            print("✅ 检测资源清理完成")
        except Exception as e:
            print(f"❌ 检测资源清理失败: {e}")


# 主函数
async def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='专用QR码检测无人机后端')
    parser.add_argument('--ws-port', type=int, default=3002, help='WebSocket服务端口')
    parser.add_argument('--http-port', type=int, default=8080, help='HTTP服务端口')
    parser.add_argument('--debug', action='store_true', help='启用调试模式')

    args = parser.parse_args()

    print("🔍 专用QR码检测无人机系统后端服务")
    print("=" * 50)
    print(f"WebSocket端口: {args.ws_port}")
    print(f"HTTP服务端口: {args.http_port}")
    print(f"QR码检测库: {'✅ 已安装 (' + QR_DETECTOR_TYPE + ')' if QR_DETECTOR_AVAILABLE else '❌ 未安装'}")
    print(f"启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 显示访问链接
    print("\n🌐 访问链接:")
    print(f"   Web界面: http://localhost:{args.http_port}")
    print(f"   WebSocket: ws://localhost:{args.ws_port}")
    print("   Electron应用: 运行 npm start 或直接打开桌面应用")
    print("=" * 50)

    if not QR_DETECTOR_AVAILABLE:
        print("\n⚠️ 重要提醒：没有可用的QR码检测库！")
        print("QR码检测功能将不可用")
        print("解决方案：pip install opencv-python")
        print("或者：pip install pyzbar")

    backend = QRDroneBackendService(ws_port=args.ws_port)
    
    # 启动HTTP服务器
    http_server = None
    try:
        # 导入HTTP服务器模块
        from http.server import HTTPServer, SimpleHTTPRequestHandler
        import threading
        
        # 创建HTTP服务器
        class CustomHTTPRequestHandler(SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=os.path.dirname(__file__), **kwargs)
                
            def log_message(self, format, *args):
                # 减少HTTP服务器日志输出
                pass
        
        http_server = HTTPServer(('localhost', args.http_port), CustomHTTPRequestHandler)
        
        # 在单独线程中运行HTTP服务器
        def run_http_server():
            print(f"✅ HTTP服务器启动成功 - http://localhost:{args.http_port}")
            http_server.serve_forever()
            
        http_thread = threading.Thread(target=run_http_server, daemon=True)
        http_thread.start()
        
    except Exception as e:
        print(f"⚠️ HTTP服务器启动失败: {e}")

    try:
        server = await backend.start_websocket_server()
        print("✅ WebSocket服务启动成功")
        print("🔌 等待客户端连接...")
        print("\n💡 提示: 您可以通过以下方式访问系统:")
        print(f"   1. 浏览器访问: http://localhost:{args.http_port}")
        print(f"   2. Electron桌面应用")
        print("   3. 自定义客户端连接WebSocket")
        print("\n按 Ctrl+C 停止服务")
        await server.wait_closed()

    except KeyboardInterrupt:
        print("\n\n⏹️ 收到停止信号，正在关闭服务...")
    except Exception as e:
        print(f"\n\n❌ 服务运行错误: {e}")
        traceback.print_exc()
    finally:
        if http_server:
            http_server.shutdown()
        backend.cleanup()
        print("👋 服务已停止")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n服务被用户中断")
    except Exception as e:
        print(f"启动失败: {e}")
        traceback.print_exc()
