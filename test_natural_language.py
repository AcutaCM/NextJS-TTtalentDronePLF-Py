#!/usr/bin/env python3
"""
测试自然语言命令处理功能
连接到Tello智能代理服务并发送测试命令
"""

import asyncio
import websockets
import json
import time

async def test_natural_language_commands():
    """测试自然语言命令处理"""
    uri = "ws://localhost:3004"  # Tello智能代理服务端口
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ 已连接到Tello智能代理服务器")
            
            # 等待连接建立
            await asyncio.sleep(1)
            
            # 测试命令列表
            test_commands = [
                "起飞",
                "向前飞行50厘米",
                "向上飞行30厘米", 
                "顺时针旋转90度",
                "悬停5秒",
                "降落"
            ]
            
            for i, command in enumerate(test_commands, 1):
                print(f"📤 测试命令 {i}: {command}")
                
                # 发送自然语言命令
                message = {
                    "type": "natural_language_command",
                    "data": {
                        "command": command
                    }
                }
                
                await websocket.send(json.dumps(message))
                
                # 等待响应
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                    response_data = json.loads(response)
                    
                    print(f"📥 响应: {response_data.get('type', 'unknown')}")
                    if response_data.get('success'):
                        print(f"✅ 命令执行成功: {response_data.get('message', '')}")
                        if 'ai_analysis' in response_data:
                            analysis = response_data['ai_analysis']
                            print(f"🧠 AI分析: {analysis.get('raw_response', '')}")
                    else:
                        print(f"❌ 命令执行失败: {response_data.get('error', '')}")
                        
                except asyncio.TimeoutError:
                    print("⏰ 响应超时")
                
                print("-" * 50)
                await asyncio.sleep(2)  # 等待2秒再发送下一个命令
            
            print("✅ 所有测试命令已发送完成")
            
    except ConnectionRefusedError:
        print("❌ 连接被拒绝")
        print("请确保Tello智能代理服务正在运行 (端口3004)")
        print("可以运行: python python/tello_intelligent_agent.py")
    except Exception as e:
        print(f"❌ 连接失败: {e}")

async def test_drone_connection():
    """测试无人机连接"""
    uri = "ws://localhost:3004"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ 已连接到Tello智能代理服务器")
            
            # 发送连接无人机命令
            connect_message = {
                "type": "connect_drone",
                "data": {}
            }
            
            print("📤 发送连接无人机命令...")
            await websocket.send(json.dumps(connect_message))
            
            # 等待响应
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=15.0)
                response_data = json.loads(response)
                
                print(f"📥 连接响应: {response_data}")
                if response_data.get('success'):
                    print("✅ 无人机连接成功")
                else:
                    print(f"❌ 无人机连接失败: {response_data.get('error', '')}")
                    
            except asyncio.TimeoutError:
                print("⏰ 连接响应超时")
                
    except Exception as e:
        print(f"❌ 测试连接失败: {e}")

if __name__ == "__main__":
    print("🧪 开始测试Tello智能代理功能...")
    print("\n1. 测试无人机连接...")
    asyncio.run(test_drone_connection())
    
    print("\n2. 测试自然语言命令...")
    asyncio.run(test_natural_language_commands())