import React, { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  ReactFlowProvider,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { TreePine, Target, BookOpen, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import MentorBackground from '../components/MentorBackground';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

const categoryEmojis = {
  MATERIAL_ASSET: '💰',
  SKILL_DEVELOPMENT: '📚',
  CAREER_GROWTH: '🚀',
  LIFE_EXPERIENCE: '🌍',
  EXISTENTIAL_WELLBEING: '🧘',
  ABSTRACT_AMBITION: '✨',
};

const categoryGradients = {
  MATERIAL_ASSET: 'from-yellow-500 to-amber-600',
  SKILL_DEVELOPMENT: 'from-blue-500 to-indigo-600',
  CAREER_GROWTH: 'from-purple-500 to-pink-600',
  LIFE_EXPERIENCE: 'from-green-500 to-emerald-600',
  EXISTENTIAL_WELLBEING: 'from-violet-500 to-purple-600',
  ABSTRACT_AMBITION: 'from-orange-500 to-red-600',
};

const defaultGradient = 'from-emerald-500 to-teal-600';

// ── Custom Node Component: Branch Node ──
const BranchNode = ({ data, selected }) => {
  const getGradient = () => categoryGradients[data.branchType] || defaultGradient;
  const getIcon = () => categoryEmojis[data.branchType] || '🌱';

  return (
    <div className={`relative group ${data.isRoot ? 'scale-110' : ''}`}>
      {data.isRoot && (
        <div className="absolute -inset-4 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 rounded-full blur-xl opacity-30 animate-pulse" />
      )}
      <div
        className={`
          relative rounded-2xl shadow-lg transition-all duration-300 cursor-pointer
          ${selected ? 'ring-3 ring-amber-400 shadow-amber-200 dark:shadow-amber-800' : ''}
          ${data.isRoot
            ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white px-4 sm:px-6 py-3 sm:py-4 min-w-[140px] sm:min-w-[180px]'
            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-2.5 sm:py-3 min-w-[120px] sm:min-w-[160px]'
          }
          hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
          ${data.isCompleted ? 'opacity-80' : ''}
        `}
        onClick={() => data.onClick?.(data)}
      >
        {!data.isRoot && (
          <div className={`absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-gradient-to-br ${getGradient()} flex items-center justify-center text-xs shadow-md`}>
            {getIcon()}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            {data.isRoot ? (
              <TreePine size={22} className="text-white" />
            ) : (
              <span className="text-lg">{getIcon()}</span>
            )}
            <h3 className={`font-semibold leading-tight ${data.isRoot ? 'text-white text-sm sm:text-lg' : 'text-gray-800 dark:text-white text-xs sm:text-sm'}`}>
              {data.label}
            </h3>
          </div>
          {data.description && (
            <p className={`text-xs leading-relaxed ${data.isRoot ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
              {data.description}
            </p>
          )}
          {!data.isRoot && data.progress !== undefined && (
            <div className="mt-1">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-gray-400">{data.itemsCount || 0} шагов</span>
                <span className="font-medium text-gray-600 dark:text-gray-300">{data.progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getGradient()} rounded-full transition-all duration-500`}
                  style={{ width: `${data.progress}%` }}
                />
              </div>
            </div>
          )}
          {!data.isRoot && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-indigo-500 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight size={12} />
              <span>Нажмите для выбора</span>
            </div>
          )}
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0" />
    </div>
  );
};

// ── Custom Node Component: Task Node (leaf) ──
const TaskNode = ({ data, selected }) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'completed': return 'from-green-400 to-emerald-500';
      case 'in_progress': return 'from-blue-400 to-indigo-500';
      case 'available': return 'from-amber-400 to-orange-500';
      default: return 'from-gray-300 to-gray-400';
    }
  };

  return (
    <div
      className={`
        relative rounded-xl shadow-md transition-all duration-300 cursor-pointer
        ${selected ? 'ring-2 ring-indigo-400 shadow-indigo-200 dark:shadow-indigo-800' : ''}
        bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 sm:px-3 py-2 sm:py-2.5 min-w-[100px] sm:min-w-[140px] max-w-[160px] sm:max-w-[200px]
        hover:shadow-lg hover:scale-[1.03] active:scale-[0.97]
      `}
      onClick={() => data.onClick?.(data)}
    >
      <div className="flex items-center gap-2">
        <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${getStatusColor()} flex items-center justify-center shadow-sm`}>
          {data.status === 'completed' ? (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          )}
        </div>
        <span className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-200 leading-tight">
          {data.label}
        </span>
      </div>
      {data.resourceCount && (
        <div className="mt-1.5 flex items-center gap-1 text-[9px] text-gray-400">
          <BookOpen size={10} />
          <span>{data.resourceCount} материалов</span>
        </div>
      )}
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0" />
    </div>
  );
};

// ── Node types ──
const nodeTypes = {
  branch: BranchNode,
  task: TaskNode,
};

// ── Demo tree data (shown when no goals exist) ──
const demoNodes = [
  {
    id: 'root',
    type: 'branch',
    position: { x: 400, y: 50 },
    data: {
      label: 'Дерево развития',
      description: 'Ваши цели и направления',
      isRoot: true,
      isCompleted: false,
    },
  },
  {
    id: 'branch-0',
    type: 'branch',
    position: { x: 200, y: 250 },
    data: {
      label: 'Книги',
      description: 'Чтение и самообразование',
      branchType: 'books',
      progress: 50,
      itemsCount: 4,
      isCompleted: false,
    },
  },
  {
    id: 'branch-1',
    type: 'branch',
    position: { x: 500, y: 250 },
    data: {
      label: 'Навыки',
      description: 'Профессиональное развитие',
      branchType: 'skills',
      progress: 30,
      itemsCount: 5,
      isCompleted: false,
    },
  },
  {
    id: 'task-0-0',
    type: 'task',
    position: { x: 50, y: 430 },
    data: {
      label: 'Прочитать книгу',
      status: 'in_progress',
      resourceCount: 2,
    },
  },
  {
    id: 'task-0-1',
    type: 'task',
    position: { x: 250, y: 460 },
    data: {
      label: 'Сделать конспект',
      status: 'available',
      resourceCount: 1,
    },
  },
  {
    id: 'task-1-0',
    type: 'task',
    position: { x: 450, y: 430 },
    data: {
      label: 'Курс по React',
      status: 'available',
      resourceCount: 3,
    },
  },
  {
    id: 'task-1-1',
    type: 'task',
    position: { x: 650, y: 460 },
    data: {
      label: 'Pet-проект',
      status: 'available',
      resourceCount: 2,
    },
  },
];

const demoEdges = [
  { id: 'edge-root-branch-0', source: 'root', target: 'branch-0', type: 'smoothstep', animated: true, style: { stroke: '#a78bfa', strokeWidth: 2, opacity: 0.6 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' } },
  { id: 'edge-root-branch-1', source: 'root', target: 'branch-1', type: 'smoothstep', animated: true, style: { stroke: '#a78bfa', strokeWidth: 2, opacity: 0.6 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' } },
  { id: 'edge-branch-0-task-0-0', source: 'branch-0', target: 'task-0-0', type: 'smoothstep', style: { stroke: '#c4b5fd', strokeWidth: 1.5, opacity: 0.4 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#c4b5fd' } },
  { id: 'edge-branch-0-task-0-1', source: 'branch-0', target: 'task-0-1', type: 'smoothstep', style: { stroke: '#c4b5fd', strokeWidth: 1.5, opacity: 0.4 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#c4b5fd' } },
  { id: 'edge-branch-1-task-1-0', source: 'branch-1', target: 'task-1-0', type: 'smoothstep', style: { stroke: '#c4b5fd', strokeWidth: 1.5, opacity: 0.4 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#c4b5fd' } },
  { id: 'edge-branch-1-task-1-1', source: 'branch-1', target: 'task-1-1', type: 'smoothstep', style: { stroke: '#c4b5fd', strokeWidth: 1.5, opacity: 0.4 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#c4b5fd' } },
];

// ── Helpers: convert goals to tree nodes/edges ──
const buildTreeFromGoals = (goals) => {
  if (!goals || goals.length === 0) {
    return { nodes: demoNodes, edges: demoEdges };
  }

  const nodes = [];
  const edges = [];

  // Root node
  nodes.push({
    id: 'root',
    type: 'branch',
    position: { x: 400, y: 50 },
    data: {
      label: 'Мои цели',
      description: `${goals.length} направлений развития`,
      isRoot: true,
    },
  });

  // Calculate positions for each goal branch
  const branchSpacingX = 320;
  const totalWidth = (goals.length - 1) * branchSpacingX;
  const startX = 400 - totalWidth / 2;

  goals.forEach((goal, goalIdx) => {
    const branchId = `goal-${goal.goal_id || goalIdx}`;
    const branchX = startX + goalIdx * branchSpacingX;

    const steps = goal.steps || [];
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const progress = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

    // Branch node for this goal
    nodes.push({
      id: branchId,
      type: 'branch',
      position: { x: branchX, y: 250 },
      data: {
        label: goal.goal_summary || goal.title || 'Цель',
        description: (goal.analysis || goal.description || '').substring(0, 60),
        branchType: goal.category || 'ABSTRACT_AMBITION',
        progress,
        itemsCount: steps.length,
        isCompleted: goal.status === 'completed',
      },
    });

    edges.push({
      id: `edge-root-${branchId}`,
      source: 'root',
      target: branchId,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#a78bfa', strokeWidth: 2, opacity: 0.6 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' },
    });

    // Task nodes for steps
    const taskSpacingY = 130;
    const taskStartX = branchX - ((steps.length - 1) * 100) / 2;

    steps.forEach((step, stepIdx) => {
      const taskId = `task-${branchId}-${stepIdx}`;
      const stepStatus = step.status || 'available';

      nodes.push({
        id: taskId,
        type: 'task',
        position: { x: taskStartX + stepIdx * 100, y: 430 },
        data: {
          label: step.title || step.summary || step.description || `Шаг ${stepIdx + 1}`,
          status: stepStatus,
          resourceCount: step.resources?.length || 0,
        },
      });

      edges.push({
        id: `edge-${branchId}-${taskId}`,
        source: branchId,
        target: taskId,
        type: 'smoothstep',
        style: { stroke: '#c4b5fd', strokeWidth: 1.5, opacity: 0.4 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#c4b5fd' },
      });
    });
  });

  return { nodes, edges };
};

// ── Main Component ──
const DevelopmentTreeContent = () => {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/mentor/dream-goals?user_id=1`);
      const fetchedGoals = (res.data?.goals || []).filter(g => g.status === 'active' || g.status === 'saved');
      setGoals(fetchedGoals);
      const { nodes: treeNodes, edges: treeEdges } = buildTreeFromGoals(fetchedGoals);
      setNodes(treeNodes);
      setEdges(treeEdges);
    } catch (err) {
      console.error('Failed to load goals:', err);
      // Fall back to demo data
      const { nodes: treeNodes, edges: treeEdges } = buildTreeFromGoals([]);
      setNodes(treeNodes);
      setEdges(treeEdges);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  return (
    <div className="flex-1 flex flex-col h-full relative">
      <MentorBackground />

      {/* Back arrow to mentor */}
      <button
        onClick={() => navigate('/mentor')}
        className="absolute top-4 left-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-all active:scale-90"
      >
        <ArrowLeft size={20} className="text-gray-700 dark:text-gray-200" />
      </button>

      {loading ? (
        <div className="flex-1 flex items-center justify-center z-10">
          <Loader2 size={32} className="text-amber-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* React Flow Canvas */}
          <div className="flex-1 [&_.react-flow\_\_controls-button]:!w-7 [&_.react-flow\_\_controls-button]:!h-7 [&_.react-flow\_\_controls-button]:!text-sm sm:[&_.react-flow\_\_controls-button]:!w-8 sm:[&_.react-flow\_\_controls-button]:!h-8 [&_.react-flow\_\_minimap]:!hidden sm:[&_.react-flow\_\_minimap]:!block">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.2}
              maxZoom={2}
              attributionPosition="bottom-left"
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{
                type: 'smoothstep',
                animated: true,
              }}
            >
              <Controls
                className="!rounded-full !shadow-lg !border-0 !bg-white/90 dark:!bg-gray-800/90 !backdrop-blur-md [&_button]:!rounded-full"
                showInteractive={false}
                position="bottom-right"
              />
              <MiniMap
                className="!rounded-2xl !shadow-lg !border-0 !overflow-hidden"
                nodeColor={(node) => {
                  if (node.data?.isRoot) return '#f59e0b';
                  if (node.type === 'task') return '#818cf8';
                  return '#10b981';
                }}
                maskColor="rgba(0,0,0,0.1)"
                style={{ background: 'transparent' }}
                zoomable
                pannable
              />
              <Background color="#e5e7eb" gap={20} size={1} />
            </ReactFlow>
          </div>

          {/* Stats bar at bottom */}
          {nodes.length > 1 && (
            <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-10 max-w-[95%] sm:max-w-none">
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full px-3 sm:px-5 py-2 sm:py-2.5 shadow-lg flex items-center gap-2 sm:gap-4 text-[10px] sm:text-sm">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <TreePine size={12} className="text-amber-500 sm:w-[14px] sm:h-[14px]" />
                  <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {nodes.filter(n => n.type === 'branch').length} напр.
                  </span>
                </div>
                <div className="w-px h-3 sm:h-4 bg-gray-300 dark:bg-gray-600" />
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Target size={12} className="text-indigo-500 sm:w-[14px] sm:h-[14px]" />
                  <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {nodes.filter(n => n.type === 'task').length} шагов
                  </span>
                </div>
                <div className="w-px h-3 sm:h-4 bg-gray-300 dark:bg-gray-600" />
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <BookOpen size={12} className="text-emerald-500 sm:w-[14px] sm:h-[14px]" />
                  <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {goals.length} целей
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const DevelopmentTree = () => (
  <ReactFlowProvider>
    <DevelopmentTreeContent />
  </ReactFlowProvider>
);

export default DevelopmentTree;