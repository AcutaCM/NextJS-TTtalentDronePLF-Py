import React from 'react';
import styles from '../styles/WorkflowEditor.module.css';

const taskNodes = [
  { type: 'takeoff', label: 'Take Off' },
  { type: 'move', label: 'Move Forward' },
  { type: 'qr_scan', label: 'Scan QR Code' },
  { type: 'strawberry_detection', label: 'Detect Strawberry' },
  { type: 'land', label: 'Land' },
];

interface TaskNodeLibraryProps {
  className?: string;
}

const TaskNodeLibrary: React.FC<TaskNodeLibraryProps> = ({ className }) => {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, label }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className={`${styles.taskNodeLibrary} ${className || ''}`}>
      <h3>Task Nodes</h3>
      <div className={styles.nodeList}>
        {taskNodes.map((node) => (
          <div 
            key={node.type} 
            className={styles.libraryNode}
            onDragStart={(event) => onDragStart(event, node.type, node.label)}
            draggable
          >
            {node.label}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default TaskNodeLibrary;