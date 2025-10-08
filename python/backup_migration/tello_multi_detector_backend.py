#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Tello无人机多模型检测后端
集成YOLOv11多模型检测系统，支持成熟度和病害检测
优化算法确保快速、准确的实时检测
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

# 设置控制台编码为UTF-8
if sys.platform.startswith('win'):
    try:
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
    print("✅ djitellopy库加载成功")
except ImportError as e:
    TELLO_AVAILABLE = False
    print(f"✗ djitellopy库导入失败: {e}")

# OpenCV导入
try:
    import cv2
    CV2_AVAILABLE = True
    print("✅ OpenCV库加载成功")
except ImportError:
    CV2_AVAILABLE = False
    print("✗ OpenCV库未安装！")

# 导入多模型检测器
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from multi_model_detector import MultiModelDetector, ModelType, Detection
    MULTI_MODEL_AVAILABLE = True
    print("✅ 多模型检测器加载成功")
except ImportError as e:
    MULTI_MODEL_AVAILABLE = False
    print(f"✗ 多模型检测器导入失败: {e}")

# WebSocket导入
try:
    import websockets
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False
    print("⚠️ websockets库未安装，WebSocket功能将不可用")


class TelloMultiDetectorService:
    """Tello无人机多模型检测服务"""
    
    def __init__(self, ws_port=3003):
        self.ws_port = ws_port
        self.drone = None
        self.multi_detector = None
        self.video_thread = None
        self.is_running = True
        
        # WebSocket客户端管理
        self.connected_clients = set()
        
        # 无人机状态
        self.drone_state = {
            'connected': False,
            'flying': False,
            'battery': 0,
            'wifi_signal': 0,
            'temperature': 0,
            'mission_active': False
        }
        
        # 检测状态
        self.video_streaming = False
        self.maturity_detection_enabled = True
        self.disease_detection_enabled = True
        self.detection_active = False
        
        # 性能统计
        self.frame_count = 0
        self.last_fps_time = time.time()
        self.fps = 0
        self.detection_count = 0
        self.last_detection_time = 0
        
        # 初始化多模型检测器
        self.init_multi_detector()
    
    def init_multi_detector(self):
        """初始化多模型检测器"""
        try:
            if not MULTI_MODEL_AVAILABLE:
                print("⚠️ 多模型检测器不可用")
                return
            
            # 模型路径配置
            models_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
            models_config = {
                "best.pt": os.path.join(models_dir, "best.pt"),      # 成熟度检测
                "disease.pt": os.path.join(models_dir, "disease.pt") # 病害检测
            }
            
            # 检查模型文件是否存在
            available_models = {}
            for model_name, model_path in models_config.items():
                if os.path.exists(model_path):
                    available_models[model_name] = model_path
                    print(f"✅ 找到模型文件: {model_name} -> {model_path}")
                else:
                    print(f"⚠️ 模型文件不存在: {model_name} -> {model_path}")
            
            if available_models:
                self.multi_detector = MultiModelDetector(available_models)
                
                # 优化检测参数
                self.multi_detector.set_detection_parameters(
                    detection_interval=0.1,    # 100ms检测间隔
                    track_timeout=2.0,         # 2秒跟踪超时
                    distance_threshold=60      # 60像素距离阈值
                )
                
                status = self.multi_detector.get_model_status()
                print(f"✅ 多模型检测器初始化成功: {status}")
            else:
                print("❌ 没有找到可用的模型文件")
                self.multi_detector = None
                
        except Exception as e:
            print(f"❌ 多模型检测器初始化失败: {e}")
            self.multi_detector = None
    
    async def start_websocket_server(self):
        """启动WebSocket服务器"""
        if not WEBSOCKETS_AVAILABLE:
            print("❌ WebSocket服务器启动失败：websockets库未安装")
            return None
        
        print(f"🚀 启动Tello多模型检测WebSocket服务器，端口: {self.ws_port}")
        
        # 保存主事件循环引用
        self.main_loop = asyncio.get_event_loop()
        
        async def handle_client(websocket, path=None):
            client_ip = websocket.remote_address[0] if websocket.remote_address else "unknown"
            print(f"🔌 客户端连接: {client_ip}")
            self.connected_clients.add(websocket)
            
            try:
                # 发送连接确认
                await websocket.send(json.dumps({
                    'type': 'connection_established',
                    'data': {
                        'server_time': datetime.now().isoformat(),
                        'multi_model_available': MULTI_MODEL_AVAILABLE,
                        'models_status': self.multi_detector.get_model_status() if self.multi_detector else {},
                        'message': 'Tello多模型检测服务已就绪'
                    },
                    'timestamp': datetime.now().isoformat()
                }, ensure_ascii=False))
                
                async for message in websocket:
                    await self.handle_websocket_message(websocket, message)
                    
            except websockets.exceptions.ConnectionClosed:
                print(f"📴 客户端断开连接: {client_ip}")
            except Exception as e:
                print(f"❌ WebSocket处理错误: {e}")
                traceback.print_exc()
            finally:
                self.connected_clients.discard(websocket)
        
        # 启动服务器
        server = await websockets.serve(handle_client, "localhost", self.ws_port)
        print(f"✅ Tello多模型检测WebSocket服务器已启动: ws://localhost:{self.ws_port}")
        return server
    
    def video_stream_worker(self):
        """视频流工作线程 - 集成多模型检测"""
        print("📹 Tello多模型检测视频流已启动")
        
        frame_retry_count = 0
        max_retry = 10
        connection_retry_count = 0
        max_connection_retry = 3
        
        while self.video_streaming and self.drone:
            try:
                # 检查无人机连接状态
                if not self.drone_state.get('connected', False):
                    print("⚠️ 无人机连接已断开，停止视频流")
                    break
                
                # 获取视频帧
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
                                time.sleep(2)
                                connection_retry_count = 0
                                print("✅ 视频流重新初始化完成")
                            except Exception as e:
                                print(f"❌ 重新初始化视频流失败: {e}")
                                break
                        time.sleep(0.5)
                        continue
                    
                    connection_retry_count = 0
                    frame = frame_read.frame
                    
                except Exception as e:
                    print(f"❌ 获取视频流失败: {e}")
                    frame = None
                
                if frame is None:
                    frame_retry_count += 1
                    if frame_retry_count > max_retry:
                        print("⚠️ 视频帧获取失败次数过多")
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
                
                # 执行多模型检测
                processed_frame = self.process_multi_model_detection(frame)
                
                # 编码并发送视频帧
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
                                'detection_status': {
                                    'maturity_enabled': self.maturity_detection_enabled,
                                    'disease_enabled': self.disease_detection_enabled,
                                    'detection_active': self.detection_active,
                                    'detection_count': self.detection_count
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
        
        print("📹 Tello多模型检测视频流已停止")
    
    def process_multi_model_detection(self, frame):
        """处理多模型检测"""
        try:
            processed_frame = frame.copy()
            
            if (self.multi_detector and 
                (self.maturity_detection_enabled or self.disease_detection_enabled)):
                
                # 执行多模型检测
                detections = self.multi_detector.detect_multi_model(
                    frame,
                    enable_maturity=self.maturity_detection_enabled,
                    enable_disease=self.disease_detection_enabled
                )
                
                if detections:
                    self.detection_count = len(detections)
                    self.detection_active = True
                    self.last_detection_time = time.time()
                    
                    # 注释掉后端绘制逻辑，改为前端绘制以避免闪烁
                    # processed_frame = self.multi_detector.draw_detections(processed_frame, detections)
                    
                    # 获取检测摘要
                    summary = self.multi_detector.get_detection_summary(detections)
                    
                    # 广播检测结果
                    if self.main_loop and not self.main_loop.is_closed():
                        try:
                            future = asyncio.run_coroutine_threadsafe(
                                self.broadcast_message('multi_model_detection', {
                                    'detections': self.format_detections_for_broadcast(detections),
                                    'summary': summary,
                                    'timestamp': datetime.now().isoformat()
                                }),
                                self.main_loop
                            )
                            future.result(timeout=0.01)
                        except Exception:
                            pass
                    
                    print(f"🎯 多模型检测: {len(detections)} 个目标")
                else:
                    # 检查是否需要重置检测状态
                    if time.time() - self.last_detection_time > 1.0:
                        self.detection_active = False
                        self.detection_count = 0
            
            # 添加状态覆盖层
            self.add_status_overlay(processed_frame)
            
            return processed_frame
            
        except Exception as e:
            print(f"❌ 多模型检测处理错误: {e}")
            return frame
    
    def format_detections_for_broadcast(self, detections):
        """格式化检测结果用于广播"""
        formatted_detections = []
        
        for detection in detections:
            formatted_detection = {
                'bbox': detection.bbox,
                'confidence': detection.confidence,
                'class_id': detection.class_id,
                'class_name': detection.class_name,
                'center': detection.center,
                'area': detection.area,
                'model_type': detection.model_type.value,
                'track_id': detection.track_id,
                'timestamp': detection.timestamp
            }
            
            # 添加模型特定属性
            if detection.model_type == ModelType.MATURITY:
                formatted_detection.update({
                    'maturity_level': detection.maturity_level,
                    'maturity_confidence': detection.maturity_confidence
                })
            elif detection.model_type == ModelType.DISEASE:
                formatted_detection.update({
                    'disease_type': detection.disease_type,
                    'disease_severity': detection.disease_severity,
                    'disease_confidence': detection.disease_confidence
                })
            
            formatted_detections.append(formatted_detection)
        
        return formatted_detections
    
    def add_status_overlay(self, frame):
        """添加状态覆盖层"""
        try:
            # 时间戳
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cv2.putText(frame, timestamp, (10, frame.shape[0] - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # FPS
            cv2.putText(frame, f'FPS: {self.fps}', (frame.shape[1] - 80, 25),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # 检测状态
            status_text = []
            if self.drone_state['connected']:
                status_text.append('CONNECTED')
            if self.drone_state['flying']:
                status_text.append('FLYING')
            if self.maturity_detection_enabled:
                status_text.append('MATURITY')
            if self.disease_detection_enabled:
                status_text.append('DISEASE')
            if self.detection_active:
                status_text.append(f'DETECTING({self.detection_count})')
            
            if status_text:
                cv2.putText(frame, ' | '.join(status_text), (10, 25),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
            
            # 模型状态
            if self.multi_detector:
                model_status = self.multi_detector.get_model_status()
                y_offset = 50
                
                if model_status['maturity_model']:
                    cv2.putText(frame, 'MATURITY MODEL: READY', (10, y_offset),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
                    y_offset += 20
                
                if model_status['disease_model']:
                    cv2.putText(frame, 'DISEASE MODEL: READY', (10, y_offset),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
                    y_offset += 20
                
                if not model_status['yolo_available']:
                    cv2.putText(frame, 'YOLO NOT AVAILABLE', (10, y_offset),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
            
        except Exception as e:
            print(f"❌ 添加状态覆盖错误: {e}")
    
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
            
            print(f"收到消息: {message_type}")
            
            if message_type == 'drone_connect':
                await self.handle_drone_connect(websocket, message_data)
            elif message_type == 'drone_disconnect':
                await self.handle_drone_disconnect(websocket, message_data)
            elif message_type == 'drone_takeoff':
                await self.handle_drone_takeoff(websocket, message_data)
            elif message_type == 'drone_land':
                await self.handle_drone_land(websocket, message_data)
            elif message_type == 'start_video_streaming':
                await self.handle_start_video_streaming(websocket, message_data)
            elif message_type == 'stop_video_streaming':
                await self.handle_stop_video_streaming(websocket, message_data)
            elif message_type == 'enable_maturity_detection':
                await self.handle_enable_maturity_detection(websocket, message_data)
            elif message_type == 'disable_maturity_detection':
                await self.handle_disable_maturity_detection(websocket, message_data)
            elif message_type == 'enable_disease_detection':
                await self.handle_enable_disease_detection(websocket, message_data)
            elif message_type == 'disable_disease_detection':
                await self.handle_disable_disease_detection(websocket, message_data)
            elif message_type == 'clear_detection_history':
                await self.handle_clear_detection_history(websocket, message_data)
            elif message_type == 'get_model_status':
                await self.handle_get_model_status(websocket, message_data)
            elif message_type == 'manual_control':
                await self.handle_manual_control(websocket, message_data)
            elif message_type == 'emergency_stop':
                await self.handle_emergency_stop(websocket, message_data)
            elif message_type == 'start_detection':
                await self.handle_start_detection(websocket, message_data)
            elif message_type == 'stop_detection':
                await self.handle_stop_detection(websocket, message_data)
            elif message_type == 'get_detection_status':
                await self.handle_get_detection_status(websocket, message_data)
            elif message_type == 'heartbeat':
                await self.handle_heartbeat(websocket, message_data)
            else:
                print(f"未知消息类型: {message_type}")
                
        except json.JSONDecodeError:
            print("WebSocket消息JSON解析失败")
            await self.send_error(websocket, "消息格式错误")
        except Exception as e:
            print(f"处理WebSocket消息失败: {e}")
            await self.send_error(websocket, str(e))
    
    # 无人机控制处理方法
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
                self.drone.RESPONSE_TIMEOUT = 10
                self.drone.connect()
                
                await asyncio.sleep(2)
                
                try:
                    battery = self.drone.get_battery()
                    if battery < 0:
                        raise Exception("无法获取有效的电池信息")
                    self.drone_state.update({
                        'connected': True,
                        'battery': battery
                    })
                    print(f"✅ 无人机连接成功，电量: {battery}%")
                except Exception as e:
                    print(f"⚠️ 电池信息获取失败: {e}，使用默认值")
                    self.drone_state.update({
                        'connected': True,
                        'battery': 50
                    })
                
                # 启动视频流
                print("📹 启动视频流...")
                await self.broadcast_message('status_update', '📹 正在启动视频流...')
                
                video_retry = 0
                max_video_retry = 3
                video_stream_started = False
                
                while video_retry < max_video_retry and not video_stream_started:
                    try:
                        self.drone.streamon()
                        await asyncio.sleep(3)
                        video_stream_started = True
                        print(f"✅ 视频流启动成功 (尝试 {video_retry + 1}/{max_video_retry})")
                    except Exception as e:
                        video_retry += 1
                        print(f"⚠️ 视频流启动失败 (尝试 {video_retry}/{max_video_retry}): {e}")
                        if video_retry < max_video_retry:
                            await asyncio.sleep(1)
                
                if video_stream_started:
                    self.start_video_streaming()
                    await self.broadcast_message('status_update', '✅ 视频流初始化成功')
                else:
                    await self.broadcast_message('status_update', '⚠️ 视频流启动失败')
                
                await self.broadcast_message('status_update', '✅ 无人机连接完成，多模型检测系统就绪')
                await self.broadcast_message('drone_connected', {
                    'success': True,
                    'battery': self.drone_state['battery'],
                    'models_status': self.multi_detector.get_model_status() if self.multi_detector else {},
                    'timestamp': datetime.now().isoformat()
                })
                await self.broadcast_drone_status()
            else:
                await self.send_error(websocket, "无人机已连接")
                
        except Exception as e:
            print(f"❌ 连接无人机失败: {e}")
            await self.send_error(websocket, f"连接失败: {str(e)}")
            if self.drone:
                try:
                    self.drone.end()
                except:
                    pass
                self.drone = None
    
    async def handle_drone_disconnect(self, websocket, data):
        """处理无人机断开"""
        try:
            if self.drone:
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
    
    async def handle_drone_takeoff(self, websocket, data):
        """处理无人机起飞"""
        try:
            if not TELLO_AVAILABLE or not self.drone:
                await self.send_error(websocket, "无人机未连接")
                return
            
            if self.drone_state.get('flying', False):
                await self.send_error(websocket, "无人机已在飞行中")
                return
            
            print("🚁 正在起飞...")
            await self.broadcast_message('status_update', '🚁 无人机正在起飞...')
            
            self.drone.takeoff()
            self.drone_state['flying'] = True
            
            await self.broadcast_message('status_update', '✅ 无人机起飞成功')
            await self.broadcast_drone_status()
            
        except Exception as e:
            print(f"❌ 起飞失败: {e}")
            await self.send_error(websocket, f"起飞失败: {str(e)}")
    
    async def handle_drone_land(self, websocket, data):
        """处理无人机降落"""
        try:
            if not TELLO_AVAILABLE or not self.drone:
                await self.send_error(websocket, "无人机未连接")
                return
            
            if not self.drone_state.get('flying', False):
                await self.send_error(websocket, "无人机未在飞行中")
                return
            
            print("🛬 正在降落...")
            await self.broadcast_message('status_update', '🛬 无人机正在降落...')
            
            self.drone.land()
            self.drone_state['flying'] = False
            
            await self.broadcast_message('status_update', '✅ 无人机降落成功')
            await self.broadcast_drone_status()
            
        except Exception as e:
            print(f"❌ 降落失败: {e}")
            await self.send_error(websocket, f"降落失败: {str(e)}")
    
    # 视频流控制方法
    def start_video_streaming(self):
        """启动视频流"""
        if self.video_thread is None or not self.video_thread.is_alive():
            self.video_streaming = True
            self.video_thread = threading.Thread(target=self.video_stream_worker)
            self.video_thread.daemon = True
            self.video_thread.start()
            print("📹 多模型检测视频流已启动")
    
    def stop_video_streaming(self):
        """停止视频流"""
        self.video_streaming = False
        if self.video_thread and self.video_thread.is_alive():
            self.video_thread.join(timeout=2)
        print("📹 多模型检测视频流已停止")
    
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
        except Exception as e:
            await self.send_error(websocket, f"停止视频流失败: {str(e)}")
    
    # 检测控制方法
    async def handle_enable_maturity_detection(self, websocket, data):
        """启用成熟度检测"""
        try:
            self.maturity_detection_enabled = True
            await self.broadcast_message('status_update', '🍓 成熟度检测已启用')
            await self.broadcast_message('detection_status', {
                'maturity_enabled': True,
                'disease_enabled': self.disease_detection_enabled
            })
        except Exception as e:
            await self.send_error(websocket, f"启用成熟度检测失败: {str(e)}")
    
    async def handle_disable_maturity_detection(self, websocket, data):
        """禁用成熟度检测"""
        try:
            self.maturity_detection_enabled = False
            await self.broadcast_message('status_update', '🍓 成熟度检测已禁用')
            await self.broadcast_message('detection_status', {
                'maturity_enabled': False,
                'disease_enabled': self.disease_detection_enabled
            })
        except Exception as e:
            await self.send_error(websocket, f"禁用成熟度检测失败: {str(e)}")
    
    async def handle_enable_disease_detection(self, websocket, data):
        """启用病害检测"""
        try:
            self.disease_detection_enabled = True
            await self.broadcast_message('status_update', '🦠 病害检测已启用')
            await self.broadcast_message('detection_status', {
                'maturity_enabled': self.maturity_detection_enabled,
                'disease_enabled': True
            })
        except Exception as e:
            await self.send_error(websocket, f"启用病害检测失败: {str(e)}")
    
    async def handle_disable_disease_detection(self, websocket, data):
        """禁用病害检测"""
        try:
            self.disease_detection_enabled = False
            await self.broadcast_message('status_update', '🦠 病害检测已禁用')
            await self.broadcast_message('detection_status', {
                'maturity_enabled': self.maturity_detection_enabled,
                'disease_enabled': False
            })
        except Exception as e:
            await self.send_error(websocket, f"禁用病害检测失败: {str(e)}")
    
    async def handle_clear_detection_history(self, websocket, data):
        """清空检测历史"""
        try:
            if self.multi_detector:
                self.multi_detector.clear_tracking()
            self.detection_count = 0
            self.detection_active = False
            await self.broadcast_message('status_update', '🧹 检测历史已清空')
        except Exception as e:
            await self.send_error(websocket, f"清空检测历史失败: {str(e)}")
    
    async def handle_get_model_status(self, websocket, data):
        """获取模型状态"""
        try:
            if self.multi_detector:
                status = self.multi_detector.get_model_status()
            else:
                status = {'maturity_model': False, 'disease_model': False, 'yolo_available': False}
            
            await websocket.send(json.dumps({
                'type': 'model_status',
                'data': status,
                'timestamp': datetime.now().isoformat()
            }))
        except Exception as e:
            await self.send_error(websocket, f"获取模型状态失败: {str(e)}")
    
    # 其他控制方法
    async def handle_manual_control(self, websocket, data):
        """处理手动控制"""
        try:
            if not self.drone or not self.drone_state['flying']:
                await self.send_error(websocket, "无人机未连接或未起飞")
                return
            
            left_right = max(-100, min(100, int(data.get('left_right', 0))))
            forward_backward = max(-100, min(100, int(data.get('forward_backward', 0))))
            up_down = max(-100, min(100, int(data.get('up_down', 0))))
            yaw = max(-100, min(100, int(data.get('yaw', 0))))
            
            self.drone.send_rc_control(left_right, forward_backward, up_down, yaw)
            
            await self.broadcast_message('manual_control_ack', {
                'left_right': left_right,
                'forward_backward': forward_backward,
                'up_down': up_down,
                'yaw': yaw
            })
            
        except Exception as e:
            await self.send_error(websocket, f"手动控制失败: {str(e)}")
    
    async def handle_emergency_stop(self, websocket, data):
        """处理急停"""
        try:
            if self.drone:
                try:
                    self.drone.emergency()
                except Exception as e:
                    print(f"执行急停失败(可能不支持): {e}")
                self.drone_state['flying'] = False
                await self.broadcast_message('status_update', '🚨 紧急停止命令已下达')
                await self.broadcast_drone_status()
        except Exception as e:
            await self.send_error(websocket, f"急停失败: {str(e)}")
    
    async def handle_start_detection(self, websocket, data):
        """处理启动检测命令"""
        try:
            model_name = data.get('model_name', '')
            detection_type = data.get('detection_type', '')
            enable_video_stream = data.get('enable_video_stream', True)
            enable_real_time_detection = data.get('enable_real_time_detection', True)
            
            print(f"🎯 启动检测: 模型={model_name}, 类型={detection_type}")
            
            # 根据检测类型启用相应的检测器
            if detection_type == 'maturity':
                self.maturity_detection_enabled = True
                self.disease_detection_enabled = False
                await self.broadcast_message('status_update', f'🍓 成熟度检测已启用 (模型: {model_name})')
            elif detection_type == 'disease':
                self.maturity_detection_enabled = False
                self.disease_detection_enabled = True
                await self.broadcast_message('status_update', f'🦠 病害检测已启用 (模型: {model_name})')
            elif detection_type == 'both':
                self.maturity_detection_enabled = True
                self.disease_detection_enabled = True
                await self.broadcast_message('status_update', f'🎯 多模型检测已启用 (模型: {model_name})')
            else:
                await self.send_error(websocket, f"未知的检测类型: {detection_type}")
                return
            
            # 如果需要启动视频流
            if enable_video_stream and not self.video_streaming:
                if self.drone:
                    try:
                        self.drone.streamon()
                        await asyncio.sleep(1)
                    except Exception as e:
                        print(f"启动Tello视频流失败: {e}")
                
                self.start_video_streaming()
                await self.broadcast_message('status_update', '📹 视频流已自动启动')
            
            # 发送成功响应
            await websocket.send(json.dumps({
                'type': 'detection_started',
                'data': {
                    'model_name': model_name,
                    'detection_type': detection_type,
                    'video_streaming': self.video_streaming,
                    'maturity_enabled': self.maturity_detection_enabled,
                    'disease_enabled': self.disease_detection_enabled,
                    'timestamp': datetime.now().isoformat()
                }
            }, ensure_ascii=False))
            
            # 广播检测状态更新
            await self.broadcast_message('detection_status', {
                'maturity_enabled': self.maturity_detection_enabled,
                'disease_enabled': self.disease_detection_enabled,
                'active_model': model_name,
                'detection_type': detection_type
            })
            
        except Exception as e:
            print(f"❌ 启动检测失败: {e}")
            await self.send_error(websocket, f"启动检测失败: {str(e)}")
    
    async def handle_stop_detection(self, websocket, data):
        """处理停止检测命令"""
        try:
            print("⏹️ 停止检测")
            
            # 停止所有检测
            self.maturity_detection_enabled = False
            self.disease_detection_enabled = False
            self.detection_active = False
            self.detection_count = 0
            
            # 清空检测历史
            if self.multi_detector:
                self.multi_detector.clear_tracking()
            
            await self.broadcast_message('status_update', '⏹️ 检测已停止')
            
            # 发送成功响应
            await websocket.send(json.dumps({
                'type': 'detection_stopped',
                'data': {
                    'timestamp': datetime.now().isoformat()
                }
            }, ensure_ascii=False))
            
            # 广播检测状态更新
            await self.broadcast_message('detection_status', {
                'maturity_enabled': False,
                'disease_enabled': False,
                'active_model': '',
                'detection_type': ''
            })
            
        except Exception as e:
            print(f"❌ 停止检测失败: {e}")
            await self.send_error(websocket, f"停止检测失败: {str(e)}")
    
    async def handle_get_detection_status(self, websocket, data):
        """获取检测状态"""
        try:
            status = {
                'is_active': self.detection_active,
                'maturity_enabled': self.maturity_detection_enabled,
                'disease_enabled': self.disease_detection_enabled,
                'video_streaming': self.video_streaming,
                'fps': self.fps,
                'detection_count': self.detection_count,
                'drone_connected': self.drone_state.get('connected', False),
                'drone_flying': self.drone_state.get('flying', False),
                'models_status': self.multi_detector.get_model_status() if self.multi_detector else {}
            }
            
            await websocket.send(json.dumps({
                'type': 'detection_status',
                'data': status,
                'timestamp': datetime.now().isoformat()
            }, ensure_ascii=False))
            
        except Exception as e:
            print(f"❌ 获取检测状态失败: {e}")
            await self.send_error(websocket, f"获取检测状态失败: {str(e)}")

    async def handle_heartbeat(self, websocket, data):
        """处理心跳"""
        try:
            await websocket.send(json.dumps({
                'type': 'heartbeat_ack',
                'data': {
                    'server_time': datetime.now().isoformat(),
                    'multi_model_ready': self.multi_detector is not None,
                    'models_status': self.multi_detector.get_model_status() if self.multi_detector else {}
                }
            }, ensure_ascii=False))
        except Exception as e:
            print(f"❌ 处理心跳失败: {e}")
    
    # 工具方法
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
        print("🧹 清理Tello多模型检测服务资源...")
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


# 主函数
async def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='Tello无人机多模型检测后端')
    parser.add_argument('--ws-port', type=int, default=3003, help='WebSocket服务端口')
    parser.add_argument('--debug', action='store_true', help='启用调试模式')
    
    args = parser.parse_args()
    
    print("🎯 Tello无人机多模型检测系统")
    print("=" * 50)
    print(f"WebSocket端口: {args.ws_port}")
    print(f"多模型检测: {'✅ 已安装' if MULTI_MODEL_AVAILABLE else '❌ 未安装'}")
    print(f"启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)
    
    if not MULTI_MODEL_AVAILABLE:
        print("\n⚠️ 重要提醒：多模型检测器不可用！")
        print("请确保已安装ultralytics库：pip install ultralytics")
    
    backend = TelloMultiDetectorService(ws_port=args.ws_port)
    
    try:
        server = await backend.start_websocket_server()
        if server:
            print("✅ WebSocket服务启动成功")
            print("🔌 等待客户端连接...")
            print(f"\n💡 WebSocket连接地址: ws://localhost:{args.ws_port}")
            print("\n按 Ctrl+C 停止服务")
            await server.wait_closed()
        else:
            print("❌ WebSocket服务启动失败")
    
    except KeyboardInterrupt:
        print("\n\n⏹️ 收到停止信号，正在关闭服务...")
    except Exception as e:
        print(f"\n\n❌ 服务运行错误: {e}")
        traceback.print_exc()
    finally:
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