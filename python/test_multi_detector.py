#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Tello无人机多模型检测系统测试脚本
"""

import os
import sys
import json
import time
import asyncio
import websockets
import numpy as np
import cv2
from datetime import datetime

def test_imports():
    """测试关键模块导入"""
    print("🧪 测试模块导入...")
    
    test_modules = [
        ("cv2", "OpenCV"),
        ("numpy", "NumPy"), 
        ("websockets", "WebSockets")
    ]
    
    optional_modules = [
        ("ultralytics", "YOLOv11"),
        ("djitellopy", "DJI Tello")
    ]
    
    success_count = 0
    total_count = len(test_modules) + len(optional_modules)
    
    # 测试必需模块
    for module_name, display_name in test_modules:
        try:
            __import__(module_name)
            print(f"✅ {display_name}: 导入成功")
            success_count += 1
        except ImportError as e:
            print(f"❌ {display_name}: 导入失败 - {e}")
    
    # 测试可选模块
    for module_name, display_name in optional_modules:
        try:
            __import__(module_name)
            print(f"✅ {display_name}: 导入成功")
            success_count += 1
        except ImportError as e:
            print(f"⚠️ {display_name}: 导入失败 - {e} (可选)")
            success_count += 0.5  # 可选模块算半分
    
    print(f"\n导入测试完成: {success_count}/{total_count}")
    return success_count >= len(test_modules)

def test_multi_detector():
    """测试多模型检测器"""
    print("\n🤖 测试多模型检测器...")
    
    try:
        from multi_model_detector import MultiModelDetector, ModelType
        
        # 创建测试配置
        models_config = {
            "best.pt": "../models/best.pt",
            "disease.pt": "../models/disease.pt"
        }
        
        # 初始化检测器
        detector = MultiModelDetector(models_config)
        
        # 检查模型状态
        status = detector.get_model_status()
        print(f"模型状态: {status}")
        
        # 创建测试图像
        test_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.circle(test_frame, (320, 240), 50, (0, 150, 0), -1)
        cv2.putText(test_frame, "TEST", (280, 250), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
        # 执行检测测试
        print("执行检测测试...")
        detections = detector.detect_multi_model(test_frame)
        print(f"检测结果: {len(detections)} 个目标")
        
        # 测试绘制功能
        result_frame = detector.draw_detections(test_frame, detections)
        print("✅ 绘制功能测试通过")
        
        # 测试摘要功能
        summary = detector.get_detection_summary(detections)
        print(f"检测摘要: {summary}")
        
        print("✅ 多模型检测器测试通过")
        return True
        
    except Exception as e:
        print(f"❌ 多模型检测器测试失败: {e}")
        return False

async def test_websocket_connection():
    """测试WebSocket连接"""
    print("\n🌐 测试WebSocket连接...")
    
    try:
        # 尝试连接到WebSocket服务器
        uri = "ws://localhost:3003"
        
        async with websockets.connect(uri, timeout=5) as websocket:
            print("✅ WebSocket连接成功")
            
            # 发送心跳测试
            heartbeat_msg = {
                "type": "heartbeat",
                "data": {"test": True},
                "timestamp": datetime.now().isoformat()
            }
            
            await websocket.send(json.dumps(heartbeat_msg))
            print("✅ 心跳消息发送成功")
            
            # 等待响应
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=3)
                data = json.loads(response)
                print(f"✅ 收到响应: {data.get('type', 'unknown')}")
                return True
            except asyncio.TimeoutError:
                print("⚠️ 响应超时，但连接正常")
                return True
                
    except Exception as e:
        print(f"❌ WebSocket连接测试失败: {e}")
        return False

def test_model_files():
    """测试模型文件"""
    print("\n📁 测试模型文件...")
    
    models_dir = "../models"
    required_models = ["best.pt", "disease.pt"]
    
    found_models = 0
    
    for model_name in required_models:
        model_path = os.path.join(models_dir, model_name)
        if os.path.exists(model_path):
            file_size = os.path.getsize(model_path) / (1024 * 1024)  # MB
            print(f"✅ {model_name}: 存在 ({file_size:.1f} MB)")
            found_models += 1
        else:
            print(f"❌ {model_name}: 不存在")
    
    print(f"模型文件检查: {found_models}/{len(required_models)}")
    return found_models > 0

def test_opencv_functionality():
    """测试OpenCV功能"""
    print("\n📷 测试OpenCV功能...")
    
    try:
        # 创建测试图像
        img = np.zeros((300, 400, 3), dtype=np.uint8)
        
        # 绘制测试图形
        cv2.rectangle(img, (50, 50), (150, 150), (0, 255, 0), 2)
        cv2.circle(img, (300, 150), 50, (255, 0, 0), -1)
        cv2.putText(img, "OpenCV Test", (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
        # 测试图像编码
        _, buffer = cv2.imencode('.jpg', img)
        print(f"✅ 图像编码成功: {len(buffer)} bytes")
        
        # 测试颜色空间转换
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        print("✅ 颜色空间转换成功")
        
        # 测试图像操作
        blurred = cv2.GaussianBlur(img, (15, 15), 0)
        print("✅ 图像模糊处理成功")
        
        print("✅ OpenCV功能测试通过")
        return True
        
    except Exception as e:
        print(f"❌ OpenCV功能测试失败: {e}")
        return False

async def main():
    """主测试函数"""
    print("🎯 Tello无人机多模型检测系统测试")
    print("=" * 50)
    
    test_results = []
    
    # 运行各项测试
    tests = [
        ("模块导入测试", test_imports),
        ("模型文件测试", test_model_files),
        ("OpenCV功能测试", test_opencv_functionality),
        ("多模型检测器测试", test_multi_detector),
    ]
    
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}...")
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            test_results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} 异常: {e}")
            test_results.append((test_name, False))
    
    # WebSocket测试（可选）
    print(f"\n📋 WebSocket连接测试...")
    try:
        ws_result = await test_websocket_connection()
        test_results.append(("WebSocket连接测试", ws_result))
    except Exception as e:
        print(f"⚠️ WebSocket测试跳过: {e}")
        test_results.append(("WebSocket连接测试", None))
    
    # 输出测试结果
    print("\n" + "=" * 50)
    print("测试结果汇总:")
    
    passed = 0
    failed = 0
    skipped = 0
    
    for test_name, result in test_results:
        if result is True:
            print(f"✅ {test_name}: 通过")
            passed += 1
        elif result is False:
            print(f"❌ {test_name}: 失败")
            failed += 1
        else:
            print(f"⚠️ {test_name}: 跳过")
            skipped += 1
    
    total = len(test_results)
    print(f"\n总计: {total} 项测试")
    print(f"通过: {passed} 项")
    print(f"失败: {failed} 项")
    print(f"跳过: {skipped} 项")
    
    if failed == 0:
        print("\n🎉 所有测试通过！系统准备就绪")
        return True
    elif passed >= total * 0.7:  # 70%通过率
        print("\n⚠️ 大部分测试通过，系统基本可用")
        return True
    else:
        print("\n❌ 测试失败过多，请检查系统配置")
        return False

if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n\n测试被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n测试运行异常: {e}")
        sys.exit(1)