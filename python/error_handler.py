#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
增强错误处理机制
提供全面的错误处理、恢复策略和用户友好的错误信息
"""

import json
import time
import asyncio
import logging
import traceback
import sys
import threading
from typing import Dict, List, Optional, Any, Union, Callable, Type
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque
import weakref
from contextlib import contextmanager
import functools

# 配置日志
logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    """错误严重程度"""
    LOW = "low"           # 轻微错误，不影响主要功能
    MEDIUM = "medium"     # 中等错误，影响部分功能
    HIGH = "high"         # 严重错误，影响主要功能
    CRITICAL = "critical" # 致命错误，系统无法继续运行


class ErrorCategory(Enum):
    """错误类别"""
    NETWORK = "network"           # 网络相关错误
    HARDWARE = "hardware"         # 硬件相关错误
    SOFTWARE = "software"         # 软件逻辑错误
    CONFIGURATION = "configuration" # 配置错误
    PERMISSION = "permission"     # 权限错误
    RESOURCE = "resource"         # 资源不足错误
    VALIDATION = "validation"     # 数据验证错误
    TIMEOUT = "timeout"           # 超时错误
    UNKNOWN = "unknown"           # 未知错误


class RecoveryStrategy(Enum):
    """恢复策略"""
    RETRY = "retry"               # 重试
    FALLBACK = "fallback"         # 回退到备用方案
    RESTART = "restart"           # 重启组件
    IGNORE = "ignore"             # 忽略错误
    ESCALATE = "escalate"         # 上报错误
    SHUTDOWN = "shutdown"         # 关闭系统


@dataclass
class ErrorInfo:
    """错误信息"""
    error_id: str
    timestamp: float
    severity: ErrorSeverity
    category: ErrorCategory
    component: str
    message: str
    details: Optional[Dict[str, Any]] = None
    traceback: Optional[str] = None
    user_message: Optional[str] = None
    recovery_strategy: Optional[RecoveryStrategy] = None
    retry_count: int = 0
    max_retries: int = 3
    resolved: bool = False
    resolution_time: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'error_id': self.error_id,
            'timestamp': self.timestamp,
            'severity': self.severity.value,
            'category': self.category.value,
            'component': self.component,
            'message': self.message,
            'details': self.details,
            'traceback': self.traceback,
            'user_message': self.user_message,
            'recovery_strategy': self.recovery_strategy.value if self.recovery_strategy else None,
            'retry_count': self.retry_count,
            'max_retries': self.max_retries,
            'resolved': self.resolved,
            'resolution_time': self.resolution_time
        }
    
    def get_user_friendly_message(self) -> str:
        """获取用户友好的错误消息"""
        if self.user_message:
            return self.user_message
        
        # 根据错误类别生成用户友好的消息
        category_messages = {
            ErrorCategory.NETWORK: "网络连接出现问题，请检查网络设置",
            ErrorCategory.HARDWARE: "硬件设备出现问题，请检查设备连接",
            ErrorCategory.SOFTWARE: "软件运行出现问题，正在尝试修复",
            ErrorCategory.CONFIGURATION: "配置设置有误，请检查配置文件",
            ErrorCategory.PERMISSION: "权限不足，请检查访问权限",
            ErrorCategory.RESOURCE: "系统资源不足，请释放一些资源",
            ErrorCategory.VALIDATION: "输入数据格式错误，请检查输入",
            ErrorCategory.TIMEOUT: "操作超时，请稍后重试",
            ErrorCategory.UNKNOWN: "发生未知错误，正在分析问题"
        }
        
        base_message = category_messages.get(self.category, "发生错误")
        
        if self.severity == ErrorSeverity.CRITICAL:
            return f"严重错误：{base_message}"
        elif self.severity == ErrorSeverity.HIGH:
            return f"重要提示：{base_message}"
        else:
            return base_message


@dataclass
class RecoveryAction:
    """恢复动作"""
    strategy: RecoveryStrategy
    action: Callable
    description: str
    max_attempts: int = 3
    delay: float = 1.0
    exponential_backoff: bool = True
    
    async def execute(self, error_info: ErrorInfo) -> bool:
        """执行恢复动作"""
        for attempt in range(self.max_attempts):
            try:
                logger.info(f"执行恢复动作: {self.description} (尝试 {attempt + 1}/{self.max_attempts})")
                
                if asyncio.iscoroutinefunction(self.action):
                    result = await self.action(error_info)
                else:
                    result = self.action(error_info)
                
                if result:
                    logger.info(f"恢复动作成功: {self.description}")
                    return True
                
            except Exception as e:
                logger.error(f"恢复动作失败: {self.description}, 错误: {e}")
            
            # 等待后重试
            if attempt < self.max_attempts - 1:
                delay = self.delay * (2 ** attempt) if self.exponential_backoff else self.delay
                await asyncio.sleep(delay)
        
        logger.error(f"恢复动作最终失败: {self.description}")
        return False


class ErrorHandler:
    """错误处理器"""
    
    def __init__(self):
        self.error_history: List[ErrorInfo] = []
        self.recovery_actions: Dict[ErrorCategory, List[RecoveryAction]] = defaultdict(list)
        self.error_patterns: Dict[str, ErrorCategory] = {}
        self.notification_callbacks: List[Callable] = []
        
        # 错误统计
        self.stats = {
            'total_errors': 0,
            'resolved_errors': 0,
            'critical_errors': 0,
            'recovery_success_rate': 0.0,
            'error_categories': defaultdict(int),
            'error_components': defaultdict(int)
        }
        
        # 错误限制（防止错误风暴）
        self.error_limits = {
            'max_errors_per_minute': 100,
            'max_errors_per_component': 50
        }
        
        self.error_counts = {
            'per_minute': deque(maxlen=60),
            'per_component': defaultdict(int)
        }
        
        # 设置默认恢复动作
        self._setup_default_recovery_actions()
    
    def _setup_default_recovery_actions(self):
        """设置默认恢复动作"""
        
        # 网络错误恢复
        async def retry_network_operation(error_info: ErrorInfo) -> bool:
            """重试网络操作"""
            await asyncio.sleep(1)
            return True  # 简化实现
        
        network_retry = RecoveryAction(
            strategy=RecoveryStrategy.RETRY,
            action=retry_network_operation,
            description="重试网络连接",
            max_attempts=3,
            delay=2.0
        )
        
        self.recovery_actions[ErrorCategory.NETWORK].append(network_retry)
        
        # 资源错误恢复
        def cleanup_resources(error_info: ErrorInfo) -> bool:
            """清理资源"""
            import gc
            gc.collect()
            return True
        
        resource_cleanup = RecoveryAction(
            strategy=RecoveryStrategy.FALLBACK,
            action=cleanup_resources,
            description="清理系统资源",
            max_attempts=1
        )
        
        self.recovery_actions[ErrorCategory.RESOURCE].append(resource_cleanup)
        
        # 配置错误恢复
        def reset_to_default_config(error_info: ErrorInfo) -> bool:
            """重置为默认配置"""
            logger.info("重置为默认配置")
            return True
        
        config_reset = RecoveryAction(
            strategy=RecoveryStrategy.FALLBACK,
            action=reset_to_default_config,
            description="重置为默认配置",
            max_attempts=1
        )
        
        self.recovery_actions[ErrorCategory.CONFIGURATION].append(config_reset)
    
    def register_recovery_action(self, category: ErrorCategory, action: RecoveryAction):
        """注册恢复动作"""
        self.recovery_actions[category].append(action)
        logger.info(f"注册恢复动作: {category.value} -> {action.description}")
    
    def register_error_pattern(self, pattern: str, category: ErrorCategory):
        """注册错误模式"""
        self.error_patterns[pattern] = category
    
    def register_notification_callback(self, callback: Callable):
        """注册通知回调"""
        self.notification_callbacks.append(callback)
    
    async def handle_error(self, 
                          component: str,
                          error: Exception,
                          severity: ErrorSeverity = ErrorSeverity.MEDIUM,
                          user_message: Optional[str] = None,
                          context: Optional[Dict[str, Any]] = None) -> ErrorInfo:
        """处理错误"""
        
        # 检查错误限制
        if self._is_error_storm():
            logger.warning("检测到错误风暴，暂停错误处理")
            return None
        
        # 创建错误信息
        error_info = self._create_error_info(
            component=component,
            error=error,
            severity=severity,
            user_message=user_message,
            context=context
        )
        
        # 记录错误
        self.error_history.append(error_info)
        self._update_stats(error_info)
        
        # 记录日志
        self._log_error(error_info)
        
        # 发送通知
        await self._notify_error(error_info)
        
        # 尝试恢复
        if error_info.recovery_strategy and error_info.recovery_strategy != RecoveryStrategy.IGNORE:
            recovery_success = await self._attempt_recovery(error_info)
            
            if recovery_success:
                error_info.resolved = True
                error_info.resolution_time = time.time()
                self.stats['resolved_errors'] += 1
        
        return error_info
    
    def _create_error_info(self,
                          component: str,
                          error: Exception,
                          severity: ErrorSeverity,
                          user_message: Optional[str],
                          context: Optional[Dict[str, Any]]) -> ErrorInfo:
        """创建错误信息"""
        
        error_id = f"{component}_{int(time.time() * 1000)}"
        category = self._categorize_error(error)
        recovery_strategy = self._determine_recovery_strategy(category, severity)
        
        return ErrorInfo(
            error_id=error_id,
            timestamp=time.time(),
            severity=severity,
            category=category,
            component=component,
            message=str(error),
            details=context,
            traceback=traceback.format_exc(),
            user_message=user_message,
            recovery_strategy=recovery_strategy
        )
    
    def _categorize_error(self, error: Exception) -> ErrorCategory:
        """分类错误"""
        error_message = str(error).lower()
        error_type = type(error).__name__.lower()
        
        # 检查注册的错误模式
        for pattern, category in self.error_patterns.items():
            if pattern.lower() in error_message or pattern.lower() in error_type:
                return category
        
        # 基于异常类型的默认分类
        if isinstance(error, (ConnectionError, TimeoutError)):
            return ErrorCategory.NETWORK
        elif isinstance(error, PermissionError):
            return ErrorCategory.PERMISSION
        elif isinstance(error, (MemoryError, OSError)):
            return ErrorCategory.RESOURCE
        elif isinstance(error, ValueError):
            return ErrorCategory.VALIDATION
        elif isinstance(error, FileNotFoundError):
            return ErrorCategory.CONFIGURATION
        else:
            return ErrorCategory.SOFTWARE
    
    def _determine_recovery_strategy(self, category: ErrorCategory, severity: ErrorSeverity) -> RecoveryStrategy:
        """确定恢复策略"""
        
        if severity == ErrorSeverity.CRITICAL:
            return RecoveryStrategy.SHUTDOWN
        
        strategy_map = {
            ErrorCategory.NETWORK: RecoveryStrategy.RETRY,
            ErrorCategory.HARDWARE: RecoveryStrategy.RESTART,
            ErrorCategory.SOFTWARE: RecoveryStrategy.RETRY,
            ErrorCategory.CONFIGURATION: RecoveryStrategy.FALLBACK,
            ErrorCategory.PERMISSION: RecoveryStrategy.ESCALATE,
            ErrorCategory.RESOURCE: RecoveryStrategy.FALLBACK,
            ErrorCategory.VALIDATION: RecoveryStrategy.IGNORE,
            ErrorCategory.TIMEOUT: RecoveryStrategy.RETRY,
            ErrorCategory.UNKNOWN: RecoveryStrategy.ESCALATE
        }
        
        return strategy_map.get(category, RecoveryStrategy.ESCALATE)
    
    def _is_error_storm(self) -> bool:
        """检查是否为错误风暴"""
        current_time = time.time()
        
        # 清理过期的错误计数
        while (self.error_counts['per_minute'] and 
               current_time - self.error_counts['per_minute'][0] > 60):
            self.error_counts['per_minute'].popleft()
        
        # 检查每分钟错误数
        if len(self.error_counts['per_minute']) >= self.error_limits['max_errors_per_minute']:
            return True
        
        return False
    
    def _update_stats(self, error_info: ErrorInfo):
        """更新统计信息"""
        self.stats['total_errors'] += 1
        self.stats['error_categories'][error_info.category.value] += 1
        self.stats['error_components'][error_info.component] += 1
        
        if error_info.severity == ErrorSeverity.CRITICAL:
            self.stats['critical_errors'] += 1
        
        # 更新错误计数
        self.error_counts['per_minute'].append(time.time())
        self.error_counts['per_component'][error_info.component] += 1
        
        # 计算恢复成功率
        if self.stats['total_errors'] > 0:
            self.stats['recovery_success_rate'] = self.stats['resolved_errors'] / self.stats['total_errors']
    
    def _log_error(self, error_info: ErrorInfo):
        """记录错误日志"""
        log_level = {
            ErrorSeverity.LOW: logging.INFO,
            ErrorSeverity.MEDIUM: logging.WARNING,
            ErrorSeverity.HIGH: logging.ERROR,
            ErrorSeverity.CRITICAL: logging.CRITICAL
        }.get(error_info.severity, logging.ERROR)
        
        logger.log(
            log_level,
            f"错误 [{error_info.error_id}] {error_info.component}: {error_info.message}"
        )
        
        if error_info.severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]:
            logger.error(f"错误详情: {error_info.details}")
            logger.error(f"错误堆栈: {error_info.traceback}")
    
    async def _notify_error(self, error_info: ErrorInfo):
        """发送错误通知"""
        for callback in self.notification_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(error_info)
                else:
                    callback(error_info)
            except Exception as e:
                logger.error(f"通知回调失败: {e}")
    
    async def _attempt_recovery(self, error_info: ErrorInfo) -> bool:
        """尝试恢复"""
        recovery_actions = self.recovery_actions.get(error_info.category, [])
        
        for action in recovery_actions:
            if action.strategy == error_info.recovery_strategy:
                try:
                    success = await action.execute(error_info)
                    if success:
                        logger.info(f"错误恢复成功: {error_info.error_id}")
                        return True
                except Exception as e:
                    logger.error(f"恢复动作执行失败: {e}")
        
        logger.warning(f"错误恢复失败: {error_info.error_id}")
        return False
    
    def get_error_stats(self) -> Dict[str, Any]:
        """获取错误统计"""
        return self.stats.copy()
    
    def get_recent_errors(self, limit: int = 10) -> List[ErrorInfo]:
        """获取最近的错误"""
        return self.error_history[-limit:]
    
    def get_unresolved_errors(self) -> List[ErrorInfo]:
        """获取未解决的错误"""
        return [error for error in self.error_history if not error.resolved]
    
    def clear_error_history(self):
        """清空错误历史"""
        self.error_history.clear()
        self.stats = {
            'total_errors': 0,
            'resolved_errors': 0,
            'critical_errors': 0,
            'recovery_success_rate': 0.0,
            'error_categories': defaultdict(int),
            'error_components': defaultdict(int)
        }


# 装饰器
def error_handler(component: str = None,
                 severity: ErrorSeverity = ErrorSeverity.MEDIUM,
                 user_message: str = None,
                 retry_count: int = 0):
    """错误处理装饰器"""
    def decorator(func):
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            handler = getattr(args[0], '_error_handler', None) if args else None
            comp_name = component or (args[0].__class__.__name__ if args else func.__name__)
            
            for attempt in range(retry_count + 1):
                try:
                    if asyncio.iscoroutinefunction(func):
                        return await func(*args, **kwargs)
                    else:
                        return func(*args, **kwargs)
                        
                except Exception as e:
                    if handler and attempt == retry_count:
                        await handler.handle_error(
                            component=comp_name,
                            error=e,
                            severity=severity,
                            user_message=user_message,
                            context={'function': func.__name__, 'attempt': attempt + 1}
                        )
                    
                    if attempt == retry_count:
                        raise
                    
                    # 重试前等待
                    await asyncio.sleep(2 ** attempt)
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            handler = getattr(args[0], '_error_handler', None) if args else None
            comp_name = component or (args[0].__class__.__name__ if args else func.__name__)
            
            for attempt in range(retry_count + 1):
                try:
                    return func(*args, **kwargs)
                        
                except Exception as e:
                    if handler and attempt == retry_count:
                        # 对于同步函数，创建一个简单的错误记录
                        error_info = ErrorInfo(
                            error_id=f"{comp_name}_{int(time.time() * 1000)}",
                            timestamp=time.time(),
                            severity=severity,
                            category=ErrorCategory.SOFTWARE,
                            component=comp_name,
                            message=str(e),
                            user_message=user_message
                        )
                        handler.error_history.append(error_info)
                    
                    if attempt == retry_count:
                        raise
                    
                    # 重试前等待
                    time.sleep(2 ** attempt)
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator


@contextmanager
def error_context(handler: ErrorHandler, component: str, operation: str):
    """错误上下文管理器"""
    start_time = time.time()
    
    try:
        logger.info(f"开始操作: {component}.{operation}")
        yield
        
    except Exception as e:
        # 异步处理错误
        asyncio.create_task(
            handler.handle_error(
                component=component,
                error=e,
                context={'operation': operation, 'duration': time.time() - start_time}
            )
        )
        raise
        
    finally:
        duration = time.time() - start_time
        logger.info(f"操作完成: {component}.{operation}, 耗时: {duration:.2f}s")


class DroneErrorHandler(ErrorHandler):
    """无人机专用错误处理器"""
    
    def __init__(self):
        super().__init__()
        self._setup_drone_specific_patterns()
        self._setup_drone_recovery_actions()
    
    def _setup_drone_specific_patterns(self):
        """设置无人机特定的错误模式"""
        
        # 无人机连接错误
        self.register_error_pattern("connection refused", ErrorCategory.NETWORK)
        self.register_error_pattern("tello not found", ErrorCategory.HARDWARE)
        self.register_error_pattern("battery low", ErrorCategory.HARDWARE)
        self.register_error_pattern("motor error", ErrorCategory.HARDWARE)
        
        # 视频流错误
        self.register_error_pattern("video stream", ErrorCategory.NETWORK)
        self.register_error_pattern("frame decode", ErrorCategory.SOFTWARE)
        
        # 检测错误
        self.register_error_pattern("model not found", ErrorCategory.CONFIGURATION)
        self.register_error_pattern("detection failed", ErrorCategory.SOFTWARE)
    
    def _setup_drone_recovery_actions(self):
        """设置无人机特定的恢复动作"""
        
        # 无人机重连
        async def reconnect_drone(error_info: ErrorInfo) -> bool:
            """重新连接无人机"""
            logger.info("尝试重新连接无人机")
            await asyncio.sleep(2)
            return True  # 简化实现
        
        drone_reconnect = RecoveryAction(
            strategy=RecoveryStrategy.RETRY,
            action=reconnect_drone,
            description="重新连接无人机",
            max_attempts=3,
            delay=5.0
        )
        
        self.register_recovery_action(ErrorCategory.HARDWARE, drone_reconnect)
        
        # 紧急降落
        async def emergency_landing(error_info: ErrorInfo) -> bool:
            """紧急降落"""
            logger.critical("执行紧急降落")
            return True  # 简化实现
        
        emergency_action = RecoveryAction(
            strategy=RecoveryStrategy.SHUTDOWN,
            action=emergency_landing,
            description="紧急降落",
            max_attempts=1
        )
        
        self.register_recovery_action(ErrorCategory.HARDWARE, emergency_action)
    
    async def handle_drone_error(self,
                                component: str,
                                error: Exception,
                                drone_state: Optional[Dict[str, Any]] = None) -> ErrorInfo:
        """处理无人机特定错误"""
        
        # 根据无人机状态调整严重程度
        severity = self._assess_drone_error_severity(error, drone_state)
        
        # 生成用户友好的消息
        user_message = self._generate_drone_user_message(error, drone_state)
        
        return await self.handle_error(
            component=component,
            error=error,
            severity=severity,
            user_message=user_message,
            context={'drone_state': drone_state}
        )
    
    def _assess_drone_error_severity(self, error: Exception, drone_state: Optional[Dict[str, Any]]) -> ErrorSeverity:
        """评估无人机错误严重程度"""
        
        error_message = str(error).lower()
        
        # 致命错误
        if any(keyword in error_message for keyword in ['motor', 'emergency', 'crash', 'battery critical']):
            return ErrorSeverity.CRITICAL
        
        # 高严重性错误
        if any(keyword in error_message for keyword in ['connection lost', 'signal weak', 'battery low']):
            return ErrorSeverity.HIGH
        
        # 检查无人机状态
        if drone_state:
            if drone_state.get('battery_level', 100) < 20:
                return ErrorSeverity.HIGH
            if not drone_state.get('is_connected', True):
                return ErrorSeverity.HIGH
        
        return ErrorSeverity.MEDIUM
    
    def _generate_drone_user_message(self, error: Exception, drone_state: Optional[Dict[str, Any]]) -> str:
        """生成无人机用户友好消息"""
        
        error_message = str(error).lower()
        
        if 'connection' in error_message:
            return "无人机连接中断，正在尝试重新连接..."
        elif 'battery' in error_message:
            return "无人机电量不足，请及时充电或降落"
        elif 'motor' in error_message:
            return "无人机电机异常，正在执行紧急降落"
        elif 'video' in error_message:
            return "视频传输出现问题，正在尝试恢复"
        elif 'detection' in error_message:
            return "图像识别功能暂时不可用"
        else:
            return "无人机系统出现问题，正在尝试修复"


if __name__ == "__main__":
    # 测试代码
    async def test_error_handling():
        # 创建错误处理器
        handler = DroneErrorHandler()
        
        # 注册通知回调
        async def error_notification(error_info: ErrorInfo):
            print(f"错误通知: {error_info.get_user_friendly_message()}")
        
        handler.register_notification_callback(error_notification)
        
        # 模拟各种错误
        test_errors = [
            (ConnectionError("Tello connection refused"), "drone_controller"),
            (ValueError("Invalid detection threshold"), "detector"),
            (MemoryError("Out of memory"), "video_processor"),
            (Exception("Motor error detected"), "drone_controller")
        ]
        
        for error, component in test_errors:
            await handler.handle_drone_error(
                component=component,
                error=error,
                drone_state={'battery_level': 85, 'is_connected': True}
            )
        
        # 打印统计信息
        stats = handler.get_error_stats()
        print(f"\n错误统计:")
        print(f"总错误数: {stats['total_errors']}")
        print(f"已解决: {stats['resolved_errors']}")
        print(f"恢复成功率: {stats['recovery_success_rate']:.2%}")
        
        # 打印未解决的错误
        unresolved = handler.get_unresolved_errors()
        print(f"\n未解决的错误: {len(unresolved)}")
        for error in unresolved:
            print(f"- {error.component}: {error.get_user_friendly_message()}")
    
    # 运行测试
    asyncio.run(test_error_handling())