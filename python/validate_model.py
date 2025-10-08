#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单模型验证脚本：
- 尝试用 ultralytics 加载 .pt 模型
- 输出模型类别数与名称（若可用）
- 退出码 0 表示通过；非 0 表示失败
"""
import sys, os

def main():
    if len(sys.argv) < 2:
        print("缺少模型路径参数", file=sys.stderr)
        return 2
    model_path = sys.argv[1]
    if not os.path.isfile(model_path):
        print("模型文件不存在", file=sys.stderr)
        return 3
    if not model_path.lower().endswith('.pt'):
        print("仅支持.pt文件", file=sys.stderr)
        return 4
    try:
        from ultralytics import YOLO
    except Exception as e:
        print("ultralytics未安装或不可用: %s" % e, file=sys.stderr)
        return 5
    try:
        model = YOLO(model_path)
        names = getattr(model, 'names', None)
        if isinstance(names, dict):
            print("模型验证通过，类别数: %d" % len(names))
        else:
            print("模型验证通过")
        return 0
    except Exception as e:
        print("模型加载失败: %s" % e, file=sys.stderr)
        return 6

if __name__ == '__main__':
    sys.exit(main())