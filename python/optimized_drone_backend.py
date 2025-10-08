#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
优化的Tello无人机后端服务
集成高性能算法、优化通信协议和智能资源管理
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
except ImportError:
    CV2_AVAILABLE = False
    logger.error("✗ OpenCV库未安装！")

# WebSocket导入
try:
    import websockets
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False
    logger.warning("⚠️ websockets库未安装，WebSocket功能将不可用")

# 导入多模型检测器
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from multi_model_detector import MultiModelDetector, ModelType, Detection
    MULTI_MODEL_AVAILABLE = True
    logger.info("✅ 多模型检测器加载成功")
except ImportError as e:
    MULTI_MODEL_AVAILABLE = False
    logger.error(f"✗ 多模型检测器导入失败: {e}")


class MessagePriority(Enum):
    """消息优先级"""
    CRITICAL = 0    # 紧急消息（错误、警告）
    HIGH = 1        # 高优先级（控制命令）
    NORMAL = 2      # 普通消息（状态更新）
    LOW = 3         # 低优先级（视频帧）


@dataclass
class OptimizedMessage:
    """优化的消息结构"""
    type: str
    data: Any
    priority: MessagePriority
    timestamp: float = field(default_factory=time.time)
    compressed: bool = False
    retry_count: int = 0
    max_retries: int = 3


class FrameBuffer:
    """高性能帧缓冲器"""
    
    def __init__(self, max_size: int = 10):
        self.buffer = deque(maxlen=max_size)
        self.lock = threading.RLock()
        self.frame_counter = 0
        
    def put_frame(self, frame: np.ndarray) -> bool:
        """添加帧到缓冲区"""
        try:
            with self.lock:
                self.buffer.append({
                    'frame': frame,
                    'timestamp': time.time(),
                    'frame_id': self.frame_counter
                })
                self.frame_counter += 1
                return True
        except Exception as e:
            logger.error(f"帧缓冲添加失败: {e}")
            return False
    
    def get_latest_frame(self) -> Optional[Dict]:
        """获取最新帧"""
        try:
            with self.lock:
                return self.buffer[-1] if self.buffer else None
        except Exception:
            return None
    
    def clear(self):
        """清空缓冲区"""
        with self.lock:
            self.buffer.clear()


class ConnectionPool:
    """WebSocket连接池管理"""
    
    def __init__(self, max_connections: int = 50):
        self.connections: Dict[str, websockets.WebSocketServerProtocol] = {}
        self.connection_stats: Dict[str, Dict] = {}
        self.max_connections = max_connections
        self.lock = threading.RLock()
        
    def add_connection(self, connection_id: str, websocket: websockets.WebSocketServerProtocol):
        """添加连接"""
        with self.lock:
            if len(self.connections) >= self.max_connections:
                # 移除最旧的连接
                oldest_id = min(self.connection_stats.keys(), 
                              key=lambda x: self.connection_stats[x]['connected_at'])
                self.remove_connection(oldest_id)
            
            self.connections[connection_id] = websocket
            self.connection_stats[connection_id] = {
                'connected_at': time.time(),
                'messages_sent': 0,
                'messages_received': 0,
                'last_activity': time.time()
            }
    
    def remove_connection(self, connection_id: str):
        """移除连接"""
        with self.lock:
            self.connections.pop(connection_id, None)
            self.connection_stats.pop(connection_id, None)
    
    def get_active_connections(self) -> List[websockets.WebSocketServerProtocol]:
        """获取活跃连接"""
        with self.lock:
            return list(self.connections.values())
    
    def update_activity(self, connection_id: str, message_type: str = 'sent'):
        """更新连接活动"""
        with self.lock:
            if connection_id in self.connection_stats:
                stats = self.connection_stats[connection_id]
                stats['last_activity'] = time.time()
                if message_type == 'sent':
                    stats['messages_sent'] += 1
                elif message_type == 'received':
                    stats['messages_received'] += 1


class OptimizedDroneService:
    """优化的无人机服务"""
    
    def __init__(self, ws_port: int = 3004, http_port: int = 8082):
        self.ws_port = ws_port
        self.http_port = http_port
        self.drone = None
        self.multi_detector = None
        
        # 高性能组件
        self.frame_buffer = FrameBuffer(max_size=15)
        self.connection_pool = ConnectionPool(max_connections=100)
        self.thread_pool = ThreadPoolExecutor(max_workers=8)
        self.message_queue = queue.PriorityQueue(maxsize=1000)
        
        # 状态管理
        self.drone_state = {
            'connected': False,
            'flying': False,
            'battery': 0,
            'wifi_signal': 0,
            'temperature': 0,
            'mission_active': False,
            'video_streaming': False
        }
        
        # 性能优化参数
        self.detection_enabled = True
        self.frame_skip_ratio = 2  # 跳帧比例
        self.detection_interval = 0.15  # 检测间隔
        self.last_detection_time = 0
        self.fps_target = 30
        self.quality_adaptive = True
        
        # 统计信息
        self.performance_stats = {
            'frames_processed': 0,
            'detections_performed': 0,
            'messages_sent': 0,
            'avg_processing_time': 0,
            'memory_usage': 0,
            'cpu_usage': 0
        }
        
        # 控制标志
        self.is_running = True
        self.video_thread = None
        self.message_worker_thread = None
        
        # 初始化组件
        self.init_multi_detector()
        self.start_background_workers()
    
    def init_multi_detector(self):
        """初始化多模型检测器"""
        try:
            if not MULTI_MODEL_AVAILABLE:
                logger.warning("⚠️ 多模型检测器不可用")
                return
            
            models_dir = os.path.join(os.path.dirname(__file__), 'models')
            models_config = {
                "best.pt": os.path.join(models_dir, "best.pt"),
                "strawberry_yolov11.pt": os.path.join(models_dir, "strawberry_yolov11.pt")
            }
            
            # 检查可用模型
            available_models = {}
            for model_name, model_path in models_config.items():
                if os.path.exists(model_path):
                    available_models[model_name] = model_path
                    logger.info(f"✅ 找到模型: {model_name}")
            
            if available_models:
                self.multi_detector = MultiModelDetector(available_models)
                # 优化检测参数
                self.multi_detector.set_detection_parameters(
                    detection_interval=self.detection_interval,
                    track_timeout=3.0,
                    distance_threshold=50
                )
                logger.info("✅ 多模型检测器初始化成功")
            else:
                logger.warning("⚠️ 没有找到可用的模型文件")
                
        except Exception as e:
            logger.error(f"❌ 多模型检测器初始化失败: {e}")
            self.multi_detector = None
    
    def start_background_workers(self):
        """启动后台工作线程"""
        # 消息处理工作线程
        self.message_worker_thread = threading.Thread(
            target=self.message_worker,
            daemon=True,
            name="MessageWorker"
        )
        self.message_worker_thread.start()
        
        # 性能监控线程
        self.performance_monitor_thread = threading.Thread(
            target=self.performance_monitor,
            daemon=True,
            name="PerformanceMonitor"
        )
        self.performance_monitor_thread.start()
    
    def message_worker(self):
        """消息处理工作线程"""
        logger.info("📨 消息处理工作线程已启动")
        
        while self.is_running:
            try:
                # 获取优先级消息
                priority, message = self.message_queue.get(timeout=1.0)
                
                if message:
                    # 异步发送消息
                    asyncio.run_coroutine_threadsafe(
                        self.broadcast_optimized_message(message),
                        self.main_loop
                    )
                
                self.message_queue.task_done()
                
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"消息处理错误: {e}")
    
    def performance_monitor(self):
        """性能监控线程"""
        logger.info("📊 性能监控线程已启动")
        
        while self.is_running:
            try:
                # 更新性能统计
                self.update_performance_stats()
                
                # 自适应质量调整
                if self.quality_adaptive:
                    self.adjust_quality_settings()
                
                # 内存清理
                if self.performance_stats['memory_usage'] > 80:
                    self.cleanup_memory()
                
                time.sleep(5.0)  # 每5秒监控一次
                
            except Exception as e:
                logger.error(f"性能监控错误: {e}")
    
    def update_performance_stats(self):
        """更新性能统计"""
        try:
            import psutil
            process = psutil.Process()
            
            self.performance_stats.update({
                'memory_usage': process.memory_percent(),
                'cpu_usage': process.cpu_percent(),
                'threads_count': process.num_threads(),
                'connections_count': len(self.connection_pool.connections)
            })
            
        except ImportError:
            # 如果没有psutil，使用简单的统计
            pass
        except Exception as e:
            logger.error(f"性能统计更新失败: {e}")
    
    def adjust_quality_settings(self):
        """自适应质量调整"""
        cpu_usage = self.performance_stats.get('cpu_usage', 0)
        memory_usage = self.performance_stats.get('memory_usage', 0)
        
        # 根据系统负载调整参数
        if cpu_usage > 80 or memory_usage > 80:
            # 高负载：降低质量
            self.frame_skip_ratio = min(5, self.frame_skip_ratio + 1)
            self.detection_interval = min(0.5, self.detection_interval + 0.05)
        elif cpu_usage < 50 and memory_usage < 50:
            # 低负载：提高质量
            self.frame_skip_ratio = max(1, self.frame_skip_ratio - 1)
            self.detection_interval = max(0.1, self.detection_interval - 0.02)
    
    def cleanup_memory(self):
        """内存清理"""
        try:
            # 清理帧缓冲
            self.frame_buffer.clear()
            
            # 强制垃圾回收
            gc.collect()
            
            logger.info("🧹 内存清理完成")
            
        except Exception as e:
            logger.error(f"内存清理失败: {e}")
    
    async def start_websocket_server(self):
        """启动优化的WebSocket服务器"""
        logger.info(f"🚀 启动优化WebSocket服务器，端口: {self.ws_port}")
        
        # 保存事件循环引用
        self.main_loop = asyncio.get_event_loop()
        
        async def handle_client(websocket, path):
            connection_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}_{int(time.time())}"
            self.connection_pool.add_connection(connection_id, websocket)
            
            logger.info(f"🔗 新客户端连接: {connection_id}")
            
            try:
                async for message in websocket:
                    self.connection_pool.update_activity(connection_id, 'received')
                    await self.handle_websocket_message(websocket, message)
                    
            except websockets.exceptions.ConnectionClosed:
                logger.info(f"🔌 客户端断开连接: {connection_id}")
            except Exception as e:
                logger.error(f"WebSocket处理错误: {e}")
            finally:
                self.connection_pool.remove_connection(connection_id)
        
        # 启动WebSocket服务器
        server = await websockets.serve(
            handle_client,
            "localhost",
            self.ws_port,
            max_size=10**7,  # 10MB最大消息大小
            max_queue=100,   # 最大队列大小
            compression="deflate"  # 启用压缩
        )
        
        logger.info(f"✅ WebSocket服务器启动成功: ws://localhost:{self.ws_port}")
        return server
    
    async def handle_websocket_message(self, websocket, message):
        """处理WebSocket消息"""
        try:
            data = json.loads(message)
            message_type = data.get('type')
            message_data = data.get('data', {})
            
            # 消息路由
            handler_map = {
                'drone_connect': self.handle_drone_connect,
                'drone_disconnect': self.handle_drone_disconnect,
                'drone_takeoff': self.handle_drone_takeoff,
                'drone_land': self.handle_drone_land,
                'start_video_streaming': self.handle_start_video_streaming,
                'stop_video_streaming': self.handle_stop_video_streaming,
                'start_detection': self.handle_start_detection,
                'stop_detection': self.handle_stop_detection,
                'manual_control': self.handle_manual_control,
                'emergency_stop': self.handle_emergency_stop,
                'get_status': self.handle_get_status,
                'heartbeat': self.handle_heartbeat
            }
            
            handler = handler_map.get(message_type)
            if handler:
                await handler(websocket, message_data)
            else:
                await self.send_error(websocket, f"未知消息类型: {message_type}")
                
        except json.JSONDecodeError:
            await self.send_error(websocket, "无效的JSON格式")
        except Exception as e:
            logger.error(f"消息处理错误: {e}")
            await self.send_error(websocket, f"消息处理失败: {str(e)}")
    
    def queue_message(self, message: OptimizedMessage):
        """将消息加入优先级队列"""
        try:
            priority_value = message.priority.value
            self.message_queue.put((priority_value, message), timeout=0.1)
        except queue.Full:
            logger.warning("消息队列已满，丢弃消息")
        except Exception as e:
            logger.error(f"消息入队失败: {e}")
    
    async def broadcast_optimized_message(self, message: OptimizedMessage):
        """广播优化消息"""
        if not self.connection_pool.get_active_connections():
            return
        
        try:
            # 构建消息数据
            message_data = {
                'type': message.type,
                'data': message.data,
                'timestamp': message.timestamp
            }
            
            json_message = json.dumps(message_data, ensure_ascii=False)
            
            # 并发发送到所有连接
            tasks = []
            for websocket in self.connection_pool.get_active_connections():
                task = asyncio.create_task(self.send_to_websocket(websocket, json_message))
                tasks.append(task)
            
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
                
            self.performance_stats['messages_sent'] += len(tasks)
            
        except Exception as e:
            logger.error(f"广播消息失败: {e}")
    
    async def send_to_websocket(self, websocket, message: str):
        """发送消息到WebSocket"""
        try:
            await websocket.send(message)
        except websockets.exceptions.ConnectionClosed:
            pass  # 连接已关闭，忽略
        except Exception as e:
            logger.error(f"发送消息失败: {e}")
    
    # 处理器方法（简化版本，完整实现需要更多代码）
    async def handle_drone_connect(self, websocket, data):
        """处理无人机连接"""
        try:
            if not TELLO_AVAILABLE:
                await self.send_error(websocket, "Tello库不可用")
                return
            
            self.drone = Tello()
            self.drone.connect()
            
            # 更新状态
            self.drone_state['connected'] = True
            self.drone_state['battery'] = self.drone.get_battery()
            
            # 发送成功响应
            message = OptimizedMessage(
                type='drone_connected',
                data={'status': 'success', 'battery': self.drone_state['battery']},
                priority=MessagePriority.HIGH
            )
            self.queue_message(message)
            
        except Exception as e:
            logger.error(f"无人机连接失败: {e}")
            await self.send_error(websocket, f"连接失败: {str(e)}")
    
    async def handle_start_video_streaming(self, websocket, data):
        """启动视频流"""
        try:
            if not self.drone or not self.drone_state['connected']:
                await self.send_error(websocket, "无人机未连接")
                return
            
            if not self.drone_state['video_streaming']:
                self.drone.streamon()
                self.drone_state['video_streaming'] = True
                
                # 启动视频处理线程
                self.video_thread = threading.Thread(
                    target=self.optimized_video_worker,
                    daemon=True,
                    name="OptimizedVideoWorker"
                )
                self.video_thread.start()
                
                message = OptimizedMessage(
                    type='video_streaming_started',
                    data={'status': 'success'},
                    priority=MessagePriority.NORMAL
                )
                self.queue_message(message)
            
        except Exception as e:
            logger.error(f"启动视频流失败: {e}")
            await self.send_error(websocket, f"启动视频流失败: {str(e)}")
    
    def optimized_video_worker(self):
        """优化的视频处理工作线程"""
        logger.info("📹 优化视频处理线程已启动")
        
        frame_counter = 0
        last_fps_time = time.time()
        
        while self.is_running and self.drone_state.get('video_streaming', False):
            try:
                # 获取视频帧
                frame_read = self.drone.get_frame_read()
                if frame_read is None:
                    time.sleep(0.01)
                    continue
                
                frame = frame_read.frame
                if frame is None:
                    time.sleep(0.01)
                    continue
                
                frame_counter += 1
                current_time = time.time()
                
                # 智能跳帧
                if frame_counter % self.frame_skip_ratio != 0:
                    continue
                
                # 添加到帧缓冲
                self.frame_buffer.put_frame(frame)
                
                # 异步处理检测
                if (self.detection_enabled and 
                    current_time - self.last_detection_time >= self.detection_interval):
                    
                    self.thread_pool.submit(self.process_frame_detection, frame.copy())
                    self.last_detection_time = current_time
                
                # 编码并发送帧
                self.thread_pool.submit(self.encode_and_send_frame, frame)
                
                # 更新统计
                self.performance_stats['frames_processed'] += 1
                
                # 控制帧率
                time.sleep(1.0 / self.fps_target)
                
            except Exception as e:
                logger.error(f"视频处理错误: {e}")
                time.sleep(0.1)
        
        logger.info("📹 优化视频处理线程已停止")
    
    def process_frame_detection(self, frame: np.ndarray):
        """处理帧检测（在线程池中执行）"""
        try:
            if not self.multi_detector:
                return
            
            start_time = time.time()
            
            # 执行检测
            detections = self.multi_detector.detect_multi_model(
                frame,
                enable_maturity=True,
                enable_disease=True
            )
            
            processing_time = time.time() - start_time
            
            # 更新统计
            self.performance_stats['detections_performed'] += 1
            self.performance_stats['avg_processing_time'] = (
                (self.performance_stats['avg_processing_time'] * 
                 (self.performance_stats['detections_performed'] - 1) + processing_time) /
                self.performance_stats['detections_performed']
            )
            
            # 发送检测结果
            if detections:
                message = OptimizedMessage(
                    type='detection_results',
                    data={
                        'detections': [self.format_detection(d) for d in detections],
                        'processing_time': processing_time,
                        'timestamp': datetime.now().isoformat()
                    },
                    priority=MessagePriority.NORMAL
                )
                self.queue_message(message)
                
        except Exception as e:
            logger.error(f"帧检测处理错误: {e}")
    
    def encode_and_send_frame(self, frame: np.ndarray):
        """编码并发送帧（在线程池中执行）"""
        try:
            # 自适应质量编码
            quality = 85
            if self.performance_stats.get('cpu_usage', 0) > 70:
                quality = 70
            elif self.performance_stats.get('cpu_usage', 0) > 90:
                quality = 60
            
            # 编码帧
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
            frame_b64 = base64.b64encode(buffer).decode('utf-8')
            
            # 发送帧
            message = OptimizedMessage(
                type='video_frame',
                data={
                    'frame': f'data:image/jpeg;base64,{frame_b64}',
                    'timestamp': datetime.now().isoformat(),
                    'quality': quality
                },
                priority=MessagePriority.LOW
            )
            self.queue_message(message)
            
        except Exception as e:
            logger.error(f"帧编码发送错误: {e}")
    
    def format_detection(self, detection: Detection) -> Dict:
        """格式化检测结果"""
        return {
            'bbox': detection.bbox,
            'confidence': detection.confidence,
            'class_name': detection.class_name,
            'model_type': detection.model_type.value,
            'timestamp': detection.timestamp
        }
    
    # 其他处理器方法的简化实现...
    async def handle_drone_disconnect(self, websocket, data):
        """处理无人机断开连接"""
        # 实现断开连接逻辑
        pass
    
    async def handle_drone_takeoff(self, websocket, data):
        """处理无人机起飞"""
        # 实现起飞逻辑
        pass
    
    async def handle_drone_land(self, websocket, data):
        """处理无人机降落"""
        # 实现降落逻辑
        pass
    
    async def handle_stop_video_streaming(self, websocket, data):
        """停止视频流"""
        # 实现停止视频流逻辑
        pass
    
    async def handle_start_detection(self, websocket, data):
        """启动检测"""
        # 实现启动检测逻辑
        pass
    
    async def handle_stop_detection(self, websocket, data):
        """停止检测"""
        # 实现停止检测逻辑
        pass
    
    async def handle_manual_control(self, websocket, data):
        """手动控制"""
        # 实现手动控制逻辑
        pass
    
    async def handle_emergency_stop(self, websocket, data):
        """紧急停止"""
        # 实现紧急停止逻辑
        pass
    
    async def handle_get_status(self, websocket, data):
        """获取状态"""
        # 实现获取状态逻辑
        pass
    
    async def handle_heartbeat(self, websocket, data):
        """心跳处理"""
        # 实现心跳逻辑
        pass
    
    async def send_error(self, websocket, error_message: str):
        """发送错误消息"""
        try:
            error_data = {
                'type': 'error',
                'data': {'message': error_message, 'timestamp': datetime.now().isoformat()}
            }
            await websocket.send(json.dumps(error_data))
        except Exception as e:
            logger.error(f"发送错误消息失败: {e}")
    
    def cleanup(self):
        """清理资源"""
        logger.info("🧹 开始清理资源...")
        
        self.is_running = False
        
        # 停止视频流
        if self.drone and self.drone_state.get('video_streaming', False):
            try:
                self.drone.streamoff()
            except:
                pass
        
        # 关闭线程池
        if self.thread_pool:
            self.thread_pool.shutdown(wait=True)
        
        # 清理缓冲区
        self.frame_buffer.clear()
        
        # 强制垃圾回收
        gc.collect()
        
        logger.info("✅ 资源清理完成")


async def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='优化的Tello无人机后端服务')
    parser.add_argument('--ws-port', type=int, default=3004, help='WebSocket端口')
    parser.add_argument('--http-port', type=int, default=8082, help='HTTP端口')
    args = parser.parse_args()
    
    service = OptimizedDroneService(ws_port=args.ws_port, http_port=args.http_port)
    
    try:
        # 启动WebSocket服务器
        server = await service.start_websocket_server()
        
        logger.info("🎯 优化后端服务启动完成")
        logger.info(f"📊 性能监控: CPU自适应, 内存管理, 智能跳帧")
        logger.info(f"🔗 WebSocket: ws://localhost:{args.ws_port}")
        
        # 保持服务运行
        await server.wait_closed()
        
    except KeyboardInterrupt:
        logger.info("\n⏹️ 服务被用户中断")
    except Exception as e:
        logger.error(f"启动失败: {e}")
        traceback.print_exc()
    finally:
        service.cleanup()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n服务被用户中断")
    except Exception as e:
        print(f"启动失败: {e}")
        traceback.print_exc()