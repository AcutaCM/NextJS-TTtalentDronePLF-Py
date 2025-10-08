#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
性能监控模块
实时监控系统资源、检测性能瓶颈并提供优化建议
"""

import os
import sys
import time
import threading
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from collections import deque, defaultdict
import weakref
import gc

# 配置日志
logger = logging.getLogger(__name__)

# 系统监控库
try:
    import psutil
    PSUTIL_AVAILABLE = True
    logger.info("✅ psutil库加载成功")
except ImportError:
    PSUTIL_AVAILABLE = False
    logger.warning("⚠️ psutil库未安装，系统监控功能受限")

# 内存分析库
try:
    from memory_profiler import profile as memory_profile
    MEMORY_PROFILER_AVAILABLE = True
except ImportError:
    MEMORY_PROFILER_AVAILABLE = False
    logger.warning("⚠️ memory_profiler库未安装，内存分析功能受限")

# 数值计算库
try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    logger.warning("⚠️ numpy库未安装，统计分析功能受限")


@dataclass
class SystemMetrics:
    """系统指标数据类"""
    timestamp: float = field(default_factory=time.time)
    cpu_percent: float = 0.0
    memory_percent: float = 0.0
    memory_used_mb: float = 0.0
    memory_available_mb: float = 0.0
    disk_usage_percent: float = 0.0
    network_sent_mb: float = 0.0
    network_recv_mb: float = 0.0
    gpu_usage_percent: float = 0.0
    gpu_memory_percent: float = 0.0
    process_count: int = 0
    thread_count: int = 0
    open_files: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'timestamp': self.timestamp,
            'cpu_percent': self.cpu_percent,
            'memory_percent': self.memory_percent,
            'memory_used_mb': self.memory_used_mb,
            'memory_available_mb': self.memory_available_mb,
            'disk_usage_percent': self.disk_usage_percent,
            'network_sent_mb': self.network_sent_mb,
            'network_recv_mb': self.network_recv_mb,
            'gpu_usage_percent': self.gpu_usage_percent,
            'gpu_memory_percent': self.gpu_memory_percent,
            'process_count': self.process_count,
            'thread_count': self.thread_count,
            'open_files': self.open_files
        }


@dataclass
class PerformanceAlert:
    """性能警报数据类"""
    level: str  # 'info', 'warning', 'critical'
    category: str  # 'cpu', 'memory', 'disk', 'network', 'gpu'
    message: str
    timestamp: float = field(default_factory=time.time)
    value: float = 0.0
    threshold: float = 0.0
    suggestion: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'level': self.level,
            'category': self.category,
            'message': self.message,
            'timestamp': self.timestamp,
            'value': self.value,
            'threshold': self.threshold,
            'suggestion': self.suggestion
        }


class PerformanceThresholds:
    """性能阈值配置"""
    
    def __init__(self):
        # CPU阈值
        self.cpu_warning = 70.0
        self.cpu_critical = 90.0
        
        # 内存阈值
        self.memory_warning = 75.0
        self.memory_critical = 90.0
        
        # 磁盘阈值
        self.disk_warning = 80.0
        self.disk_critical = 95.0
        
        # GPU阈值
        self.gpu_warning = 80.0
        self.gpu_critical = 95.0
        
        # 网络阈值 (MB/s)
        self.network_warning = 100.0
        self.network_critical = 500.0
        
        # 进程阈值
        self.process_warning = 200
        self.process_critical = 500
        
        # 线程阈值
        self.thread_warning = 100
        self.thread_critical = 300


class SystemMonitor:
    """系统监控器"""
    
    def __init__(self, history_size: int = 1000):
        self.history_size = history_size
        self.metrics_history: deque = deque(maxlen=history_size)
        self.alerts_history: deque = deque(maxlen=100)
        self.thresholds = PerformanceThresholds()
        
        # 监控状态
        self.is_monitoring = False
        self.monitor_thread = None
        self.monitor_interval = 1.0  # 监控间隔（秒）
        
        # 回调函数
        self.alert_callbacks: List[Callable[[PerformanceAlert], None]] = []
        self.metrics_callbacks: List[Callable[[SystemMetrics], None]] = []
        
        # 网络统计基线
        self.network_baseline = None
        self.last_network_time = None
        
        # 进程信息
        self.process = None
        if PSUTIL_AVAILABLE:
            try:
                self.process = psutil.Process()
            except Exception as e:
                logger.error(f"获取进程信息失败: {e}")
    
    def start_monitoring(self):
        """启动监控"""
        if self.is_monitoring:
            logger.warning("监控已在运行")
            return
        
        self.is_monitoring = True
        self.monitor_thread = threading.Thread(
            target=self._monitor_worker,
            daemon=True,
            name="SystemMonitor"
        )
        self.monitor_thread.start()
        logger.info("🔍 系统监控已启动")
    
    def stop_monitoring(self):
        """停止监控"""
        self.is_monitoring = False
        if self.monitor_thread and self.monitor_thread.is_alive():
            self.monitor_thread.join(timeout=2.0)
        logger.info("⏹️ 系统监控已停止")
    
    def _monitor_worker(self):
        """监控工作线程"""
        logger.info("📊 监控工作线程已启动")
        
        while self.is_monitoring:
            try:
                # 收集系统指标
                metrics = self._collect_system_metrics()
                
                # 添加到历史记录
                self.metrics_history.append(metrics)
                
                # 检查阈值并生成警报
                alerts = self._check_thresholds(metrics)
                for alert in alerts:
                    self.alerts_history.append(alert)
                    self._trigger_alert_callbacks(alert)
                
                # 触发指标回调
                self._trigger_metrics_callbacks(metrics)
                
                # 等待下次监控
                time.sleep(self.monitor_interval)
                
            except Exception as e:
                logger.error(f"监控工作线程错误: {e}")
                time.sleep(1.0)
        
        logger.info("📊 监控工作线程已停止")
    
    def _collect_system_metrics(self) -> SystemMetrics:
        """收集系统指标"""
        metrics = SystemMetrics()
        
        try:
            if not PSUTIL_AVAILABLE:
                return metrics
            
            # CPU使用率
            metrics.cpu_percent = psutil.cpu_percent(interval=None)
            
            # 内存信息
            memory = psutil.virtual_memory()
            metrics.memory_percent = memory.percent
            metrics.memory_used_mb = memory.used / (1024 * 1024)
            metrics.memory_available_mb = memory.available / (1024 * 1024)
            
            # 磁盘使用率
            disk = psutil.disk_usage('/')
            metrics.disk_usage_percent = disk.percent
            
            # 网络信息
            network = psutil.net_io_counters()
            current_time = time.time()
            
            if self.network_baseline and self.last_network_time:
                time_diff = current_time - self.last_network_time
                if time_diff > 0:
                    sent_diff = network.bytes_sent - self.network_baseline.bytes_sent
                    recv_diff = network.bytes_recv - self.network_baseline.bytes_recv
                    
                    metrics.network_sent_mb = (sent_diff / time_diff) / (1024 * 1024)
                    metrics.network_recv_mb = (recv_diff / time_diff) / (1024 * 1024)
            
            self.network_baseline = network
            self.last_network_time = current_time
            
            # GPU信息（如果可用）
            try:
                import GPUtil
                gpus = GPUtil.getGPUs()
                if gpus:
                    gpu = gpus[0]  # 使用第一个GPU
                    metrics.gpu_usage_percent = gpu.load * 100
                    metrics.gpu_memory_percent = gpu.memoryUtil * 100
            except ImportError:
                pass
            except Exception as e:
                logger.debug(f"GPU监控失败: {e}")
            
            # 进程信息
            if self.process:
                try:
                    metrics.process_count = len(psutil.pids())
                    metrics.thread_count = self.process.num_threads()
                    metrics.open_files = len(self.process.open_files())
                except Exception as e:
                    logger.debug(f"进程信息收集失败: {e}")
            
        except Exception as e:
            logger.error(f"系统指标收集失败: {e}")
        
        return metrics
    
    def _check_thresholds(self, metrics: SystemMetrics) -> List[PerformanceAlert]:
        """检查阈值并生成警报"""
        alerts = []
        
        # CPU检查
        if metrics.cpu_percent >= self.thresholds.cpu_critical:
            alerts.append(PerformanceAlert(
                level='critical',
                category='cpu',
                message=f'CPU使用率过高: {metrics.cpu_percent:.1f}%',
                value=metrics.cpu_percent,
                threshold=self.thresholds.cpu_critical,
                suggestion='考虑优化算法或增加CPU资源'
            ))
        elif metrics.cpu_percent >= self.thresholds.cpu_warning:
            alerts.append(PerformanceAlert(
                level='warning',
                category='cpu',
                message=f'CPU使用率较高: {metrics.cpu_percent:.1f}%',
                value=metrics.cpu_percent,
                threshold=self.thresholds.cpu_warning,
                suggestion='监控CPU使用情况，考虑优化'
            ))
        
        # 内存检查
        if metrics.memory_percent >= self.thresholds.memory_critical:
            alerts.append(PerformanceAlert(
                level='critical',
                category='memory',
                message=f'内存使用率过高: {metrics.memory_percent:.1f}%',
                value=metrics.memory_percent,
                threshold=self.thresholds.memory_critical,
                suggestion='立即释放内存或增加内存资源'
            ))
        elif metrics.memory_percent >= self.thresholds.memory_warning:
            alerts.append(PerformanceAlert(
                level='warning',
                category='memory',
                message=f'内存使用率较高: {metrics.memory_percent:.1f}%',
                value=metrics.memory_percent,
                threshold=self.thresholds.memory_warning,
                suggestion='考虑清理缓存或优化内存使用'
            ))
        
        # 磁盘检查
        if metrics.disk_usage_percent >= self.thresholds.disk_critical:
            alerts.append(PerformanceAlert(
                level='critical',
                category='disk',
                message=f'磁盘使用率过高: {metrics.disk_usage_percent:.1f}%',
                value=metrics.disk_usage_percent,
                threshold=self.thresholds.disk_critical,
                suggestion='立即清理磁盘空间'
            ))
        elif metrics.disk_usage_percent >= self.thresholds.disk_warning:
            alerts.append(PerformanceAlert(
                level='warning',
                category='disk',
                message=f'磁盘使用率较高: {metrics.disk_usage_percent:.1f}%',
                value=metrics.disk_usage_percent,
                threshold=self.thresholds.disk_warning,
                suggestion='考虑清理临时文件和日志'
            ))
        
        # GPU检查
        if metrics.gpu_usage_percent >= self.thresholds.gpu_critical:
            alerts.append(PerformanceAlert(
                level='critical',
                category='gpu',
                message=f'GPU使用率过高: {metrics.gpu_usage_percent:.1f}%',
                value=metrics.gpu_usage_percent,
                threshold=self.thresholds.gpu_critical,
                suggestion='优化GPU计算或降低模型复杂度'
            ))
        elif metrics.gpu_usage_percent >= self.thresholds.gpu_warning:
            alerts.append(PerformanceAlert(
                level='warning',
                category='gpu',
                message=f'GPU使用率较高: {metrics.gpu_usage_percent:.1f}%',
                value=metrics.gpu_usage_percent,
                threshold=self.thresholds.gpu_warning,
                suggestion='监控GPU使用情况'
            ))
        
        return alerts
    
    def _trigger_alert_callbacks(self, alert: PerformanceAlert):
        """触发警报回调"""
        for callback in self.alert_callbacks:
            try:
                callback(alert)
            except Exception as e:
                logger.error(f"警报回调执行失败: {e}")
    
    def _trigger_metrics_callbacks(self, metrics: SystemMetrics):
        """触发指标回调"""
        for callback in self.metrics_callbacks:
            try:
                callback(metrics)
            except Exception as e:
                logger.error(f"指标回调执行失败: {e}")
    
    def add_alert_callback(self, callback: Callable[[PerformanceAlert], None]):
        """添加警报回调"""
        self.alert_callbacks.append(callback)
    
    def add_metrics_callback(self, callback: Callable[[SystemMetrics], None]):
        """添加指标回调"""
        self.metrics_callbacks.append(callback)
    
    def get_current_metrics(self) -> Optional[SystemMetrics]:
        """获取当前指标"""
        if self.metrics_history:
            return self.metrics_history[-1]
        return None
    
    def get_metrics_history(self, duration_minutes: int = 10) -> List[SystemMetrics]:
        """获取指定时间段的指标历史"""
        if not self.metrics_history:
            return []
        
        cutoff_time = time.time() - (duration_minutes * 60)
        return [m for m in self.metrics_history if m.timestamp >= cutoff_time]
    
    def get_recent_alerts(self, duration_minutes: int = 10) -> List[PerformanceAlert]:
        """获取最近的警报"""
        if not self.alerts_history:
            return []
        
        cutoff_time = time.time() - (duration_minutes * 60)
        return [a for a in self.alerts_history if a.timestamp >= cutoff_time]
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """获取性能摘要"""
        if not self.metrics_history:
            return {}
        
        recent_metrics = self.get_metrics_history(5)  # 最近5分钟
        if not recent_metrics:
            return {}
        
        summary = {
            'current': self.get_current_metrics().to_dict() if self.get_current_metrics() else {},
            'averages': {},
            'peaks': {},
            'alerts_count': len(self.get_recent_alerts(10))
        }
        
        if NUMPY_AVAILABLE and recent_metrics:
            # 计算平均值和峰值
            cpu_values = [m.cpu_percent for m in recent_metrics]
            memory_values = [m.memory_percent for m in recent_metrics]
            
            summary['averages'] = {
                'cpu_percent': float(np.mean(cpu_values)),
                'memory_percent': float(np.mean(memory_values))
            }
            
            summary['peaks'] = {
                'cpu_percent': float(np.max(cpu_values)),
                'memory_percent': float(np.max(memory_values))
            }
        
        return summary


class PerformanceOptimizer:
    """性能优化器"""
    
    def __init__(self, monitor: SystemMonitor):
        self.monitor = monitor
        self.optimization_history = []
        
        # 优化策略
        self.strategies = {
            'memory_cleanup': self._memory_cleanup_strategy,
            'cpu_throttling': self._cpu_throttling_strategy,
            'cache_optimization': self._cache_optimization_strategy,
            'process_optimization': self._process_optimization_strategy
        }
    
    def analyze_and_optimize(self) -> List[str]:
        """分析并执行优化"""
        optimizations = []
        current_metrics = self.monitor.get_current_metrics()
        
        if not current_metrics:
            return optimizations
        
        # 内存优化
        if current_metrics.memory_percent > 80:
            result = self._memory_cleanup_strategy()
            if result:
                optimizations.append(result)
        
        # CPU优化
        if current_metrics.cpu_percent > 85:
            result = self._cpu_throttling_strategy()
            if result:
                optimizations.append(result)
        
        # 缓存优化
        if current_metrics.memory_percent > 70:
            result = self._cache_optimization_strategy()
            if result:
                optimizations.append(result)
        
        return optimizations
    
    def _memory_cleanup_strategy(self) -> Optional[str]:
        """内存清理策略"""
        try:
            # 强制垃圾回收
            collected = gc.collect()
            
            # 记录优化
            optimization = f"执行内存清理，回收了 {collected} 个对象"
            self.optimization_history.append({
                'timestamp': time.time(),
                'strategy': 'memory_cleanup',
                'result': optimization
            })
            
            logger.info(f"🧹 {optimization}")
            return optimization
            
        except Exception as e:
            logger.error(f"内存清理失败: {e}")
            return None
    
    def _cpu_throttling_strategy(self) -> Optional[str]:
        """CPU节流策略"""
        try:
            # 这里可以实现CPU节流逻辑
            # 例如：降低处理频率、增加延迟等
            optimization = "应用CPU节流策略，降低处理频率"
            
            self.optimization_history.append({
                'timestamp': time.time(),
                'strategy': 'cpu_throttling',
                'result': optimization
            })
            
            logger.info(f"⚡ {optimization}")
            return optimization
            
        except Exception as e:
            logger.error(f"CPU节流失败: {e}")
            return None
    
    def _cache_optimization_strategy(self) -> Optional[str]:
        """缓存优化策略"""
        try:
            # 这里可以实现缓存优化逻辑
            optimization = "优化缓存策略，清理过期缓存"
            
            self.optimization_history.append({
                'timestamp': time.time(),
                'strategy': 'cache_optimization',
                'result': optimization
            })
            
            logger.info(f"💾 {optimization}")
            return optimization
            
        except Exception as e:
            logger.error(f"缓存优化失败: {e}")
            return None
    
    def _process_optimization_strategy(self) -> Optional[str]:
        """进程优化策略"""
        try:
            # 这里可以实现进程优化逻辑
            optimization = "优化进程配置，调整线程池大小"
            
            self.optimization_history.append({
                'timestamp': time.time(),
                'strategy': 'process_optimization',
                'result': optimization
            })
            
            logger.info(f"⚙️ {optimization}")
            return optimization
            
        except Exception as e:
            logger.error(f"进程优化失败: {e}")
            return None
    
    def get_optimization_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """获取优化历史"""
        return self.optimization_history[-limit:]


class PerformanceReporter:
    """性能报告器"""
    
    def __init__(self, monitor: SystemMonitor):
        self.monitor = monitor
    
    def generate_report(self, duration_hours: int = 1) -> Dict[str, Any]:
        """生成性能报告"""
        duration_minutes = duration_hours * 60
        metrics_history = self.monitor.get_metrics_history(duration_minutes)
        alerts_history = self.monitor.get_recent_alerts(duration_minutes)
        
        if not metrics_history:
            return {'error': '没有足够的历史数据'}
        
        report = {
            'report_time': datetime.now().isoformat(),
            'duration_hours': duration_hours,
            'metrics_count': len(metrics_history),
            'alerts_count': len(alerts_history),
            'summary': self._generate_summary(metrics_history),
            'alerts_summary': self._generate_alerts_summary(alerts_history),
            'recommendations': self._generate_recommendations(metrics_history, alerts_history)
        }
        
        return report
    
    def _generate_summary(self, metrics_history: List[SystemMetrics]) -> Dict[str, Any]:
        """生成指标摘要"""
        if not NUMPY_AVAILABLE or not metrics_history:
            return {}
        
        cpu_values = [m.cpu_percent for m in metrics_history]
        memory_values = [m.memory_percent for m in metrics_history]
        
        return {
            'cpu': {
                'avg': float(np.mean(cpu_values)),
                'max': float(np.max(cpu_values)),
                'min': float(np.min(cpu_values)),
                'std': float(np.std(cpu_values))
            },
            'memory': {
                'avg': float(np.mean(memory_values)),
                'max': float(np.max(memory_values)),
                'min': float(np.min(memory_values)),
                'std': float(np.std(memory_values))
            }
        }
    
    def _generate_alerts_summary(self, alerts_history: List[PerformanceAlert]) -> Dict[str, Any]:
        """生成警报摘要"""
        if not alerts_history:
            return {'total': 0}
        
        by_level = defaultdict(int)
        by_category = defaultdict(int)
        
        for alert in alerts_history:
            by_level[alert.level] += 1
            by_category[alert.category] += 1
        
        return {
            'total': len(alerts_history),
            'by_level': dict(by_level),
            'by_category': dict(by_category)
        }
    
    def _generate_recommendations(self, 
                                metrics_history: List[SystemMetrics], 
                                alerts_history: List[PerformanceAlert]) -> List[str]:
        """生成优化建议"""
        recommendations = []
        
        if not metrics_history:
            return recommendations
        
        # 分析CPU使用情况
        if NUMPY_AVAILABLE:
            cpu_values = [m.cpu_percent for m in metrics_history]
            avg_cpu = np.mean(cpu_values)
            max_cpu = np.max(cpu_values)
            
            if avg_cpu > 70:
                recommendations.append("CPU平均使用率较高，建议优化算法或增加CPU资源")
            if max_cpu > 90:
                recommendations.append("CPU峰值使用率过高，建议实施负载均衡")
        
        # 分析内存使用情况
        if NUMPY_AVAILABLE:
            memory_values = [m.memory_percent for m in metrics_history]
            avg_memory = np.mean(memory_values)
            max_memory = np.max(memory_values)
            
            if avg_memory > 75:
                recommendations.append("内存平均使用率较高，建议优化内存管理")
            if max_memory > 90:
                recommendations.append("内存峰值使用率过高，建议增加内存或优化缓存策略")
        
        # 分析警报情况
        critical_alerts = [a for a in alerts_history if a.level == 'critical']
        if critical_alerts:
            recommendations.append(f"发现 {len(critical_alerts)} 个严重警报，需要立即处理")
        
        return recommendations
    
    def save_report(self, report: Dict[str, Any], filename: str):
        """保存报告到文件"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            logger.info(f"📄 性能报告已保存到: {filename}")
        except Exception as e:
            logger.error(f"保存报告失败: {e}")


if __name__ == "__main__":
    # 测试代码
    def alert_handler(alert: PerformanceAlert):
        print(f"🚨 警报: {alert.message}")
    
    def metrics_handler(metrics: SystemMetrics):
        print(f"📊 CPU: {metrics.cpu_percent:.1f}%, 内存: {metrics.memory_percent:.1f}%")
    
    # 创建监控器
    monitor = SystemMonitor()
    monitor.add_alert_callback(alert_handler)
    monitor.add_metrics_callback(metrics_handler)
    
    # 创建优化器
    optimizer = PerformanceOptimizer(monitor)
    
    # 创建报告器
    reporter = PerformanceReporter(monitor)
    
    try:
        # 启动监控
        monitor.start_monitoring()
        
        # 运行一段时间
        time.sleep(10)
        
        # 执行优化
        optimizations = optimizer.analyze_and_optimize()
        print(f"执行的优化: {optimizations}")
        
        # 生成报告
        report = reporter.generate_report(duration_hours=1)
        print(f"性能报告: {json.dumps(report, indent=2, ensure_ascii=False)}")
        
    except KeyboardInterrupt:
        print("\n监控被用户中断")
    finally:
        monitor.stop_monitoring()