'use client';

import { useArtifactStore } from '@/store/artifactStore';
import { useAuthStore } from '@/store/authStore';
import { useThreadStore } from '@/store/threadStore';
import {
  rearrangeChildNodesLayoutGlobal,
  resolveAllOverlapsBlockwise,
} from '@/utils/helper';
import { getReactflowDiagramFromRoadmapDSL } from '@/utils/roadmapDSLParser';
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  ReactFlow,
  useReactFlow,
} from '@xyflow/react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import AssignmentNode from '../custom-nodes/AssignmentNode';
import LearningAnchor from '../custom-nodes/LearningAnchor';
import ParagraphNode from '../custom-nodes/ParagraphNode';
import SubtopicGroupNode from '../custom-nodes/SubtopicGroupNode';
import SubTopicNode from '../custom-nodes/SubTopicNode';
import TitleNode from '../custom-nodes/TitleNode';
import TopicGroupNode from '../custom-nodes/TopicGroupNode';
import TopicNode from '../custom-nodes/TopicNode';
import EdgeMarkers from '../shared/EdgeMarkers';
import { KnowledgeLevelLegend } from '../roadmap/RoadmapDataViewer';
import styles from './RoadmapArtifact.module.css';
import RoadmapSVGViewer from '../roadmap/RoadmapSVGViewer';
import roadmapFormationGif from '@/assets/artifact/roadmap-formation.gif';
import { RoadmapProvider } from '@/context/RoadmapContext';
import { updateArtifact } from '@/service/artifact.service';

const allowedNodeTypes = {
  title: TitleNode,
  topic: TopicNode,
  subtopic: SubTopicNode,
  paragraph: ParagraphNode,
  subtopicGroup: SubtopicGroupNode,
  assignmentNode: AssignmentNode,
  topicGroup: TopicGroupNode,
  learningAnchor: LearningAnchor,
};

const defaultEdgeOptions = {
  type: 'step',
};

const RoadmapArtifact = () => {
  const userDetails = useAuthStore((s) => s.userDetails);

  const threadId = useThreadStore((s) => s.threadId);

  const artifactId = useArtifactStore((s) => s.artifactId);
  const artifactData = useArtifactStore((s) => s.artifactData);
  const artifactMetadata = useArtifactStore((s) => s.artifactMetadata);

  const setArtifactMetadata = useArtifactStore((s) => s.setArtifactMetadata);

  const storeNodes = useArtifactStore((s) => s.artifactData?.graph?.nodes);
  const storeEdges = useArtifactStore((s) => s.artifactData?.graph?.edges);

  const [nodes, setNodes] = useState(storeNodes ?? []);
  const [edges, setEdges] = useState(storeEdges ?? []);
  const [isRoadmapGenerationRunning, setIsRoadmapGenerationRunning] =
    useState(false);

  const [rfInstance, setRfInstance] = useState(null);

  const { getNodes, fitView } = useReactFlow();

  // if user away of tab then detail the update api call for DOM measurement
  const waitForVisibilityAndMeasurement = async () => {
    return new Promise((resolve) => {
      const check = () => {
        const allNodes = rfInstance.getNodes();
        const allMeasured = allNodes.every(
          (n) => n?.measured?.width && n?.measured?.height,
        );

        if (document.visibilityState === 'visible' && allMeasured) {
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  };

  const initiateRoadmapRendering = async () => {
    if (!artifactData || isRoadmapGenerationRunning) return;

    setIsRoadmapGenerationRunning(true);

    // wait until user not comeback to the screen
    await new Promise((resolve) => {
      const check = () => {
        if (document.visibilityState === 'visible') {
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });

    const roadmapDSL = artifactData.dsl;
    const reactflowStructure = getReactflowDiagramFromRoadmapDSL(roadmapDSL);
    setNodes(reactflowStructure?.nodes || []);
    setEdges(reactflowStructure?.edges || []);
    setTimeout(async () => {
      await waitForVisibilityAndMeasurement();
      const allNodes = getNodes();
      let updatedNodes = [...allNodes];

      const groupNodes = allNodes.filter(
        (n) => n.type === 'topicGroup' || n.type === 'subtopicGroup',
      );

      groupNodes.forEach((groupNode) => {
        // For header height, if not stored yet, fallback to default
        const headerEl = document.querySelector(
          `[data-node-id="${groupNode.id}"] .node-header`,
        );
        const headingHeight =
          headerEl?.offsetHeight || groupNode?.data?.headerStyle?.height || 70;
        updatedNodes = rearrangeChildNodesLayoutGlobal(
          updatedNodes,
          groupNode,
          headingHeight,
        );
      });

      const validatedNodes = resolveAllOverlapsBlockwise(
        updatedNodes,
        reactflowStructure?.edges,
      );
      setNodes(validatedNodes);
      fitView();

      setTimeout(async () => {
        const roadmapGraph = rfInstance.toObject();

        const data = {
          graph: roadmapGraph,
          meta: {
            generation_status: 'complete',
          },
        };
        const updateStatus = await updateArtifact(threadId, artifactId, data);
        if (updateStatus) {
          setArtifactMetadata((prev) => ({
            ...prev,
            generation_status: 'complete',
          }));
          setIsRoadmapGenerationRunning(false);
        }
      }, 2000);
    }, 5000);
  };

  const onNodeClick = () => {};

  useEffect(() => {
    if (!rfInstance) return;

    if (
      artifactMetadata?.generation_status &&
      artifactMetadata?.generation_status !== 'complete'
    ) {
      initiateRoadmapRendering();
    }
  }, [rfInstance, artifactMetadata]);

  useEffect(() => {
    if (storeNodes && storeNodes.length > 0) {
      setNodes(storeNodes);
    }
    if (storeEdges && storeEdges.length > 0) {
      setEdges(storeEdges);
    }
  }, [storeNodes, storeEdges]);

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          opacity: 0, // Invisible
          pointerEvents: 'none', // Don't interfere with UI
          zIndex: -1,
        }}
      >
        <RoadmapCanvas
          edges={edges}
          nodes={nodes}
          setEdges={setEdges}
          setNodes={setNodes}
          rfInstance={rfInstance}
          setRfInstance={setRfInstance}
        />
      </div>
      <div className={styles['main-container']}>
        {artifactMetadata?.generation_status === 'incomplete' ? (
          <div className={styles['loading-ct']}>
            <Image
              src={roadmapFormationGif}
              alt="shifu-bot"
              className={styles['shifu-bot-img']}
            />
            <span>I’m Generating your Roadmap.</span>
          </div>
        ) : (
          <div className={styles['bottom']}>
            <div className={styles['roadmap-svg-ct']} id="react-flow-wrapper">
              <KnowledgeLevelLegend />
              <div className={styles['roadmap-ct']}>
                <RoadmapSVGViewer
                  roadmap_graph={{ nodes, edges }}
                  learningProgress={{}}
                  onNodeClick={onNodeClick}
                  showLearningStatus={false}
                  courseRecommendations={[]}
                />
              </div>
            </div>
            {/* {!isDoubtSolverSectionOpen && <FloatingBot />}*/}
          </div>
        )}

        {/* {isDoubtSolverSectionOpen && isMobile && <DoubtSolver />}*/}
      </div>
    </>
  );
};

const RoadmapCanvas = ({
  nodes,
  edges,
  setNodes,
  setEdges,
  rfInstance,
  setRfInstance,
}) => {
  const onNodesChange = useCallback(
    (changes) => {
      let updatedNodes = applyNodeChanges(changes, nodes);
      setNodes(updatedNodes);
    },
    [nodes, setNodes],
  );
  const onEdgesChange = useCallback(
    (changes) => {
      let updatedEdges = applyEdgeChanges(changes, nodes);
      setEdges(updatedEdges);
    },
    [nodes, setEdges],
  );

  const onInit = (reactFlowInstance) => {
    setRfInstance(reactFlowInstance);
  };

  return (
    <RoadmapProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={(changes) => setTimeout(() => onNodesChange(changes))}
        onEdgesChange={(changes) => setTimeout(() => onEdgesChange(changes))}
        nodeTypes={allowedNodeTypes}
        fitView
        defaultEdgeOptions={defaultEdgeOptions}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={true}
        minZoom={0.2}
        onInit={onInit}
      >
        {/* Edge Markers for better edge visibility */}
        <EdgeMarkers />

        {/* Background with a light gray color */}
        <Background style={{ backgroundColor: '#FAFAFA' }} color="#FAFAFA" />
      </ReactFlow>
    </RoadmapProvider>
  );
};

export default RoadmapArtifact;
