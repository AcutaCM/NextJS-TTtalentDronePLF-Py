'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
} from 'reactflow';
import toast, { Toaster } from 'react-hot-toast';
import TaskNodeLibrary from './TaskNodeLibrary';
import WorkflowCanvas from './WorkflowCanvas';
import ControlStatusPanel from './ControlStatusPanel';
import useWebSocket from '../hooks/useWebSocket';
import StatusNode from './StatusNode';
import styles from '../styles/WorkflowEditor.module.css';

let id = 0;
const getId = () => `dndnode_${id++}`;

const WorkflowEditor = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<{ task: string; result: any; resultType?: string }[]>([]);
  const [isNodeLibraryVisible, setIsNodeLibraryVisible] = useState(false);
  const { isConnected, lastMessage, sendMessage } = useWebSocket('ws://localhost:8080');

  const nodeTypes = useMemo(() => ({ statusNode: StatusNode }), []);

  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.type === 'log') {
          setLogs((prev) => [...prev, data.payload]);
        } else if (data.type === 'node_status_update') {
          const { nodeId, status } = data.payload;
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === nodeId) {
                node.data = { ...node.data, status };
              }
              return node;
            })
          );
        } else if (data.type === 'task_result') {
          setResults((prev) => [...prev, data.payload]);
        } else if (data.type === 'workflow_finished') {
          toast.success(data.payload.message);
        }
      } catch (e) {
        setLogs((prev) => [...prev, lastMessage.data]);
      }
    }
  }, [lastMessage, setNodes]);

  useEffect(() => {
    setLogs(prev => [...prev, `WebSocket connection status: ${isConnected ? 'Connected' : 'Disconnected'}`]);
  }, [isConnected]);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const data = event.dataTransfer.getData('application/reactflow');
      
      if(typeof data === 'undefined' || !data) {
        return;
      }

      const { type, label } = JSON.parse(data);
      
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNode = {
        id: getId(),
        type: 'statusNode',
        position,
        data: { label: `${label}`, status: 'idle' },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const handleRun = () => {
    sendMessage({ type: 'run_workflow', payload: { nodes, edges } });
    console.log('Sent workflow to backend:', { nodes, edges });
  };

  const handleStop = () => {
    sendMessage({ type: 'stop_workflow' });
    console.log('Sent stop command to backend');
  };

  const handleClear = () => {
    setNodes([]);
    setEdges([]);
    setLogs(prev => [...prev, 'Workflow cleared.']);
    setResults([]);
    console.log('Clearing workflow');
  };

  const toggleNodeLibrary = () => {
    setIsNodeLibraryVisible(!isNodeLibraryVisible);
  };

  return (
    <div className={styles.editorContainer}>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#193059',
            color: '#E6F1FF',
            border: '1px solid #64FFDA',
          },
          success: {
            iconTheme: {
              primary: '#64FFDA',
              secondary: '#0A192F',
            },
          },
        }}
      />
      <ReactFlowProvider>
        <div className={styles.workflowWrapper} onDrop={onDrop} onDragOver={onDragOver}>
          <WorkflowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onDrop={onDrop}
            onDragOver={onDragOver}
          />
          
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <button 
              className={`${styles.toolbarButton} ${isNodeLibraryVisible ? styles.active : ''}`}
              onClick={toggleNodeLibrary}
              title="切换节点库"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                <path d="M2 17L12 22L22 17"/>
                <path d="M2 12L12 17L22 12"/>
              </svg>
            </button>
          </div>

          {/* Node Library */}
          <TaskNodeLibrary className={isNodeLibraryVisible ? styles.visible : ''} />
        </div>
      </ReactFlowProvider>
      <ControlStatusPanel onRun={handleRun} onStop={handleStop} onClear={handleClear} logs={logs} results={results} />
    </div>
  );
};

export default WorkflowEditor;