// 测试布局持久化功能的脚本
// 在浏览器控制台中运行此脚本来检查布局数据

function testLayoutPersistence() {
  const STORAGE_KEY = 'drone-analyzer-layouts';
  
  console.log('=== 布局持久化测试 ===');
  
  // 检查当前 localStorage 中的数据
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const layouts = JSON.parse(saved);
      console.log('✅ 找到保存的布局数据:');
      console.log(layouts);
      
      // 检查数据结构
      const componentIds = Object.keys(layouts);
      console.log('📋 保存的组件ID列表:', componentIds);
      
      // 检查每个组件的数据完整性
      componentIds.forEach(id => {
        const layout = layouts[id];
        if (layout.position && layout.size && layout.id) {
          console.log(`✅ 组件 ${id} 数据完整:`, layout);
        } else {
          console.log(`❌ 组件 ${id} 数据不完整:`, layout);
        }
      });
      
    } catch (error) {
      console.error('❌ 解析保存的布局数据失败:', error);
    }
  } else {
    console.log('❌ 没有找到保存的布局数据');
  }
  
  // 测试保存功能
  console.log('\n=== 测试保存功能 ===');
  const testLayout = {
    'test-component': {
      id: 'test-component',
      position: { x: 100, y: 200 },
      size: { width: 300, height: 400 }
    }
  };
  
  try {
    localStorage.setItem(STORAGE_KEY + '-test', JSON.stringify(testLayout));
    const retrieved = localStorage.getItem(STORAGE_KEY + '-test');
    if (retrieved) {
      const parsed = JSON.parse(retrieved);
      console.log('✅ 保存和读取测试成功:', parsed);
      localStorage.removeItem(STORAGE_KEY + '-test');
    } else {
      console.log('❌ 保存测试失败');
    }
  } catch (error) {
    console.error('❌ 保存测试出错:', error);
  }
  
  console.log('\n=== 测试完成 ===');
}

// 导出函数供控制台使用
if (typeof window !== 'undefined') {
  window.testLayoutPersistence = testLayoutPersistence;
  console.log('💡 在浏览器控制台中运行 testLayoutPersistence() 来测试布局持久化');
}

// 如果在 Node.js 环境中运行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testLayoutPersistence;
}