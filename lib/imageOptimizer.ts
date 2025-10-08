/**
 * 图片优化工具库
 * 提供高效的图片压缩、缓存和处理功能
 */

import { imageCache } from './imageCache';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
  enableCache?: boolean;
}

interface OptimizedImage {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
  format: string;
}

// 根据文件大小推荐优化选项
export function getRecommendedOptions(fileSize: number): ImageOptimizationOptions {
  if (fileSize > 5 * 1024 * 1024) { // > 5MB
    return {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.7,
      format: 'jpeg',
      enableCache: true
    };
  } else if (fileSize > 2 * 1024 * 1024) { // > 2MB
    return {
      maxWidth: 2560,
      maxHeight: 1440,
      quality: 0.8,
      format: 'jpeg',
      enableCache: true
    };
  } else if (fileSize > 500 * 1024) { // > 500KB
    return {
      maxWidth: 3840,
      maxHeight: 2160,
      quality: 0.85,
      format: 'jpeg',
      enableCache: true
    };
  } else {
    return {
      quality: 0.9,
      enableCache: true
    };
  }
}

// 优化图片并返回 base64
export async function optimizeImage(file: File, options: ImageOptimizationOptions = {}): Promise<string> {
  const opts = { ...getRecommendedOptions(file.size), ...options };
  
  // 检查缓存
  if (opts.enableCache) {
    const cached = imageCache.get(file, opts);
    if (cached) {
      return cached;
    }
  }

  const originalSize = file.size;
  const base64 = await processImage(file, opts);
  
  // 计算压缩后大小（base64 大约比原始数据大 33%）
  const compressedSize = (base64.length * 3) / 4;
  
  // 保存到缓存
  if (opts.enableCache) {
    imageCache.set(file, opts, base64, originalSize, compressedSize);
  }

  const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
  console.log(`🖼️ 图片优化完成: ${file.name}`);
  console.log(`📊 原始大小: ${(originalSize / 1024).toFixed(2)}KB`);
  console.log(`📊 压缩后大小: ${(compressedSize / 1024).toFixed(2)}KB`);
  console.log(`📊 压缩比: ${compressionRatio.toFixed(2)}%`);

  return base64;
}

// 处理图片的核心函数
async function processImage(file: File, options: ImageOptimizationOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('无法创建 Canvas 上下文'));
      return;
    }

    img.onload = () => {
      // 计算新的尺寸
      let { width, height } = img;
      
      if (options.maxWidth && width > options.maxWidth) {
        height = (height * options.maxWidth) / width;
        width = options.maxWidth;
      }
      
      if (options.maxHeight && height > options.maxHeight) {
        width = (width * options.maxHeight) / height;
        height = options.maxHeight;
      }

      // 设置 canvas 尺寸
      canvas.width = width;
      canvas.height = height;

      // 启用图像平滑以提高质量
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 绘制图片
      ctx.drawImage(img, 0, 0, width, height);

      // 转换为 base64
      const format = options.format || 'jpeg';
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 
                      format === 'webp' ? 'image/webp' : 'image/png';
      
      try {
        const dataUrl = canvas.toDataURL(mimeType, options.quality || 0.9);
        const base64 = dataUrl.split(',')[1]; // 移除 data: 前缀
        resolve(base64);
      } catch (error) {
        reject(error);
      } finally {
        // 清理资源
        URL.revokeObjectURL(img.src);
      }
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    // 创建对象 URL 并加载图片
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
  });
}

class ImageOptimizer {
  private cache = new Map<string, OptimizedImage>();
  private readonly defaultOptions: Required<ImageOptimizationOptions> = {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.8,
    format: 'jpeg',
    enableCache: true
  };

  /**
   * 优化图片文件
   */
  async optimizeFile(file: File, options?: ImageOptimizationOptions): Promise<OptimizedImage> {
    const opts = { ...this.defaultOptions, ...options };
    
    // 生成缓存键
    const cacheKey = this.generateCacheKey(file, opts);
    
    // 检查缓存
    if (opts.enableCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const result = await this.processImage(file, opts);
    
    // 存储到缓存
    if (opts.enableCache) {
      this.cache.set(cacheKey, result);
    }
    
    return result;
  }

  /**
   * 处理图片
   */
  private async processImage(file: File, options: Required<ImageOptimizationOptions>): Promise<OptimizedImage> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('无法创建Canvas上下文'));
        return;
      }

      img.onload = () => {
        try {
          // 计算新尺寸
          const { width, height } = this.calculateDimensions(
            img.width, 
            img.height, 
            options.maxWidth, 
            options.maxHeight
          );

          // 设置Canvas尺寸
          canvas.width = width;
          canvas.height = height;

          // 启用图像平滑以提高质量
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // 绘制压缩后的图片
          ctx.drawImage(img, 0, 0, width, height);

          // 转换为指定格式，直接返回base64字符串（不包含data:前缀）
          const mimeType = `image/${options.format}`;
          const dataUrl = canvas.toDataURL(mimeType, options.quality);
          const base64String = dataUrl.split(',')[1]; // 提取base64部分

          // 计算压缩比
          const originalSize = file.size;
          const compressedSize = this.estimateBase64Size(base64String);
          const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

          resolve({
            dataUrl: base64String, // 只返回base64字符串
            originalSize,
            compressedSize,
            compressionRatio,
            width,
            height,
            format: options.format
          });
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('图片加载失败'));
      
      // 创建对象URL以加载图片
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      
      // 清理对象URL
      const originalOnload = img.onload;
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        if (originalOnload) originalOnload.call(img);
      };
    });
  }

  /**
   * 计算优化后的尺寸
   */
  private calculateDimensions(
    originalWidth: number, 
    originalHeight: number, 
    maxWidth: number, 
    maxHeight: number
  ): { width: number; height: number } {
    let { width, height } = { width: originalWidth, height: originalHeight };

    // 如果图片尺寸超过限制，按比例缩放
    if (width > maxWidth || height > maxHeight) {
      const aspectRatio = width / height;
      
      if (width > height) {
        width = maxWidth;
        height = width / aspectRatio;
      } else {
        height = maxHeight;
        width = height * aspectRatio;
      }
    }

    return { 
      width: Math.round(width), 
      height: Math.round(height) 
    };
  }

  /**
   * 估算Base64字符串的字节大小
   */
  private estimateBase64Size(dataUrl: string): number {
    const base64String = dataUrl.split(',')[1] || dataUrl;
    return Math.round((base64String.length * 3) / 4);
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(file: File, options: Required<ImageOptimizationOptions>): string {
    return `${file.name}_${file.size}_${file.lastModified}_${JSON.stringify(options)}`;
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * 批量优化图片
   */
  async optimizeFiles(files: File[], options?: ImageOptimizationOptions): Promise<OptimizedImage[]> {
    const promises = files.map(file => this.optimizeFile(file, options));
    return Promise.all(promises);
  }

  /**
   * 检查文件是否为支持的图片格式
   */
  static isImageFile(file: File): boolean {
    return file.type.startsWith('image/') && 
           ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
  }

  /**
   * 获取推荐的优化选项
   */
  static getRecommendedOptions(fileSize: number): ImageOptimizationOptions {
    if (fileSize > 5 * 1024 * 1024) { // > 5MB
      return {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.7,
        format: 'jpeg'
      };
    } else if (fileSize > 2 * 1024 * 1024) { // > 2MB
      return {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.8,
        format: 'jpeg'
      };
    } else {
      return {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
        format: 'jpeg'
      };
    }
  }
}

// 创建全局实例
export const imageOptimizer = new ImageOptimizer();

// 导出类型和工具函数
export type { ImageOptimizationOptions, OptimizedImage };
export { ImageOptimizer };