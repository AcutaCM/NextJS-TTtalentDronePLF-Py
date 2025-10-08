import React from 'react';
import ReactFlow, { Background, Controls, MiniMap, BackgroundVariant } from 'reactflow';
import 'reactflow/dist/style.css';
import styles from '../styles/WorkflowEditor.module.css';

interface WorkflowCanvasProps {
  nodes: any[];
  edges: any[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: any) => void;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  nodeTypes: any;
  onNodeDoubleClick?: (event: React.MouseEvent, node: any) => void;
}

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onDrop,
  onDragOver,
  nodeTypes,
  onNodeDoubleClick,
}) => {
  return (
    <div className={styles.workflowCanvas} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeDoubleClick={onNodeDoubleClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            fitView
            style={{ width: '100%', height: '100%' }}
            defaultEdgeOptions={{
              style: { stroke: '#64FFDA', strokeWidth: 2 },
              type: 'smoothstep',
            }}
            connectionLineStyle={{ stroke: '#64FFDA', strokeWidth: 2 }}
            snapToGrid={true}
            snapGrid={[15, 15]}
        >
            <Background 
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#64FFDA"
              style={{ backgroundColor: '#0A192F' }}
            />
            <Controls 
              style={{
                background: 'rgba(25, 48, 89, 0.9)',
                border: '1px solid rgba(100, 255, 218, 0.3)',
                borderRadius: '8px',
              }}
            />
            <MiniMap 
              style={{
                background: 'rgba(25, 48, 89, 0.9)',
                border: '1px solid rgba(100, 255, 218, 0.3)',
                borderRadius: '8px',
              }}
              nodeColor="#64FFDA"
              maskColor="rgba(10, 25, 47, 0.8)"
            />
        </ReactFlow>
    </div>
  );
};

export default WorkflowCanvas;