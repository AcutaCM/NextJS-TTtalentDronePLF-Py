"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDroneControl } from "@/hooks/useDroneControl";
import { useAIConfig } from "@/hooks/useAIConfig";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Progress } from "@heroui/progress";
import { Divider } from "@heroui/divider";
import { Badge } from "@heroui/badge";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Tabs, Tab } from "@heroui/tabs";
import { ScrollShadow } from "@heroui/scroll-shadow";
import { Tooltip } from "@heroui/tooltip";
import ConnectionControlPanel from "@/components/ConnectionControlPanel";
import MissionPadPanel from "@/components/MissionPadPanel";
import DetectionControlPanel from "@/components/DetectionControlPanel";
import HelpPanel from "@/components/HelpPanel";
import ManualControlPanel from "@/components/ManualControlPanel";
import AIAnalysisReport from "@/components/AIAnalysisReport";
import BatteryStatusPanel from "@/components/BatteryStatusPanel";
import AppInfoPanel from "@/components/AppInfoPanel";
import VirtualPositionView from "@/components/VirtualPositionView";
import StrawberryDetectionCard from "@/components/StrawberryDetectionCard";
import QRScanPanel from "@/components/QRScanPanel";
import DraggableContainer from "@/components/DraggableContainer";
import TopNavbar from "@/components/TopNavbar";
import GridSystem from "@/components/GridSystem";
import DropZones from "@/components/layout/DropZones";
import ComponentSelector from "@/components/ComponentSelector";
// Import additional components
import ChallengeCruisePanel from "@/components/ChallengeCruisePanel";
import AIAnalysisPanel from "@/components/AIAnalysisPanel";
import ToolsPanel from "@/components/ToolsPanel";
import ConfigurationPanel from "@/components/ConfigurationPanel";
import SimulationPanel from "@/components/SimulationPanel";
import StatusInfoPanel from "@/components/StatusInfoPanel";
import SystemLogPanel from "@/components/SystemLogPanel";
import VideoControlPanel from "@/components/VideoControlPanel";
import ReportPanel from "@/components/ReportPanel";
import TelloControlPanel from "@/components/TelloControlPanel";
import ChatDock from "@/components/ChatDock";
import PureChat from "@/components/ChatbotChat";
import MemoryPanel from "@/components/MemoryPanel";
import DarkVeil from "@/components/DarkVeil";
import TelloWorkflowPanel from "@/components/TelloWorkflowPanel";
import TelloIntelligentAgent from "@/components/TelloIntelligentAgent";
import ModelManagerPanel from "@/components/ui/ModelManagerPanel";
import EnhancedModelSelector from "@/components/ui/EnhancedModelSelector";

import { LayoutProvider, useLayout } from "@/contexts/LayoutContext";
import { DropZonesProvider, useDropZonesContext } from "@/contexts/DropZonesContext";
import { DroneProvider } from "@/contexts/DroneContext";
import { GlobalModalProvider } from "@/contexts/GlobalModalContext";
import GlobalKnowledgeModal from "@/components/GlobalKnowledgeModal";

import { DroneIcon, AiIcon, MissionIcon, CruiseIcon } from "@/components/icons";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Drone control hooks and state
  const {
    droneStatus,
    missionStatus,
    detectionStats,
    logs,
    videoStream: rawVideoStream,
    isConnecting,
    connectToDrone,
    disconnectFromDrone,
    takeoff,
    land,
    startMission,
    pauseMission,
    resumeMission,
    stopMission,
    startDetection,
    stopDetection,
    startRippleDetection,
    stopRippleDetection,
    startQRDetection,
    stopQRDetection,
    startVideoStream,
    stopVideoStream,
    clearLogs,
    manualControl,
    sendMessage,
    missionPosition,
    missionMessages,
  } = useDroneControl();

  const {
    aiConfig,
    analysisResults,
    isAnalyzing,
    testResult,
    updateAIConfig,
    testAIConnection,
    analyzeImage,
    clearAnalysisResults,
    exportAnalysisResults,
    getAnalysisStats
  } = useAIConfig();

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Component state
  const [flightAltitude, setFlightAltitude] = useState<string>("2.5");
  const [waypointSpacing, setWaypointSpacing] = useState<string>("1.0");
  const [dwellSeconds, setDwellSeconds] = useState<string>("1.0");
  const [gridEnabled, setGridEnabled] = useState<boolean>(false);
  const [gridType, setGridType] = useState<string>("thirds");
  const [overlayEnabled, setOverlayEnabled] = useState<boolean>(false);
  const [delayArmed, setDelayArmed] = useState<boolean>(false);
  const [delaySeconds, setDelaySeconds] = useState<string>("3");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [rippleDetectionEnabled, setRippleDetectionEnabled] = useState<boolean>(false);
  const [qrDetectionEnabled, setQRDetectionEnabled] = useState<boolean>(false);
  const [strawberryDetections, setStrawberryDetections] = useState<any[]>([]);
  const [latestStrawberryDetection, setLatestStrawberryDetection] = useState<any>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recSeconds, setRecSeconds] = useState<number>(0);

  // Global message handler setup
  useEffect(() => {
    (globalThis as any).__droneSendMessage = sendMessage;
    return () => {
      if ((globalThis as any).__droneSendMessage === sendMessage) {
        delete (globalThis as any).__droneSendMessage;
      }
    };
  }, [sendMessage]);
  
  const [showCountdown, setShowCountdown] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [activeLevels, setActiveLevels] = useState<string[]>(["success", "info", "warning", "error"]);
  const [logKeyword, setLogKeyword] = useState<string>("");
  const [showAllDiseases, setShowAllDiseases] = useState(false);

  // Refs
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const countdownTimerRef = useRef<number | null>(null);

  // Authentication check
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, isLoading, router]);

  // Mock strawberry detection data
  useEffect(() => {
    if (rippleDetectionEnabled) {
      const interval = setInterval(() => {
        const newDetection = {
          id: Date.now(),
          name: `Strawberry ${Math.random() > 0.66 ? 'A' : Math.random() > 0.33 ? 'B' : 'C'}`,
          maturity: Math.random() > 0.66 ? 'ripe' : Math.random() > 0.33 ? 'semi-ripe' : 'unripe',
          location: `L[${Math.floor(Math.random()*100)},${Math.floor(Math.random()*100)},${Math.floor(Math.random()*10)}]`,
          timestamp: new Date().toLocaleString(),
          confidence: 0.8 + Math.random() * 0.2
        };
        
        setStrawberryDetections(prev => [newDetection, ...prev.slice(0, 49)]); // Keep last 50 detections
        setLatestStrawberryDetection(newDetection);
      }, 2000 + Math.random() * 3000); // 2-5 seconds interval
      
      return () => clearInterval(interval);
    }
  }, [rippleDetectionEnabled]);

  // Video stream status sync
  useEffect(() => {
    if (droneStatus?.connected && !rawVideoStream?.isStreaming) {
      startVideoStream();
    } else if (!droneStatus?.connected && rawVideoStream?.isStreaming) {
      stopVideoStream();
    }
  }, [droneStatus?.connected, rawVideoStream?.isStreaming, startVideoStream, stopVideoStream]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const t = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isRecording]);

  useEffect(() => {
    // Cleanup countdown timer on unmount
    return () => {
      if (countdownTimerRef.current) {
        window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, []);

  // Keyboard shortcuts: G-Grid, O-Overlay, F-Fullscreen, R-Record, S-Screenshot, D-Delay
  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      return el.isContentEditable || tag === "input" || tag === "textarea" || tag === "select";
    };
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === "g") { e.preventDefault(); setGridEnabled((v) => !v); }
      else if (key === "o") { e.preventDefault(); setOverlayEnabled((v) => !v); }
      else if (key === "f") { e.preventDefault(); handleToggleFullscreen(); }
      else if (key === "r") { e.preventDefault(); handleToggleRecording(); }
      else if (key === "s") { e.preventDefault(); handleScreenshot(); }
      else if (key === "d") { e.preventDefault(); setDelayArmed((v) => !v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/70">Loading...</p>
        </div>
      </div>
    );
  }

  // Authentication check
  if (!isAuthenticated) {
    return null;
  }

  // Ensure videoStream has default values
  const videoStream = rawVideoStream || {
    isStreaming: false,
    currentFrame: null,
    fps: 0,
    resolution: '0x0',
    timestamp: '',
    fileMode: false,
    detectionStatus: {
      qr_enabled: false,
      strawberry_enabled: false,
      ai_enabled: false
    }
  };

  const analysisStats = getAnalysisStats();

  // MISSIONPAD validation helpers
  const toNum = (v: string) => Number.parseFloat(v);
  const isValidFlightAltitude = Number.isFinite(toNum(flightAltitude)) && toNum(flightAltitude) >= 0.5 && toNum(flightAltitude) <= 15;
  const isValidWaypointSpacing = Number.isFinite(toNum(waypointSpacing)) && toNum(waypointSpacing) >= 0.3 && toNum(waypointSpacing) <= 10;
  const isValidDwellSeconds = Number.isFinite(toNum(dwellSeconds)) && toNum(dwellSeconds) >= 0 && toNum(dwellSeconds) <= 10;
  const missionFormInvalid = !isValidFlightAltitude || !isValidWaypointSpacing || !isValidDwellSeconds;

  // Strawberry maturity statistics
  const strawberryMaturityStats = {
    ripe: strawberryDetections.filter(d => d.maturity === "ripe").length,
    halfRipe: strawberryDetections.filter(d => d.maturity === "semi-ripe").length,
    unripe: strawberryDetections.filter(d => d.maturity === "unripe").length
  };

  const handleToggleFullscreen = () => {
    const el = videoContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const handleToggleRecording = () => {
    setIsRecording((r) => {
      if (r) setRecSeconds(0);
      return !r;
    });
  };

  const handleScreenshot = () => {
    const capture = () => {
      // TODO: Implement actual screenshot capture using Canvas API
      window.alert("Screenshot captured! This is a placeholder implementation.");
    };

    if (delayArmed) {
      const start = parseInt(delaySeconds, 10);
      if (!Number.isFinite(start) || start <= 0) return capture();

      // Clear any existing countdown timer
      if (countdownTimerRef.current) {
        window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }

      setCountdown(start);
      setShowCountdown(true);
      countdownTimerRef.current = window.setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (countdownTimerRef.current) {
              window.clearInterval(countdownTimerRef.current);
              countdownTimerRef.current = null;
            }
            setShowCountdown(false);
            capture();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      capture();
    }
  };

  const recMM = String(Math.floor(recSeconds / 60)).padStart(2, "0");
  const recSS = String(recSeconds % 60).padStart(2, "0");

  // Log filtering helpers
  const allLevels = ["success", "info", "warning", "error"] as const;

  const toggleLevel = (lvl: string) => {
    setActiveLevels((prev) =>
      prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl]
    );
  };

  const filteredLogs = logs
    .filter((log: any) => activeLevels.includes((log.level || "info").toLowerCase()))
    .filter((log: any) => (logKeyword ? (log.message || "").toLowerCase().includes(logKeyword.toLowerCase()) : true))
    .slice(0, 5);

  // AI analysis statistics
  const latestResult = analysisResults[0];
  const latestScore = latestResult?.analysis?.healthScore ?? 0;
  const avgScore = Math.round(analysisStats.averageHealthScore);
  const confidencePercent = Math.round((latestResult?.confidence ?? 0) * 100);
  
  // Health score ring styling
  const ringClasses = latestScore >= 85 ? "border-green-400 text-green-400" : 
                      latestScore >= 70 ? "border-blue-400 text-blue-400" : 
                      latestScore >= 50 ? "border-yellow-400 text-yellow-400" : 
                      "border-red-400 text-red-400";
  
  // Recent health scores for trend analysis
  const recentScores = analysisResults.slice(0, 10).reverse().map(result => result.analysis.healthScore);
  const hasScoreTrend = recentScores.length > 1;

  // Battery level calculations
  const batteryLevel = Math.max(0, Math.min(100, Number(droneStatus.battery ?? 85)));
  const batteryAngle = (batteryLevel / 100) * 360;
  const batteryProgressColor = batteryLevel > 50 ? "#22c55e" : batteryLevel > 20 ? "#f59e0b" : "#ef4444";
  const batteryTextClass = batteryLevel > 50 ? "text-green-400" : batteryLevel > 20 ? "text-yellow-400" : "text-red-400";

  // CSV export handler
  const handleExportCSV = () => {
    if (analysisResults.length === 0) return;
    
    const csvHeader = "Timestamp,Health Score,Plant Count,Mature Strawberries,Immature Strawberries,Disease Detected,Confidence\n";
    const csvData = analysisResults.map(result => 
      `${new Date(result.timestamp).toLocaleString()},${result.analysis.healthScore},${result.analysis.plantCount},${result.analysis.matureStrawberries},${result.analysis.immatureStrawberries},${result.analysis.diseaseDetected ? 'Yes' : 'No'},${result.confidence}`
    ).join('\n');
    
    const blob = new Blob([csvHeader + csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-analysis-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <DroneProvider>
      <GlobalModalProvider>
        <LayoutProvider>
          <DropZonesProvider>
          <MainContent 
            droneStatus={droneStatus}
            isConnecting={isConnecting}
            connectToDrone={connectToDrone}
            disconnectFromDrone={disconnectFromDrone}
            missionStatus={missionStatus}
            startMission={startMission}
            stopMission={stopMission}
            startDetection={startDetection}
            onOpen={onOpen}
            rippleDetectionEnabled={rippleDetectionEnabled}
            qrDetectionEnabled={qrDetectionEnabled}
            setRippleDetectionEnabled={setRippleDetectionEnabled}
            setQRDetectionEnabled={setQRDetectionEnabled}
            startRippleDetection={startRippleDetection}
            stopRippleDetection={stopRippleDetection}
            startQRDetection={startQRDetection}
            stopQRDetection={stopQRDetection}
            takeoff={takeoff}
            land={land}
            analysisResults={analysisResults}
            handleExportCSV={handleExportCSV}
            exportAnalysisResults={exportAnalysisResults}
            clearAnalysisResults={clearAnalysisResults}
            batteryLevel={batteryLevel}
            manualControl={manualControl}
            videoStream={videoStream}
            logs={logs}
            clearLogs={clearLogs}
            sendMessage={sendMessage}
            missionPosition={missionPosition}
            missionMessages={missionMessages}
            strawberryDetections={strawberryDetections}
            latestStrawberryDetection={latestStrawberryDetection}
            strawberryMaturityStats={strawberryMaturityStats}
          />
        </DropZonesProvider>
      </LayoutProvider>
      <GlobalKnowledgeModal />
    </GlobalModalProvider>
  </DroneProvider>
  );
}

// Main content component with DropZonesContext
interface MainContentProps {
  droneStatus: any;
  isConnecting: boolean;
  connectToDrone: () => void;
  disconnectFromDrone: () => void;
  missionStatus: any;
  startMission: () => void;
  stopMission: () => void;
  startDetection: () => void;
  onOpen: () => void;
  rippleDetectionEnabled: boolean;
  qrDetectionEnabled: boolean;
  setRippleDetectionEnabled: (enabled: boolean) => void;
  setQRDetectionEnabled: (enabled: boolean) => void;
  startRippleDetection: () => void;
  stopRippleDetection: () => void;
  startQRDetection: () => void;
  stopQRDetection: () => void;
  takeoff: () => void;
  land: () => void;
  analysisResults: any[];
  handleExportCSV: () => void;
  exportAnalysisResults: () => void;
  clearAnalysisResults: () => void;
  batteryLevel: number;
  manualControl: (direction: 'up' | 'down' | 'left' | 'right' | 'center') => void;
  videoStream: any;
  logs: any[];
  clearLogs: () => void;
  sendMessage: (type: string, data?: any) => boolean;
  missionPosition?: any;
  missionMessages?: any[];
  strawberryDetections: any[];
  latestStrawberryDetection: any;
  strawberryMaturityStats: any;
}

const MainContent: React.FC<MainContentProps> = ({
  droneStatus,
  isConnecting,
  connectToDrone,
  disconnectFromDrone,
  missionStatus,
  startMission,
  stopMission,
  startDetection,
  onOpen,
  rippleDetectionEnabled,
  qrDetectionEnabled,
  setRippleDetectionEnabled,
  setQRDetectionEnabled,
  startRippleDetection,
  stopRippleDetection,
  startQRDetection,
  stopQRDetection,
  takeoff,
  land,
  analysisResults,
  handleExportCSV,
  exportAnalysisResults,
  clearAnalysisResults,
  batteryLevel,
  manualControl,
  videoStream,
  logs,
  clearLogs,
  sendMessage,
  missionPosition,
  missionMessages,
  strawberryDetections,
  latestStrawberryDetection,
  strawberryMaturityStats,
}) => {
  const {
    isEditMode,
    isComponentVisible,
    toggleComponentVisibility,
    showComponentSelector,
    setShowComponentSelector,
    visibleComponents 
  } = useLayout();

  const dropZonesContext = useDropZonesContext();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [containerOffset, setContainerOffset] = useState<{left: number; top: number; width?: number; height?: number}>({ left: 0, top: 64 });

  // Video stream reference and state
  const vs = videoStream;

  // Video container and recording state
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  // Countdown state for delayed screenshots
  const [showCountdown, setShowCountdown] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);

  const handleToggleFullscreen = () => {
    const el = videoContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };
  const toggleFullscreen = handleToggleFullscreen;

  const handleScreenshot = () => {
    // TODO: Implement actual screenshot functionality
    window.alert("Screenshot captured! This is a placeholder implementation.");
  };
  const takeScreenshot = handleScreenshot;

  const startRecording = () => setIsRecording(true);
  const stopRecording = () => setIsRecording(false);

  useEffect(() => {
    const updateOffset = () => {
      const rect = contentRef.current?.getBoundingClientRect();
      if (rect) {
        setContainerOffset({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
      }
    };
    updateOffset();
    window.addEventListener('resize', updateOffset);
    return () => window.removeEventListener('resize', updateOffset);
  }, []);

  return (
    <>
      {/* DarkVeil background */}
      <div className="fixed inset-0 z-[-30]">
        <DarkVeil 
          hueShift={25} 
          speed={2.2}
          noiseIntensity={0.05}
          warpAmount={0.3}
        />
      </div>
      
      {/* Background overlay */}
      <div className="absolute inset-0 bg-background/30 z-[-29]" />

      {/* Grid system */}
      <GridSystem 
        gridSize={20}
        showGrid={true}
        gridColor="#ffffff"
        gridOpacity={0.05}
      />
      
      {/* Drop zones */}
      <DropZones 
        zones={dropZonesContext.zones}
        showZones={dropZonesContext.showZones}
        onZoneHover={dropZonesContext.setHoveredZone}
        draggedComponent={dropZonesContext.draggedComponent}
        containerOffset={containerOffset}
      />
      
      <TopNavbar />
      
      {/* Component selector */}
      <ComponentSelector
        isVisible={showComponentSelector}
        onSelectComponent={toggleComponentVisibility}
        onClose={() => setShowComponentSelector(false)}
        selectedComponents={visibleComponents}
      />
      
      <div ref={contentRef} className="relative z-10 min-h-[calc(100vh-64px)] p-3" style={{ position: 'relative', overflow: 'visible' }}>
        {/* Left control panel - Static container for layout */}
        <DraggableContainer
          componentId="left-control-panel"
          initialPosition={{ x: 20, y: 20 }}
          initialSize={{ width: 352, height: 800 }}
          enableContentScaling={true}
          enableInternalDragging={true}
          enableDrag={false}
          enableResize={false}
          showResizeHandles={false}
        >
          <div className="w-full h-full space-y-3 overflow-y-auto p-2">
            {/* This container is for layout purposes */}
          </div>
        </DraggableContainer>

        {/* Connection Control Panel */}
        {isComponentVisible('connection-control') && (
          <DraggableContainer
            componentId="connection-control"
            initialPosition={{ x: 400, y: 20 }}
            initialSize={{ width: 352, height: 251 }}
            enableContentScaling={true}
            enableInternalDragging={false}
            enableDropZones={true}
            strictDropZones={false}
          >
            <Card className="bg-background/60 backdrop-blur-sm border border-divider rounded-[21px]" style={{width: '100%', height: '100%'}}>
              <CardBody className="flex flex-col" style={{padding: '27px 36px'}}>
                <ConnectionControlPanel
                  isConnecting={isConnecting}
                  isConnected={droneStatus.connected}
                  onConnect={connectToDrone}
                  onDisconnect={disconnectFromDrone}
                />
              </CardBody>
            </Card>
          </DraggableContainer>
        )}

        {/* Mission Panel */}
        {isComponentVisible('mission-panel') && (
          <DraggableContainer
            componentId="mission-panel"
            initialPosition={{ x: 800, y: 20 }}
            initialSize={{ width: 352, height: 377 }}
            enableContentScaling={true}
            enableInternalDragging={false}
            enableDropZones={true}
            strictDropZones={false}
          >
            <MissionPadPanel
              isConnected={droneStatus.connected}
              onStartMission={missionStatus.active ? stopMission : startMission}
              onStopMission={stopMission}
            />
          </DraggableContainer>
        )}

        {/* Detection Control Panel */}
        {isComponentVisible('detection-control') && (
          <DraggableContainer
            componentId="detection-control"
            initialPosition={{ x: 1200, y: 20 }}
            initialSize={{ width: 352, height: 370 }}
            enableContentScaling={true}
            enableInternalDragging={false}
            enableDropZones={true}
            strictDropZones={false}
          >
            <DetectionControlPanel
              isConnected={droneStatus.connected}
              onStartDetection={startDetection}
              onConfigAPI={onOpen}
              rippleDetectionEnabled={rippleDetectionEnabled}
              qrDetectionEnabled={qrDetectionEnabled}
              onRippleDetectionChange={setRippleDetectionEnabled}
              onQRDetectionChange={setQRDetectionEnabled}
              startRippleDetection={startRippleDetection}
              stopRippleDetection={stopRippleDetection}
              startQRDetection={startQRDetection}
              stopQRDetection={stopQRDetection}
            />
          </DraggableContainer>
        )}

        {/* Help Panel */}
        {isComponentVisible('help-panel') && (
          <DraggableContainer
            componentId="help-panel"
            initialPosition={{ x: 1600, y: 20 }}
            initialSize={{ width: 352, height: 319 }}
            enableContentScaling={true}
            enableInternalDragging={false}
            enableDropZones={true}
            strictDropZones={false}
          >
            <HelpPanel
              onViewHelp={() => window.open('/help', '_blank')}
            />
          </DraggableContainer>
        )}

        {/* Video Stream Panel */}
        {isComponentVisible('video-stream') && (
          <DraggableContainer
            componentId="video-stream"
            initialPosition={{ x: 400, y: 20 }}
            initialSize={{ width: 800, height: 600 }}
            enableDropZones={true}
            strictDropZones={false}
          >
          <Card className="bg-background/60 backdrop-blur-sm border border-divider w-full h-full">
            <CardBody className="p-0 flex flex-row w-full h-full bg-content1/50 rounded-[20px] backdrop-blur-[120px]">
              {/* Left sidebar with controls */}
              <div className="w-[280px] p-6 flex flex-col h-full">
                  {/* Header */}
                  <div className="text-foreground flex-shrink-0">
                    <h2 className="text-lg font-semibold leading-tight">
                      Video Stream<br />
                      <span className="text-sm font-normal opacity-80">STREAMING</span>
                    </h2>
                  </div>
                  
                  {/* Stream info */}
                  <div className="bg-content2 rounded-[12px] p-4 flex-shrink-0 mt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      <span className="text-foreground text-sm font-medium">Stream Info</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-foreground text-sm">
                      <div>
                        <div className="text-xs opacity-70 mb-1">FPS:</div>
                        <div className="font-medium">{vs?.fps || 0}fps</div>
                      </div>
                      <div>
                        <div className="text-xs opacity-70 mb-1">Resolution:</div>
                        <div className="font-medium">{vs?.resolution || '0x0'}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Altitude info */}
                  <div className="bg-content2 rounded-[12px] p-4 flex-shrink-0 mt-6">
                    <div className="text-foreground text-sm font-medium mb-3">Flight Altitude</div>
                    <div className="text-foreground text-2xl font-bold mb-2">{droneStatus.altitude?.toFixed(1) || '0.0'}m</div>
                    <div className="w-full h-[6px] bg-content3 rounded-full">
                      <div className="w-2/3 h-full bg-primary rounded-full"></div>
                    </div>
                  </div>
                  
                  {/* System logs */}
                  <div className="bg-content2 rounded-[12px] p-4 flex-1 flex flex-col mt-6 min-h-0">
                    <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                      <svg className="w-4 h-4 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-foreground text-sm font-medium">System Logs</span>
                      <button 
                        onClick={clearLogs}
                        className="ml-auto w-6 h-6 bg-danger hover:bg-danger/80 rounded-full flex items-center justify-center transition-colors"
                        title="Clear logs"
                      >
                        <svg className="w-3 h-3 text-danger-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Log entries */}
                    <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                      {logs.length === 0 ? (
                        <div className="text-foreground/50 text-xs text-center py-2">
                          No logs available
                        </div>
                      ) : (
                        logs.slice(-10).map((log, index) => (
                          <div key={index} className="text-xs text-foreground/80 bg-content3 rounded px-2 py-1 flex-shrink-0">
                            <span className="text-foreground/60">[{log.timestamp}]</span>
                            <span className={`ml-2 ${
                              log.level === 'error' ? 'text-danger' :
                              log.level === 'warning' ? 'text-warning' :
                              log.level === 'success' ? 'text-success' :
                              'text-foreground/80'
                            }`}>
                              {log.message}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
              </div>
              
              {/* Main video display area */}
              <div className="flex-1 relative bg-content1/30 rounded-r-[20px] overflow-hidden" ref={videoContainerRef}>
                  {/* Video stream or placeholder */}
                  {vs?.isStreaming && vs?.currentFrame ? (
                    <img 
                      src={vs?.currentFrame?.startsWith('data:image') ? (vs.currentFrame as string) : (`data:image/jpeg;base64,${vs?.currentFrame}` as string)}
                      alt="Drone Video Stream"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    /* No stream placeholder */
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground">
                      <img 
                        src="/images/video-loading-icon.svg" 
                        alt="Loading" 
                        className="w-[103px] h-[82px] opacity-30 mb-4"
                      />
                      <p className="text-sm opacity-60">
                        {droneStatus.connected ? 'Waiting for video stream...' : 'Connect to drone to view stream'}
                      </p>
                    </div>
                  )}
                  
                  {/* Countdown overlay */}
                  {showCountdown && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                      <div className="text-foreground text-6xl font-bold">{countdown}</div>
                    </div>
                  )}
                  
                  {/* Bottom controls */}
                  <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                    {/* Stream status */}
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        vs?.isStreaming ? 'bg-success' :
                        droneStatus.connected ? 'bg-warning' : 'bg-danger'
                      }`}></div>
                      <span className="text-foreground text-sm">
                        {vs?.isStreaming ? 'Streaming' : 
                               droneStatus.connected ? 'Waiting for stream' : 'Disconnected'}
                      </span>
                      <svg className="w-4 h-4 text-foreground ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    
                    {/* Control buttons */}
                    <div className="flex items-center gap-3">
                      {/* Fullscreen button */}
                      <button 
                        onClick={handleToggleFullscreen}
                        className="w-10 h-10 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-full flex items-center justify-center transition-colors"
                        title="Toggle fullscreen"
                      >
                        <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </button>
                      
                      {/* Screenshot button */}
                      <button 
                        onClick={handleScreenshot}
                        className="w-10 h-10 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                        title="Take screenshot"
                        disabled={!vs?.isStreaming}
                      >
                        <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>

              </div>
            </CardBody>
          </Card>
          </DraggableContainer>
        )}



        {/* Strawberry Detection Card */}
        {isComponentVisible('strawberry-detection') && (
          <DraggableContainer
            componentId="strawberry-detection"
            initialPosition={{ x: 400, y: 650 }}
            initialSize={{ width: 300, height: 200 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <StrawberryDetectionCard 
              detectedCount={strawberryDetections.length}
              latestDetection={latestStrawberryDetection || {
                name: "No detections",
                location: "--",
                timestamp: "--",
                maturity: "--"
              }}
              maturityStats={strawberryMaturityStats}
            />
          </DraggableContainer>
        )}
        
        {/* Manual Control Panel */}
        {isComponentVisible('manual-control') && (
          <DraggableContainer
            componentId="manual-control"
            initialPosition={{ x: 720, y: 650 }}
            initialSize={{ width: 300, height: 200 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <ManualControlPanel
              onTakeoff={takeoff}
              onLanding={land}
              onDirectionControl={manualControl}
            />
          </DraggableContainer>
        )}

        {/* QR Scan Panel */}
        {isComponentVisible('qr-scan') && (
          <DraggableContainer
            componentId="qr-scan"
            initialPosition={{ x: 1040, y: 650 }}
            initialSize={{ width: 250, height: 180 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <QRScanPanel />
          </DraggableContainer>
        )}

        {/* Virtual Position View */}
        {isComponentVisible('virtual-position') && (
          <DraggableContainer
            componentId="virtual-position"
            initialPosition={{ x: 400, y: 870 }}
            initialSize={{ width: 490, height: 240 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <VirtualPositionView position={missionPosition} messages={missionMessages} />
          </DraggableContainer>
        )}

        {/* AI Analysis Report */}
        {isComponentVisible('ai-analysis-report') && (
          <DraggableContainer
            componentId="ai-analysis-report"
            initialPosition={{ x: 1220, y: 20 }}
            initialSize={{ width: 350, height: 400 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <AIAnalysisReport 
              analysisResults={analysisResults}
              onExportCSV={handleExportCSV}
              onExportJSON={exportAnalysisResults}
              onClear={clearAnalysisResults}
            />
          </DraggableContainer>
        )}

        {/* Battery Status Panel */}
        {isComponentVisible('battery-status') && (
          <BatteryStatusPanel 
            batteryLevel={batteryLevel}
            isCharging={false}
          />
        )}

        {/* App Info Panel */}
        {isComponentVisible('app-info') && (
          <DraggableContainer
            componentId="app-info"
            initialPosition={{ x: 1220, y: 660 }}
            initialSize={{ width: 350, height: 150 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <AppInfoPanel />
          </DraggableContainer>
        )}

        {/* Challenge Cruise Panel */}
        {isComponentVisible('challenge-cruise') && (
          <DraggableContainer
            componentId="challenge-cruise"
            initialPosition={{ x: 1600, y: 360 }}
            initialSize={{ width: 350, height: 400 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <ChallengeCruisePanel 
              isConnected={droneStatus.connected}
              cruiseActive={Boolean(missionStatus?.active)}
              onStartCruise={(params) => { sendMessage('cruise_start', params); }}
              onStopCruise={() => { sendMessage('cruise_stop'); }}
              cruiseProgress={missionStatus?.progress ?? 0}
              currentRound={missionStatus?.currentRound ?? 0}
              totalRounds={missionStatus?.totalRounds ?? 0}
            />
          </DraggableContainer>
        )}

        {/* AI Analysis Panel */}
        {isComponentVisible('ai-analysis-panel') && (
          <DraggableContainer
            componentId="ai-analysis-panel"
            initialPosition={{ x: 1600, y: 780 }}
            initialSize={{ width: 400, height: 500 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <AIAnalysisPanel 
              isConnected={droneStatus.connected}
              analysisActive={false}
              onStartAnalysis={(config) => { sendMessage('analysis_start', config); }}
              onStopAnalysis={() => { sendMessage('analysis_stop'); }}
              onTestAI={() => { sendMessage('ai_test'); }}
            />
          </DraggableContainer>
        )}

        {/* Tools Panel */}
        {isComponentVisible('tools-panel') && (
          <DraggableContainer
            componentId="tools-panel"
            initialPosition={{ x: 2020, y: 20 }}
            initialSize={{ width: 380, height: 600 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <ToolsPanel 
              isConnected={droneStatus.connected}
              onGenerateQR={(config) => { sendMessage('qr_generate', config); }}
              onResetQR={() => { sendMessage('qr_reset'); }}
              onCalibrateCamera={() => { sendMessage('camera_calibrate'); }}
              onResetSystem={() => { sendMessage('system_reset'); }}
              onOpenWorkflowEditor={() => { toggleComponentVisibility('tello-workflow-panel'); }}
            />
          </DraggableContainer>
        )}

        {/* Configuration Panel */}
        {isComponentVisible('configuration-panel') && (
          <DraggableContainer
            componentId="configuration-panel"
            initialPosition={{ x: 2020, y: 640 }}
            initialSize={{ width: 400, height: 500 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <ConfigurationPanel 
              isConnected={droneStatus.connected}
              onSaveConfig={(config) => { sendMessage('ai_config_save', config); }}
              onTestAI={() => { sendMessage('ai_test'); }}
              onLoadConfig={() => { sendMessage('ai_config_load'); }}
              onExportConfig={() => { sendMessage('ai_config_export'); }}
            />
          </DraggableContainer>
        )}

        {/* Simulation Panel */}
        {isComponentVisible('simulation-panel') && (
          <DraggableContainer
            componentId="simulation-panel"
            initialPosition={{ x: 2440, y: 20 }}
            initialSize={{ width: 380, height: 550 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <SimulationPanel sendMessage={sendMessage} isConnected={droneStatus.connected} />
          </DraggableContainer>
        )}

        {/* Status Info Panel */}
        {isComponentVisible('status-info-panel') && (
          <DraggableContainer
            componentId="status-info-panel"
            initialPosition={{ x: 2440, y: 590 }}
            initialSize={{ width: 350, height: 450 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <StatusInfoPanel 
              batteryLevel={batteryLevel}
              analyzedPlants={analysisResults.length}
              detectionMode={rippleDetectionEnabled ? "Strawberry Detection" : "Standard Mode"}
              cruiseStatus={missionStatus?.status || "Idle"}
              strawberryCount={{
                ripe: analysisResults.filter(r => r.maturity === 'ripe').length,
                halfRipe: analysisResults.filter(r => r.maturity === 'half-ripe').length,
                unripe: analysisResults.filter(r => r.maturity === 'unripe').length
              }}
              connectionStatus={droneStatus?.connected ? "Connected" : "Disconnected"}
              flightTime={droneStatus?.flightTime || 0}
              altitude={droneStatus?.altitude || 0}
              gpsSignal={droneStatus?.gpsSignal || 0}
              temperature={droneStatus?.temperature || 25}
              humidity={droneStatus?.humidity || 60}
            />
          </DraggableContainer>
        )}

        {/* System Log Panel */}
        {isComponentVisible('system-log-panel') && (
          <DraggableContainer
            componentId="system-log-panel"
            initialPosition={{ x: 2820, y: 20 }}
            initialSize={{ width: 400, height: 600 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <SystemLogPanel 
              logs={logs}
              onClearLogs={clearLogs}
              onExportLogs={() => {
                const logData = logs.map(log => ({
                  timestamp: log.timestamp,
                  level: log.level,
                  category: log.category,
                  message: log.message,
                  details: log.details
                }));
                const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `system-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            />
          </DraggableContainer>
        )}

        {/* Video Control Panel */}
        {isComponentVisible('video-control-panel') && (
          <DraggableContainer
            componentId="video-control-panel"
            initialPosition={{ x: 2820, y: 640 }}
            initialSize={{ width: 380, height: 400 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <VideoControlPanel
              isConnected={droneStatus.connected}
              isRecording={isRecording}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onTakeScreenshot={takeScreenshot}
              onToggleFullscreen={toggleFullscreen}
              videoStream={videoStream}
            />
          </DraggableContainer>
        )}

        {/* Report Panel */}
        {isComponentVisible('report-panel') && (
          <DraggableContainer
            componentId="report-panel"
            initialPosition={{ x: 3220, y: 20 }}
            initialSize={{ width: 400, height: 650 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <ReportPanel
              onGenerateReport={(config) => {
                console.log('Generating report with config:', config);
                // TODO: Implement report generation
              }}
              onExportReport={(reportId, format) => {
                console.log('Exporting report:', reportId, format);
                // TODO: Implement report export
              }}
              onDeleteReport={(reportId) => {
                console.log('Deleting report:', reportId);
                // TODO: Implement report deletion
              }}
              reports={[]}
              isGenerating={false}
              generationProgress={0}
            />
          </DraggableContainer>
        )}

        {/* Chat Panel */}
        {isComponentVisible('chat-panel') && (
          <DraggableContainer
            componentId="chat-panel"
            initialPosition={{ x: 1680, y: 980 }}
            initialSize={{ width: 420, height: 560 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <PureChat />
          </DraggableContainer>
        )}

        {/* Memory Panel */}
        {isComponentVisible('memory-panel') && (
          <DraggableContainer
            componentId="memory-panel"
            initialPosition={{ x: 2120, y: 980 }}
            initialSize={{ width: 420, height: 560 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <MemoryPanel />
          </DraggableContainer>
        )}



        {/* Tello Control Panel */}
        {isComponentVisible('drone-control-panel') && (
          <DraggableContainer
            componentId="drone-control-panel"
            initialPosition={{ x: 100, y: 100 }}
            initialSize={{ width: 600, height: 700 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <TelloControlPanel />
          </DraggableContainer>
        )}

        {/* Tello Intelligent Agent */}
        {isComponentVisible('tello-intelligent-agent') && (
          <DraggableContainer
            componentId="tello-intelligent-agent"
            initialPosition={{ x: 1300, y: 100 }}
            initialSize={{ width: 600, height: 800 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <TelloIntelligentAgent />
          </DraggableContainer>
        )}

        {/* YOLO Model Manager Panel */}
        {isComponentVisible('yolo-model-manager') && (
          <DraggableContainer
            componentId="yolo-model-manager"
            initialPosition={{ x: 1280, y: 1080 }}
            initialSize={{ width: 400, height: 500 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <ModelManagerPanel />
          </DraggableContainer>
        )}

        {/* Enhanced Model Selector Panel */}
        {isComponentVisible('enhanced-model-selector') && (
          <DraggableContainer
            componentId="enhanced-model-selector"
            initialPosition={{ x: 50, y: 400 }}
            initialSize={{ width: 600, height: 700 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <EnhancedModelSelector 
              onModelChange={(modelName, modelType) => {
                console.log(`模型已切换: ${modelName} (${modelType})`);
                // 这里可以添加模型切换后的回调逻辑
              }}
              showUpload={true}
              compactMode={false}
            />
          </DraggableContainer>
        )}

        {/* Compact Model Selector Panel */}
        {isComponentVisible('compact-model-selector') && (
          <DraggableContainer
            componentId="compact-model-selector"
            initialPosition={{ x: 50, y: 50 }}
            initialSize={{ width: 500, height: 150 }}
            enableDropZones={true}
            strictDropZones={false}
          >
            <EnhancedModelSelector 
              onModelChange={(modelName, modelType) => {
                console.log(`模型已切换: ${modelName} (${modelType})`);
              }}
              showUpload={false}
              compactMode={true}
            />
          </DraggableContainer>
        )}
      </div>
    </>
  );
};