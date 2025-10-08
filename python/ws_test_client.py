# 简易WebSocket测试客户端，用于与TelloIntelligentAgent服务交互
import asyncio
import json
import websockets

WS_URL = "ws://127.0.0.1:3005/"

async def send_message(ws, msg):
    print(f"发送: {msg.get('type')}")
    await ws.send(json.dumps(msg))
    resp = await ws.recv()
    print("收到:", resp)
    return json.loads(resp)

async def main():
    print(f"连接到 {WS_URL}")
    async with websockets.connect(WS_URL) as ws:
        # 1) 查询当前AI设置
        await send_message(ws, {
            "type": "get_ai_settings",
            "data": {}
        })

        # 2) 更新AI设置为本地Ollama
        await send_message(ws, {
            "type": "update_ai_settings",
            "data": {
                "provider": "ollama",
                "base_url": "http://localhost:11434/v1",
                "model": "llama3.1:8b",
                "api_key": "ollama"
            }
        })

        # 3) 发送自然语言命令（不连接无人机，仅测试解析）
        await send_message(ws, {
            "type": "natural_language_command",
            "data": {
                "command": "起飞，然后向前移动50厘米，再降落"
            }
        })

if __name__ == "__main__":
    asyncio.run(main())