#!/usr/bin/env python3
"""
测试AI分析结果处理功能
模拟发送ai_analysis_complete消息到前端
"""

import asyncio
import websockets
import json
import time

async def test_ai_analysis_complete():
    """测试AI分析完成消息处理"""
    uri = "ws://localhost:3002"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ 已连接到WebSocket服务器")
            
            # 测试案例1：健康植株
            healthy_analysis = {
                "type": "ai_analysis_complete",
                "data": {
                    "plant_id": "PLANT_001",
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "analysis": {
                        "health_score": 85,
                        "diseases": [],
                        "nutrition_status": "良好",
                        "growth_stage": "成熟期",
                        "recommendations": ["继续当前护理方案"]
                    },
                    "qr_info": {
                        "detected": True,
                        "plant_id": "PLANT_001"
                    }
                }
            }
            
            print("📤 发送健康植株分析结果...")
            await websocket.send(json.dumps(healthy_analysis))
            await asyncio.sleep(2)
            
            # 测试案例2：不健康植株
            unhealthy_analysis = {
                "type": "ai_analysis_complete",
                "data": {
                    "plant_id": "PLANT_002",
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "analysis": {
                        "health_score": 45,
                        "diseases": [
                            {
                                "name": "叶斑病",
                                "confidence": 0.78,
                                "severity": "中等"
                            },
                            {
                                "name": "营养不良",
                                "confidence": 0.65,
                                "severity": "轻微"
                            }
                        ],
                        "nutrition_status": "缺乏氮元素",
                        "growth_stage": "生长期",
                        "recommendations": [
                            "增加氮肥施用",
                            "改善通风条件",
                            "定期喷洒杀菌剂"
                        ]
                    },
                    "qr_info": {
                        "detected": True,
                        "plant_id": "PLANT_002"
                    }
                }
            }
            
            print("📤 发送不健康植株分析结果...")
            await websocket.send(json.dumps(unhealthy_analysis))
            await asyncio.sleep(2)
            
            # 测试案例3：中等健康植株
            moderate_analysis = {
                "type": "ai_analysis_complete",
                "data": {
                    "plant_id": "PLANT_003",
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "analysis": {
                        "health_score": 72,
                        "diseases": [
                            {
                                "name": "轻微虫害",
                                "confidence": 0.55,
                                "severity": "轻微"
                            }
                        ],
                        "nutrition_status": "基本正常",
                        "growth_stage": "开花期",
                        "recommendations": [
                            "监控虫害发展",
                            "适当增加磷钾肥"
                        ]
                    },
                    "qr_info": {
                        "detected": True,
                        "plant_id": "PLANT_003"
                    }
                }
            }
            
            print("📤 发送中等健康植株分析结果...")
            await websocket.send(json.dumps(moderate_analysis))
            await asyncio.sleep(2)
            
            print("✅ 所有测试消息已发送完成")
            print("请检查前端日志，验证AI分析结果处理是否正常")
            
    except Exception as e:
        print(f"❌ 连接失败: {e}")
        print("请确保后端WebSocket服务正在运行 (端口3002)")

if __name__ == "__main__":
    print("🧪 开始测试AI分析结果处理功能...")
    asyncio.run(test_ai_analysis_complete())