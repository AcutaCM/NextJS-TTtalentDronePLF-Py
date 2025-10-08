#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Cleanup Example Module
Demonstrates how to use the cleanup callback system in MissionController
"""

import time
from mission_controller import MissionController


class ResourceManager:
    """Example resource manager that needs cleanup"""
    
    def __init__(self, name):
        self.name = name
        self.is_active = False
        self.resources = []
        
    def start(self):
        """Start the resource manager"""
        self.is_active = True
        self.resources = [f"resource_{i}" for i in range(3)]
        print(f"🟢 {self.name} started with resources: {self.resources}")
        
    def cleanup(self):
        """Cleanup method to be called when mission ends"""
        print(f"🧹 Cleaning up {self.name}...")
        self.is_active = False
        self.resources.clear()
        print(f"✅ {self.name} cleanup completed")


def example_cleanup_function():
    """Example standalone cleanup function"""
    print("🧹 Executing standalone cleanup function...")
    # Simulate cleanup work
    time.sleep(0.1)
    print("✅ Standalone cleanup completed")


def demonstrate_cleanup_system():
    """Demonstrate the cleanup callback system"""
    print("=== Cleanup Callback System Demo ===\n")
    
    # Create a mock drone controller (for demonstration)
    class MockDroneController:
        def __init__(self):
            self.is_connected = True
            self.is_flying = False
            self.mission_pad_id = -1
            
        def takeoff(self):
            self.is_flying = True
            print("🚁 Mock drone takeoff")
            
        def land(self):
            self.is_flying = False
            print("🛬 Mock drone landing")
    
    # Create mission controller
    mock_drone = MockDroneController()
    mission_controller = MissionController(mock_drone)
    
    # Create resource managers
    video_manager = ResourceManager("VideoManager")
    detection_manager = ResourceManager("DetectionManager")
    log_manager = ResourceManager("LogManager")
    
    # Start resources
    video_manager.start()
    detection_manager.start()
    log_manager.start()
    
    # Register cleanup callbacks
    print("\n--- Registering Cleanup Callbacks ---")
    mission_controller.add_cleanup_callback(video_manager.cleanup)
    mission_controller.add_cleanup_callback(detection_manager.cleanup)
    mission_controller.add_cleanup_callback(log_manager.cleanup)
    mission_controller.add_cleanup_callback(example_cleanup_function)
    
    # Simulate mission execution
    print("\n--- Simulating Mission Execution ---")
    print("Mission running...")
    time.sleep(1)
    
    # Stop mission and trigger cleanup
    print("\n--- Stopping Mission and Executing Cleanup ---")
    mission_controller.stop_mission_execution()
    
    print("\n=== Demo Completed ===")


if __name__ == "__main__":
    demonstrate_cleanup_system()