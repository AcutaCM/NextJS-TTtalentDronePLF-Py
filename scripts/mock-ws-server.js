const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 8080 });

console.log('Mock WebSocket server started on ws://localhost:8080');

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.send(JSON.stringify({ type: 'log', payload: 'Connection established with mock server.' }));

  ws.on('message', (message) => {
    console.log('received: %s', message);
    let workflow;
    try {
      workflow = JSON.parse(message);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', payload: 'Invalid JSON received.' }));
      return;
    }

    if (workflow.type === 'run_workflow') {
      ws.send(JSON.stringify({ type: 'log', payload: 'Workflow execution started...' }));
      
      const nodes = workflow.payload.nodes || [];
      let delay = 1000;

      // Reset all node statuses to idle first
      nodes.forEach(node => {
        ws.send(JSON.stringify({ type: 'node_status_update', payload: { nodeId: node.id, status: 'idle' } }));
      });

      nodes.forEach((node) => {
        // Set status to 'running'
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'log', payload: `Executing task: ${node.data.label}...` }));
          ws.send(JSON.stringify({ type: 'node_status_update', payload: { nodeId: node.id, status: 'running' } }));
        }, delay);
        delay += 2000; // Simulate work

        // Set status to 'success' or 'failed'
        setTimeout(() => {
          const status = Math.random() > 0.1 ? 'success' : 'failed'; // 10% chance of failure
          ws.send(JSON.stringify({ type: 'log', payload: `Task "${node.data.label}" completed with status: ${status}.` }));
          ws.send(JSON.stringify({ type: 'node_status_update', payload: { nodeId: node.id, status } }));

          // If the task was a QR scan and it succeeded, send back a result
          if (status === 'success' && node.data.label === 'Scan QR Code') {
            const qrResult = `QR-CODE-DATA-${Math.round(Math.random() * 1000)}`;
            ws.send(JSON.stringify({ type: 'task_result', payload: { task: node.data.label, result: qrResult } }));
            ws.send(JSON.stringify({ type: 'log', payload: `Result for "${node.data.label}": ${qrResult}` }));
          }

          // If the task was strawberry detection and it succeeded, send back an image URL
          if (status === 'success' && node.data.label === 'Detect Strawberry') {
            // Using a placeholder image service. In a real scenario, this would be a path to a saved image.
            const imageUrl = `https://picsum.photos/seed/${Math.random()}/200/150`;
            ws.send(JSON.stringify({ type: 'task_result', payload: { task: node.data.label, result: imageUrl, resultType: 'image' } }));
            ws.send(JSON.stringify({ type: 'log', payload: `Image result for "${node.data.label}" available.` }));
          }
        }, delay);
        delay += 500;
      });

      setTimeout(() => {
        ws.send(JSON.stringify({ type: 'log', payload: 'Workflow finished.' }));
        ws.send(JSON.stringify({ type: 'workflow_finished', payload: { message: 'Workflow completed successfully!' } }));
      }, delay);

    } else if (workflow.type === 'stop_workflow') {
      ws.send(JSON.stringify({ type: 'log', payload: 'Workflow execution stopped by user.' }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});