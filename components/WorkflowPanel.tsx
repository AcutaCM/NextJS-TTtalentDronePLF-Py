import React from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { useDisclosure } from "@heroui/use-disclosure";
import WorkflowEditor from "./WorkflowEditor";

interface WorkflowPanelProps {
  isConnected: boolean;
}

const WorkflowPanel: React.FC<WorkflowPanelProps> = ({ isConnected }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <Card className="h-full bg-black/40 border border-white/20">
        <CardHeader className="pb-2">
          <div className="flex flex-col w-full">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <i className="fas fa-project-diagram text-purple-400"></i>
              工作流面板
            </h3>
            <p className="text-white/70 text-sm">控制</p>
          </div>
        </CardHeader>
        <Divider className="bg-white/20" />
        <CardBody className="flex flex-col justify-between">
          <p className="text-xs text-white/70">
            通过可视化界面搭建、执行和监控无人机任务流。
          </p>
          <Button
            className="w-full mt-4 bg-purple-600/80 hover:bg-purple-600 text-white"
            onPress={onOpen}
            isDisabled={!isConnected}
            startContent={<i className="fas fa-sitemap"></i>}
          >
            打开编辑器
          </Button>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onClose={onClose} size="full">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h3 className="text-xl font-bold">工作流编辑器</h3>
            <p className="text-sm text-gray-500">拖拽节点以构建无人机任务</p>
          </ModalHeader>
          <ModalBody>
            <div className="h-[80vh]">
              <WorkflowEditor />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onPress={onClose}>
              关闭
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default WorkflowPanel;