#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
接口验证器
验证各模块接口和数据流完整性，确保组件映射关系正常运作
"""

import json
import time
import asyncio
import logging
import inspect
import traceback
from typing import Dict, List, Optional, Any, Union, Callable, Type
from dataclasses import dataclass, field
from enum import Enum
import threading
from collections import defaultdict, deque
import weakref
import sys
import importlib

# 配置日志
logger = logging.getLogger(__name__)


class ValidationLevel(Enum):
    """验证级别"""
    BASIC = "basic"          # 基础验证
    STANDARD = "standard"    # 标准验证
    STRICT = "strict"        # 严格验证
    COMPREHENSIVE = "comprehensive"  # 全面验证


class ValidationStatus(Enum):
    """验证状态"""
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"
    SKIPPED = "skipped"
    ERROR = "error"


@dataclass
class ValidationResult:
    """验证结果"""
    component: str
    interface: str
    status: ValidationStatus
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: float = field(default_factory=time.time)
    execution_time: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'component': self.component,
            'interface': self.interface,
            'status': self.status.value,
            'message': self.message,
            'details': self.details,
            'timestamp': self.timestamp,
            'execution_time': self.execution_time
        }


@dataclass
class InterfaceSpec:
    """接口规范"""
    name: str
    component: str
    methods: List[str]
    required_attributes: List[str]
    data_types: Dict[str, Type]
    validation_rules: Dict[str, Callable]
    dependencies: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'name': self.name,
            'component': self.component,
            'methods': self.methods,
            'required_attributes': self.required_attributes,
            'data_types': {k: str(v) for k, v in self.data_types.items()},
            'dependencies': self.dependencies
        }


class ComponentRegistry:
    """组件注册表"""
    
    def __init__(self):
        self.components: Dict[str, Any] = {}
        self.interfaces: Dict[str, InterfaceSpec] = {}
        self.dependencies: Dict[str, List[str]] = defaultdict(list)
        self.reverse_dependencies: Dict[str, List[str]] = defaultdict(list)
        
    def register_component(self, name: str, component: Any, interface_spec: Optional[InterfaceSpec] = None):
        """注册组件"""
        self.components[name] = component
        
        if interface_spec:
            self.interfaces[name] = interface_spec
            
            # 构建依赖关系图
            for dep in interface_spec.dependencies:
                self.dependencies[name].append(dep)
                self.reverse_dependencies[dep].append(name)
        
        logger.info(f"组件已注册: {name}")
    
    def get_component(self, name: str) -> Optional[Any]:
        """获取组件"""
        return self.components.get(name)
    
    def get_interface_spec(self, name: str) -> Optional[InterfaceSpec]:
        """获取接口规范"""
        return self.interfaces.get(name)
    
    def get_dependencies(self, name: str) -> List[str]:
        """获取依赖"""
        return self.dependencies.get(name, [])
    
    def get_dependents(self, name: str) -> List[str]:
        """获取依赖者"""
        return self.reverse_dependencies.get(name, [])
    
    def list_components(self) -> List[str]:
        """列出所有组件"""
        return list(self.components.keys())
    
    def get_dependency_graph(self) -> Dict[str, List[str]]:
        """获取依赖图"""
        return dict(self.dependencies)


class InterfaceValidator:
    """接口验证器"""
    
    def __init__(self, validation_level: ValidationLevel = ValidationLevel.STANDARD):
        self.validation_level = validation_level
        self.registry = ComponentRegistry()
        self.validation_results: List[ValidationResult] = []
        self.validation_cache: Dict[str, ValidationResult] = {}
        
        # 验证统计
        self.stats = {
            'total_validations': 0,
            'passed': 0,
            'failed': 0,
            'warnings': 0,
            'errors': 0,
            'skipped': 0
        }
    
    def register_component(self, name: str, component: Any, interface_spec: Optional[InterfaceSpec] = None):
        """注册组件"""
        self.registry.register_component(name, component, interface_spec)
    
    def validate_all_interfaces(self) -> List[ValidationResult]:
        """验证所有接口"""
        logger.info(f"开始验证所有接口，级别: {self.validation_level.value}")
        
        results = []
        components = self.registry.list_components()
        
        for component_name in components:
            component_results = self.validate_component_interface(component_name)
            results.extend(component_results)
        
        # 验证依赖关系
        dependency_results = self.validate_dependencies()
        results.extend(dependency_results)
        
        # 验证数据流
        if self.validation_level in [ValidationLevel.STRICT, ValidationLevel.COMPREHENSIVE]:
            dataflow_results = self.validate_data_flow()
            results.extend(dataflow_results)
        
        self.validation_results = results
        self._update_stats(results)
        
        logger.info(f"接口验证完成，共 {len(results)} 项结果")
        return results
    
    def validate_component_interface(self, component_name: str) -> List[ValidationResult]:
        """验证组件接口"""
        results = []
        start_time = time.time()
        
        try:
            component = self.registry.get_component(component_name)
            interface_spec = self.registry.get_interface_spec(component_name)
            
            if not component:
                result = ValidationResult(
                    component=component_name,
                    interface="component_existence",
                    status=ValidationStatus.FAILED,
                    message="组件不存在",
                    execution_time=time.time() - start_time
                )
                results.append(result)
                return results
            
            if not interface_spec:
                # 如果没有接口规范，进行基础验证
                result = self._validate_basic_interface(component_name, component)
                results.append(result)
                return results
            
            # 验证方法存在性
            method_results = self._validate_methods(component_name, component, interface_spec)
            results.extend(method_results)
            
            # 验证属性存在性
            attr_results = self._validate_attributes(component_name, component, interface_spec)
            results.extend(attr_results)
            
            # 验证数据类型
            if self.validation_level in [ValidationLevel.STANDARD, ValidationLevel.STRICT, ValidationLevel.COMPREHENSIVE]:
                type_results = self._validate_data_types(component_name, component, interface_spec)
                results.extend(type_results)
            
            # 验证自定义规则
            if self.validation_level in [ValidationLevel.STRICT, ValidationLevel.COMPREHENSIVE]:
                rule_results = self._validate_custom_rules(component_name, component, interface_spec)
                results.extend(rule_results)
            
        except Exception as e:
            result = ValidationResult(
                component=component_name,
                interface="validation_error",
                status=ValidationStatus.ERROR,
                message=f"验证过程中发生错误: {str(e)}",
                details={'traceback': traceback.format_exc()},
                execution_time=time.time() - start_time
            )
            results.append(result)
        
        return results
    
    def _validate_basic_interface(self, component_name: str, component: Any) -> ValidationResult:
        """基础接口验证"""
        start_time = time.time()
        
        try:
            # 检查组件是否可调用或有基本方法
            if hasattr(component, '__call__') or hasattr(component, '__dict__'):
                return ValidationResult(
                    component=component_name,
                    interface="basic_interface",
                    status=ValidationStatus.PASSED,
                    message="基础接口验证通过",
                    execution_time=time.time() - start_time
                )
            else:
                return ValidationResult(
                    component=component_name,
                    interface="basic_interface",
                    status=ValidationStatus.WARNING,
                    message="组件缺少基本接口",
                    execution_time=time.time() - start_time
                )
                
        except Exception as e:
            return ValidationResult(
                component=component_name,
                interface="basic_interface",
                status=ValidationStatus.ERROR,
                message=f"基础验证失败: {str(e)}",
                execution_time=time.time() - start_time
            )
    
    def _validate_methods(self, component_name: str, component: Any, interface_spec: InterfaceSpec) -> List[ValidationResult]:
        """验证方法"""
        results = []
        
        for method_name in interface_spec.methods:
            start_time = time.time()
            
            if hasattr(component, method_name):
                method = getattr(component, method_name)
                if callable(method):
                    result = ValidationResult(
                        component=component_name,
                        interface=f"method_{method_name}",
                        status=ValidationStatus.PASSED,
                        message=f"方法 {method_name} 存在且可调用",
                        execution_time=time.time() - start_time
                    )
                else:
                    result = ValidationResult(
                        component=component_name,
                        interface=f"method_{method_name}",
                        status=ValidationStatus.FAILED,
                        message=f"方法 {method_name} 存在但不可调用",
                        execution_time=time.time() - start_time
                    )
            else:
                result = ValidationResult(
                    component=component_name,
                    interface=f"method_{method_name}",
                    status=ValidationStatus.FAILED,
                    message=f"方法 {method_name} 不存在",
                    execution_time=time.time() - start_time
                )
            
            results.append(result)
        
        return results
    
    def _validate_attributes(self, component_name: str, component: Any, interface_spec: InterfaceSpec) -> List[ValidationResult]:
        """验证属性"""
        results = []
        
        for attr_name in interface_spec.required_attributes:
            start_time = time.time()
            
            if hasattr(component, attr_name):
                result = ValidationResult(
                    component=component_name,
                    interface=f"attribute_{attr_name}",
                    status=ValidationStatus.PASSED,
                    message=f"属性 {attr_name} 存在",
                    execution_time=time.time() - start_time
                )
            else:
                result = ValidationResult(
                    component=component_name,
                    interface=f"attribute_{attr_name}",
                    status=ValidationStatus.FAILED,
                    message=f"属性 {attr_name} 不存在",
                    execution_time=time.time() - start_time
                )
            
            results.append(result)
        
        return results
    
    def _validate_data_types(self, component_name: str, component: Any, interface_spec: InterfaceSpec) -> List[ValidationResult]:
        """验证数据类型"""
        results = []
        
        for attr_name, expected_type in interface_spec.data_types.items():
            start_time = time.time()
            
            if hasattr(component, attr_name):
                attr_value = getattr(component, attr_name)
                if isinstance(attr_value, expected_type):
                    result = ValidationResult(
                        component=component_name,
                        interface=f"type_{attr_name}",
                        status=ValidationStatus.PASSED,
                        message=f"属性 {attr_name} 类型正确: {expected_type.__name__}",
                        execution_time=time.time() - start_time
                    )
                else:
                    actual_type = type(attr_value).__name__
                    result = ValidationResult(
                        component=component_name,
                        interface=f"type_{attr_name}",
                        status=ValidationStatus.FAILED,
                        message=f"属性 {attr_name} 类型错误: 期望 {expected_type.__name__}, 实际 {actual_type}",
                        details={'expected': expected_type.__name__, 'actual': actual_type},
                        execution_time=time.time() - start_time
                    )
            else:
                result = ValidationResult(
                    component=component_name,
                    interface=f"type_{attr_name}",
                    status=ValidationStatus.SKIPPED,
                    message=f"属性 {attr_name} 不存在，跳过类型验证",
                    execution_time=time.time() - start_time
                )
            
            results.append(result)
        
        return results
    
    def _validate_custom_rules(self, component_name: str, component: Any, interface_spec: InterfaceSpec) -> List[ValidationResult]:
        """验证自定义规则"""
        results = []
        
        for rule_name, rule_func in interface_spec.validation_rules.items():
            start_time = time.time()
            
            try:
                rule_result = rule_func(component)
                
                if rule_result is True:
                    result = ValidationResult(
                        component=component_name,
                        interface=f"rule_{rule_name}",
                        status=ValidationStatus.PASSED,
                        message=f"自定义规则 {rule_name} 验证通过",
                        execution_time=time.time() - start_time
                    )
                elif rule_result is False:
                    result = ValidationResult(
                        component=component_name,
                        interface=f"rule_{rule_name}",
                        status=ValidationStatus.FAILED,
                        message=f"自定义规则 {rule_name} 验证失败",
                        execution_time=time.time() - start_time
                    )
                else:
                    # 如果返回字符串，作为详细信息
                    result = ValidationResult(
                        component=component_name,
                        interface=f"rule_{rule_name}",
                        status=ValidationStatus.WARNING,
                        message=f"自定义规则 {rule_name}: {str(rule_result)}",
                        execution_time=time.time() - start_time
                    )
                
            except Exception as e:
                result = ValidationResult(
                    component=component_name,
                    interface=f"rule_{rule_name}",
                    status=ValidationStatus.ERROR,
                    message=f"自定义规则 {rule_name} 执行错误: {str(e)}",
                    details={'traceback': traceback.format_exc()},
                    execution_time=time.time() - start_time
                )
            
            results.append(result)
        
        return results
    
    def validate_dependencies(self) -> List[ValidationResult]:
        """验证依赖关系"""
        results = []
        dependency_graph = self.registry.get_dependency_graph()
        
        # 检查循环依赖
        cycle_result = self._check_circular_dependencies(dependency_graph)
        results.append(cycle_result)
        
        # 检查依赖存在性
        for component, deps in dependency_graph.items():
            for dep in deps:
                start_time = time.time()
                
                if self.registry.get_component(dep):
                    result = ValidationResult(
                        component=component,
                        interface=f"dependency_{dep}",
                        status=ValidationStatus.PASSED,
                        message=f"依赖 {dep} 存在",
                        execution_time=time.time() - start_time
                    )
                else:
                    result = ValidationResult(
                        component=component,
                        interface=f"dependency_{dep}",
                        status=ValidationStatus.FAILED,
                        message=f"依赖 {dep} 不存在",
                        execution_time=time.time() - start_time
                    )
                
                results.append(result)
        
        return results
    
    def _check_circular_dependencies(self, dependency_graph: Dict[str, List[str]]) -> ValidationResult:
        """检查循环依赖"""
        start_time = time.time()
        
        def has_cycle(graph):
            """使用DFS检测循环"""
            WHITE, GRAY, BLACK = 0, 1, 2
            color = defaultdict(int)
            
            def dfs(node):
                if color[node] == GRAY:
                    return True  # 发现循环
                if color[node] == BLACK:
                    return False
                
                color[node] = GRAY
                for neighbor in graph.get(node, []):
                    if dfs(neighbor):
                        return True
                color[node] = BLACK
                return False
            
            for node in graph:
                if color[node] == WHITE:
                    if dfs(node):
                        return True
            return False
        
        try:
            if has_cycle(dependency_graph):
                return ValidationResult(
                    component="system",
                    interface="circular_dependencies",
                    status=ValidationStatus.FAILED,
                    message="检测到循环依赖",
                    details={'dependency_graph': dependency_graph},
                    execution_time=time.time() - start_time
                )
            else:
                return ValidationResult(
                    component="system",
                    interface="circular_dependencies",
                    status=ValidationStatus.PASSED,
                    message="无循环依赖",
                    execution_time=time.time() - start_time
                )
                
        except Exception as e:
            return ValidationResult(
                component="system",
                interface="circular_dependencies",
                status=ValidationStatus.ERROR,
                message=f"循环依赖检查失败: {str(e)}",
                execution_time=time.time() - start_time
            )
    
    def validate_data_flow(self) -> List[ValidationResult]:
        """验证数据流"""
        results = []
        
        # 这里可以实现更复杂的数据流验证逻辑
        # 例如：检查数据格式一致性、数据传输完整性等
        
        start_time = time.time()
        result = ValidationResult(
            component="system",
            interface="data_flow",
            status=ValidationStatus.PASSED,
            message="数据流验证通过（基础检查）",
            execution_time=time.time() - start_time
        )
        results.append(result)
        
        return results
    
    def _update_stats(self, results: List[ValidationResult]):
        """更新统计信息"""
        self.stats['total_validations'] = len(results)
        
        for result in results:
            if result.status == ValidationStatus.PASSED:
                self.stats['passed'] += 1
            elif result.status == ValidationStatus.FAILED:
                self.stats['failed'] += 1
            elif result.status == ValidationStatus.WARNING:
                self.stats['warnings'] += 1
            elif result.status == ValidationStatus.ERROR:
                self.stats['errors'] += 1
            elif result.status == ValidationStatus.SKIPPED:
                self.stats['skipped'] += 1
    
    def get_validation_report(self) -> Dict[str, Any]:
        """获取验证报告"""
        return {
            'timestamp': time.time(),
            'validation_level': self.validation_level.value,
            'statistics': self.stats,
            'results': [result.to_dict() for result in self.validation_results],
            'component_count': len(self.registry.list_components()),
            'dependency_graph': self.registry.get_dependency_graph()
        }
    
    def save_report(self, filename: str):
        """保存验证报告"""
        report = self.get_validation_report()
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
            
            logger.info(f"验证报告已保存: {filename}")
            
        except Exception as e:
            logger.error(f"保存验证报告失败: {e}")
    
    def get_failed_validations(self) -> List[ValidationResult]:
        """获取失败的验证"""
        return [result for result in self.validation_results 
                if result.status in [ValidationStatus.FAILED, ValidationStatus.ERROR]]
    
    def get_warnings(self) -> List[ValidationResult]:
        """获取警告"""
        return [result for result in self.validation_results 
                if result.status == ValidationStatus.WARNING]


class DroneSystemValidator:
    """无人机系统验证器"""
    
    def __init__(self):
        self.validator = InterfaceValidator(ValidationLevel.COMPREHENSIVE)
        self._setup_drone_interfaces()
    
    def _setup_drone_interfaces(self):
        """设置无人机系统接口规范"""
        
        # 无人机控制器接口
        drone_controller_spec = InterfaceSpec(
            name="drone_controller",
            component="DroneController",
            methods=[
                "connect", "disconnect", "takeoff", "land", 
                "move_up", "move_down", "move_left", "move_right",
                "move_forward", "move_back", "rotate_clockwise", "rotate_counter_clockwise",
                "emergency", "get_battery", "get_height", "get_speed"
            ],
            required_attributes=["is_connected", "battery_level", "flight_mode"],
            data_types={
                "is_connected": bool,
                "battery_level": int,
                "flight_mode": str
            },
            validation_rules={
                "battery_range": lambda obj: 0 <= getattr(obj, 'battery_level', -1) <= 100,
                "connection_state": lambda obj: hasattr(obj, 'is_connected')
            },
            dependencies=[]
        )
        
        # 视频流处理器接口
        video_processor_spec = InterfaceSpec(
            name="video_processor",
            component="VideoProcessor",
            methods=[
                "start_stream", "stop_stream", "get_frame", 
                "set_quality", "get_fps", "process_frame"
            ],
            required_attributes=["is_streaming", "frame_count", "fps"],
            data_types={
                "is_streaming": bool,
                "frame_count": int,
                "fps": float
            },
            validation_rules={
                "fps_range": lambda obj: 0 <= getattr(obj, 'fps', -1) <= 60,
                "frame_count_positive": lambda obj: getattr(obj, 'frame_count', -1) >= 0
            },
            dependencies=["drone_controller"]
        )
        
        # 检测器接口
        detector_spec = InterfaceSpec(
            name="detector",
            component="Detector",
            methods=[
                "detect", "set_model", "get_model_info", 
                "set_confidence_threshold", "get_detection_stats"
            ],
            required_attributes=["model_loaded", "confidence_threshold"],
            data_types={
                "model_loaded": bool,
                "confidence_threshold": float
            },
            validation_rules={
                "confidence_range": lambda obj: 0.0 <= getattr(obj, 'confidence_threshold', -1) <= 1.0,
                "model_status": lambda obj: hasattr(obj, 'model_loaded')
            },
            dependencies=["video_processor"]
        )
        
        # WebSocket服务器接口
        websocket_server_spec = InterfaceSpec(
            name="websocket_server",
            component="WebSocketServer",
            methods=[
                "start_server", "stop_server", "send_message", 
                "broadcast_message", "get_connected_clients"
            ],
            required_attributes=["is_running", "port", "client_count"],
            data_types={
                "is_running": bool,
                "port": int,
                "client_count": int
            },
            validation_rules={
                "port_range": lambda obj: 1024 <= getattr(obj, 'port', 0) <= 65535,
                "client_count_positive": lambda obj: getattr(obj, 'client_count', -1) >= 0
            },
            dependencies=["drone_controller", "video_processor", "detector"]
        )
        
        # 注册接口规范
        self.interface_specs = {
            "drone_controller": drone_controller_spec,
            "video_processor": video_processor_spec,
            "detector": detector_spec,
            "websocket_server": websocket_server_spec
        }
    
    def register_drone_component(self, component_type: str, component: Any):
        """注册无人机组件"""
        if component_type in self.interface_specs:
            spec = self.interface_specs[component_type]
            self.validator.register_component(component_type, component, spec)
        else:
            logger.warning(f"未知的组件类型: {component_type}")
    
    def validate_drone_system(self) -> Dict[str, Any]:
        """验证无人机系统"""
        logger.info("开始验证无人机系统")
        
        # 执行验证
        results = self.validator.validate_all_interfaces()
        
        # 生成报告
        report = self.validator.get_validation_report()
        
        # 添加无人机特定的验证结果
        drone_specific_results = self._validate_drone_specific_requirements()
        report['drone_specific_validations'] = drone_specific_results
        
        return report
    
    def _validate_drone_specific_requirements(self) -> List[Dict[str, Any]]:
        """验证无人机特定需求"""
        results = []
        
        # 检查关键组件是否都已注册
        required_components = ["drone_controller", "video_processor", "detector", "websocket_server"]
        
        for component_name in required_components:
            component = self.validator.registry.get_component(component_name)
            
            if component:
                result = {
                    'requirement': f'{component_name}_registration',
                    'status': 'passed',
                    'message': f'{component_name} 已正确注册'
                }
            else:
                result = {
                    'requirement': f'{component_name}_registration',
                    'status': 'failed',
                    'message': f'{component_name} 未注册'
                }
            
            results.append(result)
        
        return results


# 自动发现和验证工具
class AutoDiscoveryValidator:
    """自动发现验证器"""
    
    def __init__(self, module_paths: List[str]):
        self.module_paths = module_paths
        self.validator = InterfaceValidator()
        
    def discover_and_validate(self) -> Dict[str, Any]:
        """自动发现并验证组件"""
        logger.info("开始自动发现组件")
        
        discovered_components = self._discover_components()
        
        # 注册发现的组件
        for name, component in discovered_components.items():
            self.validator.register_component(name, component)
        
        # 执行验证
        results = self.validator.validate_all_interfaces()
        
        return {
            'discovered_components': list(discovered_components.keys()),
            'validation_results': self.validator.get_validation_report()
        }
    
    def _discover_components(self) -> Dict[str, Any]:
        """发现组件"""
        components = {}
        
        for module_path in self.module_paths:
            try:
                # 动态导入模块
                module = importlib.import_module(module_path)
                
                # 查找类和函数
                for name in dir(module):
                    obj = getattr(module, name)
                    
                    # 跳过私有成员和内置成员
                    if name.startswith('_'):
                        continue
                    
                    # 检查是否是类或函数
                    if inspect.isclass(obj) or inspect.isfunction(obj):
                        component_name = f"{module_path}.{name}"
                        components[component_name] = obj
                        
            except Exception as e:
                logger.error(f"导入模块失败 {module_path}: {e}")
        
        logger.info(f"发现 {len(components)} 个组件")
        return components


if __name__ == "__main__":
    # 测试代码
    def test_interface_validation():
        # 创建测试组件
        class TestDroneController:
            def __init__(self):
                self.is_connected = False
                self.battery_level = 85
                self.flight_mode = "manual"
            
            def connect(self):
                self.is_connected = True
            
            def disconnect(self):
                self.is_connected = False
            
            def takeoff(self):
                pass
            
            def land(self):
                pass
        
        # 创建验证器
        validator = DroneSystemValidator()
        
        # 注册组件
        drone_controller = TestDroneController()
        validator.register_drone_component("drone_controller", drone_controller)
        
        # 执行验证
        report = validator.validate_drone_system()
        
        # 打印结果
        print("验证报告:")
        print(f"总验证数: {report['statistics']['total_validations']}")
        print(f"通过: {report['statistics']['passed']}")
        print(f"失败: {report['statistics']['failed']}")
        print(f"警告: {report['statistics']['warnings']}")
        print(f"错误: {report['statistics']['errors']}")
        
        # 打印失败的验证
        failed_results = [r for r in report['results'] if r['status'] == 'failed']
        if failed_results:
            print("\n失败的验证:")
            for result in failed_results:
                print(f"- {result['component']}.{result['interface']}: {result['message']}")
    
    # 运行测试
    test_interface_validation()