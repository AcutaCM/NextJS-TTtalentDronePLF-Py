import React from "react";
import { Button } from "@heroui/button";

interface ConnectionControlPanelProps {
  isConnecting: boolean;
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

const ConnectionControlPanel: React.FC<ConnectionControlPanelProps> = ({
  isConnecting,
  isConnected,
  onConnect,
  onDisconnect,
}) => {
  return (
    <div className="h-full flex flex-col justify-between p-6">
      <div className="mb-6">
        <h2 className="text-foreground font-bold text-[18px] leading-[22px] mb-1">连接控制</h2>
        <p className="text-foreground/70 font-bold text-[18px] leading-[22px]">CONNECT CONTROL</p>
      </div>
      <div className="space-y-4">
        <Button
          color="primary"
          variant="bordered"
          size="lg"
          className="w-full h-[48px] text-[16px] font-medium"
          isLoading={isConnecting && !isConnected}
          onPress={onConnect}
          isDisabled={isConnected}
        >
          连接
        </Button>
        <Button
          color="primary"
          variant="bordered"
          size="lg"
          className="w-full h-[48px] text-[16px] font-medium"
          onPress={onDisconnect}
          isDisabled={!isConnected}
        >
          断开连接
        </Button>
      </div>
    </div>
  );
};

export default ConnectionControlPanel;