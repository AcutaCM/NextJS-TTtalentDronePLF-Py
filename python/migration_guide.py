#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
系统迁移指南
提供从旧系统到优化系统的平滑迁移工具和指导
"""

import os
import json
import shutil
import logging
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
from dataclasses import dataclass
import importlib.util
import sys

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class MigrationStep:
    """迁移步骤"""
    name: str
    description: str
    action: callable
    required: bool = True
    rollback_action: Optional[callable] = None
    
    async def execute(self) -> Tuple[bool, str]:
        """执行迁移步骤"""
        try:
            logger.info(f"执行迁移步骤: {self.name}")
            if asyncio.iscoroutinefunction(self.action):
                result = await self.action()
            else:
                result = self.action()
            
            if result:
                logger.info(f"迁移步骤完成: {self.name}")
                return True, "成功"
            else:
                logger.error(f"迁移步骤失败: {self.name}")
                return False, "执行失败"
                
        except Exception as e:
            logger.error(f"迁移步骤异常: {self.name} - {e}")
            return False, str(e)
    
    async def rollback(self) -> bool:
        """回滚迁移步骤"""
        if not self.rollback_action:
            return True
        
        try:
            logger.info(f"回滚迁移步骤: {self.name}")
            if asyncio.iscoroutinefunction(self.rollback_action):
                result = await self.rollback_action()
            else:
                result = self.rollback_action()
            
            logger.info(f"回滚完成: {self.name}")
            return result
            
        except Exception as e:
            logger.error(f"回滚失败: {self.name} - {e}")
            return False


class SystemMigrator:
    """系统迁移器"""
    
    def __init__(self, source_dir: str, target_dir: str = None):
        self.source_dir = Path(source_dir)
        self.target_dir = Path(target_dir) if target_dir else self.source_dir
        self.backup_dir = self.target_dir / "backup_migration"
        
        # 迁移状态
        self.migration_log = []
        self.completed_steps = []
        self.failed_steps = []
        
        # 文件映射
        self.file_mappings = {
            # 原始文件 -> 优化文件
            "drone_backend.py": "optimized_drone_backend.py",
            "multi_model_detector.py": "enhanced_multi_model_detector.py",
            "requirements.txt": "optimized_requirements.txt"
        }
        
        # 配置映射
        self.config_mappings = {
            "websocket_port": "websocket_port",
            "http_port": "http_port",
            "detection_confidence": "detection_confidence",
            "detection_interval": "detection_interval"
        }
        
        # 创建迁移步骤
        self.migration_steps = self._create_migration_steps()
    
    def _create_migration_steps(self) -> List[MigrationStep]:
        """创建迁移步骤"""
        steps = []
        
        # 1. 环境检查
        steps.append(MigrationStep(
            name="environment_check",
            description="检查迁移环境和依赖",
            action=self._check_environment,
            required=True
        ))
        
        # 2. 备份原始文件
        steps.append(MigrationStep(
            name="backup_files",
            description="备份原始系统文件",
            action=self._backup_files,
            required=True,
            rollback_action=self._restore_backup
        ))
        
        # 3. 安装新依赖
        steps.append(MigrationStep(
            name="install_dependencies",
            description="安装优化系统的依赖包",
            action=self._install_dependencies,
            required=True
        ))
        
        # 4. 迁移配置文件
        steps.append(MigrationStep(
            name="migrate_config",
            description="迁移和转换配置文件",
            action=self._migrate_config,
            required=True,
            rollback_action=self._restore_config
        ))
        
        # 5. 部署优化文件
        steps.append(MigrationStep(
            name="deploy_optimized_files",
            description="部署优化后的系统文件",
            action=self._deploy_optimized_files,
            required=True,
            rollback_action=self._restore_original_files
        ))
        
        # 6. 更新导入语句
        steps.append(MigrationStep(
            name="update_imports",
            description="更新相关文件的导入语句",
            action=self._update_imports,
            required=False,
            rollback_action=self._restore_imports
        ))
        
        # 7. 验证迁移
        steps.append(MigrationStep(
            name="validate_migration",
            description="验证迁移后的系统完整性",
            action=self._validate_migration,
            required=True
        ))
        
        # 8. 性能测试
        steps.append(MigrationStep(
            name="performance_test",
            description="运行性能测试确保优化效果",
            action=self._performance_test,
            required=False
        ))
        
        return steps
    
    async def migrate(self) -> bool:
        """执行完整迁移"""
        logger.info("开始系统迁移...")
        
        try:
            # 创建备份目录
            self.backup_dir.mkdir(exist_ok=True)
            
            # 执行迁移步骤
            for step in self.migration_steps:
                success, message = await step.execute()
                
                self.migration_log.append({
                    'step': step.name,
                    'success': success,
                    'message': message,
                    'required': step.required
                })
                
                if success:
                    self.completed_steps.append(step)
                else:
                    self.failed_steps.append(step)
                    
                    if step.required:
                        logger.error(f"必需的迁移步骤失败: {step.name}")
                        await self._rollback_migration()
                        return False
                    else:
                        logger.warning(f"可选的迁移步骤失败: {step.name}")
            
            # 生成迁移报告
            await self._generate_migration_report()
            
            logger.info("系统迁移完成!")
            return True
            
        except Exception as e:
            logger.error(f"迁移过程中出现异常: {e}")
            await self._rollback_migration()
            return False
    
    async def _rollback_migration(self):
        """回滚迁移"""
        logger.info("开始回滚迁移...")
        
        # 逆序回滚已完成的步骤
        for step in reversed(self.completed_steps):
            try:
                await step.rollback()
            except Exception as e:
                logger.error(f"回滚步骤失败: {step.name} - {e}")
        
        logger.info("迁移回滚完成")
    
    def _check_environment(self) -> bool:
        """检查环境"""
        logger.info("检查迁移环境...")
        
        # 检查源目录
        if not self.source_dir.exists():
            logger.error(f"源目录不存在: {self.source_dir}")
            return False
        
        # 检查必需的原始文件
        required_files = ["drone_backend.py"]
        for file_name in required_files:
            file_path = self.source_dir / file_name
            if not file_path.exists():
                logger.error(f"必需的文件不存在: {file_path}")
                return False
        
        # 检查Python版本
        if sys.version_info < (3, 8):
            logger.error("需要Python 3.8或更高版本")
            return False
        
        # 检查磁盘空间
        try:
            stat = shutil.disk_usage(self.target_dir)
            free_gb = stat.free / (1024**3)
            if free_gb < 1.0:  # 至少需要1GB空间
                logger.error(f"磁盘空间不足: {free_gb:.1f}GB")
                return False
        except Exception as e:
            logger.warning(f"无法检查磁盘空间: {e}")
        
        logger.info("环境检查通过")
        return True
    
    def _backup_files(self) -> bool:
        """备份文件"""
        logger.info("备份原始文件...")
        
        try:
            # 备份主要文件
            files_to_backup = [
                "drone_backend.py",
                "multi_model_detector.py",
                "requirements.txt",
                "tello_multi_detector_backend.py"
            ]
            
            for file_name in files_to_backup:
                source_file = self.source_dir / file_name
                if source_file.exists():
                    backup_file = self.backup_dir / file_name
                    shutil.copy2(source_file, backup_file)
                    logger.info(f"已备份: {file_name}")
            
            # 备份配置文件
            config_files = list(self.source_dir.glob("*.json")) + list(self.source_dir.glob("*.yaml"))
            for config_file in config_files:
                backup_file = self.backup_dir / config_file.name
                shutil.copy2(config_file, backup_file)
                logger.info(f"已备份配置: {config_file.name}")
            
            return True
            
        except Exception as e:
            logger.error(f"备份文件失败: {e}")
            return False
    
    def _restore_backup(self) -> bool:
        """恢复备份"""
        logger.info("恢复备份文件...")
        
        try:
            if not self.backup_dir.exists():
                return True
            
            for backup_file in self.backup_dir.iterdir():
                if backup_file.is_file():
                    target_file = self.source_dir / backup_file.name
                    shutil.copy2(backup_file, target_file)
                    logger.info(f"已恢复: {backup_file.name}")
            
            return True
            
        except Exception as e:
            logger.error(f"恢复备份失败: {e}")
            return False
    
    async def _install_dependencies(self) -> bool:
        """安装依赖"""
        logger.info("安装新依赖...")
        
        try:
            # 检查是否存在优化的requirements文件
            optimized_req = self.source_dir / "optimized_requirements.txt"
            if not optimized_req.exists():
                logger.warning("优化的requirements文件不存在，跳过依赖安装")
                return True
            
            # 使用pip安装
            import subprocess
            result = subprocess.run([
                sys.executable, "-m", "pip", "install", "-r", str(optimized_req)
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info("依赖安装成功")
                return True
            else:
                logger.error(f"依赖安装失败: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"安装依赖时出错: {e}")
            return False
    
    def _migrate_config(self) -> bool:
        """迁移配置"""
        logger.info("迁移配置文件...")
        
        try:
            # 查找现有配置
            old_config = {}
            
            # 尝试从原始代码中提取配置
            drone_backend = self.source_dir / "drone_backend.py"
            if drone_backend.exists():
                old_config.update(self._extract_config_from_code(drone_backend))
            
            # 查找JSON配置文件
            for config_file in self.source_dir.glob("*.json"):
                try:
                    with open(config_file, 'r', encoding='utf-8') as f:
                        file_config = json.load(f)
                        old_config.update(file_config)
                except Exception as e:
                    logger.warning(f"无法读取配置文件 {config_file}: {e}")
            
            # 创建新的系统配置
            new_config = self._create_new_config(old_config)
            
            # 保存新配置
            config_path = self.target_dir / "system_config.json"
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(new_config, f, indent=2, ensure_ascii=False)
            
            logger.info(f"配置已迁移到: {config_path}")
            return True
            
        except Exception as e:
            logger.error(f"配置迁移失败: {e}")
            return False
    
    def _extract_config_from_code(self, code_file: Path) -> Dict[str, Any]:
        """从代码中提取配置"""
        config = {}
        
        try:
            with open(code_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 简单的正则提取（可以根据需要改进）
            import re
            
            # 提取端口配置
            port_match = re.search(r'port["\']?\s*[:=]\s*(\d+)', content, re.IGNORECASE)
            if port_match:
                config['websocket_port'] = int(port_match.group(1))
            
            # 提取置信度配置
            conf_match = re.search(r'confidence["\']?\s*[:=]\s*([\d.]+)', content, re.IGNORECASE)
            if conf_match:
                config['detection_confidence'] = float(conf_match.group(1))
            
        except Exception as e:
            logger.warning(f"从代码提取配置失败: {e}")
        
        return config
    
    def _create_new_config(self, old_config: Dict[str, Any]) -> Dict[str, Any]:
        """创建新配置"""
        # 默认配置
        new_config = {
            "websocket_port": 3005,
            "http_port": 8081,
            "host": "localhost",
            "enable_performance_monitoring": True,
            "enable_protocol_upgrade": True,
            "enable_interface_validation": True,
            "enable_enhanced_error_handling": True,
            "maturity_model_path": "strawberry_yolov11.pt",
            "disease_model_path": "best.pt",
            "detection_confidence": 0.5,
            "detection_interval": 0.1,
            "max_fps": 30,
            "frame_skip_ratio": 0.3,
            "enable_adaptive_quality": True,
            "enable_compression": True,
            "performance_report_interval": 300,
            "error_history_limit": 1000
        }
        
        # 应用旧配置中的值
        for old_key, new_key in self.config_mappings.items():
            if old_key in old_config:
                new_config[new_key] = old_config[old_key]
        
        return new_config
    
    def _restore_config(self) -> bool:
        """恢复配置"""
        try:
            # 删除新配置文件
            config_path = self.target_dir / "system_config.json"
            if config_path.exists():
                config_path.unlink()
            
            return True
        except Exception as e:
            logger.error(f"恢复配置失败: {e}")
            return False
    
    def _deploy_optimized_files(self) -> bool:
        """部署优化文件"""
        logger.info("部署优化文件...")
        
        try:
            # 优化文件列表
            optimized_files = [
                "optimized_drone_backend.py",
                "enhanced_multi_model_detector.py",
                "performance_monitor.py",
                "protocol_upgrade.py",
                "interface_validator.py",
                "error_handler.py",
                "system_integration.py",
                "optimized_requirements.txt"
            ]
            
            # 检查并复制文件
            for file_name in optimized_files:
                source_file = Path(__file__).parent / file_name
                target_file = self.target_dir / file_name
                
                if source_file.exists():
                    shutil.copy2(source_file, target_file)
                    logger.info(f"已部署: {file_name}")
                else:
                    logger.warning(f"优化文件不存在: {file_name}")
            
            return True
            
        except Exception as e:
            logger.error(f"部署优化文件失败: {e}")
            return False
    
    def _restore_original_files(self) -> bool:
        """恢复原始文件"""
        try:
            # 删除优化文件
            optimized_files = [
                "optimized_drone_backend.py",
                "enhanced_multi_model_detector.py",
                "performance_monitor.py",
                "protocol_upgrade.py",
                "interface_validator.py",
                "error_handler.py",
                "system_integration.py"
            ]
            
            for file_name in optimized_files:
                file_path = self.target_dir / file_name
                if file_path.exists():
                    file_path.unlink()
            
            return True
        except Exception as e:
            logger.error(f"恢复原始文件失败: {e}")
            return False
    
    def _update_imports(self) -> bool:
        """更新导入语句"""
        logger.info("更新导入语句...")
        
        try:
            # 需要更新的文件
            files_to_update = []
            
            # 查找可能需要更新的Python文件
            for py_file in self.target_dir.glob("*.py"):
                if py_file.name not in ["optimized_drone_backend.py", "enhanced_multi_model_detector.py"]:
                    files_to_update.append(py_file)
            
            # 导入映射
            import_mappings = {
                "from drone_backend import": "from optimized_drone_backend import",
                "import drone_backend": "import optimized_drone_backend as drone_backend",
                "from multi_model_detector import": "from enhanced_multi_model_detector import",
                "import multi_model_detector": "import enhanced_multi_model_detector as multi_model_detector"
            }
            
            # 更新文件
            for file_path in files_to_update:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    original_content = content
                    
                    # 应用导入映射
                    for old_import, new_import in import_mappings.items():
                        content = content.replace(old_import, new_import)
                    
                    # 如果有变化，保存文件
                    if content != original_content:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(content)
                        logger.info(f"已更新导入: {file_path.name}")
                
                except Exception as e:
                    logger.warning(f"更新文件 {file_path} 失败: {e}")
            
            return True
            
        except Exception as e:
            logger.error(f"更新导入语句失败: {e}")
            return False
    
    def _restore_imports(self) -> bool:
        """恢复导入语句"""
        # 这里可以实现导入语句的恢复逻辑
        # 由于复杂性，暂时返回True
        return True
    
    async def _validate_migration(self) -> bool:
        """验证迁移"""
        logger.info("验证迁移结果...")
        
        try:
            # 检查关键文件是否存在
            required_files = [
                "optimized_drone_backend.py",
                "enhanced_multi_model_detector.py",
                "system_integration.py",
                "system_config.json"
            ]
            
            for file_name in required_files:
                file_path = self.target_dir / file_name
                if not file_path.exists():
                    logger.error(f"关键文件缺失: {file_name}")
                    return False
            
            # 尝试导入新模块
            try:
                sys.path.insert(0, str(self.target_dir))
                
                # 测试导入
                spec = importlib.util.spec_from_file_location(
                    "system_integration", 
                    self.target_dir / "system_integration.py"
                )
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                logger.info("模块导入测试通过")
                
            except Exception as e:
                logger.error(f"模块导入测试失败: {e}")
                return False
            finally:
                if str(self.target_dir) in sys.path:
                    sys.path.remove(str(self.target_dir))
            
            # 检查配置文件格式
            config_path = self.target_dir / "system_config.json"
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                
                # 验证必需的配置项
                required_config = ["websocket_port", "http_port", "detection_confidence"]
                for key in required_config:
                    if key not in config:
                        logger.error(f"配置项缺失: {key}")
                        return False
                
                logger.info("配置文件验证通过")
                
            except Exception as e:
                logger.error(f"配置文件验证失败: {e}")
                return False
            
            logger.info("迁移验证通过")
            return True
            
        except Exception as e:
            logger.error(f"验证迁移失败: {e}")
            return False
    
    async def _performance_test(self) -> bool:
        """性能测试"""
        logger.info("运行性能测试...")
        
        try:
            # 这里可以实现简单的性能测试
            # 例如：测试模块加载时间、内存使用等
            
            import time
            import psutil
            
            # 测试模块加载时间
            start_time = time.time()
            
            try:
                sys.path.insert(0, str(self.target_dir))
                
                # 导入优化模块
                spec = importlib.util.spec_from_file_location(
                    "optimized_drone_backend", 
                    self.target_dir / "optimized_drone_backend.py"
                )
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                load_time = time.time() - start_time
                logger.info(f"模块加载时间: {load_time:.3f}秒")
                
                # 检查内存使用
                process = psutil.Process()
                memory_mb = process.memory_info().rss / 1024 / 1024
                logger.info(f"当前内存使用: {memory_mb:.1f}MB")
                
                return True
                
            except Exception as e:
                logger.error(f"性能测试失败: {e}")
                return False
            finally:
                if str(self.target_dir) in sys.path:
                    sys.path.remove(str(self.target_dir))
            
        except Exception as e:
            logger.warning(f"性能测试出错: {e}")
            return True  # 性能测试是可选的
    
    async def _generate_migration_report(self):
        """生成迁移报告"""
        logger.info("生成迁移报告...")
        
        try:
            report = {
                "migration_summary": {
                    "total_steps": len(self.migration_steps),
                    "completed_steps": len(self.completed_steps),
                    "failed_steps": len(self.failed_steps),
                    "success_rate": len(self.completed_steps) / len(self.migration_steps)
                },
                "migration_log": self.migration_log,
                "file_mappings": self.file_mappings,
                "backup_location": str(self.backup_dir),
                "recommendations": self._generate_recommendations()
            }
            
            # 保存报告
            report_path = self.target_dir / "migration_report.json"
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            
            logger.info(f"迁移报告已保存: {report_path}")
            
        except Exception as e:
            logger.error(f"生成迁移报告失败: {e}")
    
    def _generate_recommendations(self) -> List[str]:
        """生成建议"""
        recommendations = []
        
        if self.failed_steps:
            recommendations.append("有迁移步骤失败，请检查日志并手动处理")
        
        recommendations.extend([
            "建议运行完整的系统测试以确保功能正常",
            "可以通过 python system_integration.py 启动新系统",
            "监控系统性能并根据需要调整配置",
            "定期备份系统配置和数据"
        ])
        
        return recommendations


async def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="无人机系统迁移工具")
    parser.add_argument("--source", "-s", required=True, help="源目录路径")
    parser.add_argument("--target", "-t", help="目标目录路径（默认为源目录）")
    parser.add_argument("--dry-run", action="store_true", help="仅检查，不执行实际迁移")
    
    args = parser.parse_args()
    
    # 创建迁移器
    migrator = SystemMigrator(args.source, args.target)
    
    if args.dry_run:
        logger.info("执行干运行模式...")
        # 只执行环境检查
        success = migrator._check_environment()
        if success:
            logger.info("环境检查通过，可以执行迁移")
        else:
            logger.error("环境检查失败，请修复问题后重试")
        return 0 if success else 1
    
    # 执行迁移
    success = await migrator.migrate()
    
    if success:
        logger.info("迁移成功完成!")
        logger.info("请运行以下命令启动新系统:")
        logger.info(f"cd {migrator.target_dir}")
        logger.info("python system_integration.py")
        return 0
    else:
        logger.error("迁移失败，请检查日志")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())