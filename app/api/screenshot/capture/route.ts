import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { withDetection = true, save = true } = await req.json();
    
    console.log(`📸 执行截图操作 - 检测框: ${withDetection}, 保存: ${save}`);
    
    // 模拟截图过程
    const screenshot = await simulateScreenshot(withDetection);
    
    let savedPath = null;
    if (save) {
      savedPath = await saveScreenshot(screenshot, withDetection);
    }
    
    return NextResponse.json({
      success: true,
      message: '截图成功',
      data: {
        timestamp: new Date().toISOString(),
        withDetection,
        saved: save,
        path: savedPath,
        size: screenshot.size,
        detectionCount: screenshot.detectionCount
      }
    });
    
  } catch (error: any) {
    console.error('截图失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function simulateScreenshot(withDetection: boolean) {
  // 在实际项目中，这里会：
  // 1. 从视频流组件获取当前帧
  // 2. 如果withDetection=true，叠加YOLO检测框
  // 3. 返回处理后的图像数据
  
  return {
    size: { width: 1920, height: 1080 },
    format: 'png',
    detectionCount: withDetection ? Math.floor(Math.random() * 5) + 1 : 0,
    data: 'base64_image_data_placeholder' // 实际项目中是真实的图像数据
  };
}

async function saveScreenshot(screenshot: any, withDetection: boolean): Promise<string> {
  try {
    // 创建保存目录
    const saveDir = path.join(process.cwd(), 'public', 'screenshots');
    await fs.mkdir(saveDir, { recursive: true });
    
    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const suffix = withDetection ? '_with_detection' : '';
    const filename = `screenshot_${timestamp}${suffix}.png`;
    const filePath = path.join(saveDir, filename);
    
    // 在实际项目中，这里会保存真实的图像数据
    // await fs.writeFile(filePath, screenshot.data, 'base64');
    
    // 创建一个占位符文件
    await fs.writeFile(filePath, `Screenshot taken at ${timestamp}\nWith detection: ${withDetection}\nDetection count: ${screenshot.detectionCount}`);
    
    return `/screenshots/${filename}`;
  } catch (error) {
    console.error('保存截图失败:', error);
    throw error;
  }
}