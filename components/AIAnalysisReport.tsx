'use client';

import React, {useMemo} from 'react';
import { Button } from '@nextui-org/react';
import AnimatedList from './ui/AnimatedList';

interface AIAnalysisReportProps {
  analysisResults?: any[];
  onExportCSV?: () => void;
  onExportJSON?: () => void;
  onClear?: () => void;
}

export default function AIAnalysisReport({
  analysisResults = [],
  onExportCSV,
  onExportJSON,
  onClear
}: AIAnalysisReportProps) {
  const latest = analysisResults[0];

  const stats = useMemo(() => {
    if (!analysisResults.length) return null;
    const s = analysisResults.reduce((acc, r) => {
      acc.total++;
      acc.conf += r.confidence || 0;
      acc.health += r.analysis?.healthScore || 0;
      if (r.analysis?.diseaseDetected) acc.disease++;
      acc.plants += r.analysis?.plantCount || 0;
      acc.mature += r.analysis?.matureStrawberries || 0;
      acc.immature += r.analysis?.immatureStrawberries || 0;
      return acc;
    }, {total:0, conf:0, health:0, disease:0, plants:0, mature:0, immature:0});
    return {
      total: s.total,
      avgConf: s.conf / s.total,
      avgHealth: s.health / s.total,
      diseaseRate: s.total ? (s.disease / s.total) * 100 : 0,
      plants: s.plants,
      mature: s.mature,
      immature: s.immature
    };
  }, [analysisResults]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 背景渐变 */}
      <div className="absolute inset-0 rounded-[20px] bg-gradient-to-b from-[rgba(6,11,40,0.74)] to-[rgba(10,14,35,0.71)] backdrop-blur-[120px]" />

      {/* 内容 */}
      <div className="relative z-10 h-full w-full p-5 text-white">
        {/* 标题区 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">AI分析管理器</h2>
            <p className="text-white/60 text-xs">AI Analysis Manager</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="flat" onPress={onExportJSON}>导出JSON</Button>
            <Button size="sm" variant="flat" onPress={onExportCSV}>导出CSV</Button>
            <Button size="sm" color="danger" variant="flat" onPress={onClear}>清空</Button>
          </div>
        </div>

        <div className="mt-3 h-px bg-white/30" />

        {!latest ? (
          <div className="h-[calc(100%-64px)] flex items-center justify-center text-white/70">
            暂无分析结果
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-12 gap-3 h-[calc(100%-64px)]">
            {/* 左侧：最新一次诊断 */}
            <div className="col-span-7 min-w-0">
              <h3 className="text-2xl font-light">病害诊断</h3>

              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <InfoItem label="健康评分" value={(latest.analysis?.healthScore ?? 0).toFixed(1)} />
                <InfoItem label="置信度" value={`${((latest.confidence ?? 0)*100).toFixed(1)}%`} />
                <InfoItem label="是否检测到病害" value={latest.analysis?.diseaseDetected ? '是' : '否'} />
                <InfoItem label="植株数量" value={latest.analysis?.plantCount ?? 0} />
                <InfoItem label="成熟草莓" value={latest.analysis?.matureStrawberries ?? 0} />
                <InfoItem label="未熟草莓" value={latest.analysis?.immatureStrawberries ?? 0} />
              </div>

              {latest.recommendations?.length ? null : null}

              <div className="mt-4">
                <h4 className="text-sm text-white/80 mb-2">专业建议</h4>
                <AnimatedList
                  items={latest.analysis?.recommendations || []}
                  renderItem={(rec, idx) => (
                    <div className="text-xs text-white/90 bg-white/10 rounded-md px-2 py-1 mx-1 my-1">
                      {rec}
                    </div>
                  )}
                  maxHeight="112px"
                  itemHeight={32}
                  showGradients={true}
                  enableArrowNavigation={false}
                  className="pr-1"
                  emptyState={
                    <div className="text-xs text-white/60">暂无建议</div>
                  }
                />
              </div>

              {latest.imageUrl && (
                <div className="mt-4">
                  <h4 className="text-sm text-white/80 mb-2">图像预览</h4>
                  <img src={latest.imageUrl} alt="analysis" className="w-full rounded-lg border border-white/20" />
                </div>
              )}
            </div>

            {/* 右侧：统计与历史 */}
            <div className="col-span-5 min-w-0">
              <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                <h4 className="text-sm text-white/80">统计概览</h4>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <InfoItem small label="总样本" value={stats?.total ?? 0} />
                  <InfoItem small label="平均置信度" value={`${((stats?.avgConf ?? 0)*100).toFixed(1)}%`} />
                  <InfoItem small label="平均健康分" value={(stats?.avgHealth ?? 0).toFixed(1)} />
                  <InfoItem small label="病害率" value={`${(stats?.diseaseRate ?? 0).toFixed(1)}%`} />
                  <InfoItem small label="总植株" value={stats?.plants ?? 0} />
                  <InfoItem small label="成熟/未熟" value={`${stats?.mature ?? 0}/${stats?.immature ?? 0}`} />
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-white/15 bg-white/5 p-3 h-[calc(100%-130px)]">
                <h4 className="text-sm text-white/80 mb-2">历史记录</h4>
                <AnimatedList
                  items={analysisResults.slice(0,20)}
                  renderItem={(r, i) => (
                    <div className="flex items-center justify-between text-xs bg-white/8 rounded-md px-2 py-1 mx-1 my-1">
                      <div className="truncate max-w-[55%]" title={r.timestamp}>
                        {new Date(r.timestamp).toLocaleString('zh-CN')}
                      </div>
                      <div className="flex gap-3 text-white/90">
                        <span>健康 {r.analysis?.healthScore?.toFixed?.(1) ?? r.analysis?.healthScore ?? '-'}</span>
                        <span>置信 {((r.confidence ?? 0)*100).toFixed(0)}%</span>
                        <span className={r.analysis?.diseaseDetected? 'text-red-300':'text-green-300'}>
                          {r.analysis?.diseaseDetected? '病害':'正常'}
                        </span>
                      </div>
                    </div>
                  )}
                  maxHeight="calc(100% - 24px)"
                  itemHeight={40}
                  showGradients={true}
                  enableArrowNavigation={false}
                  className="pr-1"
                  emptyState={
                    <div className="text-white/60 text-xs">暂无记录</div>
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({label, value, small}:{label:string; value:any; small?:boolean}){
  return (
    <div className={`rounded-lg border border-white/15 bg-white/5 ${small? 'px-2 py-1':'px-3 py-2'}`}>
      <div className={`text-white/60 ${small? 'text-[10px]':'text-xs'}`}>{label}</div>
      <div className={`${small? 'text-sm':'text-base'} font-semibold`}>{value}</div>
    </div>
  );
}