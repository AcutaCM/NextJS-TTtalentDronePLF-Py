#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
增强版多模型检测器
优化算法效率、内存管理和检测性能
"""

import os
import json
import time
import threading
import numpy as np
from datetime import datetime
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any, Union
from enum import Enum
import logging
from collections import deque, defaultdict
import weakref
import gc

# 配置日志
logger = logging.getLogger(__name__)

# YOLO导入检查
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
    logger.info("✅ YOLO库加载成功")
except ImportError as e:
    YOLO_AVAILABLE = False
    logger.error(f"✗ YOLO库导入失败: {e}")

# OpenCV导入检查
try:
    import cv2
    CV2_AVAILABLE = True
    logger.info("✅ OpenCV库加载成功")
except ImportError:
    CV2_AVAILABLE = False
    logger.error("✗ OpenCV库未安装！")


class ModelType(Enum):
    """模型类型枚举"""
    MATURITY = "maturity"
    DISEASE = "disease"
    GENERAL = "general"


class DetectionStatus(Enum):
    """检测状态枚举"""
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"
    CACHED = "cached"


@dataclass
class Detection:
    """检测结果数据类"""
    bbox: List[float]  # [x1, y1, x2, y2]
    confidence: float
    class_name: str
    model_type: ModelType
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    track_id: Optional[int] = None
    additional_info: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TrackedObject:
    """跟踪对象数据类"""
    track_id: int
    detections: deque = field(default_factory=lambda: deque(maxlen=10))
    last_seen: float = field(default_factory=time.time)
    confidence_history: deque = field(default_factory=lambda: deque(maxlen=5))
    position_history: deque = field(default_factory=lambda: deque(maxlen=5))
    stable_count: int = 0
    
    def update(self, detection: Detection):
        """更新跟踪对象"""
        self.detections.append(detection)
        self.last_seen = time.time()
        self.confidence_history.append(detection.confidence)
        
        # 计算中心点
        bbox = detection.bbox
        center = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
        self.position_history.append(center)
        
        # 更新稳定计数
        if len(self.confidence_history) >= 3:
            recent_confidences = list(self.confidence_history)[-3:]
            if all(c > 0.7 for c in recent_confidences):
                self.stable_count += 1
            else:
                self.stable_count = max(0, self.stable_count - 1)
    
    @property
    def is_stable(self) -> bool:
        """判断对象是否稳定"""
        return self.stable_count >= 3
    
    @property
    def avg_confidence(self) -> float:
        """平均置信度"""
        if not self.confidence_history:
            return 0.0
        return sum(self.confidence_history) / len(self.confidence_history)


class ModelConfig:
    """模型配置类"""
    
    def __init__(self, model_path: str, model_type: ModelType):
        self.model_path = model_path
        self.model_type = model_type
        self.model = None
        self.is_loaded = False
        self.load_time = 0
        self.inference_count = 0
        self.total_inference_time = 0
        
        # 性能优化参数
        self.confidence_threshold = 0.5
        self.iou_threshold = 0.45
        self.max_detections = 100
        self.input_size = (640, 640)
        
        # 缓存设置
        self.enable_cache = True
        self.cache_size = 50
        self.result_cache = {}
        
    def load_model(self) -> bool:
        """加载模型"""
        try:
            if not YOLO_AVAILABLE:
                logger.error("YOLO库不可用，无法加载模型")
                return False
            
            if not os.path.exists(self.model_path):
                logger.error(f"模型文件不存在: {self.model_path}")
                return False
            
            start_time = time.time()
            self.model = YOLO(self.model_path)
            
            # 预热模型
            dummy_input = np.zeros((640, 640, 3), dtype=np.uint8)
            _ = self.model(dummy_input, verbose=False)
            
            self.load_time = time.time() - start_time
            self.is_loaded = True
            
            logger.info(f"✅ 模型加载成功: {os.path.basename(self.model_path)} ({self.load_time:.2f}s)")
            return True
            
        except Exception as e:
            logger.error(f"❌ 模型加载失败 {self.model_path}: {e}")
            return False
    
    def predict(self, image: np.ndarray, enable_cache: bool = True) -> List[Detection]:
        """执行预测"""
        if not self.is_loaded or self.model is None:
            return []
        
        try:
            # 缓存检查
            if enable_cache and self.enable_cache:
                cache_key = self._generate_cache_key(image)
                if cache_key in self.result_cache:
                    return self.result_cache[cache_key]
            
            start_time = time.time()
            
            # 执行推理
            results = self.model(
                image,
                conf=self.confidence_threshold,
                iou=self.iou_threshold,
                max_det=self.max_detections,
                verbose=False
            )
            
            inference_time = time.time() - start_time
            self.inference_count += 1
            self.total_inference_time += inference_time
            
            # 解析结果
            detections = self._parse_results(results)
            
            # 缓存结果
            if enable_cache and self.enable_cache and len(self.result_cache) < self.cache_size:
                self.result_cache[cache_key] = detections
            
            return detections
            
        except Exception as e:
            logger.error(f"模型预测失败: {e}")
            return []
    
    def _generate_cache_key(self, image: np.ndarray) -> str:
        """生成缓存键"""
        # 使用图像的简单哈希作为缓存键
        return str(hash(image.tobytes()))
    
    def _parse_results(self, results) -> List[Detection]:
        """解析YOLO结果"""
        detections = []
        
        try:
            for result in results:
                if result.boxes is not None:
                    boxes = result.boxes.xyxy.cpu().numpy()
                    confidences = result.boxes.conf.cpu().numpy()
                    classes = result.boxes.cls.cpu().numpy()
                    
                    for i in range(len(boxes)):
                        bbox = boxes[i].tolist()
                        confidence = float(confidences[i])
                        class_id = int(classes[i])
                        
                        # 获取类名
                        class_name = result.names.get(class_id, f"class_{class_id}")
                        
                        detection = Detection(
                            bbox=bbox,
                            confidence=confidence,
                            class_name=class_name,
                            model_type=self.model_type
                        )
                        detections.append(detection)
            
        except Exception as e:
            logger.error(f"结果解析失败: {e}")
        
        return detections
    
    def clear_cache(self):
        """清空缓存"""
        self.result_cache.clear()
    
    @property
    def avg_inference_time(self) -> float:
        """平均推理时间"""
        if self.inference_count == 0:
            return 0.0
        return self.total_inference_time / self.inference_count


class EnhancedMultiModelDetector:
    """增强版多模型检测器"""
    
    def __init__(self, models_config: Dict[str, str]):
        """
        初始化多模型检测器
        
        Args:
            models_config: 模型配置字典 {model_name: model_path}
        """
        self.models: Dict[str, ModelConfig] = {}
        self.tracking_objects: Dict[int, TrackedObject] = {}
        self.next_track_id = 1
        
        # 性能优化参数
        self.detection_interval = 0.1  # 检测间隔
        self.track_timeout = 3.0  # 跟踪超时
        self.distance_threshold = 50  # 距离阈值
        self.max_frame_skip = 5  # 最大跳帧数
        self.frame_skip_counter = 0
        
        # 统计信息
        self.performance_stats = {
            'total_detections': 0,
            'successful_detections': 0,
            'failed_detections': 0,
            'cached_detections': 0,
            'avg_processing_time': 0,
            'memory_usage': 0
        }
        
        # 线程安全锁
        self.lock = threading.RLock()
        
        # 初始化模型
        self._initialize_models(models_config)
        
        # 启动清理线程
        self._start_cleanup_thread()
    
    def _initialize_models(self, models_config: Dict[str, str]):
        """初始化模型"""
        logger.info("🔧 初始化增强版多模型检测器...")
        
        model_type_mapping = {
            'best.pt': ModelType.GENERAL,
            'strawberry_yolov11.pt': ModelType.MATURITY,
            'disease_model.pt': ModelType.DISEASE
        }
        
        for model_name, model_path in models_config.items():
            try:
                # 确定模型类型
                model_type = ModelType.GENERAL
                for key, mtype in model_type_mapping.items():
                    if key in model_name:
                        model_type = mtype
                        break
                
                # 创建模型配置
                config = ModelConfig(model_path, model_type)
                
                # 加载模型
                if config.load_model():
                    self.models[model_name] = config
                    logger.info(f"✅ 模型 {model_name} 初始化成功")
                else:
                    logger.warning(f"⚠️ 模型 {model_name} 初始化失败")
                    
            except Exception as e:
                logger.error(f"❌ 模型 {model_name} 初始化异常: {e}")
        
        logger.info(f"🎯 成功加载 {len(self.models)} 个模型")
    
    def _start_cleanup_thread(self):
        """启动清理线程"""
        def cleanup_worker():
            while True:
                try:
                    self._cleanup_expired_tracks()
                    self._cleanup_model_caches()
                    time.sleep(5.0)  # 每5秒清理一次
                except Exception as e:
                    logger.error(f"清理线程错误: {e}")
        
        cleanup_thread = threading.Thread(
            target=cleanup_worker,
            daemon=True,
            name="ModelCleanupThread"
        )
        cleanup_thread.start()
    
    def _cleanup_expired_tracks(self):
        """清理过期的跟踪对象"""
        with self.lock:
            current_time = time.time()
            expired_ids = []
            
            for track_id, tracked_obj in self.tracking_objects.items():
                if current_time - tracked_obj.last_seen > self.track_timeout:
                    expired_ids.append(track_id)
            
            for track_id in expired_ids:
                del self.tracking_objects[track_id]
            
            if expired_ids:
                logger.debug(f"清理了 {len(expired_ids)} 个过期跟踪对象")
    
    def _cleanup_model_caches(self):
        """清理模型缓存"""
        for model_config in self.models.values():
            if len(model_config.result_cache) > model_config.cache_size:
                # 清理一半的缓存
                items_to_remove = len(model_config.result_cache) // 2
                keys_to_remove = list(model_config.result_cache.keys())[:items_to_remove]
                
                for key in keys_to_remove:
                    model_config.result_cache.pop(key, None)
    
    def set_detection_parameters(self, **kwargs):
        """设置检测参数"""
        with self.lock:
            if 'detection_interval' in kwargs:
                self.detection_interval = kwargs['detection_interval']
            if 'track_timeout' in kwargs:
                self.track_timeout = kwargs['track_timeout']
            if 'distance_threshold' in kwargs:
                self.distance_threshold = kwargs['distance_threshold']
            if 'max_frame_skip' in kwargs:
                self.max_frame_skip = kwargs['max_frame_skip']
            
            logger.info(f"检测参数已更新: {kwargs}")
    
    def detect_multi_model(self, 
                          image: np.ndarray, 
                          enable_maturity: bool = True,
                          enable_disease: bool = True,
                          enable_tracking: bool = True,
                          force_detection: bool = False) -> List[Detection]:
        """
        多模型检测
        
        Args:
            image: 输入图像
            enable_maturity: 启用成熟度检测
            enable_disease: 启用病害检测
            enable_tracking: 启用目标跟踪
            force_detection: 强制检测（忽略跳帧）
            
        Returns:
            检测结果列表
        """
        start_time = time.time()
        
        try:
            with self.lock:
                # 智能跳帧
                if not force_detection:
                    self.frame_skip_counter += 1
                    if self.frame_skip_counter < self.max_frame_skip:
                        self.performance_stats['total_detections'] += 1
                        return self._get_cached_detections()
                    self.frame_skip_counter = 0
                
                # 执行检测
                all_detections = []
                
                # 成熟度检测
                if enable_maturity:
                    maturity_detections = self._detect_with_model_type(image, ModelType.MATURITY)
                    all_detections.extend(maturity_detections)
                
                # 病害检测
                if enable_disease:
                    disease_detections = self._detect_with_model_type(image, ModelType.DISEASE)
                    all_detections.extend(disease_detections)
                
                # 通用检测
                general_detections = self._detect_with_model_type(image, ModelType.GENERAL)
                all_detections.extend(general_detections)
                
                # 非最大抑制
                filtered_detections = self._apply_nms(all_detections)
                
                # 目标跟踪
                if enable_tracking:
                    tracked_detections = self._update_tracking(filtered_detections)
                else:
                    tracked_detections = filtered_detections
                
                # 更新统计
                processing_time = time.time() - start_time
                self._update_performance_stats(len(tracked_detections), processing_time, True)
                
                return tracked_detections
                
        except Exception as e:
            logger.error(f"多模型检测失败: {e}")
            self._update_performance_stats(0, time.time() - start_time, False)
            return []
    
    def _detect_with_model_type(self, image: np.ndarray, model_type: ModelType) -> List[Detection]:
        """使用指定类型的模型进行检测"""
        detections = []
        
        for model_name, model_config in self.models.items():
            if model_config.model_type == model_type:
                model_detections = model_config.predict(image)
                detections.extend(model_detections)
        
        return detections
    
    def _apply_nms(self, detections: List[Detection], iou_threshold: float = 0.5) -> List[Detection]:
        """应用非最大抑制"""
        if not detections:
            return []
        
        try:
            # 按置信度排序
            detections.sort(key=lambda x: x.confidence, reverse=True)
            
            # 简单的NMS实现
            filtered_detections = []
            
            for detection in detections:
                should_keep = True
                
                for kept_detection in filtered_detections:
                    iou = self._calculate_iou(detection.bbox, kept_detection.bbox)
                    if iou > iou_threshold:
                        should_keep = False
                        break
                
                if should_keep:
                    filtered_detections.append(detection)
            
            return filtered_detections
            
        except Exception as e:
            logger.error(f"NMS处理失败: {e}")
            return detections
    
    def _calculate_iou(self, bbox1: List[float], bbox2: List[float]) -> float:
        """计算IoU"""
        try:
            x1_1, y1_1, x2_1, y2_1 = bbox1
            x1_2, y1_2, x2_2, y2_2 = bbox2
            
            # 计算交集
            x1_inter = max(x1_1, x1_2)
            y1_inter = max(y1_1, y1_2)
            x2_inter = min(x2_1, x2_2)
            y2_inter = min(y2_1, y2_2)
            
            if x2_inter <= x1_inter or y2_inter <= y1_inter:
                return 0.0
            
            inter_area = (x2_inter - x1_inter) * (y2_inter - y1_inter)
            
            # 计算并集
            area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
            area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
            union_area = area1 + area2 - inter_area
            
            return inter_area / union_area if union_area > 0 else 0.0
            
        except Exception:
            return 0.0
    
    def _update_tracking(self, detections: List[Detection]) -> List[Detection]:
        """更新目标跟踪"""
        try:
            # 匹配检测结果与现有跟踪对象
            matched_detections = []
            unmatched_detections = detections.copy()
            
            for detection in detections:
                best_match_id = None
                best_distance = float('inf')
                
                detection_center = [
                    (detection.bbox[0] + detection.bbox[2]) / 2,
                    (detection.bbox[1] + detection.bbox[3]) / 2
                ]
                
                for track_id, tracked_obj in self.tracking_objects.items():
                    if tracked_obj.position_history:
                        last_position = tracked_obj.position_history[-1]
                        distance = np.sqrt(
                            (detection_center[0] - last_position[0]) ** 2 +
                            (detection_center[1] - last_position[1]) ** 2
                        )
                        
                        if distance < self.distance_threshold and distance < best_distance:
                            best_distance = distance
                            best_match_id = track_id
                
                if best_match_id is not None:
                    # 更新现有跟踪对象
                    detection.track_id = best_match_id
                    self.tracking_objects[best_match_id].update(detection)
                    matched_detections.append(detection)
                    unmatched_detections.remove(detection)
            
            # 为未匹配的检测创建新的跟踪对象
            for detection in unmatched_detections:
                track_id = self.next_track_id
                self.next_track_id += 1
                
                detection.track_id = track_id
                tracked_obj = TrackedObject(track_id=track_id)
                tracked_obj.update(detection)
                self.tracking_objects[track_id] = tracked_obj
                matched_detections.append(detection)
            
            return matched_detections
            
        except Exception as e:
            logger.error(f"跟踪更新失败: {e}")
            return detections
    
    def _get_cached_detections(self) -> List[Detection]:
        """获取缓存的检测结果"""
        cached_detections = []
        
        try:
            current_time = time.time()
            
            for tracked_obj in self.tracking_objects.values():
                if (current_time - tracked_obj.last_seen < 0.5 and 
                    tracked_obj.detections and 
                    tracked_obj.is_stable):
                    
                    # 使用最新的检测结果
                    latest_detection = tracked_obj.detections[-1]
                    cached_detections.append(latest_detection)
            
            if cached_detections:
                self.performance_stats['cached_detections'] += len(cached_detections)
            
        except Exception as e:
            logger.error(f"获取缓存检测失败: {e}")
        
        return cached_detections
    
    def _update_performance_stats(self, detection_count: int, processing_time: float, success: bool):
        """更新性能统计"""
        self.performance_stats['total_detections'] += 1
        
        if success:
            self.performance_stats['successful_detections'] += 1
        else:
            self.performance_stats['failed_detections'] += 1
        
        # 更新平均处理时间
        total_successful = self.performance_stats['successful_detections']
        if total_successful > 0:
            current_avg = self.performance_stats['avg_processing_time']
            self.performance_stats['avg_processing_time'] = (
                (current_avg * (total_successful - 1) + processing_time) / total_successful
            )
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """获取性能统计"""
        with self.lock:
            stats = self.performance_stats.copy()
            
            # 添加模型统计
            model_stats = {}
            for model_name, model_config in self.models.items():
                model_stats[model_name] = {
                    'inference_count': model_config.inference_count,
                    'avg_inference_time': model_config.avg_inference_time,
                    'cache_size': len(model_config.result_cache),
                    'is_loaded': model_config.is_loaded
                }
            
            stats['models'] = model_stats
            stats['active_tracks'] = len(self.tracking_objects)
            
            return stats
    
    def clear_all_caches(self):
        """清空所有缓存"""
        with self.lock:
            for model_config in self.models.values():
                model_config.clear_cache()
            
            self.tracking_objects.clear()
            self.next_track_id = 1
            
            logger.info("所有缓存已清空")
    
    def optimize_memory(self):
        """优化内存使用"""
        try:
            # 清理过期跟踪
            self._cleanup_expired_tracks()
            
            # 清理模型缓存
            self._cleanup_model_caches()
            
            # 强制垃圾回收
            gc.collect()
            
            logger.info("内存优化完成")
            
        except Exception as e:
            logger.error(f"内存优化失败: {e}")
    
    def get_model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        model_info = {}
        
        for model_name, model_config in self.models.items():
            model_info[model_name] = {
                'model_path': model_config.model_path,
                'model_type': model_config.model_type.value,
                'is_loaded': model_config.is_loaded,
                'load_time': model_config.load_time,
                'inference_count': model_config.inference_count,
                'avg_inference_time': model_config.avg_inference_time,
                'confidence_threshold': model_config.confidence_threshold,
                'iou_threshold': model_config.iou_threshold,
                'cache_enabled': model_config.enable_cache,
                'cache_size': len(model_config.result_cache)
            }
        
        return model_info


# 向后兼容的别名
MultiModelDetector = EnhancedMultiModelDetector


if __name__ == "__main__":
    # 测试代码
    models_config = {
        "best.pt": "models/best.pt",
        "strawberry_yolov11.pt": "models/strawberry_yolov11.pt"
    }
    
    detector = EnhancedMultiModelDetector(models_config)
    
    # 打印模型信息
    model_info = detector.get_model_info()
    print("模型信息:")
    for name, info in model_info.items():
        print(f"  {name}: {info}")
    
    # 打印性能统计
    stats = detector.get_performance_stats()
    print(f"\n性能统计: {stats}")