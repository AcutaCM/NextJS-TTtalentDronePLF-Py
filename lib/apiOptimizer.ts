// API调用优化器
interface ApiRequest {
  url: string;
  method: string;
  body: any;
  headers: any;
}

interface CachedResponse {
  data: any;
  timestamp: number;
  ttl: number; // 生存时间（毫秒）
}

interface RequestQueue {
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class ApiOptimizer {
  private responseCache = new Map<string, CachedResponse>();
  private pendingRequests = new Map<string, RequestQueue[]>();
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private maxConcurrentRequests = 3;
  private activeRequests = 0;

  // 生成请求的唯一键
  private generateRequestKey(request: ApiRequest): string {
    const { url, method, body } = request;
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    return `${method}:${url}:${this.hashString(bodyStr)}`;
  }

  // 简单的字符串哈希函数
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(36);
  }

  // 检查缓存
  private getFromCache(key: string): any | null {
    const cached = this.responseCache.get(key);
    if (!cached) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.responseCache.delete(key);
      return null;
    }

    console.log(`🎯 API缓存命中: ${key.substring(0, 50)}...`);
    return cached.data;
  }

  // 保存到缓存
  private saveToCache(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    // 默认5分钟TTL
    this.responseCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // 优化的API调用
  async optimizedFetch(request: ApiRequest, options: {
    enableCache?: boolean;
    cacheTtl?: number;
    enableDeduplication?: boolean;
    priority?: 'high' | 'normal' | 'low';
  } = {}): Promise<any> {
    const {
      enableCache = true,
      cacheTtl = 5 * 60 * 1000,
      enableDeduplication = true,
      priority = 'normal'
    } = options;

    const requestKey = this.generateRequestKey(request);

    // 检查缓存
    if (enableCache) {
      const cached = this.getFromCache(requestKey);
      if (cached) {
        return cached;
      }
    }

    // 请求去重：如果相同请求正在进行中，等待结果
    if (enableDeduplication && this.pendingRequests.has(requestKey)) {
      console.log(`⏳ 请求去重: ${requestKey.substring(0, 50)}...`);
      return new Promise((resolve, reject) => {
        this.pendingRequests.get(requestKey)!.push({ resolve, reject });
      });
    }

    // 创建新的请求
    return new Promise((resolve, reject) => {
      const executeRequest = async () => {
        try {
          this.activeRequests++;
          
          // 初始化待处理队列
          if (enableDeduplication) {
            this.pendingRequests.set(requestKey, []);
          }

          console.log(`🚀 发起API请求: ${request.method} ${request.url}`);
          const startTime = Date.now();

          const response = await fetch(request.url, {
            method: request.method,
            headers: request.headers,
            body: typeof request.body === 'string' ? request.body : JSON.stringify(request.body),
          });

          if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            console.error(`❌ API请求失败: ${request.method} ${request.url}`);
            console.error(`   状态码: ${response.status}`);
            console.error(`   错误信息: ${errorText}`);
            console.error(`   请求头: ${JSON.stringify(request.headers)}`);
            throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
          }

          const duration = Date.now() - startTime;
          console.log(`✅ API请求完成: ${duration}ms`);

          // 对于流式响应，直接返回Response对象
          // 对于非流式响应，解析JSON并缓存
          const contentType = response.headers.get('content-type') || '';
          const isStreamResponse = contentType.includes('text/event-stream') || 
                                 contentType.includes('text/plain') ||
                                 request.body?.stream === true;

          if (isStreamResponse) {
            // 流式响应：直接返回Response对象，不解析JSON
            resolve(response);
          } else {
            // 非流式响应：解析JSON并缓存
            const data = await response.json();
            
            // 保存到缓存
            if (enableCache) {
              this.saveToCache(requestKey, data, cacheTtl);
            }

            // 解决所有等待的请求
            if (enableDeduplication) {
              const waitingRequests = this.pendingRequests.get(requestKey) || [];
              waitingRequests.forEach(({ resolve: waitingResolve }) => {
                waitingResolve(data);
              });
              this.pendingRequests.delete(requestKey);
            }

            resolve(data);
          }
        } catch (error) {
          console.error(`❌ API请求失败:`, error);

          // 拒绝所有等待的请求
          if (enableDeduplication) {
            const waitingRequests = this.pendingRequests.get(requestKey) || [];
            waitingRequests.forEach(({ reject: waitingReject }) => {
              waitingReject(error);
            });
            this.pendingRequests.delete(requestKey);
          }

          reject(error);
        } finally {
          this.activeRequests--;
          this.processQueue();
        }
      };

      // 根据优先级和并发限制处理请求
      if (priority === 'high' || this.activeRequests < this.maxConcurrentRequests) {
        executeRequest();
      } else {
        // 添加到队列
        this.requestQueue.push(executeRequest);
        this.processQueue();
      }
    });
  }

  // 处理请求队列
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.activeRequests >= this.maxConcurrentRequests) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
      const request = this.requestQueue.shift();
      if (request) {
        request();
      }
    }

    this.isProcessing = false;
  }

  // 批量请求优化
  async batchRequests<T>(requests: Array<{
    request: ApiRequest;
    options?: any;
  }>): Promise<T[]> {
    console.log(`📦 批量处理 ${requests.length} 个请求`);
    
    const promises = requests.map(({ request, options }) => 
      this.optimizedFetch(request, options)
    );

    return Promise.all(promises);
  }

  // 清空缓存
  clearCache(): void {
    this.responseCache.clear();
    console.log('🗑️ API缓存已清空');
  }

  // 获取缓存统计
  getCacheStats(): { count: number; size: number } {
    let totalSize = 0;
    for (const cached of this.responseCache.values()) {
      totalSize += JSON.stringify(cached.data).length;
    }

    return {
      count: this.responseCache.size,
      size: totalSize
    };
  }

  // 预热缓存（可选）
  async warmupCache(requests: ApiRequest[]): Promise<void> {
    console.log(`🔥 预热缓存: ${requests.length} 个请求`);
    
    const promises = requests.map(request => 
      this.optimizedFetch(request, { priority: 'low' })
    );

    await Promise.allSettled(promises);
  }
}

// 导出单例实例
export const apiOptimizer = new ApiOptimizer();