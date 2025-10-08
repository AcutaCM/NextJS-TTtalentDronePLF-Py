import React, { useState } from 'react';
import styles from '../styles/WorkflowEditor.module.css';

interface ControlStatusPanelProps {
  onRun: () => void;
  onStop: () => void;
  onClear: () => void;
  logs: string[];
  results: { task: string; result: any; resultType?: string }[];
}

const ControlStatusPanel: React.FC<ControlStatusPanelProps> = ({ onRun, onStop, onClear, logs, results }) => {
  const [activeTab, setActiveTab] = useState('log'); // 'log' or 'results'

  return (
    <aside className={styles.controlStatusPanel}>
      <div className={styles.controls}>
        <h4>Controls</h4>
        <button className={`${styles.button} ${styles.runButton}`} onClick={onRun}>▶ Run Workflow</button>
        <button className={`${styles.button} ${styles.stopButton}`} onClick={onStop}>■ Stop</button>
        <button className={`${styles.button} ${styles.clearButton}`} onClick={onClear}>Clear</button>
      </div>
      <div className={styles.monitoring}>
        <h4>Monitoring</h4>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'log' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('log')}
          >
            Live Log
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'results' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('results')}
          >
            Results
          </button>
        </div>
        <div className={styles.contentContainer}>
          {activeTab === 'log' && (
            <div className={styles.logContent}>
              {logs.map((log, index) => (
                <p key={index}>[{new Date().toLocaleTimeString()}] {log}</p>
              ))}
            </div>
          )}
          {activeTab === 'results' && (
            <div className={styles.resultsContent}>
              {results.length === 0 ? (
                <p>No results yet.</p>
              ) : (
                results.map((item, index) => (
                  <div key={index} className={styles.resultItem}>
                    <strong>{item.task}:</strong>
                    {item.resultType === 'image' ? (
                      <img src={item.result} alt={item.task} className={styles.resultImage} />
                    ) : (
                      <p>{JSON.stringify(item.result)}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default ControlStatusPanel;