#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
协议升级模块
实现高效的通信协议，支持向后兼容和协议协商
"""

import json
import time
import asyncio
import logging
import zlib
import base64
import struct
from typing import Dict, List, Optional, Any, Union, Callable
from dataclasses import dataclass, field
from enum import Enum
import threading
from collections import deque
import weakref

# 配置日志
logger = logging.getLogger(__name__)

# WebSocket导入
try:
    import websockets
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False
    logger.warning("⚠️ websockets库未安装")

# 消息包导入
try:
    import msgpack
    MSGPACK_AVAILABLE = True
    logger.info("✅ msgpack库加载成功")
except ImportError:
    MSGPACK_AVAILABLE = False
    logger.warning("⚠️ msgpack库未安装，将使用JSON序列化")


class ProtocolVersion(Enum):
    """协议版本枚举"""
    V1_0 = "1.0"  # 原始JSON协议
    V2_0 = "2.0"  # 优化的二进制协议
    V2_1 = "2.1"  # 压缩和批处理协议
    V3_0 = "3.0"  # 流式协议


class MessageType(Enum):
    """消息类型枚举"""
    # 控制消息
    HANDSHAKE = "handshake"
    PROTOCOL_NEGOTIATION = "protocol_negotiation"
    HEARTBEAT = "heartbeat"
    ACK = "ack"
    ERROR = "error"
    
    # 无人机控制
    DRONE_CONNECT = "drone_connect"
    DRONE_DISCONNECT = "drone_disconnect"
    DRONE_TAKEOFF = "drone_takeoff"
    DRONE_LAND = "drone_land"
    DRONE_EMERGENCY = "drone_emergency"
    DRONE_STATUS = "drone_status"
    
    # 视频流
    VIDEO_START = "video_start"
    VIDEO_STOP = "video_stop"
    VIDEO_FRAME = "video_frame"
    VIDEO_QUALITY = "video_quality"
    
    # 检测相关
    DETECTION_START = "detection_start"
    DETECTION_STOP = "detection_stop"
    DETECTION_RESULT = "detection_result"
    DETECTION_CONFIG = "detection_config"
    
    # 性能监控
    PERFORMANCE_STATS = "performance_stats"
    SYSTEM_METRICS = "system_metrics"


class CompressionType(Enum):
    """压缩类型枚举"""
    NONE = "none"
    GZIP = "gzip"
    ZLIB = "zlib"
    LZ4 = "lz4"


@dataclass
class ProtocolCapabilities:
    """协议能力描述"""
    version: ProtocolVersion
    compression_support: List[CompressionType]
    binary_support: bool = False
    streaming_support: bool = False
    batch_support: bool = False
    encryption_support: bool = False
    max_message_size: int = 10 * 1024 * 1024  # 10MB
    heartbeat_interval: float = 30.0
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'version': self.version.value,
            'compression_support': [c.value for c in self.compression_support],
            'binary_support': self.binary_support,
            'streaming_support': self.streaming_support,
            'batch_support': self.batch_support,
            'encryption_support': self.encryption_support,
            'max_message_size': self.max_message_size,
            'heartbeat_interval': self.heartbeat_interval
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ProtocolCapabilities':
        """从字典创建"""
        return cls(
            version=ProtocolVersion(data['version']),
            compression_support=[CompressionType(c) for c in data.get('compression_support', [])],
            binary_support=data.get('binary_support', False),
            streaming_support=data.get('streaming_support', False),
            batch_support=data.get('batch_support', False),
            encryption_support=data.get('encryption_support', False),
            max_message_size=data.get('max_message_size', 10 * 1024 * 1024),
            heartbeat_interval=data.get('heartbeat_interval', 30.0)
        )


@dataclass
class Message:
    """统一消息结构"""
    type: MessageType
    data: Any
    message_id: Optional[str] = None
    timestamp: float = field(default_factory=time.time)
    priority: int = 0  # 0=highest, 9=lowest
    compression: CompressionType = CompressionType.NONE
    requires_ack: bool = False
    correlation_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'type': self.type.value,
            'data': self.data,
            'message_id': self.message_id,
            'timestamp': self.timestamp,
            'priority': self.priority,
            'compression': self.compression.value,
            'requires_ack': self.requires_ack,
            'correlation_id': self.correlation_id
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Message':
        """从字典创建"""
        return cls(
            type=MessageType(data['type']),
            data=data['data'],
            message_id=data.get('message_id'),
            timestamp=data.get('timestamp', time.time()),
            priority=data.get('priority', 0),
            compression=CompressionType(data.get('compression', 'none')),
            requires_ack=data.get('requires_ack', False),
            correlation_id=data.get('correlation_id')
        )


class MessageSerializer:
    """消息序列化器"""
    
    def __init__(self, protocol_version: ProtocolVersion):
        self.protocol_version = protocol_version
        self.compression_enabled = True
        self.compression_threshold = 1024  # 1KB
    
    def serialize(self, message: Message) -> bytes:
        """序列化消息"""
        try:
            if self.protocol_version == ProtocolVersion.V1_0:
                return self._serialize_v1(message)
            elif self.protocol_version in [ProtocolVersion.V2_0, ProtocolVersion.V2_1]:
                return self._serialize_v2(message)
            elif self.protocol_version == ProtocolVersion.V3_0:
                return self._serialize_v3(message)
            else:
                raise ValueError(f"不支持的协议版本: {self.protocol_version}")
                
        except Exception as e:
            logger.error(f"消息序列化失败: {e}")
            raise
    
    def deserialize(self, data: bytes) -> Message:
        """反序列化消息"""
        try:
            if self.protocol_version == ProtocolVersion.V1_0:
                return self._deserialize_v1(data)
            elif self.protocol_version in [ProtocolVersion.V2_0, ProtocolVersion.V2_1]:
                return self._deserialize_v2(data)
            elif self.protocol_version == ProtocolVersion.V3_0:
                return self._deserialize_v3(data)
            else:
                raise ValueError(f"不支持的协议版本: {self.protocol_version}")
                
        except Exception as e:
            logger.error(f"消息反序列化失败: {e}")
            raise
    
    def _serialize_v1(self, message: Message) -> bytes:
        """V1.0协议序列化（JSON）"""
        json_str = json.dumps(message.to_dict(), ensure_ascii=False)
        return json_str.encode('utf-8')
    
    def _deserialize_v1(self, data: bytes) -> Message:
        """V1.0协议反序列化（JSON）"""
        json_str = data.decode('utf-8')
        message_dict = json.loads(json_str)
        return Message.from_dict(message_dict)
    
    def _serialize_v2(self, message: Message) -> bytes:
        """V2.0/V2.1协议序列化（二进制+压缩）"""
        # 使用msgpack或JSON
        if MSGPACK_AVAILABLE:
            payload = msgpack.packb(message.to_dict())
        else:
            json_str = json.dumps(message.to_dict(), ensure_ascii=False)
            payload = json_str.encode('utf-8')
        
        # 压缩处理
        if (self.compression_enabled and 
            len(payload) > self.compression_threshold and
            message.compression != CompressionType.NONE):
            
            if message.compression == CompressionType.ZLIB:
                payload = zlib.compress(payload)
            elif message.compression == CompressionType.GZIP:
                import gzip
                payload = gzip.compress(payload)
        
        # 构建二进制头部
        header = self._build_v2_header(message, len(payload))
        
        return header + payload
    
    def _deserialize_v2(self, data: bytes) -> Message:
        """V2.0/V2.1协议反序列化（二进制+压缩）"""
        # 解析头部
        header_size = 16  # 固定头部大小
        if len(data) < header_size:
            raise ValueError("数据长度不足")
        
        header = data[:header_size]
        payload = data[header_size:]
        
        # 解析头部信息
        version, msg_type, compression, payload_size = struct.unpack('!BBHI', header[:8])
        
        # 解压缩
        if compression == CompressionType.ZLIB.value:
            payload = zlib.decompress(payload)
        elif compression == CompressionType.GZIP.value:
            import gzip
            payload = gzip.decompress(payload)
        
        # 反序列化数据
        if MSGPACK_AVAILABLE:
            try:
                message_dict = msgpack.unpackb(payload, raw=False)
            except:
                # 回退到JSON
                json_str = payload.decode('utf-8')
                message_dict = json.loads(json_str)
        else:
            json_str = payload.decode('utf-8')
            message_dict = json.loads(json_str)
        
        return Message.from_dict(message_dict)
    
    def _serialize_v3(self, message: Message) -> bytes:
        """V3.0协议序列化（流式）"""
        # 实现流式协议
        return self._serialize_v2(message)  # 暂时使用V2协议
    
    def _deserialize_v3(self, data: bytes) -> Message:
        """V3.0协议反序列化（流式）"""
        # 实现流式协议
        return self._deserialize_v2(data)  # 暂时使用V2协议
    
    def _build_v2_header(self, message: Message, payload_size: int) -> bytes:
        """构建V2协议头部"""
        version = int(self.protocol_version.value.replace('.', ''))
        msg_type = hash(message.type.value) & 0xFF
        compression = 0 if message.compression == CompressionType.NONE else 1
        
        # 16字节头部：版本(1) + 消息类型(1) + 压缩(1) + 保留(1) + 负载大小(4) + 时间戳(8)
        header = struct.pack('!BBHI', version, msg_type, compression, payload_size)
        header += struct.pack('!d', message.timestamp)
        
        return header


class ProtocolNegotiator:
    """协议协商器"""
    
    def __init__(self):
        self.server_capabilities = self._get_server_capabilities()
        self.negotiated_protocols: Dict[str, ProtocolCapabilities] = {}
    
    def _get_server_capabilities(self) -> ProtocolCapabilities:
        """获取服务器能力"""
        compression_support = [CompressionType.NONE, CompressionType.ZLIB]
        
        # 检查可用的压缩算法
        try:
            import gzip
            compression_support.append(CompressionType.GZIP)
        except ImportError:
            pass
        
        try:
            import lz4
            compression_support.append(CompressionType.LZ4)
        except ImportError:
            pass
        
        return ProtocolCapabilities(
            version=ProtocolVersion.V2_1,
            compression_support=compression_support,
            binary_support=True,
            streaming_support=True,
            batch_support=True,
            encryption_support=False,
            max_message_size=50 * 1024 * 1024,  # 50MB
            heartbeat_interval=30.0
        )
    
    async def negotiate_protocol(self, websocket, client_capabilities: Dict[str, Any]) -> ProtocolCapabilities:
        """协商协议"""
        try:
            client_caps = ProtocolCapabilities.from_dict(client_capabilities)
            
            # 选择最佳协议版本
            negotiated_version = self._select_best_version(client_caps.version)
            
            # 选择支持的压缩算法
            negotiated_compression = self._select_compression(client_caps.compression_support)
            
            # 构建协商结果
            negotiated_caps = ProtocolCapabilities(
                version=negotiated_version,
                compression_support=negotiated_compression,
                binary_support=min(self.server_capabilities.binary_support, client_caps.binary_support),
                streaming_support=min(self.server_capabilities.streaming_support, client_caps.streaming_support),
                batch_support=min(self.server_capabilities.batch_support, client_caps.batch_support),
                encryption_support=min(self.server_capabilities.encryption_support, client_caps.encryption_support),
                max_message_size=min(self.server_capabilities.max_message_size, client_caps.max_message_size),
                heartbeat_interval=max(self.server_capabilities.heartbeat_interval, client_caps.heartbeat_interval)
            )
            
            # 保存协商结果
            connection_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
            self.negotiated_protocols[connection_id] = negotiated_caps
            
            # 发送协商结果
            response = {
                'type': MessageType.PROTOCOL_NEGOTIATION.value,
                'data': {
                    'status': 'success',
                    'negotiated_capabilities': negotiated_caps.to_dict()
                }
            }
            
            await websocket.send(json.dumps(response))
            
            logger.info(f"协议协商成功: {negotiated_version.value}")
            return negotiated_caps
            
        except Exception as e:
            logger.error(f"协议协商失败: {e}")
            
            # 发送错误响应
            error_response = {
                'type': MessageType.ERROR.value,
                'data': {'message': f'协议协商失败: {str(e)}'}
            }
            await websocket.send(json.dumps(error_response))
            
            # 回退到V1.0协议
            fallback_caps = ProtocolCapabilities(
                version=ProtocolVersion.V1_0,
                compression_support=[CompressionType.NONE],
                binary_support=False
            )
            
            connection_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
            self.negotiated_protocols[connection_id] = fallback_caps
            
            return fallback_caps
    
    def _select_best_version(self, client_version: ProtocolVersion) -> ProtocolVersion:
        """选择最佳协议版本"""
        server_version = self.server_capabilities.version
        
        # 版本优先级
        version_priority = {
            ProtocolVersion.V3_0: 4,
            ProtocolVersion.V2_1: 3,
            ProtocolVersion.V2_0: 2,
            ProtocolVersion.V1_0: 1
        }
        
        # 选择双方都支持的最高版本
        server_priority = version_priority.get(server_version, 1)
        client_priority = version_priority.get(client_version, 1)
        
        selected_priority = min(server_priority, client_priority)
        
        for version, priority in version_priority.items():
            if priority == selected_priority:
                return version
        
        return ProtocolVersion.V1_0  # 默认回退
    
    def _select_compression(self, client_compression: List[CompressionType]) -> List[CompressionType]:
        """选择压缩算法"""
        server_compression = self.server_capabilities.compression_support
        
        # 找到双方都支持的压缩算法
        common_compression = []
        for comp in server_compression:
            if comp in client_compression:
                common_compression.append(comp)
        
        # 如果没有共同支持的压缩算法，使用无压缩
        if not common_compression:
            common_compression = [CompressionType.NONE]
        
        return common_compression
    
    def get_negotiated_protocol(self, connection_id: str) -> Optional[ProtocolCapabilities]:
        """获取协商的协议"""
        return self.negotiated_protocols.get(connection_id)
    
    def remove_negotiated_protocol(self, connection_id: str):
        """移除协商的协议"""
        self.negotiated_protocols.pop(connection_id, None)


class EnhancedProtocolHandler:
    """增强协议处理器"""
    
    def __init__(self):
        self.negotiator = ProtocolNegotiator()
        self.serializers: Dict[str, MessageSerializer] = {}
        self.message_handlers: Dict[MessageType, Callable] = {}
        self.heartbeat_tasks: Dict[str, asyncio.Task] = {}
        
        # 统计信息
        self.stats = {
            'messages_sent': 0,
            'messages_received': 0,
            'bytes_sent': 0,
            'bytes_received': 0,
            'compression_ratio': 0.0,
            'protocol_negotiations': 0
        }
    
    def register_message_handler(self, message_type: MessageType, handler: Callable):
        """注册消息处理器"""
        self.message_handlers[message_type] = handler
    
    async def handle_connection(self, websocket, path):
        """处理WebSocket连接"""
        connection_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
        logger.info(f"新连接: {connection_id}")
        
        try:
            # 等待协议协商
            negotiated_caps = await self._wait_for_negotiation(websocket, connection_id)
            
            # 创建序列化器
            serializer = MessageSerializer(negotiated_caps.version)
            self.serializers[connection_id] = serializer
            
            # 启动心跳
            if negotiated_caps.heartbeat_interval > 0:
                heartbeat_task = asyncio.create_task(
                    self._heartbeat_worker(websocket, connection_id, negotiated_caps.heartbeat_interval)
                )
                self.heartbeat_tasks[connection_id] = heartbeat_task
            
            # 处理消息
            async for raw_message in websocket:
                await self._handle_raw_message(websocket, connection_id, raw_message)
                
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"连接关闭: {connection_id}")
        except Exception as e:
            logger.error(f"连接处理错误: {e}")
        finally:
            await self._cleanup_connection(connection_id)
    
    async def _wait_for_negotiation(self, websocket, connection_id: str) -> ProtocolCapabilities:
        """等待协议协商"""
        try:
            # 等待客户端发送协商请求
            raw_message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
            
            # 解析协商请求
            try:
                message_data = json.loads(raw_message)
            except json.JSONDecodeError:
                # 如果不是JSON，假设是V1.0协议
                return await self._fallback_to_v1(websocket, connection_id)
            
            if message_data.get('type') == MessageType.PROTOCOL_NEGOTIATION.value:
                client_capabilities = message_data.get('data', {})
                negotiated_caps = await self.negotiator.negotiate_protocol(websocket, client_capabilities)
                self.stats['protocol_negotiations'] += 1
                return negotiated_caps
            else:
                # 如果第一条消息不是协商请求，回退到V1.0
                return await self._fallback_to_v1(websocket, connection_id)
                
        except asyncio.TimeoutError:
            logger.warning(f"协议协商超时，回退到V1.0: {connection_id}")
            return await self._fallback_to_v1(websocket, connection_id)
    
    async def _fallback_to_v1(self, websocket, connection_id: str) -> ProtocolCapabilities:
        """回退到V1.0协议"""
        fallback_caps = ProtocolCapabilities(
            version=ProtocolVersion.V1_0,
            compression_support=[CompressionType.NONE],
            binary_support=False
        )
        
        self.negotiator.negotiated_protocols[connection_id] = fallback_caps
        return fallback_caps
    
    async def _handle_raw_message(self, websocket, connection_id: str, raw_message):
        """处理原始消息"""
        try:
            serializer = self.serializers.get(connection_id)
            if not serializer:
                logger.error(f"找不到序列化器: {connection_id}")
                return
            
            # 反序列化消息
            if isinstance(raw_message, str):
                message_bytes = raw_message.encode('utf-8')
            else:
                message_bytes = raw_message
            
            message = serializer.deserialize(message_bytes)
            
            # 更新统计
            self.stats['messages_received'] += 1
            self.stats['bytes_received'] += len(message_bytes)
            
            # 处理消息
            await self._handle_message(websocket, connection_id, message)
            
        except Exception as e:
            logger.error(f"消息处理失败: {e}")
            await self._send_error(websocket, connection_id, f"消息处理失败: {str(e)}")
    
    async def _handle_message(self, websocket, connection_id: str, message: Message):
        """处理消息"""
        try:
            # 查找处理器
            handler = self.message_handlers.get(message.type)
            if handler:
                await handler(websocket, connection_id, message)
            else:
                logger.warning(f"未找到消息处理器: {message.type}")
            
            # 发送ACK（如果需要）
            if message.requires_ack:
                await self._send_ack(websocket, connection_id, message.message_id)
                
        except Exception as e:
            logger.error(f"消息处理器执行失败: {e}")
            await self._send_error(websocket, connection_id, f"处理器执行失败: {str(e)}")
    
    async def send_message(self, websocket, connection_id: str, message: Message):
        """发送消息"""
        try:
            serializer = self.serializers.get(connection_id)
            if not serializer:
                logger.error(f"找不到序列化器: {connection_id}")
                return
            
            # 序列化消息
            message_bytes = serializer.serialize(message)
            
            # 发送消息
            negotiated_caps = self.negotiator.get_negotiated_protocol(connection_id)
            if negotiated_caps and negotiated_caps.binary_support:
                await websocket.send(message_bytes)
            else:
                await websocket.send(message_bytes.decode('utf-8'))
            
            # 更新统计
            self.stats['messages_sent'] += 1
            self.stats['bytes_sent'] += len(message_bytes)
            
        except Exception as e:
            logger.error(f"消息发送失败: {e}")
    
    async def _send_ack(self, websocket, connection_id: str, message_id: Optional[str]):
        """发送ACK"""
        if not message_id:
            return
        
        ack_message = Message(
            type=MessageType.ACK,
            data={'message_id': message_id},
            correlation_id=message_id
        )
        
        await self.send_message(websocket, connection_id, ack_message)
    
    async def _send_error(self, websocket, connection_id: str, error_message: str):
        """发送错误消息"""
        error_msg = Message(
            type=MessageType.ERROR,
            data={'message': error_message, 'timestamp': time.time()}
        )
        
        await self.send_message(websocket, connection_id, error_msg)
    
    async def _heartbeat_worker(self, websocket, connection_id: str, interval: float):
        """心跳工作线程"""
        logger.info(f"启动心跳: {connection_id}, 间隔: {interval}s")
        
        try:
            while True:
                await asyncio.sleep(interval)
                
                heartbeat_message = Message(
                    type=MessageType.HEARTBEAT,
                    data={'timestamp': time.time()}
                )
                
                await self.send_message(websocket, connection_id, heartbeat_message)
                
        except asyncio.CancelledError:
            logger.info(f"心跳任务被取消: {connection_id}")
        except Exception as e:
            logger.error(f"心跳错误: {e}")
    
    async def _cleanup_connection(self, connection_id: str):
        """清理连接"""
        # 取消心跳任务
        heartbeat_task = self.heartbeat_tasks.pop(connection_id, None)
        if heartbeat_task:
            heartbeat_task.cancel()
        
        # 清理序列化器
        self.serializers.pop(connection_id, None)
        
        # 清理协商协议
        self.negotiator.remove_negotiated_protocol(connection_id)
        
        logger.info(f"连接清理完成: {connection_id}")
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        stats = self.stats.copy()
        
        # 计算压缩比
        if stats['bytes_sent'] > 0:
            # 这里需要实际的压缩前后大小来计算
            stats['compression_ratio'] = 0.0  # 占位符
        
        stats['active_connections'] = len(self.serializers)
        stats['negotiated_protocols'] = len(self.negotiator.negotiated_protocols)
        
        return stats


# 向后兼容的处理器
class BackwardCompatibilityHandler:
    """向后兼容处理器"""
    
    def __init__(self, enhanced_handler: EnhancedProtocolHandler):
        self.enhanced_handler = enhanced_handler
        self.legacy_handlers: Dict[str, Callable] = {}
    
    def register_legacy_handler(self, message_type: str, handler: Callable):
        """注册遗留消息处理器"""
        self.legacy_handlers[message_type] = handler
    
    async def handle_legacy_message(self, websocket, connection_id: str, raw_data: str):
        """处理遗留消息格式"""
        try:
            # 解析JSON消息
            message_data = json.loads(raw_data)
            message_type = message_data.get('type')
            
            # 查找遗留处理器
            handler = self.legacy_handlers.get(message_type)
            if handler:
                await handler(websocket, message_data)
            else:
                # 转换为新格式并使用新处理器
                new_message = self._convert_legacy_message(message_data)
                await self.enhanced_handler._handle_message(websocket, connection_id, new_message)
                
        except Exception as e:
            logger.error(f"遗留消息处理失败: {e}")
    
    def _convert_legacy_message(self, legacy_data: Dict[str, Any]) -> Message:
        """转换遗留消息格式"""
        try:
            message_type = MessageType(legacy_data['type'])
        except ValueError:
            # 如果消息类型不存在，使用错误类型
            message_type = MessageType.ERROR
        
        return Message(
            type=message_type,
            data=legacy_data.get('data', {}),
            timestamp=legacy_data.get('timestamp', time.time())
        )


if __name__ == "__main__":
    # 测试代码
    async def test_protocol():
        # 创建协议处理器
        handler = EnhancedProtocolHandler()
        
        # 注册消息处理器
        async def handle_drone_connect(websocket, connection_id, message):
            print(f"处理无人机连接: {message.data}")
        
        handler.register_message_handler(MessageType.DRONE_CONNECT, handle_drone_connect)
        
        # 测试消息序列化
        test_message = Message(
            type=MessageType.DRONE_CONNECT,
            data={'drone_id': 'test_drone'},
            requires_ack=True
        )
        
        serializer = MessageSerializer(ProtocolVersion.V2_1)
        serialized = serializer.serialize(test_message)
        deserialized = serializer.deserialize(serialized)
        
        print(f"原始消息: {test_message}")
        print(f"序列化大小: {len(serialized)} bytes")
        print(f"反序列化消息: {deserialized}")
        
        # 打印统计信息
        stats = handler.get_stats()
        print(f"统计信息: {stats}")
    
    # 运行测试
    asyncio.run(test_protocol())