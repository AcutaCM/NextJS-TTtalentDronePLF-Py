#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
多模型Tello无人机检测器
支持YOLOv11多模型部署：成熟度检测 + 病害检测
优化算法确保快速、准确识别
"""

import os
import sys
import cv2
import numpy as np
import json
import time
import threading
from datetime import datetime
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from enum import Enum
import logging

# YOLO导入
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
    print("✅ YOLOv11库加载成功")
except ImportError:
    YOLO_AVAILABLE = False
    print("❌ ultralytics库未安装！请运行: pip install ultralytics")

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ModelType(Enum):
    """模型类型枚举"""
    MATURITY = "maturity"  # 成熟度检测
    DISEASE = "disease"    # 病害检测


class DetectionStatus(Enum):
    """检测状态枚举"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    TRACKING = "tracking"


@dataclass
class Detection:
    """通用检测结果"""
    bbox: Tuple[int, int, int, int]  # x1, y1, x2, y2
    confidence: float
    class_id: int
    class_name: str
    center: Tuple[int, int]
    area: float
    model_type: ModelType
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    track_id: Optional[str] = None
    last_seen: float = field(default_factory=time.time)
    
    # 成熟度特定属性
    maturity_level: Optional[str] = None
    maturity_confidence: Optional[float] = None
    
    # 病害特定属性
    disease_type: Optional[str] = None
    disease_severity: Optional[str] = None
    disease_confidence: Optional[float] = None


@dataclass
class TrackedObject:
    """跟踪对象"""
    track_id: str
    detection: Detection
    first_detected: float
    last_updated: float
    update_count: int = 1
    is_active: bool = True
    status: DetectionStatus = DetectionStatus.ACTIVE


class ModelConfig:
    """模型配置类"""
    
    def __init__(self, model_path: str, model_type: ModelType, 
                 conf_threshold: float = 0.25, iou_threshold: float = 0.45,
                 class_names: Optional[Dict[int, str]] = None):
        self.model_path = model_path
        self.model_type = model_type
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.class_names = class_names or {}
        self.model = None
        self.is_loaded = False
        
    def load_model(self) -> bool:
        """加载模型"""
        try:
            if not os.path.exists(self.model_path):
                logger.error(f"模型文件不存在: {self.model_path}")
                return False
                
            logger.info(f"加载{self.model_type.value}模型: {self.model_path}")
            self.model = YOLO(self.model_path)
            self.is_loaded = True
            logger.info(f"✅ {self.model_type.value}模型加载成功")
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.model_type.value}模型加载失败: {e}")
            return False


class MultiModelDetector:
    """多模型检测器"""
    
    def __init__(self, models_config: Dict[str, str]):
        """
        初始化多模型检测器
        
        Args:
            models_config: 模型配置字典 {"best.pt": "成熟度模型路径", "disease.pt": "病害模型路径"}
        """
        self.models_config = models_config
        self.models: Dict[ModelType, ModelConfig] = {}
        self.tracked_objects: Dict[str, TrackedObject] = {}
        self.detection_history: Dict[str, float] = {}
        
        # 跟踪参数
        self.track_timeout = 2.0  # 跟踪超时时间
        self.distance_threshold = 80  # 距离阈值
        self.next_track_id = 1
        
        # 性能优化参数
        self.detection_interval = 0.1  # 检测间隔
        self.last_detection_time = 0
        self.frame_skip_count = 0
        self.max_frame_skip = 2  # 最大跳帧数
        
        # 线程安全锁
        self.detection_lock = threading.Lock()
        
        self.init_models()
    
    def init_models(self):
        """初始化所有模型"""
        if not YOLO_AVAILABLE:
            logger.error("YOLOv11库不可用")
            return
        
        # 成熟度检测模型配置
        if "best.pt" in self.models_config:
            maturity_config = ModelConfig(
                model_path=self.models_config["best.pt"],
                model_type=ModelType.MATURITY,
                conf_threshold=0.2,
                iou_threshold=0.4,
                class_names={
                    0: "ripe",      # 成熟
                    1: "semi_ripe", # 半成熟
                    2: "unripe"     # 未成熟
                }
            )
            if maturity_config.load_model():
                self.models[ModelType.MATURITY] = maturity_config
        
        # 病害检测模型配置
        if "disease.pt" in self.models_config:
            disease_config = ModelConfig(
                model_path=self.models_config["disease.pt"],
                model_type=ModelType.DISEASE,
                conf_threshold=0.25,
                iou_threshold=0.45,
                class_names={
                    0: "healthy",           # 健康
                    1: "leaf_spot",         # 叶斑病
                    2: "powdery_mildew",    # 白粉病
                    3: "rust",              # 锈病
                    4: "blight",            # 枯萎病
                    5: "mosaic_virus"       # 花叶病毒
                }
            )
            if disease_config.load_model():
                self.models[ModelType.DISEASE] = disease_config
        
        logger.info(f"已加载 {len(self.models)} 个模型")
    
    def detect_multi_model(self, frame: np.ndarray, 
                          enable_maturity: bool = True, 
                          enable_disease: bool = True) -> List[Detection]:
        """
        多模型检测
        
        Args:
            frame: 输入图像
            enable_maturity: 是否启用成熟度检测
            enable_disease: 是否启用病害检测
            
        Returns:
            检测结果列表
        """
        current_time = time.time()
        
        # 性能优化：跳帧检测
        if current_time - self.last_detection_time < self.detection_interval:
            return self.get_active_detections()
        
        self.last_detection_time = current_time
        
        with self.detection_lock:
            all_detections = []
            
            # 成熟度检测
            if enable_maturity and ModelType.MATURITY in self.models:
                maturity_detections = self._detect_with_model(
                    frame, self.models[ModelType.MATURITY]
                )
                all_detections.extend(maturity_detections)
            
            # 病害检测
            if enable_disease and ModelType.DISEASE in self.models:
                disease_detections = self._detect_with_model(
                    frame, self.models[ModelType.DISEASE]
                )
                all_detections.extend(disease_detections)
            
            # 更新跟踪
            self.update_tracking(all_detections, current_time)
            
            # 返回活跃检测结果
            active_detections = self.get_active_detections()
            
            if all_detections:
                logger.info(f"🎯 检测到 {len(all_detections)} 个目标，跟踪 {len(active_detections)} 个")
            
            return active_detections
    
    def _detect_with_model(self, frame: np.ndarray, model_config: ModelConfig) -> List[Detection]:
        """使用指定模型进行检测"""
        detections = []
        
        try:
            if not model_config.is_loaded or model_config.model is None:
                return detections
            
            # YOLO推理
            results = model_config.model(
                frame, 
                conf=model_config.conf_threshold,
                iou=model_config.iou_threshold,
                verbose=False  # 减少日志输出
            )
            
            if results and results[0].boxes is not None:
                boxes = results[0].boxes
                
                for box in boxes:
                    # 提取检测信息
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    confidence = float(box.conf[0])
                    class_id = int(box.cls[0])
                    
                    # 获取类别名称
                    class_name = model_config.class_names.get(class_id, f"class_{class_id}")
                    
                    # 计算中心点和面积
                    center_x = (x1 + x2) // 2
                    center_y = (y1 + y2) // 2
                    area = (x2 - x1) * (y2 - y1)
                    
                    # 创建检测对象
                    detection = Detection(
                        bbox=(x1, y1, x2, y2),
                        confidence=confidence,
                        class_id=class_id,
                        class_name=class_name,
                        center=(center_x, center_y),
                        area=area,
                        model_type=model_config.model_type
                    )
                    
                    # 根据模型类型设置特定属性
                    if model_config.model_type == ModelType.MATURITY:
                        detection.maturity_level = class_name
                        detection.maturity_confidence = confidence
                        
                        # 进一步分析成熟度（基于颜色）
                        roi = frame[y1:y2, x1:x2]
                        refined_maturity = self._analyze_maturity_color(roi)
                        if refined_maturity:
                            detection.maturity_level = refined_maturity[0]
                            detection.maturity_confidence = refined_maturity[1]
                    
                    elif model_config.model_type == ModelType.DISEASE:
                        detection.disease_type = class_name
                        detection.disease_confidence = confidence
                        
                        # 分析病害严重程度
                        severity = self._analyze_disease_severity(confidence, area)
                        detection.disease_severity = severity
                    
                    detections.append(detection)
        
        except Exception as e:
            logger.error(f"❌ {model_config.model_type.value}模型检测错误: {e}")
        
        return detections
    
    def _analyze_maturity_color(self, roi: np.ndarray) -> Optional[Tuple[str, float]]:
        """基于颜色分析成熟度（辅助YOLO检测）"""
        try:
            if roi.size == 0:
                return None
            
            # 转换到HSV色彩空间
            hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
            
            # 定义颜色范围
            color_ranges = {
                'ripe': [(0, 50, 50), (20, 255, 255), (160, 50, 50), (180, 255, 255)],  # 红色
                'semi_ripe': [(20, 50, 50), (40, 255, 255)],  # 橙黄色
                'unripe': [(40, 50, 50), (80, 255, 255)]      # 绿色
            }
            
            max_ratio = 0
            best_maturity = 'unknown'
            
            for maturity, ranges in color_ranges.items():
                total_mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
                
                # 处理多个颜色范围（如红色的两个范围）
                for i in range(0, len(ranges), 2):
                    if i + 1 < len(ranges):
                        mask = cv2.inRange(hsv, ranges[i], ranges[i + 1])
                        total_mask = cv2.bitwise_or(total_mask, mask)
                
                ratio = np.sum(total_mask > 0) / total_mask.size
                
                if ratio > max_ratio:
                    max_ratio = ratio
                    best_maturity = maturity
            
            # 只有当颜色比例足够高时才返回结果
            if max_ratio > 0.1:
                return best_maturity, max_ratio
            
            return None
            
        except Exception as e:
            logger.error(f"颜色分析错误: {e}")
            return None
    
    def _analyze_disease_severity(self, confidence: float, area: float) -> str:
        """分析病害严重程度"""
        # 基于置信度和面积判断严重程度
        if confidence > 0.8 and area > 5000:
            return "severe"     # 严重
        elif confidence > 0.6 and area > 2000:
            return "moderate"   # 中等
        elif confidence > 0.4:
            return "mild"       # 轻微
        else:
            return "suspected"  # 疑似
    
    def update_tracking(self, current_detections: List[Detection], current_time: float):
        """更新目标跟踪"""
        # 标记所有跟踪对象为非活跃
        for tracked in self.tracked_objects.values():
            tracked.is_active = False
        
        # 为当前检测分配跟踪ID
        for detection in current_detections:
            best_match_id = None
            min_distance = float('inf')
            
            # 寻找最佳匹配
            for track_id, tracked in self.tracked_objects.items():
                if (not tracked.is_active and 
                    tracked.detection.model_type == detection.model_type):
                    
                    distance = self._calculate_distance(
                        detection.center, tracked.detection.center
                    )
                    
                    if distance < self.distance_threshold and distance < min_distance:
                        min_distance = distance
                        best_match_id = track_id
            
            if best_match_id:
                # 更新现有跟踪
                tracked = self.tracked_objects[best_match_id]
                tracked.detection = detection
                tracked.last_updated = current_time
                tracked.update_count += 1
                tracked.is_active = True
                tracked.status = DetectionStatus.TRACKING
                detection.track_id = best_match_id
            else:
                # 创建新跟踪
                track_id = f"{detection.model_type.value}_{self.next_track_id}"
                self.next_track_id += 1
                detection.track_id = track_id
                
                tracked_object = TrackedObject(
                    track_id=track_id,
                    detection=detection,
                    first_detected=current_time,
                    last_updated=current_time
                )
                
                self.tracked_objects[track_id] = tracked_object
                logger.info(f"🆕 新目标跟踪: {track_id} ({detection.class_name})")
        
        # 移除超时的跟踪对象
        expired_tracks = []
        for track_id, tracked in self.tracked_objects.items():
            if not tracked.is_active and (current_time - tracked.last_updated) > self.track_timeout:
                expired_tracks.append(track_id)
        
        for track_id in expired_tracks:
            del self.tracked_objects[track_id]
            logger.info(f"⏰ 跟踪超时移除: {track_id}")
    
    def _calculate_distance(self, center1: Tuple[int, int], center2: Tuple[int, int]) -> float:
        """计算两点间距离"""
        return ((center1[0] - center2[0]) ** 2 + (center1[1] - center2[1]) ** 2) ** 0.5
    
    def get_active_detections(self) -> List[Detection]:
        """获取所有活跃的检测结果"""
        active_detections = []
        current_time = time.time()
        
        for tracked in self.tracked_objects.values():
            if (current_time - tracked.last_updated) <= self.track_timeout:
                active_detections.append(tracked.detection)
        
        return active_detections
    
    def draw_detections(self, frame: np.ndarray, detections: List[Detection]) -> np.ndarray:
        """绘制检测结果"""
        result_frame = frame.copy()
        
        # 定义颜色
        colors = {
            ModelType.MATURITY: {
                'ripe': (0, 255, 0),      # 绿色 - 成熟
                'semi_ripe': (0, 255, 255), # 黄色 - 半成熟
                'unripe': (0, 0, 255),    # 红色 - 未成熟
            },
            ModelType.DISEASE: {
                'healthy': (0, 255, 0),        # 绿色 - 健康
                'leaf_spot': (0, 165, 255),    # 橙色 - 叶斑病
                'powdery_mildew': (255, 255, 0), # 青色 - 白粉病
                'rust': (0, 69, 255),          # 红橙色 - 锈病
                'blight': (128, 0, 128),       # 紫色 - 枯萎病
                'mosaic_virus': (255, 0, 255)  # 品红色 - 花叶病毒
            }
        }
        
        drawn_tracks = set()
        
        for detection in detections:
            if detection.track_id in drawn_tracks:
                continue
            
            # 获取颜色
            model_colors = colors.get(detection.model_type, {})
            color = model_colors.get(detection.class_name, (255, 255, 255))
            
            x1, y1, x2, y2 = detection.bbox
            
            # 绘制边界框
            cv2.rectangle(result_frame, (x1, y1), (x2, y2), color, 2)
            
            # 绘制中心点
            cv2.circle(result_frame, detection.center, 3, color, -1)
            
            # 准备标签信息
            labels = []
            
            if detection.track_id:
                labels.append(f"ID: {detection.track_id}")
            
            if detection.model_type == ModelType.MATURITY:
                labels.append(f"成熟度: {detection.maturity_level}")
                if detection.maturity_confidence:
                    labels.append(f"置信度: {detection.maturity_confidence:.2f}")
            
            elif detection.model_type == ModelType.DISEASE:
                labels.append(f"病害: {detection.disease_type}")
                if detection.disease_severity:
                    labels.append(f"严重程度: {detection.disease_severity}")
                if detection.disease_confidence:
                    labels.append(f"置信度: {detection.disease_confidence:.2f}")
            
            # 绘制标签
            y_offset = y1 - 10
            for i, label in enumerate(labels):
                label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
                
                # 绘制标签背景
                cv2.rectangle(result_frame,
                             (x1, y_offset - label_size[1] - 5),
                             (x1 + label_size[0] + 10, y_offset + 5),
                             color, -1)
                
                # 绘制标签文字
                cv2.putText(result_frame, label, (x1 + 5, y_offset),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                
                y_offset -= (label_size[1] + 10)
            
            drawn_tracks.add(detection.track_id)
        
        return result_frame
    
    def get_detection_summary(self, detections: List[Detection]) -> Dict[str, Any]:
        """获取检测摘要统计"""
        summary = {
            'total_count': len(detections),
            'maturity_analysis': {
                'total': 0,
                'ripe': 0,
                'semi_ripe': 0,
                'unripe': 0
            },
            'disease_analysis': {
                'total': 0,
                'healthy': 0,
                'diseased': 0,
                'diseases': {}
            },
            'timestamp': datetime.now().isoformat()
        }
        
        for detection in detections:
            if detection.model_type == ModelType.MATURITY:
                summary['maturity_analysis']['total'] += 1
                maturity = detection.maturity_level
                if maturity in summary['maturity_analysis']:
                    summary['maturity_analysis'][maturity] += 1
            
            elif detection.model_type == ModelType.DISEASE:
                summary['disease_analysis']['total'] += 1
                disease = detection.disease_type
                
                if disease == 'healthy':
                    summary['disease_analysis']['healthy'] += 1
                else:
                    summary['disease_analysis']['diseased'] += 1
                    if disease not in summary['disease_analysis']['diseases']:
                        summary['disease_analysis']['diseases'][disease] = 0
                    summary['disease_analysis']['diseases'][disease] += 1
        
        return summary
    
    def clear_tracking(self):
        """清空跟踪数据"""
        self.tracked_objects.clear()
        self.detection_history.clear()
        self.next_track_id = 1
        logger.info("🧹 跟踪数据已清空")
    
    def get_model_status(self) -> Dict[str, bool]:
        """获取模型状态"""
        return {
            'maturity_model': ModelType.MATURITY in self.models and self.models[ModelType.MATURITY].is_loaded,
            'disease_model': ModelType.DISEASE in self.models and self.models[ModelType.DISEASE].is_loaded,
            'yolo_available': YOLO_AVAILABLE
        }
    
    def set_detection_parameters(self, 
                               detection_interval: float = None,
                               track_timeout: float = None,
                               distance_threshold: float = None):
        """设置检测参数"""
        if detection_interval is not None:
            self.detection_interval = detection_interval
        if track_timeout is not None:
            self.track_timeout = track_timeout
        if distance_threshold is not None:
            self.distance_threshold = distance_threshold
        
        logger.info(f"检测参数已更新: interval={self.detection_interval}, timeout={self.track_timeout}, threshold={self.distance_threshold}")


# 使用示例和测试
if __name__ == "__main__":
    # 模型配置
    models_config = {
        "best.pt": "models/best.pt",      # 成熟度检测模型
        "disease.pt": "models/disease.pt"  # 病害检测模型
    }
    
    # 创建多模型检测器
    detector = MultiModelDetector(models_config)
    
    # 检查模型状态
    status = detector.get_model_status()
    print(f"模型状态: {status}")
    
    if status['maturity_model'] or status['disease_model']:
        print("✅ 多模型检测器初始化成功")
        
        # 创建测试图像
        test_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.circle(test_frame, (320, 240), 50, (0, 150, 0), -1)
        
        # 执行检测
        detections = detector.detect_multi_model(test_frame)
        print(f"检测结果: {len(detections)} 个目标")
        
        # 获取摘要
        summary = detector.get_detection_summary(detections)
        print(f"检测摘要: {summary}")
        
    else:
        print("❌ 没有可用的模型")