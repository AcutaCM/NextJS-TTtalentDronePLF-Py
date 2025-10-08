#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Mission Controller Module
Handles mission planning and execution for challenge pads
"""

import threading
import time


class MissionController:
    """Class for controlling drone missions with challenge pads"""

    def __init__(self, drone_controller, status_callback=None, position_callback=None):
        """Initialize the mission controller

        Args:
            drone_controller: DroneController instance
            status_callback: Function to call with mission status updates
            position_callback: Function to call with position updates (for UI)
        """
        self.drone = drone_controller
        self.status_callback = status_callback
        # 新增：位置回调
        self.position_callback = position_callback

        # Mission parameters
        self.mission_rounds = 3  # Default mission rounds
        self.is_mission_running = False
        self.mission_thread = None
        self.stop_mission = False

        # Mission pad alignment status
        self.yaw_aligned = False

        # Default height for missions in cm
        self.mission_height = 100

        # Last detected pad
        self.last_pad_id = -1
        
        # 新增：挑战卡停留时间功能
        self.stay_duration = 3.0     # 默认停留时间（秒）
        
        # Status update optimization
        self.last_status_message = ""
        self.last_status_time = 0
        self.status_update_interval = 1.0  # Minimum interval between status updates (seconds)
        
        # Resource cleanup callbacks
        self.cleanup_callbacks = []

    def set_mission_rounds(self, rounds):
        """Set the number of mission rounds

        Args:
            rounds: Number of rounds (1-10)
        """
        self.mission_rounds = max(1, min(10, rounds))

    def set_mission_height(self, height_cm):
        """Set the mission flight height

        Args:
            height_cm: Height in centimeters (40-300)
        """
        self.mission_height = max(40, min(300, height_cm))

    def optimized_status_callback(self, message):
        """Optimized status callback that reduces unnecessary updates"""
        if not self.status_callback:
            return
            
        current_time = time.time()
        
        # Skip duplicate messages within the interval
        if (message == self.last_status_message and 
            current_time - self.last_status_time < self.status_update_interval):
            return
            
        # Update tracking variables
        self.last_status_message = message
        self.last_status_time = current_time
        
        # Send the status update
        self.status_callback(message)

    def add_cleanup_callback(self, callback):
        """Add a cleanup callback function to be called when mission ends
        
        Args:
            callback: Function to call during cleanup
        """
        if callable(callback):
            self.cleanup_callbacks.append(callback)
            print(f"Added cleanup callback: {callback.__name__ if hasattr(callback, '__name__') else 'anonymous'}")

    def remove_cleanup_callback(self, callback):
        """Remove a cleanup callback function
        
        Args:
            callback: Function to remove from cleanup callbacks
        """
        if callback in self.cleanup_callbacks:
            self.cleanup_callbacks.remove(callback)
            print(f"Removed cleanup callback: {callback.__name__ if hasattr(callback, '__name__') else 'anonymous'}")

    def execute_cleanup_callbacks(self):
        """Execute all registered cleanup callbacks"""
        print(f"🧹 Executing {len(self.cleanup_callbacks)} cleanup callbacks...")
        
        for callback in self.cleanup_callbacks:
            try:
                callback()
                print(f"✅ Cleanup callback executed: {callback.__name__ if hasattr(callback, '__name__') else 'anonymous'}")
            except Exception as e:
                print(f"❌ Cleanup callback failed: {callback.__name__ if hasattr(callback, '__name__') else 'anonymous'} - {e}")
        
        print("🧹 All cleanup callbacks executed")

    def set_stay_duration(self, duration):
        """Set the duration to stay at each challenge card

        Args:
            duration: Duration in seconds (0.5-30)
        """
        self.stay_duration = max(0.5, min(30, duration))
        self.optimized_status_callback(f"设置停留时间: {self.stay_duration}秒")

    # 新增：统一位置上报辅助方法
    def emit_position(self, current_pad=None, x=None, y=None, z=None, target_pad=None, progress=None, note=None):
        """Emit position update via position_callback if provided.

        Args:
            current_pad: 当前所处挑战卡ID
            x, y, z: 相对坐标或语义坐标（可为None）
            target_pad: 目标挑战卡ID
            progress: 0.0~1.0 进度（可为None）
            note: 备注信息
        """
        try:
            if not self.position_callback:
                return
            # 统一组织数据结构
            ts = time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime())
            payload = {
                'current_pad': current_pad,
                'coords': {
                    'x': 0 if x is None else x,
                    'y': 0 if y is None else y,
                    'z': 0 if z is None else z,
                },
                'target_pad': target_pad,
                'progress': progress,
                'note': note,
                'timestamp': ts,
            }
            self.position_callback(payload)
        except Exception as e:
            # 避免位置上报影响主流程
            print(f"emit_position error: {e}")

    def start_mission(self):
        """Start the mission execution"""
        if self.is_mission_running:
            self.optimized_status_callback("Mission already running")
            return False

        if not self.drone.is_connected:
            self.optimized_status_callback("Drone not connected")
            return False

        self.stop_mission = False
        self.is_mission_running = True

        # Start mission in a separate thread
        self.mission_thread = threading.Thread(target=self.mission_sequence)
        self.mission_thread.start()

        self.optimized_status_callback("Mission started")
        return True

    def stop_mission_execution(self):
        """Stop the current mission execution"""
        print("Stopping mission execution...")
        self.stop_mission = True
        
        # Disable all detection systems when mission ends
        try:
            # Stop QR detection
            if hasattr(self.drone, 'handle_stop_qr_detection'):
                print("🔴 Stopping QR detection...")
                self.drone.qr_detection_enabled = False
                self.optimized_status_callback("QR检测已停用")
            
            # Stop strawberry detection  
            if hasattr(self.drone, 'handle_stop_strawberry_detection'):
                print("🔴 Stopping strawberry detection...")
                self.drone.strawberry_detection_enabled = False
                self.optimized_status_callback("草莓检测已停用")
                
            # Stop AI analysis
            if hasattr(self.drone, 'ai_analysis_enabled'):
                print("🔴 Stopping AI analysis...")
                self.drone.ai_analysis_enabled = False
                self.optimized_status_callback("AI分析已停用")
                
        except Exception as e:
            print(f"Error stopping detection systems: {e}")
            self.optimized_status_callback(f"检测系统停用错误：{str(e)}")

        # Execute all cleanup callbacks
        self.execute_cleanup_callbacks()

        # Wait for mission thread to complete
        if self.mission_thread and self.mission_thread.is_alive():
            self.mission_thread.join(timeout=5)  # Wait up to 5 seconds

        # Update mission status
        self.is_mission_running = False
        
        if self.optimized_status_callback:
            self.optimized_status_callback("Mission stopped")

    def mission_sequence(self):
        """Execute the full mission sequence"""
        try:
            # Take off if not already flying
            if not self.drone.is_flying:
                self.optimized_status_callback("Taking off")

                success = self.drone.takeoff()
                if not success:
                    self.optimized_status_callback("Takeoff failed")
                    self.is_mission_running = False
                    return

                # Wait for stabilization
                time.sleep(2)

            # Raise to initial height
            self.optimized_status_callback("Adjusting height")
            self.drone.set_height(self.mission_height)
            time.sleep(2)

            # Search for challenge card
            self.optimized_status_callback("Searching for challenge card")
            if not self.align_with_mission_pad():
                self.optimized_status_callback("Could not find challenge card")
                return

            # Execute mission rounds
            successful_rounds = 0
            for i in range(self.mission_rounds):
                if self.stop_mission:
                    break

                self.optimized_status_callback(f"Round {i + 1}/{self.mission_rounds}")

                if self.execute_round_trip():
                    successful_rounds += 1

                if i < self.mission_rounds - 1 and not self.stop_mission:
                    time.sleep(2)  # Short pause between rounds

            # Mission complete, prepare for landing
            self.optimized_status_callback(f"Mission complete: {successful_rounds}/{self.mission_rounds} rounds successful")

            self.prepare_for_landing()

            # Land the drone
            self.optimized_status_callback("Landing")

            self.drone.land()

        except Exception as e:
            print(f"Mission execution error: {e}")
            self.optimized_status_callback(f"Mission error: {str(e)}")

            # Try to land safely
            try:
                self.drone.land()
            except:
                pass

        finally:
            self.is_mission_running = False
            
            # 通知任务完成，重置后端状态
            self.optimized_status_callback("任务已完成，正在重置状态...")
            
            # 调用任务完成回调来重置后端状态
            if hasattr(self, 'mission_complete_callback') and self.mission_complete_callback:
                try:
                    self.mission_complete_callback()
                except Exception as e:
                    print(f"任务完成回调执行失败: {e}")
                    
            print("✅ 任务执行完成，状态已重置")

    def align_with_mission_pad(self):
        """Search for and align with a mission pad

        Returns:
            Boolean indicating success
        """
        # Wait for mission pad detection
        detect_time = 0
        max_time = 10  # Maximum search time in seconds
        pad_detected = False

        while detect_time < max_time and not pad_detected and not self.stop_mission:
            if self.drone.mission_pad_id > 0:
                pad_detected = True
                self.last_pad_id = self.drone.mission_pad_id
                break

            time.sleep(0.5)
            detect_time += 0.5

            # Rotate to search for pads every 2 seconds
            if detect_time % 2 == 0:
                try:
                    self.drone.rotate(30)  # Rotate clockwise
                except Exception as e:
                    print(f"Rotation error during pad search: {e}")

        if pad_detected:
            print(f"Detected challenge card ID: {self.drone.mission_pad_id}")

            # Move to position above the pad
            try:
                # Using move_to_mission_pad for better precision
                self.drone.move_to_mission_pad(
                    self.drone.mission_pad_id,
                    0, 0, self.mission_height,
                    20
                )
                time.sleep(2)

                self.yaw_aligned = True
                return True

            except Exception as e:
                print(f"Error aligning with pad: {e}")
                return False

        return False

    def execute_round_trip(self):
        """Execute a round trip from pad 1 to pad 6 and back"""
        # Safety check: ensure drone is connected and flying
        if not self.drone.is_connected:
            self.optimized_status_callback("错误：无人机未连接")
            return False

        # 1. Ensure we're on pad 1
        if not self.wait_for_pad(1, timeout=4):
            self.optimized_status_callback("错误：无法定位到挑战卡1")
            return False

        # Position precisely on pad 1
        self.precise_positioning_on_pad(1)
        self.optimized_status_callback(f"在挑战卡 1 停留 {self.stay_duration} 秒")
        # 上报位于PAD1
        self.emit_position(current_pad=1, x=0, y=0, z=self.mission_height, target_pad=1, progress=0.0, note='位于PAD1')
        time.sleep(self.stay_duration)

        # 2. Move right to find pad 6
        found_pad6 = False
        for attempt in range(3):  # Try up to 3 times
            if self.stop_mission:
                break

            try:
                # Safety check before movement
                if not self.drone.is_flying:
                    self.optimized_status_callback("错误：无人机未在飞行状态")
                    return False

                # Move right with reduced strength for more stable movement
                self.drone.manual_control(25, 0, 0, 0)  # Reduced from 40 to 25
                time.sleep(0.8)  # Reduced from 1.0 to 0.8 seconds
                self.drone.manual_control(0, 0, 0, 0)  # Stop movement

                # Wait for pad detection with increased timeout
                if self.wait_for_pad(6, timeout=4):  # Increased timeout
                    found_pad6 = True
                    break

            except Exception as e:
                self.optimized_status_callback(f"移动错误：{str(e)}")
                break

        if found_pad6:
            # 3. Position precisely on pad 6
            self.precise_positioning_on_pad(6)
            self.optimized_status_callback(f"在挑战卡 6 停留 {self.stay_duration} 秒")
            # 上报位于PAD6
            self.emit_position(current_pad=6, x=200, y=0, z=self.mission_height, target_pad=6, progress=50.0, note='位于PAD6')
            time.sleep(self.stay_duration)

            # 4. Move left to return to pad 1
            found_pad1 = False
            for attempt in range(3):  # Try up to 3 times
                if self.stop_mission:
                    break

                try:
                    # Safety check before movement
                    if not self.drone.is_flying:
                        self.optimized_status_callback("错误：无人机未在飞行状态")
                        return False

                    # Move left with reduced strength for more stable movement
                    self.drone.manual_control(-25, 0, 0, 0)  # Reduced from -40 to -25
                    time.sleep(0.8)  # Reduced from 1.0 to 0.8 seconds
                    self.drone.manual_control(0, 0, 0, 0)  # Stop movement

                    # Wait for pad detection with increased timeout
                    if self.wait_for_pad(1, timeout=4):  # Increased timeout
                        found_pad1 = True
                        break

                except Exception as e:
                    self.optimized_status_callback(f"返回移动错误：{str(e)}")
                    break

            if found_pad1:
                # 5. Position precisely on pad 1 again
                self.precise_positioning_on_pad(1)
                # 上报位于PAD1
                self.emit_position(current_pad=1, x=0, y=0, z=self.mission_height, target_pad=1, progress=0.0, note='回到PAD1')
                print("\nSuccessfully completed round trip!")
                return True
            else:
                print("Could not find pad 1 on return trip")
                self.find_pad_by_rotation(1)  # Attempt to recover by rotation
                return False
        else:
            print("Could not find pad 6")
            # Try to recover by returning to pad 1
            self.find_pad_by_rotation(1)
            return False



    def wait_for_pad(self, pad_id, timeout=10):
        """Wait for a specific pad to be detected with improved detection logic

        Args:
            pad_id: ID of the pad to wait for
            timeout: Maximum time to wait in seconds

        Returns:
            Boolean indicating if pad was found
        """
        start_time = time.time()
        detection_count = 0
        required_detections = 2  # Require multiple consistent detections
        
        while time.time() - start_time < timeout and not self.stop_mission:
            if self.drone.mission_pad_id == pad_id:
                detection_count += 1
                if detection_count >= required_detections:
                    self.last_pad_id = pad_id
                    print(f"Successfully detected pad {pad_id} (confirmed {detection_count} times)")
                    return True
            else:
                detection_count = 0  # Reset if detection is lost
            
            time.sleep(0.2)  # Slightly longer interval for more stable detection

        print(f"Could not detect pad {pad_id} consistently")
        return False

    def find_pad_by_rotation(self, pad_id, max_rotations=4):
        """Search for a specific pad by rotating

        Args:
            pad_id: ID of the pad to search for
            max_rotations: Maximum number of rotation attempts (reduced to 4)

        Returns:
            Boolean indicating if pad was found
        """
        for i in range(max_rotations):
            if self.stop_mission:
                return False

            # Check if pad is already detected before rotating
            if self.drone.mission_pad_id == pad_id:
                self.last_pad_id = pad_id
                return True

            print(f"Rotation search for pad {pad_id}, attempt {i + 1}")
            # Reduce rotation angle from 45 to 30 degrees for gentler movement
            self.drone.rotate(30)
            time.sleep(1.5)  # Reduced wait time for faster response
            
            # Check again after rotation
            time.sleep(0.5)  # Brief pause for detection
            if self.drone.mission_pad_id == pad_id:
                self.last_pad_id = pad_id
                return True

        return False

    def precise_positioning_on_pad(self, pad_id):
        """Position precisely on a mission pad with improved stability and error handling

        Args:
            pad_id: ID of the pad to position on

        Returns:
            Boolean indicating success
        """
        try:
            # First, try to detect the pad without moving
            if self.wait_for_pad(pad_id, timeout=2):
                print(f"Pad {pad_id} already detected, proceeding with positioning")
            else:
                # If not detected, use rotation search
                if not self.find_pad_by_rotation(pad_id):
                    self.optimized_status_callback(f"定位错误：无法找到挑战卡{pad_id}")
                    return False

            # Move to the mission pad with reduced speed for stability
            success = self.drone.move_to_mission_pad(pad_id, 0, 0, self.mission_height, 15)  # Reduced speed from 20 to 15
            
            if success:
                # Allow more time for stabilization
                time.sleep(3)  # Increased from 2 to 3 seconds
                
                # Verify positioning with wait_for_pad
                if self.wait_for_pad(pad_id, timeout=3):
                    print(f"Successfully positioned on pad {pad_id}")
                    return True
                else:
                    self.optimized_status_callback(f"定位验证失败：挑战卡{pad_id}")
                    return False
            else:
                self.optimized_status_callback(f"定位失败：无法移动到挑战卡{pad_id}")
                return False
                
        except Exception as e:
            print(f"Positioning error: {e}")
            self.optimized_status_callback(f"定位错误：{str(e)}")
            return False

    def prepare_for_landing(self, target_pad=None):
        """Prepare for landing by positioning above a pad and lowering altitude

        Args:
            target_pad: ID of the pad to land on (default: last detected pad or 1)

        Returns:
            Boolean indicating success
        """
        print("\n=== Preparing for landing ===")

        # If no target specified, use last detected pad or default to 1
        if target_pad is None:
            target_pad = self.last_pad_id if self.last_pad_id > 0 else 1

        print(f"Locating pad {target_pad} for landing...")
        if not self.wait_for_pad(target_pad, timeout=5):
            print(f"Could not immediately detect pad {target_pad}, searching...")
            self.find_pad_by_rotation(target_pad)

        if self.drone.mission_pad_id == target_pad:
            print(f"Found pad {target_pad}, adjusting to landing position...")
            try:
                # Move to pad center at safer height
                self.drone.move_to_mission_pad(target_pad, 0, 0, 60, 20)
                time.sleep(2)

                # Lower to landing height
                self.drone.move_to_mission_pad(target_pad, 0, 0, 30, 15)
                time.sleep(2)

                print("Position and altitude adjusted, ready for landing")
                return True

            except Exception as e:
                print(f"Error adjusting landing position: {e}")
                return False
        else:
            print("Could not find landing pad, will land at current position")

            # Gently lower altitude for safer landing
            try:
                self.drone.set_height(30)  # Use set_height for smoother descent
                time.sleep(2)
                return False

            except Exception as e:
                print(f"Error lowering altitude: {e}")
                return False