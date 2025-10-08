import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface BlockNodeData {
  label: string;
  nodeType: string;
  status?: 'idle' | 'running' | 'success' | 'error';
  parameters?: Record<string, any>;
}

const statusColors = {
  idle: 'bg-gray-500',
  running: 'bg-blue-500',
  success: 'bg-green-500',
  error: 'bg-red-500',
};

interface BlockNodeProps extends NodeProps<BlockNodeData> {
  onNodeDoubleClick?: (event: React.MouseEvent, node: NodeProps<BlockNodeData>) => void;
}

const BlockNode: React.FC<BlockNodeProps> = ({ data, isConnectable, id, ...props }) => {
  const statusColor = statusColors[data.status || 'idle'];
  
  const handleDoubleClick = (event: React.MouseEvent) => {
    if (props.onNodeDoubleClick) {
      props.onNodeDoubleClick(event, { data, isConnectable, id, ...props });
    }
  };
  
  return (
    <div 
      className="px-4 py-3 bg-white border-2 border-gray-800 rounded shadow-lg min-w-[150px] cursor-pointer"
      onDoubleClick={handleDoubleClick}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
      
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${statusColor}`}></div>
        <div className="font-medium text-gray-800">{data.label}</div>
      </div>
      
      {data.parameters && Object.keys(data.parameters).length > 0 && (
        <div className="mt-2 text-xs text-gray-600">
          {Object.entries(data.parameters).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="font-medium">{key}:</span>
              <span>{String(value)}</span>
            </div>
          ))}
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
    </div>
  );
};

export default memo(BlockNode);