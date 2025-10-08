#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
草莓成熟度分析器
使用YOLOv11模型检测草莓并分析成熟度
"""

import os
import sys
import cv2
import numpy as np
import json
import time
from datetime import datetime
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple

# YOLO导入
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
    print("✅ YOLOv11库加载成功")
except ImportError:
    YOLO_AVAILABLE = False
    print("❌ ultralytics库未安装！请运行: pip install ultralytics")


@dataclass
class StrawberryDetection:
    """草莓检测结果"""
    bbox: Tuple[int, int, int, int]  # x1, y1, x2, y2
    confidence: float
    maturity_level: str  # 'ripe', 'semi_ripe', 'unripe'
    maturity_confidence: float
    center: Tuple[int, int]
    area: float
    timestamp: str = None
    track_id: str = None  # 跟踪ID
    last_seen: float = None  # 最后检测到的时间
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()
        if self.last_seen is None:
            self.last_seen = time.time()


@dataclass
class TrackedStrawberry:
    """跟踪的草莓对象"""
    track_id: str
    detection: StrawberryDetection
    first_detected: float
    last_updated: float
    update_count: int = 1
    is_active: bool = True


class StrawberryMaturityAnalyzer:
    """草莓成熟度分析器"""
    
    def __init__(self, model_path):
        self.model_path = model_path
        self.model = None
        self.tracked_strawberries = {}  # 跟踪的草莓字典 {track_id: TrackedStrawberry}
        self.detection_history = {}  # 草莓检测历史（保留兼容性）
        self.track_timeout = 2.0  # 2.0秒未检测到则认为草莓消失，减少闪烁
        self.distance_threshold = 60  # 像素距离阈值，减少重复检测
        self.next_track_id = 1  # 下一个跟踪ID
        
        # 成熟度颜色阈值（HSV色彩空间）- 修复成熟度识别
        self.maturity_thresholds = {
            'ripe': {
                'hue_ranges': [(0, 20), (155, 180)],  # 红色范围（进一步扩大）
                'saturation_min': 20,  # 进一步降低饱和度要求
                'value_min': 20,       # 进一步降低亮度要求
                'confidence_threshold': 0.02  # 降低置信度阈值
            },
            'semi_ripe': {
                'hue_ranges': [(20, 40)],  # 橙黄色范围
                'saturation_min': 15,  # 降低饱和度要求
                'value_min': 15,       # 降低亮度要求
                'confidence_threshold': 0.015  # 降低置信度阈值
            },
            'unripe': {
                'hue_ranges': [(40, 90)],  # 绿色范围
                'saturation_min': 15,  # 降低饱和度要求
                'value_min': 15,       # 降低亮度要求
                'confidence_threshold': 0.015  # 降低置信度阈值
            }
        }
        
        self.init_model()
    
    def init_model(self):
        """初始化YOLO模型"""
        try:
            if not YOLO_AVAILABLE:
                print("❌ YOLO库不可用")
                return False
            
            if not os.path.exists(self.model_path):
                print(f"❌ 模型文件不存在: {self.model_path}")
                return False
            
            print(f"🤖 加载草莓检测模型: {self.model_path}")
            self.model = YOLO(self.model_path)
            print("✅ 草莓检测模型加载成功")
            return True
            
        except Exception as e:
            print(f"❌ 模型加载失败: {e}")
            return False
    
    def detect_strawberries(self, frame, qr_id=None) -> List[StrawberryDetection]:
        """检测草莓并分析成熟度（支持持续跟踪）"""
        if self.model is None:
            return []
        
        current_time = time.time()
        current_detections = []
        
        try:
            # YOLO检测（进一步降低置信度，确保能检测到草莓）
            results = self.model(frame, conf=0.15, iou=0.4)
            
            if results and results[0].boxes:
                boxes = results[0].boxes
                
                for i, box in enumerate(boxes):
                    # 获取边界框和置信度
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    confidence = float(box.conf[0])
                    
                    # 计算中心点和面积
                    center_x = (x1 + x2) // 2
                    center_y = (y1 + y2) // 2
                    area = (x2 - x1) * (y2 - y1)
                    
                    # 提取草莓区域进行成熟度分析
                    strawberry_roi = frame[y1:y2, x1:x2]
                    maturity_level, maturity_confidence = self.analyze_maturity(strawberry_roi)
                    
                    # 输出所有检测的调试信息
                    if confidence > 0.2:
                        print(f"🔍 草莓 {i+1}: 成熟度={maturity_level}, 置信度={maturity_confidence:.3f}")
                    
                    # 创建检测结果
                    detection = StrawberryDetection(
                        bbox=(x1, y1, x2, y2),
                        confidence=confidence,
                        maturity_level=maturity_level,
                        maturity_confidence=maturity_confidence,
                        center=(center_x, center_y),
                        area=area,
                        last_seen=current_time
                    )
                    
                    current_detections.append(detection)
            
            # 更新跟踪状态
            self.update_tracking(current_detections, current_time)
            
            # 返回所有活跃的草莓（包括当前检测到的和之前跟踪的）
            active_detections = self.get_active_detections()
            
            if current_detections:
                print(f"🍓 当前帧检测到 {len(current_detections)} 个草莓，总跟踪 {len(active_detections)} 个")
        
        except Exception as e:
            print(f"❌ 草莓检测错误: {e}")
            # 即使检测失败，也返回之前跟踪的草莓
            active_detections = self.get_active_detections()
        
        return active_detections
    
    def analyze_maturity(self, roi) -> Tuple[str, float]:
        """分析草莓成熟度（改进的算法）"""
        try:
            if roi.size == 0:
                return 'unknown', 0.0
            
            # 转换到HSV色彩空间
            hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
            
            # 计算各成熟度等级的匹配度
            maturity_scores = {}
            
            for maturity, thresholds in self.maturity_thresholds.items():
                hue_ranges = thresholds['hue_ranges']
                sat_min = thresholds['saturation_min']
                val_min = thresholds['value_min']
                
                # 为每个色调范围创建掩码
                combined_mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
                
                for hue_min, hue_max in hue_ranges:
                    mask = cv2.inRange(hsv, 
                                     (hue_min, sat_min, val_min), 
                                     (hue_max, 255, 255))
                    combined_mask = cv2.bitwise_or(combined_mask, mask)
                
                # 计算匹配像素比例
                pixel_ratio = np.sum(combined_mask > 0) / combined_mask.size
                maturity_scores[maturity] = pixel_ratio
            
            # 调试信息：显示所有成熟度得分
            print(f"  🎯 成熟度得分: ripe={maturity_scores.get('ripe', 0):.3f}, semi_ripe={maturity_scores.get('semi_ripe', 0):.3f}, unripe={maturity_scores.get('unripe', 0):.3f}")
            
            # 修复的成熟度判断逻辑（优先识别成熟草莓）
            ripe_score = maturity_scores.get('ripe', 0)
            semi_ripe_score = maturity_scores.get('semi_ripe', 0)
            unripe_score = maturity_scores.get('unripe', 0)
            
            # 设置更低的最低分数阈值，特别是成熟草莓
            min_scores = {
                'ripe': 0.01,      # 大幅降低成熟草莓阈值
                'semi_ripe': 0.015,
                'unripe': 0.02
            }
            
            # 优先判断成熟度，并给成熟草莓更高的优先级
            max_score = max(ripe_score, semi_ripe_score, unripe_score)
            
            # 如果成熟度得分达到最低要求，优先选择成熟
            if ripe_score >= min_scores['ripe'] and ripe_score >= max_score * 0.7:  # 成熟得分占主导
                print(f"  ✅ 检测到成熟草莓: ripe={ripe_score:.3f}")
                return 'ripe', ripe_score
            elif semi_ripe_score >= min_scores['semi_ripe'] and semi_ripe_score == max_score:
                print(f"  🟡 检测到半成熟草莓: semi_ripe={semi_ripe_score:.3f}")
                return 'semi_ripe', semi_ripe_score
            elif unripe_score >= min_scores['unripe'] and unripe_score == max_score:
                print(f"  🟢 检测到未成熟草莓: unripe={unripe_score:.3f}")
                return 'unripe', unripe_score
            else:
                # 如果所有得分都很低，选择最高得分的
                if max_score < 0.005:  # 进一步降低unknown阈值
                    print(f"  ⚠️ 所有得分都很低，标记为unknown")
                    return 'unknown', max_score
                else:
                    if max_score == ripe_score:
                        maturity = 'ripe'
                    elif max_score == semi_ripe_score:
                        maturity = 'semi_ripe'
                    else:
                        maturity = 'unripe'
                    print(f"  📏 相对最佳匹配: {maturity}={max_score:.3f}")
                    return maturity, max_score
            
        except Exception as e:
            print(f"❌ 成熟度分析错误: {e}")
            return 'unknown', 0.0
    
    def update_tracking(self, current_detections: List[StrawberryDetection], current_time: float):
        """更新草莓跟踪状态"""
        # 标记所有跟踪的草莓为未更新
        for tracked in self.tracked_strawberries.values():
            tracked.is_active = False
        
        # 为当前检测到的草莓分配跟踪ID
        for detection in current_detections:
            best_match_id = None
            min_distance = float('inf')
            
            # 寻找最佳匹配的已跟踪草莓
            for track_id, tracked in self.tracked_strawberries.items():
                if not tracked.is_active:  # 只考虑未更新的草莓
                    distance = self.calculate_distance(detection.center, tracked.detection.center)
                    if distance < self.distance_threshold and distance < min_distance:
                        min_distance = distance
                        best_match_id = track_id
            
            if best_match_id:
                # 更新已存在的跟踪
                tracked = self.tracked_strawberries[best_match_id]
                tracked.detection = detection
                tracked.last_updated = current_time
                tracked.update_count += 1
                tracked.is_active = True
                detection.track_id = best_match_id
            else:
                # 创建新的跟踪
                track_id = f"strawberry_{self.next_track_id}"
                self.next_track_id += 1
                detection.track_id = track_id
                
                tracked_strawberry = TrackedStrawberry(
                    track_id=track_id,
                    detection=detection,
                    first_detected=current_time,
                    last_updated=current_time
                )
                
                self.tracked_strawberries[track_id] = tracked_strawberry
                print(f"🆕 新草莓跟踪: {track_id} 成熟度={detection.maturity_level}")
        
        # 移除超时的草莓
        expired_tracks = []
        for track_id, tracked in self.tracked_strawberries.items():
            if not tracked.is_active and (current_time - tracked.last_updated) > self.track_timeout:
                expired_tracks.append(track_id)
        
        for track_id in expired_tracks:
            del self.tracked_strawberries[track_id]
            print(f"⏰ 草莓跟踪超时移除: {track_id}")
    
    def calculate_distance(self, center1: Tuple[int, int], center2: Tuple[int, int]) -> float:
        """计算两个中心点之间的欧几里得距离"""
        return ((center1[0] - center2[0]) ** 2 + (center1[1] - center2[1]) ** 2) ** 0.5
    
    def get_active_detections(self) -> List[StrawberryDetection]:
        """获取所有活跃的草莓检测结果"""
        active_detections = []
        current_time = time.time()
        
        for tracked in self.tracked_strawberries.values():
            # 检查是否在超时范围内
            if (current_time - tracked.last_updated) <= self.track_timeout:
                active_detections.append(tracked.detection)
        
        return active_detections
    
    def is_recently_processed(self, strawberry_id, current_time) -> bool:
        """检查草莓是否最近已被处理（保留兼容性）"""
        if strawberry_id in self.detection_history:
            time_diff = current_time - self.detection_history[strawberry_id]
            return time_diff < 5.0  # 固定5秒冷却期
        return False
    
    def clear_detection_history(self):
        """清空检测历史和跟踪数据"""
        self.detection_history.clear()
        self.tracked_strawberries.clear()
        self.next_track_id = 1
        print("🧹 草莓检测历史和跟踪数据已清空")
    
    def draw_detections(self, frame, detections: List[StrawberryDetection]):
        """在图像上绘制检测结果（优化显示，避免重复绘制）"""
        maturity_colors = {
            'ripe': (0, 255, 0),      # 绿色 - 成熟
            'semi_ripe': (0, 255, 255), # 黄色 - 半成熟
            'unripe': (0, 0, 255),    # 红色 - 未成熟
            'unknown': (128, 128, 128) # 灰色 - 未知
        }
        
        # 创建帧的副本以避免修改原始帧
        result_frame = frame.copy()
        current_time = time.time()
        
        # 使用集合来避免重复绘制相同的track_id
        drawn_tracks = set()
        
        # 绘制所有检测到的草莓（实时显示）
        for detection in detections:
            # 避免重复绘制相同的跟踪ID
            if detection.track_id in drawn_tracks:
                continue
                
            if detection.track_id and detection.track_id in self.tracked_strawberries:
                tracked = self.tracked_strawberries[detection.track_id]
                # 降低稳定性要求，更快显示检测框
                if (tracked.update_count >= 1 or 
                    (current_time - tracked.first_detected) > 0.1):
                    
                    # 标记为已绘制
                    drawn_tracks.add(detection.track_id)
                    
                    x1, y1, x2, y2 = detection.bbox
                    color = maturity_colors.get(detection.maturity_level, (255, 255, 255))
                    
                    # 统一使用实线边框，减少视觉复杂度
                    cv2.rectangle(result_frame, (x1, y1), (x2, y2), color, 2)
                    
                    # 绘制中心点
                    cv2.circle(result_frame, detection.center, 3, color, -1)
                    
                    # 构建标签信息
                    track_info = f"[{detection.track_id}]" if detection.track_id else "[NEW]"
                    maturity_info = f"{detection.maturity_level} ({detection.maturity_confidence:.2f})"
                    
                    # 绘制跟踪ID标签（在边界框上方）
                    track_label_size = cv2.getTextSize(track_info, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)[0]
                    cv2.rectangle(result_frame, 
                                 (x1, y1 - track_label_size[1] - 25), 
                                 (x1 + track_label_size[0] + 5, y1 - 15), 
                                 (50, 50, 50), -1)
                    cv2.putText(result_frame, track_info, (x1 + 2, y1 - 18),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
                    
                    # 绘制成熟度标签（在边界框上方，跟踪ID下方）
                    maturity_label_size = cv2.getTextSize(maturity_info, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
                    cv2.rectangle(result_frame, 
                                 (x1, y1 - maturity_label_size[1] - 10), 
                                 (x1 + maturity_label_size[0] + 10, y1), 
                                 color, -1)
                    cv2.putText(result_frame, maturity_info, (x1 + 5, y1 - 5),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        return result_frame  # 返回修改后的帧
    
    def draw_dashed_rectangle(self, img, pt1, pt2, color, thickness):
        """绘制虚线矩形"""
        x1, y1 = pt1
        x2, y2 = pt2
        
        # 虚线参数
        dash_length = 10
        gap_length = 5
        
        # 绘制上边
        for x in range(x1, x2, dash_length + gap_length):
            cv2.line(img, (x, y1), (min(x + dash_length, x2), y1), color, thickness)
        
        # 绘制下边
        for x in range(x1, x2, dash_length + gap_length):
            cv2.line(img, (x, y2), (min(x + dash_length, x2), y2), color, thickness)
        
        # 绘制左边
        for y in range(y1, y2, dash_length + gap_length):
            cv2.line(img, (x1, y), (x1, min(y + dash_length, y2)), color, thickness)
        
        # 绘制右边
        for y in range(y1, y2, dash_length + gap_length):
            cv2.line(img, (x2, y), (x2, min(y + dash_length, y2)), color, thickness)
    
    def get_maturity_summary(self, detections: List[StrawberryDetection]) -> Dict:
        """获取成熟度统计摘要"""
        print(f"📊 统计草莓成熟度: 总数={len(detections)}")
        
        if not detections:
            return {
                'total_count': 0,
                'ripe_count': 0,
                'semi_ripe_count': 0,
                'unripe_count': 0,
                'unknown_count': 0,
                'average_confidence': 0.0
            }
        
        summary = {
            'total_count': len(detections),
            'ripe_count': 0,
            'semi_ripe_count': 0,
            'unripe_count': 0,
            'unknown_count': 0,
            'average_confidence': 0.0
        }
        
        total_confidence = 0
        for i, detection in enumerate(detections):
            maturity = detection.maturity_level
            print(f"  草莓{i+1}: 成熟度={maturity}, 置信度={detection.maturity_confidence:.3f}")
            
            if maturity == 'ripe':
                summary['ripe_count'] += 1
            elif maturity == 'semi_ripe':
                summary['semi_ripe_count'] += 1
            elif maturity == 'unripe':
                summary['unripe_count'] += 1
            else:
                summary['unknown_count'] += 1
            
            total_confidence += detection.maturity_confidence
        
        summary['average_confidence'] = total_confidence / len(detections)
        
        print(f"📈 统计结果: 成熟={summary['ripe_count']}, 半成熟={summary['semi_ripe_count']}, 未成熟={summary['unripe_count']}, 未知={summary['unknown_count']}")
        
        return summary


if __name__ == "__main__":
    # 测试草莓检测器
    model_path = r"c:\Users\Zarce\PycharmProjects\opencvpython\electron-drone-analyzer2\electron-drone-analyzer\models\strawberry_yolov11.pt"
    
    analyzer = StrawberryMaturityAnalyzer(model_path)
    
    if analyzer.model:
        print("草莓检测器测试完成 ✅")
    else:
        print("草莓检测器初始化失败 ❌")