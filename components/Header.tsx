
import React from 'react';
import Image from 'next/image';

// Since the icon assets are not yet available, we use placeholders.
const PlaceholderIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <div className={`${className} bg-gray-500 rounded animate-pulse`} />
);

const Slogan = () => {
  return (
    <div className="flex items-center gap-x-4">
      {/* Logo */}
      <Image src="/logo.svg" alt="TTtalentDev Logo" width={61} height={47} />
      <div className="flex flex-col">
        <span className="text-white font-inter text-base">TTtalentDev无人机作业平台</span>
        <span className="text-white font-inter text-base">DRONE PLF</span>
      </div>
    </div>
  );
};

const StatusItem = ({ icon, label }: { icon: React.ReactNode, label: string }) => (
  <div className="flex items-center justify-center gap-x-2 bg-black/35 text-white text-sm font-medium px-4 py-2 rounded-[21px] min-w-[106px] h-[36px]">
    {icon}
    <span>{label}</span>
  </div>
);

const DroneStatus = () => {
  return (
    <div className="flex items-center gap-x-4">
      <StatusItem icon={<PlaceholderIcon className="w-4 h-4" />} label="巡航：待机" />
      <StatusItem icon={<PlaceholderIcon className="w-4 h-4" />} label="任务：待机" />
      <StatusItem icon={<PlaceholderIcon className="w-4 h-4" />} label="无人机：否" />
      <StatusItem icon={<PlaceholderIcon className="w-4 h-4" />} label="AI：离线" />
    </div>
  );
};

const UserControls = () => {
  return (
    <div className="flex items-center gap-x-6">
      <div className="relative flex items-center">
        <div className="absolute left-3">
          <PlaceholderIcon className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="Type here..."
          className="bg-[#0F1535] border border-white/30 rounded-[15px] w-[190px] h-[35px] pl-9 pr-3 text-sm text-white placeholder-gray-400"
        />
      </div>
      <div className="flex items-center gap-x-2 text-white/30">
        <PlaceholderIcon className="w-6 h-6" />
        <span className="text-base">登录</span>
      </div>
      <div className="flex items-center gap-x-4">
        <PlaceholderIcon className="w-6 h-6" />
        <PlaceholderIcon className="w-6 h-6" />
      </div>
    </div>
  );
};

const Header = () => {
  return (
    <header className="w-full flex items-center justify-between px-8 py-2 bg-transparent">
      <Slogan />
      <DroneStatus />
      <UserControls />
    </header>
  );
};

export default Header;
