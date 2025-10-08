import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import styles from '../styles/WorkflowEditor.module.css';

interface StatusNodeData {
  label: string;
  status?: 'idle' | 'running' | 'success' | 'failed';
}

const StatusNode = ({ data, selected }: { data: StatusNodeData; selected?: boolean }) => {
  const statusClassName = data.status || 'idle'; // idle, running, success, failed
  return (
    <div className={`${styles.statusNode} ${styles[statusClassName]} ${selected ? styles.selected : ''}`}>
      <Handle 
        type="target" 
        position={Position.Top}
        style={{ 
          background: '#64FFDA',
          border: '2px solid #0A192F',
          width: '10px',
          height: '10px'
        }}
      />
      <div style={{ 
        fontSize: '14px', 
        fontWeight: '500',
        textAlign: 'center',
        padding: '4px 8px'
      }}>
        {data.label}
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom}
        style={{ 
          background: '#64FFDA',
          border: '2px solid #0A192F',
          width: '10px',
          height: '10px'
        }}
      />
    </div>
  );
};

export default memo(StatusNode);