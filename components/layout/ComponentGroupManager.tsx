"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Button } from '@heroui/button';
import { Chip } from '@heroui/chip';
import { Divider } from '@heroui/divider';
import { Tooltip } from '@heroui/tooltip';
import { Badge } from '@heroui/badge';
import { ScrollShadow } from '@heroui/scroll-shadow';
import { useLayout } from '@/contexts/LayoutContext';
import { COMPONENT_GROUPS, COMPONENT_METADATA, COMPONENT_PRIORITY } from '@/config/SlotConfig';

// 类型别名
type GroupId = typeof COMPONENT_GROUPS[keyof typeof COMPONENT_GROUPS];
type ComponentId = keyof typeof COMPONENT_METADATA;

interface ComponentGroupManagerProps {
  onGroupToggle?: (groupId: string, visible: boolean) => void;
  onComponentToggle?: (componentId: string, visible: boolean) => void;
}

const ComponentGroupManager: React.FC<ComponentGroupManagerProps> = ({
  onGroupToggle,
  onComponentToggle
}) => {
  const { visibleComponents, toggleComponentVisibility } = useLayout();
  const [expandedGroups, setExpandedGroups] = useState<Set<GroupId>>(new Set<GroupId>([COMPONENT_GROUPS.CORE]));
  const [groupVisibility, setGroupVisibility] = useState<Record<GroupId, boolean>>({} as Record<GroupId, boolean>);

  // 组信息映射
  const groupInfo: Record<GroupId, { name: string; description: string }> = React.useMemo(() => ({
    [COMPONENT_GROUPS.CORE]: { name: '核心功能', description: '无人机核心功能组件' },
    [COMPONENT_GROUPS.CONTROL]: { name: '控制面板', description: '无人机控制相关组件' },
    [COMPONENT_GROUPS.DETECTION]: { name: '检测功能', description: 'AI检测和识别组件' },
    [COMPONENT_GROUPS.INFO]: { name: '信息展示', description: '状态和信息显示组件' },
    [COMPONENT_GROUPS.ANALYSIS]: { name: '分析报告', description: '数据分析和报告组件' },
  }), []);

  // 根据 COMPONENT_METADATA 动态生成组件分组
  const componentGroups = React.useMemo(() => {
    const groups: Record<GroupId, ComponentId[]> = {
      [COMPONENT_GROUPS.CORE]: [],
      [COMPONENT_GROUPS.CONTROL]: [],
      [COMPONENT_GROUPS.DETECTION]: [],
      [COMPONENT_GROUPS.INFO]: [],
      [COMPONENT_GROUPS.ANALYSIS]: [],
    } as Record<GroupId, ComponentId[]>;
    
    // 根据 COMPONENT_METADATA 将组件分配到对应组
    Object.entries(COMPONENT_METADATA).forEach(([componentId, metadata]) => {
      const groupKey = metadata.group as GroupId;
      if (groups[groupKey]) {
        groups[groupKey].push(componentId as ComponentId);
      }
    });
    
    return groups;
  }, []);

  // 计算每个组的可见组件数量
  const getGroupStats = (groupId: GroupId) => {
    const groupComponents = componentGroups[groupId];
    if (!groupComponents) return { visible: 0, total: 0 };
    
    const visibleCount = groupComponents.filter(id => visibleComponents.includes(id as string)).length;
    return {
      visible: visibleCount,
      total: groupComponents.length
    };
  };

  // 切换组的展开/折叠状态
  const toggleGroupExpansion = (groupId: GroupId) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // 切换整个组的可见性
  const toggleGroupVisibility = (groupId: GroupId) => {
    const groupComponents = componentGroups[groupId];
    if (!groupComponents) return;

    const stats = getGroupStats(groupId);
    const shouldShow = stats.visible < stats.total;

    groupComponents.forEach(componentId => {
      if (shouldShow && !visibleComponents.includes(componentId as string)) {
          toggleComponentVisibility(componentId as string);
        } else if (!shouldShow && visibleComponents.includes(componentId as string)) {
        toggleComponentVisibility(componentId as string);
      }
    });

    onGroupToggle?.(groupId, shouldShow);
  };

  // 获取组件的优先级颜色（根据数值优先级映射）
  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case COMPONENT_PRIORITY.CRITICAL: return 'danger';
      case COMPONENT_PRIORITY.HIGH: return 'warning';
      case COMPONENT_PRIORITY.MEDIUM: return 'primary';
      case COMPONENT_PRIORITY.LOW: return 'default';
      default: return 'default';
    }
  };

  // 切换单个组件的可见性
  const handleComponentToggle = (componentId: string) => {
    const isCurrentlyVisible = visibleComponents.includes(componentId);
    toggleComponentVisibility(componentId);
    onComponentToggle?.(componentId, !isCurrentlyVisible);
  };

  // 获取组的状态颜色
  const getGroupStatusColor = (groupId: GroupId) => {
    const stats = getGroupStats(groupId);
    if (stats.visible === 0) return 'default';
    if (stats.visible === stats.total) return 'success';
    return 'warning';
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <div className="flex flex-col w-full">
          <h3 className="text-lg font-semibold">组件分组管理</h3>
          <p className="text-sm text-default-500">按功能分组管理组件显示</p>
        </div>
      </CardHeader>
      <Divider />
      <CardBody className="p-0">
        <ScrollShadow className="h-full">
          <div className="p-4 space-y-3">
            {(Object.values(COMPONENT_GROUPS) as GroupId[]).map((groupId) => {
              const stats = getGroupStats(groupId);
              const isExpanded = expandedGroups.has(groupId);
              const statusColor = getGroupStatusColor(groupId);
              const info = groupInfo[groupId];

              return (
                <Card key={groupId} className="border-1 border-default-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onClick={() => toggleGroupExpansion(groupId)}
                        >
                          <svg
                            className={`w-4 h-4 transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </Button>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{info?.name || groupId}</span>
                          <Badge
                            color={statusColor}
                            variant="flat"
                            size="sm"
                          >
                            {stats.visible}/{stats.total}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tooltip content={`${info?.description || '组件分组'}`}>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </Button>
                        </Tooltip>
                        <Button
                          size="sm"
                          variant={stats.visible > 0 ? "solid" : "bordered"}
                          color={statusColor}
                          onClick={() => toggleGroupVisibility(groupId)}
                        >
                          {stats.visible === stats.total ? '全部隐藏' : '全部显示'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && (
                    <CardBody className="pt-0">
                      <div className="space-y-2">
                        {componentGroups[groupId].map((componentId) => {
                          const metadata = COMPONENT_METADATA[componentId];
                          const isVisible = visibleComponents.includes(componentId as string);
                          
                          return (
                            <div
                              key={componentId as string}
                              className="flex items-center justify-between p-2 rounded-lg border-1 border-default-100 hover:bg-default-50 transition-colors"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{componentId as string}</span>
                                    <Chip size="sm" variant="flat" color={getPriorityColor(metadata.priority)}>
                                      {metadata.priority}
                                    </Chip>
                                  </div>
                                  <span className="text-xs text-default-500">分组：{metadata.group}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* 去掉无类型定义的槽位显示 */}
                                <Button
                                  size="sm"
                                  variant={isVisible ? 'solid' : 'bordered'}
                                  color={isVisible ? 'success' : 'default'}
                                  onClick={() => handleComponentToggle(componentId as string)}
                                >
                                  {isVisible ? '隐藏' : '显示'}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardBody>
                  )}
                </Card>
              );
            })}
          </div>
        </ScrollShadow>
      </CardBody>
    </Card>
  );
};

export default ComponentGroupManager;