// TTBlock节点定义
import {
  Circle,
  StopCircle,
  Plane,
  PlaneLanding,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  MoveUp,
  MoveDown,
  RotateCw,
  RotateCcw,
  RefreshCw,
  QrCode,
  Eye,
  Zap,
  Target,
  Workflow,
  Camera,
  Brain,
  GitBranch,
  Database,
  FileImage,
  Cpu,
  Network,
  CheckCircle,
  XCircle,
  Code,
  Repeat,
  Variable,
  FileText,
  Hash,
  Clock,
  Pause,
  Settings
} from 'lucide-react';

export interface BlockNodeDefinition {
  type: string;
  label: string;
  icon: React.ComponentType<any>;
  category: string;
  description: string;
  color: string;
  parameters?: BlockNodeParameter[];
}

export interface BlockNodeParameter {
  name: string;
  label: string;
  type: 'number' | 'text' | 'boolean' | 'select' | 'slider';
  defaultValue?: any;
  options?: string[]; // 用于select类型
  min?: number; // 用于slider和number类型
  max?: number; // 用于slider和number类型
  step?: number; // 用于slider和number类型
  description?: string;
}

// TTBlock节点定义
export const ttBlockNodes: BlockNodeDefinition[] = [
  // 流程控制
  { 
    type: 'start', 
    label: '开始', 
    icon: Circle,
    category: 'flow',
    description: '程序开始节点',
    color: '#4ade80',
    parameters: [
      { name: 'autoStart', label: '自动开始', type: 'boolean', defaultValue: false, description: '程序加载后自动开始执行' },
      { name: 'description', label: '描述', type: 'text', defaultValue: '', description: '程序描述信息' }
    ]
  },
  { 
    type: 'end', 
    label: '结束', 
    icon: StopCircle,
    category: 'flow',
    description: '程序结束节点',
    color: '#f87171',
    parameters: [
      { name: 'endAction', label: '结束动作', type: 'select', defaultValue: 'land', options: ['land', 'hover', 'continue'], description: '程序结束后的动作' },
      { name: 'generateReport', label: '生成报告', type: 'boolean', defaultValue: true, description: '是否生成执行报告' }
    ]
  },
  
  // 基础控制
  { 
    type: 'takeoff', 
    label: '起飞', 
    icon: Plane,
    category: 'basic',
    description: '无人机起飞到指定高度',
    color: '#60a5fa',
    parameters: [
      { name: 'height', label: '高度(cm)', type: 'number', defaultValue: 100, min: 20, max: 500, description: '起飞目标高度' },
      { name: 'waitForStable', label: '等待稳定', type: 'boolean', defaultValue: true, description: '起飞后是否等待无人机稳定' }
    ]
  },
  { 
    type: 'land', 
    label: '降落', 
    icon: PlaneLanding,
    category: 'basic',
    description: '无人机安全降落',
    color: '#60a5fa',
    parameters: [
      { name: 'safetyCheck', label: '安全检查', type: 'boolean', defaultValue: true, description: '降落前进行安全检查' },
      { name: 'speed', label: '降落速度', type: 'slider', defaultValue: 50, min: 10, max: 100, description: '降落速度(%)' }
    ]
  },
  { 
    type: 'emergency_stop', 
    label: '紧急停止', 
    icon: AlertTriangle,
    category: 'basic',
    description: '立即停止所有动作并悬停',
    color: '#f87171'
  },
  
  // 移动控制
  { 
    type: 'move_forward', 
    label: '前进', 
    icon: ArrowUp,
    category: 'movement',
    description: '向前移动指定距离',
    color: '#a78bfa',
    parameters: [
      { name: 'distance', label: '距离(cm)', type: 'number', defaultValue: 50, min: 10, max: 500, description: '移动距离' },
      { name: 'speed', label: '速度', type: 'slider', defaultValue: 50, min: 10, max: 100, description: '移动速度(%)' }
    ]
  },
  { 
    type: 'move_backward', 
    label: '后退', 
    icon: ArrowDown,
    category: 'movement',
    description: '向后移动指定距离',
    color: '#a78bfa',
    parameters: [
      { name: 'distance', label: '距离(cm)', type: 'number', defaultValue: 50, min: 10, max: 500, description: '移动距离' },
      { name: 'speed', label: '速度', type: 'slider', defaultValue: 50, min: 10, max: 100, description: '移动速度(%)' }
    ]
  },
  { 
    type: 'move_left', 
    label: '左移', 
    icon: ArrowLeft,
    category: 'movement',
    description: '向左移动指定距离',
    color: '#a78bfa',
    parameters: [
      { name: 'distance', label: '距离(cm)', type: 'number', defaultValue: 50, min: 10, max: 500, description: '移动距离' },
      { name: 'speed', label: '速度', type: 'slider', defaultValue: 50, min: 10, max: 100, description: '移动速度(%)' }
    ]
  },
  { 
    type: 'move_right', 
    label: '右移', 
    icon: ArrowRight,
    category: 'movement',
    description: '向右移动指定距离',
    color: '#a78bfa',
    parameters: [
      { name: 'distance', label: '距离(cm)', type: 'number', defaultValue: 50, min: 10, max: 500, description: '移动距离' },
      { name: 'speed', label: '速度', type: 'slider', defaultValue: 50, min: 10, max: 100, description: '移动速度(%)' }
    ]
  },
  { 
    type: 'move_up', 
    label: '上升', 
    icon: MoveUp,
    category: 'movement',
    description: '向上移动指定距离',
    color: '#a78bfa',
    parameters: [
      { name: 'distance', label: '距离(cm)', type: 'number', defaultValue: 50, min: 10, max: 500, description: '移动距离' },
      { name: 'speed', label: '速度', type: 'slider', defaultValue: 30, min: 10, max: 100, description: '移动速度(%)' }
    ]
  },
  { 
    type: 'move_down', 
    label: '下降', 
    icon: MoveDown,
    category: 'movement',
    description: '向下移动指定距离',
    color: '#a78bfa',
    parameters: [
      { name: 'distance', label: '距离(cm)', type: 'number', defaultValue: 50, min: 10, max: 500, description: '移动距离' },
      { name: 'speed', label: '速度', type: 'slider', defaultValue: 30, min: 10, max: 100, description: '移动速度(%)' }
    ]
  },
  
  // 旋转控制
  { 
    type: 'rotate_cw', 
    label: '顺时针旋转', 
    icon: RotateCw,
    category: 'rotation',
    description: '顺时针旋转指定角度',
    color: '#fbbf24',
    parameters: [
      { name: 'angle', label: '角度(°)', type: 'number', defaultValue: 90, min: 10, max: 360, description: '旋转角度' },
      { name: 'speed', label: '速度', type: 'slider', defaultValue: 60, min: 10, max: 100, description: '旋转速度(%)' }
    ]
  },
  { 
    type: 'rotate_ccw', 
    label: '逆时针旋转', 
    icon: RotateCcw,
    category: 'rotation',
    description: '逆时针旋转指定角度',
    color: '#fbbf24',
    parameters: [
      { name: 'angle', label: '角度(°)', type: 'number', defaultValue: 90, min: 10, max: 360, description: '旋转角度' },
      { name: 'speed', label: '速度', type: 'slider', defaultValue: 60, min: 10, max: 100, description: '旋转速度(%)' }
    ]
  },
  
  // 特技动作
  { 
    type: 'flip_forward', 
    label: '前翻', 
    icon: RefreshCw,
    category: 'tricks',
    description: '向前翻转360度',
    color: '#ec4899',
    parameters: [
      { name: 'safetyCheck', label: '安全检查', type: 'boolean', defaultValue: true, description: '执行前进行安全检查' },
      { name: 'waitAfter', label: '等待时间(s)', type: 'number', defaultValue: 2, min: 0, max: 10, description: '翻转后等待时间' }
    ]
  },
  { 
    type: 'flip_backward', 
    label: '后翻', 
    icon: RefreshCw,
    category: 'tricks',
    description: '向后翻转360度',
    color: '#ec4899',
    parameters: [
      { name: 'safetyCheck', label: '安全检查', type: 'boolean', defaultValue: true, description: '执行前进行安全检查' },
      { name: 'waitAfter', label: '等待时间(s)', type: 'number', defaultValue: 2, min: 0, max: 10, description: '翻转后等待时间' }
    ]
  },
  { 
    type: 'flip_left', 
    label: '左翻', 
    icon: RefreshCw,
    category: 'tricks',
    description: '向左翻转360度',
    color: '#ec4899',
    parameters: [
      { name: 'safetyCheck', label: '安全检查', type: 'boolean', defaultValue: true, description: '执行前进行安全检查' },
      { name: 'waitAfter', label: '等待时间(s)', type: 'number', defaultValue: 2, min: 0, max: 10, description: '翻转后等待时间' }
    ]
  },
  { 
    type: 'flip_right', 
    label: '右翻', 
    icon: RefreshCw,
    category: 'tricks',
    description: '向右翻转360度',
    color: '#ec4899',
    parameters: [
      { name: 'safetyCheck', label: '安全检查', type: 'boolean', defaultValue: true, description: '执行前进行安全检查' },
      { name: 'waitAfter', label: '等待时间(s)', type: 'number', defaultValue: 2, min: 0, max: 10, description: '翻转后等待时间' }
    ]
  },
  
  // 检测任务
  { 
    type: 'qr_scan', 
    label: 'QR码扫描', 
    icon: QrCode,
    category: 'detection',
    description: '扫描并识别QR码',
    color: '#8b5cf6',
    parameters: [
      { name: 'timeout', label: '超时时间(s)', type: 'number', defaultValue: 10, min: 1, max: 60, description: '扫描超时时间' },
      { name: 'saveImage', label: '保存图像', type: 'boolean', defaultValue: true, description: '是否保存扫描到的图像' }
    ]
  },
  { 
    type: 'strawberry_detection', 
    label: '草莓检测', 
    icon: Eye,
    category: 'detection',
    description: '检测并识别草莓',
    color: '#8b5cf6',
    parameters: [
      { name: 'confidence', label: '置信度阈值', type: 'slider', defaultValue: 0.7, min: 0.1, max: 1, step: 0.05, description: '检测置信度阈值' },
      { name: 'timeout', label: '超时时间(s)', type: 'number', defaultValue: 15, min: 1, max: 60, description: '检测超时时间' },
      { name: 'saveResults', label: '保存结果', type: 'boolean', defaultValue: true, description: '是否保存检测结果' }
    ]
  },
  { 
    type: 'object_tracking', 
    label: '目标跟踪', 
    icon: Target,
    category: 'detection',
    description: '跟踪指定目标对象',
    color: '#8b5cf6',
    parameters: [
      { name: 'targetType', label: '目标类型', type: 'select', defaultValue: 'person', options: ['person', 'car', 'animal', 'custom'], description: '要跟踪的目标类型' },
      { name: 'duration', label: '跟踪时长(s)', type: 'number', defaultValue: 30, min: 5, max: 300, description: '跟踪持续时间' }
    ]
  },
  
  // 延时控制
  { 
    type: 'wait', 
    label: '等待', 
    icon: Clock,
    category: 'control',
    description: '等待指定时间',
    color: '#06b6d4',
    parameters: [
      { name: 'duration', label: '等待时间(s)', type: 'number', defaultValue: 1, min: 0.1, max: 300, step: 0.1, description: '等待时间' },
      { name: 'description', label: '描述', type: 'text', defaultValue: '', description: '等待原因描述' }
    ]
  },
  { 
    type: 'hover', 
    label: '悬停', 
    icon: Pause,
    category: 'control',
    description: '在当前位置悬停',
    color: '#06b6d4',
    parameters: [
      { name: 'duration', label: '悬停时间(s)', type: 'number', defaultValue: 3, min: 0.1, max: 300, step: 0.1, description: '悬停时间' },
      { name: 'stabilize', label: '稳定悬停', type: 'boolean', defaultValue: true, description: '是否启用稳定悬停' }
    ]
  },

  // 图像采集
  { 
    type: 'take_photo', 
    label: '拍照', 
    icon: Camera,
    category: 'imaging',
    description: '拍摄照片并保存',
    color: '#10b981',
    parameters: [
      { name: 'resolution', label: '分辨率', type: 'select', defaultValue: 'high', options: ['low', 'medium', 'high'], description: '照片分辨率' },
      { name: 'format', label: '格式', type: 'select', defaultValue: 'jpg', options: ['jpg', 'png'], description: '照片格式' },
      { name: 'saveLocal', label: '本地保存', type: 'boolean', defaultValue: true, description: '是否保存到本地' }
    ]
  },
  { 
    type: 'start_video', 
    label: '开始录像', 
    icon: FileImage,
    category: 'imaging',
    description: '开始视频录制',
    color: '#10b981',
    parameters: [
      { name: 'resolution', label: '分辨率', type: 'select', defaultValue: 'high', options: ['low', 'medium', 'high'], description: '视频分辨率' },
      { name: 'format', label: '格式', type: 'select', defaultValue: 'mp4', options: ['mp4', 'avi'], description: '视频格式' }
    ]
  },
  { 
    type: 'stop_video', 
    label: '停止录像', 
    icon: FileImage,
    category: 'imaging',
    description: '停止视频录制',
    color: '#10b981'
  },

  // AI分析
  { 
    type: 'ai_image_analysis', 
    label: 'AI图像分析', 
    icon: Brain,
    category: 'ai',
    description: '使用AI分析图像内容',
    color: '#f97316',
    parameters: [
      { name: 'analysisType', label: '分析类型', type: 'select', defaultValue: 'object_detection', options: ['object_detection', 'classification', 'segmentation'], description: 'AI分析类型' },
      { name: 'confidence', label: '置信度阈值', type: 'slider', defaultValue: 0.7, min: 0.1, max: 1, step: 0.05, description: '分析置信度阈值' },
      { name: 'model', label: '模型', type: 'select', defaultValue: 'yolo', options: ['yolo', 'resnet', 'mobilenet'], description: '使用的AI模型' }
    ]
  },
  { 
    type: 'object_detection', 
    label: '物体检测', 
    icon: Eye,
    category: 'ai',
    description: '检测图像中的物体',
    color: '#f97316',
    parameters: [
      { name: 'model', label: '模型', type: 'select', defaultValue: 'yolo', options: ['yolo', 'ssd', 'faster_rcnn'], description: '使用的检测模型' },
      { name: 'confidence', label: '置信度阈值', type: 'slider', defaultValue: 0.7, min: 0.1, max: 1, step: 0.05, description: '检测置信度阈值' },
      { name: 'maxDetections', label: '最大检测数', type: 'number', defaultValue: 10, min: 1, max: 50, description: '最大检测物体数量' }
    ]
  },
  { 
    type: 'face_recognition', 
    label: '人脸识别', 
    icon: Eye,
    category: 'ai',
    description: '识别图像中的人脸',
    color: '#f97316',
    parameters: [
      { name: 'model', label: '模型', type: 'select', defaultValue: 'facenet', options: ['facenet', 'dlib', 'opencv'], description: '使用的人脸识别模型' },
      { name: 'confidence', label: '置信度阈值', type: 'slider', defaultValue: 0.8, min: 0.1, max: 1, step: 0.05, description: '识别置信度阈值' }
    ]
  },
  { 
    type: 'text_recognition', 
    label: '文字识别', 
    icon: FileText,
    category: 'ai',
    description: '识别图像中的文字',
    color: '#f97316',
    parameters: [
      { name: 'language', label: '语言', type: 'select', defaultValue: 'chinese', options: ['chinese', 'english', 'mixed'], description: '识别文字的语言' },
      { name: 'accuracy', label: '精度', type: 'select', defaultValue: 'high', options: ['low', 'medium', 'high'], description: '识别精度' }
    ]
  },

  // 逻辑判断
  { 
    type: 'condition_branch', 
    label: '条件分支', 
    icon: GitBranch,
    category: 'logic',
    description: '根据条件执行不同分支',
    color: '#ec4899',
    parameters: [
      { name: 'variable', label: '变量', type: 'text', defaultValue: 'battery', description: '要比较的变量' },
      { name: 'operator', label: '操作符', type: 'select', defaultValue: '>', options: ['>', '<', '>=', '<=', '==', '!='], description: '比较操作符' },
      { name: 'value', label: '值', type: 'number', defaultValue: 50, description: '比较值' }
    ]
  },
  { 
    type: 'if_else', 
    label: 'IF-ELSE判断', 
    icon: GitBranch,
    category: 'logic',
    description: 'IF-ELSE条件判断',
    color: '#ec4899',
    parameters: [
      { name: 'condition', label: '条件', type: 'text', defaultValue: 'battery > 50', description: '判断条件表达式' },
      { name: 'trueLabel', label: '真分支标签', type: 'text', defaultValue: '是', description: '条件为真时的标签' },
      { name: 'falseLabel', label: '假分支标签', type: 'text', defaultValue: '否', description: '条件为假时的标签' }
    ]
  },
  { 
    type: 'switch_case', 
    label: '多路分支', 
    icon: GitBranch,
    category: 'logic',
    description: 'Switch-Case多路分支',
    color: '#ec4899',
    parameters: [
      { name: 'variable', label: '变量', type: 'text', defaultValue: 'mode', description: '用于分支判断的变量' },
      { name: 'cases', label: '分支数', type: 'number', defaultValue: 3, min: 2, max: 10, description: '分支数量' }
    ]
  },
  { 
    type: 'loop', 
    label: '循环', 
    icon: Repeat,
    category: 'logic',
    description: '循环执行指定次数',
    color: '#ec4899',
    parameters: [
      { name: 'iterations', label: '循环次数', type: 'number', defaultValue: 3, min: 1, max: 100, description: '循环执行次数' },
      { name: 'condition', label: '循环条件', type: 'text', defaultValue: '', description: '循环继续条件' }
    ]
  },

  // 数据处理
  { 
    type: 'variable_set', 
    label: '设置变量', 
    icon: Variable,
    category: 'data',
    description: '设置变量值',
    color: '#6366f1',
    parameters: [
      { name: 'variable', label: '变量名', type: 'text', defaultValue: 'myVar', description: '要设置的变量名' },
      { name: 'value', label: '值', type: 'text', defaultValue: '0', description: '变量值' },
      { name: 'type', label: '类型', type: 'select', defaultValue: 'number', options: ['number', 'string', 'boolean'], description: '变量类型' }
    ]
  },
  { 
    type: 'variable_get', 
    label: '获取变量', 
    icon: Variable,
    category: 'data',
    description: '获取变量值',
    color: '#6366f1',
    parameters: [
      { name: 'variable', label: '变量名', type: 'text', defaultValue: 'myVar', description: '要获取的变量名' }
    ]
  },
  { 
    type: 'data_transform', 
    label: '数据转换', 
    icon: Code,
    category: 'data',
    description: '转换数据格式',
    color: '#6366f1',
    parameters: [
      { name: 'inputFormat', label: '输入格式', type: 'select', defaultValue: 'json', options: ['json', 'xml', 'csv'], description: '输入数据格式' },
      { name: 'outputFormat', label: '输出格式', type: 'select', defaultValue: 'csv', options: ['json', 'xml', 'csv'], description: '输出数据格式' }
    ]
  },
  { 
    type: 'data_filter', 
    label: '数据过滤', 
    icon: Database,
    category: 'data',
    description: '过滤数据内容',
    color: '#6366f1',
    parameters: [
      { name: 'filterType', label: '过滤类型', type: 'select', defaultValue: 'threshold', options: ['threshold', 'range', 'regex'], description: '数据过滤类型' },
      { name: 'keepMatching', label: '保留匹配项', type: 'boolean', defaultValue: true, description: '是否保留匹配的数据' }
    ]
  },

  // 网络通信
  { 
    type: 'http_request', 
    label: 'HTTP请求', 
    icon: Network,
    category: 'network',
    description: '发送HTTP请求',
    color: '#0ea5e9',
    parameters: [
      { name: 'url', label: 'URL', type: 'text', defaultValue: 'https://api.example.com', description: '请求的URL' },
      { name: 'method', label: '方法', type: 'select', defaultValue: 'POST', options: ['GET', 'POST', 'PUT', 'DELETE'], description: 'HTTP方法' },
      { name: 'timeout', label: '超时时间(s)', type: 'number', defaultValue: 30, min: 1, max: 300, description: '请求超时时间' }
    ]
  },
  { 
    type: 'websocket_send', 
    label: 'WebSocket发送', 
    icon: Network,
    category: 'network',
    description: '通过WebSocket发送数据',
    color: '#0ea5e9',
    parameters: [
      { name: 'url', label: 'URL', type: 'text', defaultValue: 'ws://localhost:8080', description: 'WebSocket连接URL' },
      { name: 'message', label: '消息', type: 'text', defaultValue: 'Hello', description: '要发送的消息' },
      { name: 'timeout', label: '超时时间(s)', type: 'number', defaultValue: 10, min: 1, max: 60, description: '连接超时时间' }
    ]
  },
  { 
    type: 'api_call', 
    label: 'API调用', 
    icon: Cpu,
    category: 'network',
    description: '调用外部API',
    color: '#0ea5e9',
    parameters: [
      { name: 'endpoint', label: '端点', type: 'text', defaultValue: '/api/data', description: 'API端点' },
      { name: 'retries', label: '重试次数', type: 'number', defaultValue: 3, min: 0, max: 10, description: '失败重试次数' }
    ]
  },

  // 结果处理
  { 
    type: 'success_handler', 
    label: '成功处理', 
    icon: CheckCircle,
    category: 'result',
    description: '处理成功结果',
    color: '#22c55e',
    parameters: [
      { name: 'action', label: '动作', type: 'select', defaultValue: 'continue', options: ['continue', 'stop', 'repeat'], description: '成功后的动作' },
      { name: 'message', label: '消息', type: 'text', defaultValue: '操作成功', description: '成功消息' }
    ]
  },
  { 
    type: 'error_handler', 
    label: '错误处理', 
    icon: XCircle,
    category: 'result',
    description: '处理错误情况',
    color: '#ef4444',
    parameters: [
      { name: 'action', label: '动作', type: 'select', defaultValue: 'retry', options: ['retry', 'skip', 'stop'], description: '错误处理动作' },
      { name: 'maxRetries', label: '最大重试次数', type: 'number', defaultValue: 3, min: 0, max: 10, description: '最大重试次数' },
      { name: 'fallbackAction', label: '备选动作', type: 'select', defaultValue: 'skip', options: ['skip', 'stop'], description: '重试失败后的备选动作' }
    ]
  },
  { 
    type: 'result_aggregator', 
    label: '结果聚合', 
    icon: Database,
    category: 'result',
    description: '聚合多个结果',
    color: '#22c55e',
    parameters: [
      { name: 'aggregationType', label: '聚合类型', type: 'select', defaultValue: 'merge', options: ['merge', 'average', 'sum'], description: '结果聚合方式' },
      { name: 'outputFormat', label: '输出格式', type: 'select', defaultValue: 'json', options: ['json', 'csv', 'xml'], description: '聚合结果输出格式' }
    ]
  },
];

// 节点分类定义
export const nodeCategories = [
  { key: 'all', label: '全部', icon: Workflow, color: '#94a3b8' },
  { key: 'flow', label: '流程控制', icon: Circle, color: '#4ade80' },
  { key: 'basic', label: '基础控制', icon: Plane, color: '#60a5fa' },
  { key: 'movement', label: '移动控制', icon: ArrowUp, color: '#a78bfa' },
  { key: 'rotation', label: '旋转控制', icon: RotateCw, color: '#fbbf24' },
  { key: 'tricks', label: '特技动作', icon: Zap, color: '#ec4899' },
  { key: 'detection', label: '检测任务', icon: Eye, color: '#8b5cf6' },
  { key: 'control', label: '时间控制', icon: Settings, color: '#06b6d4' },
  { key: 'imaging', label: '图像采集', icon: Camera, color: '#10b981' },
  { key: 'ai', label: 'AI分析', icon: Brain, color: '#f97316' },
  { key: 'logic', label: '逻辑判断', icon: GitBranch, color: '#ec4899' },
  { key: 'data', label: '数据处理', icon: Database, color: '#6366f1' },
  { key: 'network', label: '网络通信', icon: Network, color: '#0ea5e9' },
  { key: 'result', label: '结果处理', icon: CheckCircle, color: '#22c55e' },
];