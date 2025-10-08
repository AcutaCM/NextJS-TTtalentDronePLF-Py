// 图片缓存管理器
interface CachedImage {
  base64: string;
  timestamp: number;
  size: number;
  originalSize: number;
  compressionRatio: number;
}

class ImageCache {
  private cache = new Map<string, CachedImage>();
  private maxCacheSize = 50 * 1024 * 1024; // 50MB 最大缓存大小
  private maxAge = 30 * 60 * 1000; // 30分钟过期时间

  // 生成缓存键
  private generateKey(file: File, options: any): string {
    return `${file.name}_${file.size}_${file.lastModified}_${JSON.stringify(options)}`;
  }

  // 获取缓存
  get(file: File, options: any): string | null {
    const key = this.generateKey(file, options);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    console.log(`🎯 缓存命中: ${file.name}, 压缩比: ${cached.compressionRatio.toFixed(2)}%`);
    return cached.base64;
  }

  // 设置缓存
  set(file: File, options: any, base64: string, originalSize: number, compressedSize: number): void {
    const key = this.generateKey(file, options);
    
    // 清理过期缓存
    this.cleanup();

    // 检查缓存大小限制
    const estimatedSize = base64.length * 0.75; // base64 大约比原始数据大 33%
    if (estimatedSize > this.maxCacheSize / 10) { // 单个文件不超过缓存总大小的 10%
      console.warn(`⚠️ 文件过大，不缓存: ${file.name}`);
      return;
    }

    // 如果缓存即将超限，清理最旧的条目
    while (this.getCurrentCacheSize() + estimatedSize > this.maxCacheSize) {
      this.removeOldest();
    }

    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

    this.cache.set(key, {
      base64,
      timestamp: Date.now(),
      size: estimatedSize,
      originalSize,
      compressionRatio
    });

    console.log(`💾 缓存已保存: ${file.name}, 压缩比: ${compressionRatio.toFixed(2)}%`);
  }

  // 清理过期缓存
  private cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }
  }

  // 获取当前缓存大小
  private getCurrentCacheSize(): number {
    let totalSize = 0;
    for (const cached of this.cache.values()) {
      totalSize += cached.size;
    }
    return totalSize;
  }

  // 移除最旧的缓存条目
  private removeOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, cached] of this.cache.entries()) {
      if (cached.timestamp < oldestTime) {
        oldestTime = cached.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // 清空缓存
  clear(): void {
    this.cache.clear();
    console.log('🗑️ 图片缓存已清空');
  }

  // 获取缓存统计信息
  getStats(): { count: number; size: number; hitRate: number } {
    return {
      count: this.cache.size,
      size: this.getCurrentCacheSize(),
      hitRate: 0 // 可以在实际使用中跟踪命中率
    };
  }
}

// 导出单例实例
export const imageCache = new ImageCache();