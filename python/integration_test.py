#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Integration Test Module
Tests the integration of status update optimization and cleanup callback system
"""

import time
import threading
from mission_controller import MissionController


class MockDroneController:
    """Mock drone controller for testing"""
    
    def __init__(self):
        self.is_connected = True
        self.is_flying = False
        self.mission_pad_id = -1
        self.battery_level = 85
        self.height = 0
        
    def takeoff(self):
        self.is_flying = True
        self.height = 100
        print("🚁 Mock drone takeoff")
        return True
        
    def land(self):
        self.is_flying = False
        self.height = 0
        print("🛬 Mock drone landing")
        return True
        
    def set_height(self, height_cm):
        self.height = height_cm
        print(f"📏 Mock drone height set to {height_cm}cm")
        return True
        
    def rotate(self, degrees):
        print(f"🔄 Mock drone rotate {degrees} degrees")
        return True
        
    def move_to_mission_pad(self, pad_id, x, y, z, speed):
        self.mission_pad_id = pad_id
        print(f"🎯 Mock drone move to pad {pad_id} at ({x}, {y}, {z}) speed {speed}")
        return True


class TestResourceManager:
    """Test resource manager for cleanup testing"""
    
    def __init__(self, name):
        self.name = name
        self.is_active = False
        self.resources = []
        
    def start(self):
        """Start the resource manager"""
        self.is_active = True
        self.resources = [f"resource_{i}" for i in range(2)]
        print(f"🟢 {self.name} started")
        
    def cleanup(self):
        """Cleanup method"""
        print(f"🧹 Cleaning up {self.name}...")
        self.is_active = False
        self.resources.clear()
        print(f"✅ {self.name} cleanup completed")


def test_status_update_optimization():
    """Test status update optimization functionality"""
    print("\n=== 测试状态更新优化 ===")
    
    status_messages = []
    
    def status_callback(message):
        status_messages.append((time.time(), message))
        print(f"📢 状态更新: {message}")
    
    # Create mission controller
    mock_drone = MockDroneController()
    mission_controller = MissionController(mock_drone, status_callback=status_callback)
    
    # Test rapid status updates (should be optimized)
    print("\n--- 测试快速重复状态更新 ---")
    start_time = time.time()
    
    for i in range(5):
        mission_controller.optimized_status_callback("测试重复消息")
        time.sleep(0.1)  # 快速发送，应该被优化
    
    # Test different messages (should not be optimized)
    print("\n--- 测试不同状态消息 ---")
    for i in range(3):
        mission_controller.optimized_status_callback(f"不同消息 {i}")
        time.sleep(0.1)
    
    # Test after interval (should send duplicate)
    print("\n--- 测试间隔后的重复消息 ---")
    time.sleep(1.1)  # 等待超过状态更新间隔
    mission_controller.optimized_status_callback("测试重复消息")
    
    print(f"\n📊 总共收到 {len(status_messages)} 条状态消息")
    for timestamp, message in status_messages:
        print(f"  {timestamp:.2f}: {message}")
    
    return len(status_messages)


def test_cleanup_callback_system():
    """Test cleanup callback system functionality"""
    print("\n=== 测试清理回调系统 ===")
    
    # Create mission controller
    mock_drone = MockDroneController()
    mission_controller = MissionController(mock_drone)
    
    # Create test resource managers
    video_manager = TestResourceManager("VideoManager")
    ai_manager = TestResourceManager("AIManager")
    detection_manager = TestResourceManager("DetectionManager")
    
    # Start resources
    video_manager.start()
    ai_manager.start()
    detection_manager.start()
    
    # Register cleanup callbacks
    print("\n--- 注册清理回调 ---")
    mission_controller.add_cleanup_callback(video_manager.cleanup)
    mission_controller.add_cleanup_callback(ai_manager.cleanup)
    mission_controller.add_cleanup_callback(detection_manager.cleanup)
    
    # Add a standalone cleanup function
    def standalone_cleanup():
        print("🧹 执行独立清理函数...")
        time.sleep(0.1)
        print("✅ 独立清理完成")
    
    mission_controller.add_cleanup_callback(standalone_cleanup)
    
    # Test cleanup execution
    print("\n--- 执行清理回调 ---")
    mission_controller.execute_cleanup_callbacks()
    
    # Test removing a callback
    print("\n--- 测试移除回调 ---")
    mission_controller.remove_cleanup_callback(standalone_cleanup)
    print("移除独立清理函数后再次执行清理:")
    mission_controller.execute_cleanup_callbacks()


def test_mission_integration():
    """Test integration of both systems in a mission context"""
    print("\n=== 测试任务集成 ===")
    
    status_messages = []
    
    def status_callback(message):
        status_messages.append(message)
        print(f"📢 任务状态: {message}")
    
    # Create mission controller
    mock_drone = MockDroneController()
    mission_controller = MissionController(mock_drone, status_callback=status_callback)
    
    # Create and register resource managers
    resource_manager = TestResourceManager("MissionResource")
    resource_manager.start()
    mission_controller.add_cleanup_callback(resource_manager.cleanup)
    
    # Simulate mission operations with status updates
    print("\n--- 模拟任务执行 ---")
    mission_controller.optimized_status_callback("任务初始化")
    time.sleep(0.2)
    
    mission_controller.optimized_status_callback("起飞准备")
    time.sleep(0.2)
    
    mission_controller.optimized_status_callback("执行任务")
    time.sleep(0.2)
    
    # Rapid duplicate updates (should be optimized)
    for i in range(3):
        mission_controller.optimized_status_callback("执行任务")
        time.sleep(0.1)
    
    mission_controller.optimized_status_callback("任务完成")
    
    # Stop mission and trigger cleanup
    print("\n--- 停止任务并清理 ---")
    mission_controller.stop_mission_execution()
    
    print(f"\n📊 任务期间收到 {len(status_messages)} 条状态消息")
    return len(status_messages)


def run_all_tests():
    """Run all integration tests"""
    print("🧪 开始集成测试")
    print("=" * 50)
    
    try:
        # Test status update optimization
        status_count = test_status_update_optimization()
        
        # Test cleanup callback system
        test_cleanup_callback_system()
        
        # Test mission integration
        mission_status_count = test_mission_integration()
        
        print("\n" + "=" * 50)
        print("✅ 所有测试完成")
        print(f"📊 状态优化测试: 收到 {status_count} 条消息")
        print(f"📊 任务集成测试: 收到 {mission_status_count} 条消息")
        print("🎉 集成测试成功!")
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    run_all_tests()