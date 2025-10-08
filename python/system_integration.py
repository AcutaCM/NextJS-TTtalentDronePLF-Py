#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
系统集成模块
整合所有优化组件，提供统一的高性能无人机后端服务
"""

import asyncio
import json
import logging
import time
import threading
import signal
import sys
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from pathlib import Path
import weakref

# 导入优化组件
OptimizedTelloDroneService = None
EnhancedMultiModelDetector = None
SystemMonitor = None
PerformanceOptimizer = None
EnhancedProtocolHandler = None
DroneSystemValidator = None
DroneErrorHandler = None

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('drone_system.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

try:
    from optimized_drone_backend import OptimizedDroneService as OptimizedTelloDroneService
    logger.info("✅ 优化无人机后端服务导入成功")
except ImportError as e:
    logger.warning(f"优化无人机后端服务导入失败: {e}")

try:
    from enhanced_multi_model_detector import EnhancedMultiModelDetector
    logger.info("✅ 增强多模型检测器导入成功")
except ImportError as e:
    logger.warning(f"增强多模型检测器导入失败: {e}")

try:
    from performance_monitor import SystemMonitor, PerformanceOptimizer
    logger.info("✅ 性能监控组件导入成功")
except ImportError as e:
    logger.warning(f"性能监控组件导入失败: {e}")

try:
    from protocol_upgrade import EnhancedProtocolHandler, ProtocolVersion
    logger.info("✅ 协议升级组件导入成功")
except ImportError as e:
    logger.warning(f"协议升级组件导入失败: {e}")

try:
    from interface_validator import DroneSystemValidator
    logger.info("✅ 接口验证器导入成功")
except ImportError as e:
    logger.warning(f"接口验证器导入失败: {e}")

try:
    from error_handler import DroneErrorHandler, ErrorSeverity
    logger.info("✅ 错误处理器导入成功")
except ImportError as e:
    logger.warning(f"错误处理器导入失败: {e}")

# 回退到原始组件
if not OptimizedTelloDroneService:
    try:
        from drone_backend import QRDroneBackendService as OptimizedTelloDroneService
        logger.info("✅ 回退到原始无人机后端服务")
    except ImportError:
        logger.critical("无法导入任何后端组件")
        sys.exit(1)

if not EnhancedMultiModelDetector:
    try:
        from multi_model_detector import MultiModelDetector as EnhancedMultiModelDetector
        logger.info("✅ 回退到原始多模型检测器")
    except ImportError:
        logger.warning("无法导入多模型检测器")

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('drone_system.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


@dataclass
class SystemConfig:
    """系统配置"""
    # 服务器配置
    websocket_port: int = 3005
    http_port: int = 8081
    host: str = "localhost"
    
    # 性能配置
    enable_performance_monitoring: bool = True
    enable_protocol_upgrade: bool = True
    enable_interface_validation: bool = True
    enable_enhanced_error_handling: bool = True
    
    # 检测配置
    maturity_model_path: str = "strawberry_yolov11.pt"
    disease_model_path: str = "best.pt"
    detection_confidence: float = 0.5
    detection_interval: float = 0.1
    
    # 优化配置
    max_fps: int = 30
    frame_skip_ratio: float = 0.3
    enable_adaptive_quality: bool = True
    enable_compression: bool = True
    
    # 监控配置
    performance_report_interval: int = 300  # 5分钟
    error_history_limit: int = 1000
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SystemConfig':
        """从字典创建配置"""
        # 处理嵌套配置结构
        config_data = {}
        
        # 如果是嵌套结构，展平配置
        if 'server' in data:
            config_data.update({
                'websocket_port': data['server'].get('websocket_port', 3005),
                'http_port': data['server'].get('http_port', 8081),
                'host': data['server'].get('host', 'localhost')
            })
        
        if 'performance' in data:
            config_data.update({
                'enable_performance_monitoring': data['performance'].get('enable_performance_monitoring', True),
                'max_fps': data['performance'].get('max_fps', 30),
                'frame_skip_ratio': data['performance'].get('frame_skip_ratio', 0.3),
                'enable_adaptive_quality': data['performance'].get('enable_adaptive_quality', True),
                'performance_report_interval': data['performance'].get('performance_report_interval', 300)
            })
        
        if 'detection' in data:
            config_data.update({
                'maturity_model_path': data['detection'].get('maturity_model_path', 'strawberry_yolov11.pt'),
                'disease_model_path': data['detection'].get('disease_model_path', 'best.pt'),
                'detection_confidence': data['detection'].get('detection_confidence', 0.5),
                'detection_interval': data['detection'].get('detection_interval', 0.1)
            })
        
        if 'optimization' in data:
            config_data.update({
                'enable_compression': data['optimization'].get('enable_compression', True)
            })
        
        if 'protocol' in data:
            config_data.update({
                'enable_protocol_upgrade': data['protocol'].get('enable_protocol_upgrade', True)
            })
        
        if 'validation' in data:
            config_data.update({
                'enable_interface_validation': data['validation'].get('enable_interface_validation', True)
            })
        
        if 'error_handling' in data:
            config_data.update({
                'enable_enhanced_error_handling': data['error_handling'].get('enable_enhanced_error_handling', True)
            })
        
        if 'monitoring' in data:
            config_data.update({
                'error_history_limit': data['monitoring'].get('error_history_limit', 1000)
            })
        
        # 如果是平面结构，直接使用
        if not any(key in data for key in ['server', 'performance', 'detection', 'optimization', 'protocol', 'validation', 'error_handling', 'monitoring']):
            config_data = data
        
        # 过滤掉不存在的字段
        valid_fields = {field.name for field in cls.__dataclass_fields__.values()}
        filtered_data = {k: v for k, v in config_data.items() if k in valid_fields}
        
        return cls(**filtered_data)
    
    @classmethod
    def load_from_file(cls, config_path: str) -> 'SystemConfig':
        """从文件加载配置"""
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return cls.from_dict(data)
        except Exception as e:
            logger.warning(f"加载配置文件失败: {e}, 使用默认配置")
            return cls()
    
    def save_to_file(self, config_path: str):
        """保存配置到文件"""
        try:
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(self.to_dict(), f, indent=2, ensure_ascii=False)
            logger.info(f"配置已保存到: {config_path}")
        except Exception as e:
            logger.error(f"保存配置文件失败: {e}")


class IntegratedDroneSystem:
    """集成无人机系统"""
    
    def __init__(self, config: SystemConfig):
        self.config = config
        self.is_running = False
        self.shutdown_event = asyncio.Event()
        
        # 核心组件
        self.drone_service: Optional[OptimizedTelloDroneService] = None
        self.detector: Optional[EnhancedMultiModelDetector] = None
        self.protocol_handler: Optional[EnhancedProtocolHandler] = None
        
        # 监控和管理组件
        self.system_monitor: Optional[SystemMonitor] = None
        self.performance_optimizer: Optional[PerformanceOptimizer] = None
        self.error_handler: Optional[DroneErrorHandler] = None
        self.interface_validator: Optional[DroneSystemValidator] = None
        
        # 性能统计
        self.stats = {
            'start_time': None,
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'average_response_time': 0.0,
            'peak_memory_usage': 0,
            'peak_cpu_usage': 0.0
        }
        
        # 组件状态
        self.component_status = {
            'drone_service': 'stopped',
            'detector': 'stopped',
            'protocol_handler': 'stopped',
            'system_monitor': 'stopped',
            'performance_optimizer': 'stopped',
            'error_handler': 'stopped'
        }
        
        # 设置信号处理
        self._setup_signal_handlers()
    
    def _setup_signal_handlers(self):
        """设置信号处理器"""
        def signal_handler(signum, frame):
            logger.info(f"接收到信号 {signum}, 开始优雅关闭...")
            asyncio.create_task(self.shutdown())
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    async def initialize(self) -> bool:
        """初始化系统"""
        try:
            logger.info("开始初始化集成无人机系统...")
            
            # 初始化错误处理器
            if self.config.enable_enhanced_error_handling:
                await self._initialize_error_handler()
            
            # 初始化接口验证器
            if self.config.enable_interface_validation:
                await self._initialize_interface_validator()
            
            # 初始化检测器
            await self._initialize_detector()
            
            # 初始化协议处理器
            if self.config.enable_protocol_upgrade:
                await self._initialize_protocol_handler()
            
            # 初始化无人机服务
            await self._initialize_drone_service()
            
            # 初始化性能监控
            if self.config.enable_performance_monitoring:
                await self._initialize_performance_monitoring()
            
            # 验证系统集成
            if self.interface_validator:
                try:
                    validation_result = self.interface_validator.validate_drone_system()
                    if validation_result.get('statistics', {}).get('failed', 0) > 0:
                        logger.warning(f"系统验证发现问题: {validation_result.get('statistics', {})}")
                    else:
                        logger.info("系统验证通过")
                except Exception as e:
                    logger.warning(f"系统验证失败: {e}")
                    # 不阻止系统启动
            
            logger.info("系统初始化完成")
            return True
            
        except Exception as e:
            if self.error_handler:
                await self.error_handler.handle_error(
                    component="system_integration",
                    error=e,
                    severity=ErrorSeverity.CRITICAL,
                    user_message="系统初始化失败"
                )
            else:
                logger.critical(f"系统初始化失败: {e}")
            return False
    
    async def _initialize_error_handler(self):
        """初始化错误处理器"""
        try:
            if DroneErrorHandler:
                self.error_handler = DroneErrorHandler()
                
                # 注册通知回调
                async def system_error_notification(error_info):
                    logger.error(f"系统错误通知: {error_info.get_user_friendly_message()}")
                    
                    # 更新统计
                    self.stats['failed_requests'] += 1
                    
                    # 严重错误时触发系统保护
                    if hasattr(error_info, 'severity') and hasattr(ErrorSeverity, 'CRITICAL'):
                        if error_info.severity == ErrorSeverity.CRITICAL:
                            logger.critical("检测到严重错误，触发系统保护模式")
                            await self._enter_safe_mode()
                
                self.error_handler.register_notification_callback(system_error_notification)
                self.component_status['error_handler'] = 'running'
                logger.info("错误处理器初始化完成")
            else:
                logger.warning("错误处理器组件不可用，跳过初始化")
                self.component_status['error_handler'] = 'disabled'
            
        except Exception as e:
            logger.error(f"错误处理器初始化失败: {e}")
            self.component_status['error_handler'] = 'failed'
    
    async def _initialize_interface_validator(self):
        """初始化接口验证器"""
        try:
            if DroneSystemValidator:
                self.interface_validator = DroneSystemValidator()
                
                # 注册系统组件
                components = {
                    'drone_service': OptimizedTelloDroneService,
                    'detector': EnhancedMultiModelDetector,
                    'error_handler': DroneErrorHandler
                }
                
                for name, component_class in components.items():
                    if component_class:
                        self.interface_validator.validator.register_component(name, component_class)
                
                logger.info("接口验证器初始化完成")
            else:
                logger.warning("接口验证器组件不可用，跳过初始化")
            
        except Exception as e:
            logger.error(f"接口验证器初始化失败: {e}")
            # 不抛出异常，允许系统继续运行
    
    async def _initialize_detector(self):
        """初始化检测器"""
        try:
            if EnhancedMultiModelDetector:
                # 检查模型文件
                maturity_model = Path(self.config.maturity_model_path)
                disease_model = Path(self.config.disease_model_path)
                
                if not maturity_model.exists():
                    logger.warning(f"成熟度模型文件不存在: {maturity_model}")
                
                if not disease_model.exists():
                    logger.warning(f"病害模型文件不存在: {disease_model}")
                
                # 初始化检测器（使用正确的参数）
                self.detector = EnhancedMultiModelDetector(
                    confidence_threshold=self.config.detection_confidence,
                    detection_interval=self.config.detection_interval
                )
                
                # 设置错误处理器
                if self.error_handler:
                    self.detector._error_handler = self.error_handler
                
                self.component_status['detector'] = 'running'
                logger.info("检测器初始化完成")
            else:
                logger.warning("检测器组件不可用，跳过初始化")
                self.component_status['detector'] = 'disabled'
            
        except Exception as e:
            logger.error(f"检测器初始化失败: {e}")
            self.component_status['detector'] = 'failed'
    
    async def _initialize_protocol_handler(self):
        """初始化协议处理器"""
        try:
            if EnhancedProtocolHandler and ProtocolVersion:
                self.protocol_handler = EnhancedProtocolHandler()
                
                # 设置错误处理器
                if self.error_handler:
                    self.protocol_handler._error_handler = self.error_handler
                
                self.component_status['protocol_handler'] = 'running'
                logger.info("协议处理器初始化完成")
            else:
                logger.warning("协议处理器组件不可用，跳过初始化")
                self.component_status['protocol_handler'] = 'disabled'
            
        except Exception as e:
            logger.error(f"协议处理器初始化失败: {e}")
            self.component_status['protocol_handler'] = 'failed'
    
    async def _initialize_drone_service(self):
        """初始化无人机服务"""
        try:
            # 创建无人机服务（使用正确的参数）
            self.drone_service = OptimizedTelloDroneService(
                ws_port=self.config.websocket_port,
                http_port=self.config.http_port
            )
            
            # 设置错误处理器
            if self.error_handler:
                self.drone_service._error_handler = self.error_handler
            
            self.component_status['drone_service'] = 'running'
            logger.info("无人机服务初始化完成")
            
        except Exception as e:
            logger.error(f"无人机服务初始化失败: {e}")
            self.component_status['drone_service'] = 'failed'
    
    async def _initialize_performance_monitoring(self):
        """初始化性能监控"""
        try:
            if SystemMonitor and PerformanceOptimizer:
                # 系统监控器
                self.system_monitor = SystemMonitor()
                
                # 性能优化器
                self.performance_optimizer = PerformanceOptimizer()
                
                # 设置错误处理器
                if self.error_handler:
                    if hasattr(self.system_monitor, '_error_handler'):
                        self.system_monitor._error_handler = self.error_handler
                    if hasattr(self.performance_optimizer, '_error_handler'):
                        self.performance_optimizer._error_handler = self.error_handler
                
                self.component_status['system_monitor'] = 'running'
                self.component_status['performance_optimizer'] = 'running'
                logger.info("性能监控初始化完成")
            else:
                logger.warning("性能监控组件不可用，跳过初始化")
                self.component_status['system_monitor'] = 'disabled'
                self.component_status['performance_optimizer'] = 'disabled'
            
        except Exception as e:
            logger.error(f"性能监控初始化失败: {e}")
            self.component_status['system_monitor'] = 'failed'
            self.component_status['performance_optimizer'] = 'failed'
    
    async def start(self) -> bool:
        """启动系统"""
        try:
            if self.is_running:
                logger.warning("系统已在运行中")
                return True
            
            # 初始化系统
            if not await self.initialize():
                logger.error("系统初始化失败")
                return False
            
            # 启动无人机服务
            if self.drone_service:
                if hasattr(self.drone_service, 'start'):
                    await self.drone_service.start()
                else:
                    # 原始版本的启动方式
                    asyncio.create_task(self.drone_service.start_websocket_server())
            
            # 启动统计更新
            asyncio.create_task(self._stats_update_loop())
            
            # 启动性能报告
            if self.system_monitor:
                asyncio.create_task(self._performance_report_loop())
            
            self.is_running = True
            self.stats['start_time'] = time.time()
            
            logger.info(f"集成无人机系统启动成功")
            logger.info(f"WebSocket服务器: ws://{self.config.host}:{self.config.websocket_port}")
            logger.info(f"HTTP服务器: http://{self.config.host}:{self.config.http_port}")
            
            return True
            
        except Exception as e:
            if self.error_handler:
                await self.error_handler.handle_error(
                    component="system_integration",
                    error=e,
                    severity=ErrorSeverity.CRITICAL,
                    user_message="系统启动失败"
                )
            else:
                logger.critical(f"系统启动失败: {e}")
            return False
    
    async def shutdown(self):
        """关闭系统"""
        try:
            if not self.is_running:
                return
            
            logger.info("开始关闭系统...")
            self.is_running = False
            self.shutdown_event.set()
            
            # 关闭各个组件
            if self.drone_service and hasattr(self.drone_service, 'shutdown'):
                await self.drone_service.shutdown()
            
            if self.system_monitor:
                await self.system_monitor.stop_monitoring()
            
            # 生成最终报告
            await self._generate_final_report()
            
            logger.info("系统已安全关闭")
            
        except Exception as e:
            logger.error(f"系统关闭时出错: {e}")
    
    async def _enter_safe_mode(self):
        """进入安全模式"""
        logger.warning("系统进入安全模式")
        
        # 降低性能要求
        if self.drone_service and hasattr(self.drone_service, 'set_safe_mode'):
            await self.drone_service.set_safe_mode(True)
        
        # 停止非关键功能
        if self.detector and hasattr(self.detector, 'set_detection_enabled'):
            self.detector.set_detection_enabled(False)
    
    async def _performance_optimization_loop(self):
        """性能优化循环"""
        while self.is_running and not self.shutdown_event.is_set():
            try:
                if self.system_monitor and self.performance_optimizer:
                    # 获取系统指标
                    metrics = await self.system_monitor.get_current_metrics()
                    
                    # 应用优化策略
                    optimizations = await self.performance_optimizer.optimize_system(metrics)
                    
                    if optimizations:
                        logger.info(f"应用了 {len(optimizations)} 项性能优化")
                
                await asyncio.sleep(60)  # 每分钟优化一次
                
            except Exception as e:
                if self.error_handler:
                    await self.error_handler.handle_error(
                        component="performance_optimizer",
                        error=e,
                        severity=ErrorSeverity.MEDIUM
                    )
                await asyncio.sleep(60)
    
    async def _stats_update_loop(self):
        """统计更新循环"""
        while self.is_running and not self.shutdown_event.is_set():
            try:
                # 更新性能统计
                if self.system_monitor:
                    metrics = await self.system_monitor.get_current_metrics()
                    self.stats['peak_memory_usage'] = max(
                        self.stats['peak_memory_usage'],
                        metrics.memory_usage
                    )
                    self.stats['peak_cpu_usage'] = max(
                        self.stats['peak_cpu_usage'],
                        metrics.cpu_usage
                    )
                
                await asyncio.sleep(10)  # 每10秒更新一次
                
            except Exception as e:
                if self.error_handler:
                    await self.error_handler.handle_error(
                        component="stats_updater",
                        error=e,
                        severity=ErrorSeverity.LOW
                    )
                await asyncio.sleep(10)
    
    async def _performance_report_loop(self):
        """性能报告循环"""
        while self.is_running and not self.shutdown_event.is_set():
            try:
                await asyncio.sleep(self.config.performance_report_interval)
                
                if self.system_monitor:
                    # 生成性能报告
                    report = await self.system_monitor.generate_report()
                    logger.info(f"性能报告: {report['summary']}")
                
            except Exception as e:
                if self.error_handler:
                    await self.error_handler.handle_error(
                        component="performance_reporter",
                        error=e,
                        severity=ErrorSeverity.LOW
                    )
                await asyncio.sleep(self.config.performance_report_interval)
    
    async def _generate_final_report(self):
        """生成最终报告"""
        try:
            uptime = time.time() - self.stats['start_time'] if self.stats['start_time'] else 0
            
            report = {
                'system_info': {
                    'uptime_seconds': uptime,
                    'uptime_formatted': f"{uptime/3600:.1f} 小时",
                    'component_status': self.component_status.copy()
                },
                'performance_stats': self.stats.copy(),
                'error_stats': self.error_handler.get_error_stats() if self.error_handler else {},
                'detector_stats': self.detector.get_performance_stats() if self.detector and hasattr(self.detector, 'get_performance_stats') else {}
            }
            
            # 保存报告
            report_path = f"system_report_{int(time.time())}.json"
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            
            logger.info(f"最终报告已保存: {report_path}")
            
        except Exception as e:
            logger.error(f"生成最终报告失败: {e}")
    
    def get_system_status(self) -> Dict[str, Any]:
        """获取系统状态"""
        uptime = time.time() - self.stats['start_time'] if self.stats['start_time'] else 0
        
        return {
            'is_running': self.is_running,
            'uptime': uptime,
            'component_status': self.component_status.copy(),
            'performance_stats': self.stats.copy(),
            'config': self.config.to_dict()
        }
    
    def get_health_check(self) -> Dict[str, Any]:
        """健康检查"""
        health = {
            'status': 'healthy' if self.is_running else 'stopped',
            'components': {},
            'issues': []
        }
        
        # 检查各组件状态
        for component, status in self.component_status.items():
            health['components'][component] = {
                'status': status,
                'healthy': status == 'running'
            }
            
            if status != 'running' and self.is_running:
                health['issues'].append(f"{component} 未运行")
        
        # 检查错误率
        if self.stats['total_requests'] > 0:
            error_rate = self.stats['failed_requests'] / self.stats['total_requests']
            if error_rate > 0.1:  # 错误率超过10%
                health['issues'].append(f"错误率过高: {error_rate:.1%}")
        
        # 检查内存使用
        if self.stats['peak_memory_usage'] > 90:
            health['issues'].append(f"内存使用率过高: {self.stats['peak_memory_usage']:.1f}%")
        
        # 更新整体状态
        if health['issues']:
            health['status'] = 'degraded' if len(health['issues']) < 3 else 'unhealthy'
        
        return health


async def main():
    """主函数"""
    # 加载配置
    config_path = "system_config.json"
    config = SystemConfig.load_from_file(config_path)
    
    # 保存默认配置（如果不存在）
    if not Path(config_path).exists():
        config.save_to_file(config_path)
    
    # 创建系统
    system = IntegratedDroneSystem(config)
    
    try:
        # 启动系统
        if await system.start():
            logger.info("系统启动成功，按 Ctrl+C 停止")
            
            # 等待关闭信号
            await system.shutdown_event.wait()
        else:
            logger.error("系统启动失败")
            return 1
            
    except KeyboardInterrupt:
        logger.info("接收到中断信号")
    except Exception as e:
        logger.critical(f"系统运行时出现严重错误: {e}")
        return 1
    finally:
        await system.shutdown()
    
    return 0


if __name__ == "__main__":
    # 设置事件循环策略（Windows）
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    # 运行系统
    exit_code = asyncio.run(main())
    sys.exit(exit_code)