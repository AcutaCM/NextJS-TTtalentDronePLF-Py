#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Python 环境测试脚本
测试 drone-analyzer-nextjs 项目的 Python 依赖是否正确安装
"""

import sys
import os
from datetime import datetime

def test_import(module_name, optional=False):
    """测试模块导入"""
    try:
        __import__(module_name)
        print(f"✅ {module_name} - 导入成功")
        return True
    except ImportError as e:
        if optional:
            print(f"⚠️  {module_name} - 可选依赖，未安装: {e}")
        else:
            print(f"❌ {module_name} - 导入失败: {e}")
        return False

def main():
    """主测试函数"""
    print("=" * 60)
    print("🔍 drone-analyzer-nextjs Python 环境测试")
    print("=" * 60)
    
    print(f"📅 测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🐍 Python 版本: {sys.version}")
    print(f"📂 当前工作目录: {os.getcwd()}")
    print(f"🔧 虚拟环境: {'是' if sys.prefix != sys.base_prefix else '否'}")
    print()
    
    # 核心依赖测试
    print("🧪 测试核心依赖:")
    core_deps = [
        "numpy",
        "cv2",  # opencv-python
        "PIL",  # Pillow
        "json",
        "base64",
        "datetime",
        "asyncio",
        "threading",
        "time"
    ]
    
    core_success = 0
    for dep in core_deps:
        if test_import(dep):
            core_success += 1
    
    print()
    
    # AI 和无人机相关依赖
    print("🤖 测试AI和无人机依赖:")
    ai_deps = [
        ("dashscope", False),
        ("djitellopy", False),
        ("pyzbar", True),
        ("websockets", False),
        ("aiohttp", False)
    ]
    
    ai_success = 0
    for dep, optional in ai_deps:
        if test_import(dep, optional):
            ai_success += 1
    
    print()
    
    # 数据处理依赖
    print("📊 测试数据处理依赖:")
    data_deps = [
        ("pandas", True),
        ("scipy", True),
        ("sklearn", True),
        ("requests", False),
        ("psutil", True)
    ]
    
    data_success = 0
    for dep, optional in data_deps:
        if test_import(dep, optional):
            data_success += 1
    
    print()
    
    # 测试项目特定模块
    print("🎯 测试项目模块:")
    project_modules = []
    
    # 检查 python 目录下的模块
    python_dir = os.path.join(os.getcwd(), "python")
    if os.path.exists(python_dir):
        sys.path.insert(0, python_dir)
        
        modules_to_test = [
            ("crop_analyzer_dashscope", "CropAnalyzer"),
            ("drone_backend", "DroneControllerAdapter"),
            ("mission_controller", "MissionController"),
            ("strawberry_maturity_analyzer", "StrawberryMaturityAnalyzer")
        ]
        
        for module_name, class_name in modules_to_test:
            try:
                module = __import__(module_name)
                if hasattr(module, class_name):
                    print(f"✅ {module_name}.{class_name} - 类可用")
                    project_modules.append(True)
                else:
                    print(f"⚠️  {module_name}.{class_name} - 类未找到")
                    project_modules.append(False)
            except ImportError as e:
                print(f"❌ {module_name} - 导入失败: {e}")
                project_modules.append(False)
    else:
        print("⚠️  python 目录未找到")
    
    print()
    
    # 功能测试
    print("🧪 基础功能测试:")
    
    # 测试 OpenCV
    try:
        import cv2
        import numpy as np
        
        # 创建测试图像
        test_img = np.zeros((100, 100, 3), dtype=np.uint8)
        test_img[:] = (255, 0, 0)  # 蓝色
        
        # 测试图像操作
        gray = cv2.cvtColor(test_img, cv2.COLOR_BGR2GRAY)
        print("✅ OpenCV 图像处理 - 正常")
    except Exception as e:
        print(f"❌ OpenCV 图像处理 - 失败: {e}")
    
    # 测试 JSON 处理
    try:
        import json
        test_data = {"test": "data", "number": 123}
        json_str = json.dumps(test_data)
        parsed_data = json.loads(json_str)
        print("✅ JSON 处理 - 正常")
    except Exception as e:
        print(f"❌ JSON 处理 - 失败: {e}")
    
    print()
    
    # 总结
    print("=" * 60)
    print("📊 测试总结:")
    print(f"核心依赖: {core_success}/{len(core_deps)} 成功")
    print(f"AI依赖: {ai_success}/{len(ai_deps)} 成功")
    print(f"数据处理依赖: {data_success}/{len(data_deps)} 成功")
    if project_modules:
        project_success = sum(project_modules)
        print(f"项目模块: {project_success}/{len(project_modules)} 成功")
    
    total_critical = core_success + ai_success
    total_expected = len(core_deps) + len([dep for dep, opt in ai_deps if not opt])
    
    if total_critical >= total_expected * 0.8:
        print("🎉 环境配置良好，可以运行项目！")
        return 0
    else:
        print("⚠️  环境配置不完整，请检查缺失的依赖")
        return 1

if __name__ == "__main__":
    sys.exit(main())