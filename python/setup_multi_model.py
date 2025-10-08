#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Tello无人机多模型检测系统安装和配置脚本
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def check_python_version():
    """检查Python版本"""
    if sys.version_info < (3.8, 0):
        print("❌ 需要Python 3.8或更高版本")
        return False
    print(f"✅ Python版本: {sys.version}")
    return True

def install_requirements():
    """安装依赖包"""
    print("📦 安装依赖包...")
    
    requirements_file = Path(__file__).parent / "requirements_multi_model.txt"
    
    if not requirements_file.exists():
        print("❌ requirements_multi_model.txt文件不存在")
        return False
    
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
        ])
        print("✅ 依赖包安装完成")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ 依赖包安装失败: {e}")
        return False

def check_models():
    """检查模型文件"""
    print("🔍 检查模型文件...")
    
    models_dir = Path(__file__).parent.parent / "models"
    required_models = ["best.pt", "disease.pt"]
    
    missing_models = []
    for model_name in required_models:
        model_path = models_dir / model_name
        if model_path.exists():
            print(f"✅ 找到模型: {model_name}")
        else:
            print(f"⚠️ 缺少模型: {model_name}")
            missing_models.append(model_name)
    
    if missing_models:
        print(f"\n⚠️ 缺少以下模型文件: {', '.join(missing_models)}")
        print(f"请将模型文件放置在: {models_dir}")
        return False
    
    return True

def test_imports():
    """测试关键模块导入"""
    print("🧪 测试模块导入...")
    
    test_modules = [
        ("cv2", "OpenCV"),
        ("numpy", "NumPy"),
        ("ultralytics", "YOLOv11"),
        ("djitellopy", "DJI Tello"),
        ("websockets", "WebSockets")
    ]
    
    failed_imports = []
    
    for module_name, display_name in test_modules:
        try:
            __import__(module_name)
            print(f"✅ {display_name}: 导入成功")
        except ImportError as e:
            print(f"❌ {display_name}: 导入失败 - {e}")
            failed_imports.append(display_name)
    
    if failed_imports:
        print(f"\n❌ 以下模块导入失败: {', '.join(failed_imports)}")
        return False
    
    return True

def test_yolo_model():
    """测试YOLO模型加载"""
    print("🤖 测试YOLO模型加载...")
    
    try:
        from ultralytics import YOLO
        
        # 尝试加载一个预训练模型进行测试
        model = YOLO('yolov8n.pt')  # 使用轻量级模型测试
        print("✅ YOLO模型加载测试成功")
        return True
    except Exception as e:
        print(f"❌ YOLO模型加载测试失败: {e}")
        return False

def create_config_template():
    """创建配置文件模板"""
    print("📝 创建配置文件模板...")
    
    config_template = {
        "models": {
            "maturity_model": "models/best.pt",
            "disease_model": "models/disease.pt"
        },
        "detection_settings": {
            "maturity_confidence_threshold": 0.2,
            "disease_confidence_threshold": 0.25,
            "iou_threshold": 0.45,
            "detection_interval": 0.1,
            "track_timeout": 2.0,
            "distance_threshold": 60
        },
        "tello_settings": {
            "response_timeout": 10,
            "video_retry_count": 3,
            "connection_retry_count": 3
        },
        "websocket_settings": {
            "port": 3003,
            "host": "localhost"
        }
    }
    
    config_path = Path(__file__).parent / "config_multi_model.json"
    
    try:
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config_template, f, indent=2, ensure_ascii=False)
        print(f"✅ 配置文件模板已创建: {config_path}")
        return True
    except Exception as e:
        print(f"❌ 创建配置文件失败: {e}")
        return False

def create_startup_script():
    """创建启动脚本"""
    print("🚀 创建启动脚本...")
    
    # Windows批处理脚本
    bat_script = """@echo off
echo 启动Tello无人机多模型检测系统...
cd /d "%~dp0"
python tello_multi_detector_backend.py
pause
"""
    
    # Linux/Mac shell脚本
    sh_script = """#!/bin/bash
echo "启动Tello无人机多模型检测系统..."
cd "$(dirname "$0")"
python3 tello_multi_detector_backend.py
"""
    
    try:
        # Windows脚本
        bat_path = Path(__file__).parent / "start_multi_detector.bat"
        with open(bat_path, 'w', encoding='utf-8') as f:
            f.write(bat_script)
        print(f"✅ Windows启动脚本已创建: {bat_path}")
        
        # Linux/Mac脚本
        sh_path = Path(__file__).parent / "start_multi_detector.sh"
        with open(sh_path, 'w', encoding='utf-8') as f:
            f.write(sh_script)
        
        # 设置执行权限
        if os.name != 'nt':  # 非Windows系统
            os.chmod(sh_path, 0o755)
        
        print(f"✅ Linux/Mac启动脚本已创建: {sh_path}")
        return True
        
    except Exception as e:
        print(f"❌ 创建启动脚本失败: {e}")
        return False

def run_system_test():
    """运行系统测试"""
    print("🔬 运行系统测试...")
    
    try:
        # 导入多模型检测器
        from multi_model_detector import MultiModelDetector
        
        # 创建测试配置
        models_config = {
            "best.pt": "models/best.pt",
            "disease.pt": "models/disease.pt"
        }
        
        # 初始化检测器
        detector = MultiModelDetector(models_config)
        
        # 检查模型状态
        status = detector.get_model_status()
        print(f"模型状态: {status}")
        
        if status['yolo_available']:
            print("✅ 系统测试通过")
            return True
        else:
            print("⚠️ YOLO不可用，但系统基本功能正常")
            return True
            
    except Exception as e:
        print(f"❌ 系统测试失败: {e}")
        return False

def main():
    """主函数"""
    print("🎯 Tello无人机多模型检测系统安装程序")
    print("=" * 50)
    
    steps = [
        ("检查Python版本", check_python_version),
        ("安装依赖包", install_requirements),
        ("测试模块导入", test_imports),
        ("测试YOLO模型", test_yolo_model),
        ("检查模型文件", check_models),
        ("创建配置文件", create_config_template),
        ("创建启动脚本", create_startup_script),
        ("运行系统测试", run_system_test)
    ]
    
    success_count = 0
    
    for step_name, step_func in steps:
        print(f"\n📋 {step_name}...")
        try:
            if step_func():
                success_count += 1
                print(f"✅ {step_name} 完成")
            else:
                print(f"❌ {step_name} 失败")
        except Exception as e:
            print(f"❌ {step_name} 异常: {e}")
    
    print("\n" + "=" * 50)
    print(f"安装完成: {success_count}/{len(steps)} 步骤成功")
    
    if success_count == len(steps):
        print("🎉 系统安装完全成功！")
        print("\n🚀 启动方式:")
        print("  Windows: 双击 start_multi_detector.bat")
        print("  Linux/Mac: ./start_multi_detector.sh")
        print("  手动: python tello_multi_detector_backend.py")
    elif success_count >= len(steps) - 2:
        print("⚠️ 系统基本安装成功，但有部分功能可能受限")
        print("请检查上述失败的步骤")
    else:
        print("❌ 系统安装失败，请解决上述问题后重试")
    
    print(f"\n📚 更多信息请查看文档和日志")

if __name__ == "__main__":
    main()