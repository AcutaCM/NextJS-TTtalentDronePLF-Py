"use client";

import { Card, CardBody } from "@heroui/card";
import { useEffect, useState } from "react";

// Corresponds to the QRScanResult in useDroneControl
interface QRScanResult {
  id: string;
  plantId: string;
  timestamp: string;
  qrImage: string; // Base64 encoded image
  size?: string;
  cooldownTime?: number; // Cooldown end timestamp
}

interface QRScanPanelProps {
  scanResult?: QRScanResult | null;
  cooldownTime?: number | null; // Cooldown end timestamp for the specific plantId
  scanHistory?: QRScanResult[];
}

export default function QRScanPanel({
  scanResult,
  cooldownTime,
  scanHistory,
}: QRScanPanelProps) {
  const [remainingCooldown, setRemainingCooldown] = useState<number>(0);

  useEffect(() => {
    if (cooldownTime) {
      const updateCooldown = () => {
        const now = Date.now();
        const remaining = Math.ceil((cooldownTime - now) / 1000);
        setRemainingCooldown(Math.max(0, remaining));
      };

      updateCooldown();
      const interval = setInterval(updateCooldown, 1000);

      return () => clearInterval(interval);
    } else {
      setRemainingCooldown(0);
    }
  }, [cooldownTime]);

  const plantId = scanResult?.plantId || "N/A";
  const qrImage = scanResult?.qrImage;
  const scanInfo = scanResult
    ? `植株信息\nID: ${scanResult.plantId}\nSize: ${scanResult.size || "未知"}`
    : "等待扫描...";

  return (
    <Card className="w-full h-full bg-background/60 backdrop-blur-[120px] border border-divider rounded-[5%] z-10 relative">
      <CardBody className="p-0 relative overflow-hidden">
        {/* Document Icon */}
        <div className="absolute top-[8%] left-[7.5%] w-[13.5%] h-[13.5%]">
          <svg className="w-full h-full text-foreground" viewBox="0 0 33 32" fill="none">
            <path d="M11 6.26H27.5V28.93H11V6.26Z" fill="currentColor" />
            <path d="M11 2.67H30.75V7.82H11V2.67Z" fill="currentColor" opacity="0.5" />
          </svg>
        </div>
        
        {/* QR Scan Title */}
        <div className="absolute top-[10.5%] left-[21.5%] w-[68.5%] h-[10%]">
          <span className="text-foreground font-bold text-[1.25rem] leading-tight font-['HONOR_Sans_Design']">
            QR扫描
          </span>
        </div>
        
        {/* QR Code Image Area */}
        <div className="absolute top-[24.5%] left-[10.5%] w-[37.5%] h-[36.5%] bg-content2 rounded-[3%] flex items-center justify-center">
          {qrImage ? (
            <img src={`data:image/png;base64,${qrImage}`} alt="Detected QR Code" className="w-full h-full object-contain rounded-[3%]" />
          ) : (
            <span className="text-foreground/60 font-normal text-[0.75rem] leading-tight text-center">
              放检测到的二维码
            </span>
          )}
        </div>
        
        {/* Scan Result Info */}
        <div className="absolute top-[23.5%] left-[54.5%] w-[38.5%] h-[38.5%]">
          <div className="text-foreground font-medium text-[0.75rem] leading-tight whitespace-pre-line">
            {scanInfo}
          </div>
        </div>
        
        {/* Bottom Info Area */}
        <>
          {/* Cooldown Icon */}
          <div className="absolute top-[75%] left-[8.5%] w-[14.5%] h-[14.5%]">
            <svg className="w-full h-full text-foreground/40" viewBox="0 0 35 35" fill="none">
              <circle cx="17.5" cy="17.5" r="15.675" fill="currentColor" opacity="0.5" />
              <path d="M19.68 23.7L14.1 18.12L19.68 12.54" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </div>
          
          {/* Plant ID and Cooldown Time */}
          <div className="absolute top-[72%] left-[29%] w-[43%] h-[14.5%]">
            <div className="text-foreground font-medium text-[0.75rem] leading-tight whitespace-pre-line">
              {plantId}
              {"\n"}
              QR冷却：{remainingCooldown}s
            </div>
          </div>
        </>
      </CardBody>
    </Card>
  );
}