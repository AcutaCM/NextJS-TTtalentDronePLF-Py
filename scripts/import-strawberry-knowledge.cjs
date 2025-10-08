#!/usr/bin/env node

/**
 * 草莓知识库批量导入脚本
 * 将A草莓知识库目录中的PDF和DOCX文档导入到系统知识库中
 */

const fs = require('fs');
const path = require('path');

// 知识库目录路径
const KNOWLEDGE_BASE_DIR = 'c:\\Users\\Zarce\\PycharmProjects\\opencvpython\\electron-drone-analyzer2\\A草莓知识库';

// 支持的文件类型
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt'];

// 分类映射
const CATEGORY_MAPPING = {
  '病害': '草莓病害',
  '虫害': '草莓虫害', 
  '栽培': '草莓栽培',
  '管理': '草莓管理',
  '技术': '草莓技术',
  '防治': '草莓防治',
  '种植': '草莓种植',
  '育苗': '草莓育苗',
  '施肥': '草莓施肥',
  '灌溉': '草莓灌溉',
  '采收': '草莓采收',
  '储存': '草莓储存',
  '品种': '草莓品种',
  '营养': '草莓营养',
  '土壤': '土壤管理',
  '温室': '温室栽培',
  '大棚': '大棚栽培',
  '有机': '有机栽培',
  '无土': '无土栽培',
  '水培': '水培技术'
};

// 从文件名推断分类
function inferCategory(filename) {
  const name = filename.toLowerCase();
  
  for (const [keyword, category] of Object.entries(CATEGORY_MAPPING)) {
    if (name.includes(keyword)) {
      return category;
    }
  }
  
  return '草莓知识'; // 默认分类
}

// 从文件名提取标签
function extractTags(filename) {
  const name = filename.toLowerCase();
  const tags = ['草莓'];
  
  // 常见标签关键词
  const tagKeywords = [
    '病害', '虫害', '防治', '栽培', '种植', '管理', '技术',
    '育苗', '施肥', '灌溉', '采收', '储存', '品种', '营养',
    '土壤', '温室', '大棚', '有机', '无土', '水培', '叶面',
    '根系', '花期', '果期', '成熟', '品质', '产量', '效益'
  ];
  
  tagKeywords.forEach(keyword => {
    if (name.includes(keyword) && !tags.includes(keyword)) {
      tags.push(keyword);
    }
  });
  
  return tags;
}

// 生成知识条目内容
function generateKnowledgeContent(filename, filepath) {
  const category = inferCategory(filename);
  const tags = extractTags(filename);
  
  // 基于文件名生成描述性内容
  let content = `# ${filename.replace(/\.[^/.]+$/, "")}\n\n`;
  content += `本文档来源于草莓知识库，包含关于${category}的专业知识。\n\n`;
  content += `**文档信息：**\n`;
  content += `- 文件名：${filename}\n`;
  content += `- 分类：${category}\n`;
  content += `- 标签：${tags.join(', ')}\n`;
  content += `- 导入时间：${new Date().toLocaleString('zh-CN')}\n\n`;
  
  // 根据分类添加相关描述
  if (category.includes('病害')) {
    content += `**病害防治要点：**\n`;
    content += `- 及时识别病害症状\n`;
    content += `- 选择合适的防治方法\n`;
    content += `- 注意预防措施\n`;
    content += `- 合理使用农药\n\n`;
  } else if (category.includes('栽培')) {
    content += `**栽培技术要点：**\n`;
    content += `- 选择适宜的品种\n`;
    content += `- 合理安排种植密度\n`;
    content += `- 科学施肥管理\n`;
    content += `- 适时浇水灌溉\n\n`;
  } else if (category.includes('管理')) {
    content += `**管理技术要点：**\n`;
    content += `- 日常田间管理\n`;
    content += `- 生长期监控\n`;
    content += `- 环境条件调控\n`;
    content += `- 品质提升措施\n\n`;
  }
  
  content += `**注意：** 本文档为自动导入的知识条目，详细内容请参考原始文档。如需更新或补充信息，请通过知识库管理功能进行编辑。`;
  
  return {
    title: filename.replace(/\.[^/.]+$/, ""),
    content: content,
    category: category,
    tags: tags,
    type: 'document',
    source: 'strawberry_knowledge_import',
    metadata: {
      originalFile: filepath,
      fileSize: getFileSize(filepath),
      importDate: new Date().toISOString()
    }
  };
}

// 获取文件大小
function getFileSize(filepath) {
  try {
    const stats = fs.statSync(filepath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

// 扫描知识库目录
function scanKnowledgeDirectory(dir) {
  const knowledgeFiles = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          knowledgeFiles.push({
            name: item,
            path: fullPath,
            size: stat.size,
            extension: ext
          });
        }
      }
    }
  } catch (error) {
    console.error('❌ 扫描知识库目录失败:', error.message);
  }
  
  return knowledgeFiles;
}

// 生成知识库导入数据
function generateKnowledgeData() {
  console.log('🔍 扫描草莓知识库目录...');
  
  if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) {
    console.error('❌ 草莓知识库目录不存在:', KNOWLEDGE_BASE_DIR);
    return [];
  }
  
  const files = scanKnowledgeDirectory(KNOWLEDGE_BASE_DIR);
  console.log(`📚 发现 ${files.length} 个知识文档`);
  
  const knowledgeData = [];
  
  for (const file of files) {
    const knowledge = generateKnowledgeContent(file.name, file.path);
    knowledgeData.push(knowledge);
  }
  
  return knowledgeData;
}

// 生成导入脚本
function generateImportScript() {
  const knowledgeData = generateKnowledgeData();
  
  if (knowledgeData.length === 0) {
    console.log('⚠️ 没有找到可导入的知识文档');
    return;
  }
  
  // 生成JavaScript导入代码
  const importScript = `
// 草莓知识库自动导入脚本
// 生成时间: ${new Date().toLocaleString('zh-CN')}
// 文档数量: ${knowledgeData.length}

import { knowledgeBaseManager } from '../lib/knowledgeBase.js';

export const strawberryKnowledgeData = ${JSON.stringify(knowledgeData, null, 2)};

export async function importStrawberryKnowledge() {
  console.log('🍓 开始导入草莓知识库...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const knowledge of strawberryKnowledgeData) {
    try {
      await knowledgeBaseManager.addKnowledge(knowledge);
      successCount++;
      console.log(\`✅ 导入成功: \${knowledge.title}\`);
    } catch (error) {
      errorCount++;
      console.error(\`❌ 导入失败: \${knowledge.title}\`, error.message);
    }
  }
  
  console.log(\`🎉 草莓知识库导入完成！成功: \${successCount}, 失败: \${errorCount}\`);
  
  return {
    success: successCount,
    error: errorCount,
    total: strawberryKnowledgeData.length
  };
}

// 如果直接运行此脚本
if (typeof window !== 'undefined') {
  // 浏览器环境
  window.importStrawberryKnowledge = importStrawberryKnowledge;
} else if (typeof module !== 'undefined' && module.exports) {
  // Node.js环境
  module.exports = { strawberryKnowledgeData, importStrawberryKnowledge };
}
`;
  
  // 保存导入脚本
  const outputPath = path.join(__dirname, 'strawberry-knowledge-import.js');
  fs.writeFileSync(outputPath, importScript, 'utf8');
  
  console.log(`📝 导入脚本已生成: ${outputPath}`);
  console.log(`📊 统计信息:`);
  
  // 统计分类分布
  const categoryStats = {};
  knowledgeData.forEach(item => {
    categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
  });
  
  console.log('   分类分布:');
  Object.entries(categoryStats).forEach(([category, count]) => {
    console.log(`     - ${category}: ${count}个文档`);
  });
  
  // 统计文件类型分布
  const typeStats = {};
  const files = scanKnowledgeDirectory(KNOWLEDGE_BASE_DIR);
  files.forEach(file => {
    typeStats[file.extension] = (typeStats[file.extension] || 0) + 1;
  });
  
  console.log('   文件类型:');
  Object.entries(typeStats).forEach(([type, count]) => {
    console.log(`     - ${type}: ${count}个文件`);
  });
  
  return outputPath;
}

// 主函数
function main() {
  console.log('🍓 草莓知识库批量导入工具');
  console.log('================================');
  
  try {
    const scriptPath = generateImportScript();
    
    console.log('\n✨ 导入脚本生成完成！');
    console.log('\n📋 使用方法:');
    console.log('1. 在前端应用中导入生成的脚本');
    console.log('2. 调用 importStrawberryKnowledge() 函数');
    console.log('3. 等待导入完成');
    
    console.log('\n💡 提示:');
    console.log('- 导入过程可能需要一些时间，请耐心等待');
    console.log('- 建议在系统空闲时进行批量导入');
    console.log('- 导入后可以通过知识库管理界面查看和编辑');
    
  } catch (error) {
    console.error('❌ 生成导入脚本失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  generateKnowledgeData,
  generateImportScript,
  CATEGORY_MAPPING,
  SUPPORTED_EXTENSIONS
};