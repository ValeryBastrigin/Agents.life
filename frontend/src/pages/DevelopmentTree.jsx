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
import { TreePine, Target, BookOpen, ChevronRight, ArrowLeft, Loader2, MessageSquare, CheckCircle2, X } from 'lucide-react';
import MentorBackground from '../components/MentorBackground';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

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

const categoryLabels = {
  MATERIAL_ASSET: 'Материальная цель',
  SKILL_DEVELOPMENT: 'Развитие навыков',
  CAREER_GROWTH: 'Карьерный рост',
  LIFE_EXPERIENCE: 'Жизненный опыт',
  EXISTENTIAL_WELLBEING: 'Благополучие',
  ABSTRACT_AMBITION: 'Амбиция',
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
        goalId: goal.goal_id,
        goalData: goal, // pass full goal for modal
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
    const taskStartX = branchX - ((steps.length - 1) * 100) / 2;

    steps.forEach((step, stepIdx) => {
      const taskId = `task-${branchId}-${stepIdx}`;
      const stepStatus = step.status || 'available';

      nodes.push({
        id: taskId,
        type: 'task',
        position: { x: taskStartX + stepIdx * 100, y: 430 },
        data: {
          label: step.title || step.summary || step.text || step.description || `Шаг ${stepIdx + 1}`,
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

// ── Rebuild progress for a single goal branch in the nodes array ──
const updateGoalProgressInNodes = (nodes, goalId, steps) => {
  const branchId = `goal-${goalId}`;
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progress = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

  return nodes.map(node => {
    if (node.id === branchId) {
      return {
        ...node,
        data: {
          ...node.data,
          progress,
          itemsCount: steps.length,
          goalData: {
            ...node.data.goalData,
            steps,
          },
        },
      };
    }
    // Also update task nodes
    if (node.id.startsWith(`task-${branchId}-`)) {
      const stepIdx = parseInt(node.id.split('-').pop(), 10);
      if (stepIdx >= 0 && stepIdx < steps.length) {
        return {
          ...node,
          data: {
            ...node.data,
            status: steps[stepIdx].status || 'available',
          },
        };
      }
    }
    return node;
  });
};

// ── Main Component ──
const STORAGE_KEY = 'development-tree-positions';

const DevelopmentTreeContent = () => {
  const navigate = useNavigate();
  const { userId } = useUser();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingGoal, setViewingGoal] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  const onNodeDragStop = useCallback((event, node) => {
    // Сохраняем позицию узла после перетаскивания
    const savedPositions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    savedPositions[node.id] = { x: Math.round(node.position.x), y: Math.round(node.position.y) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPositions));
  }, []);

  // Handle click on a goal branch node → open modal
  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'branch' && node.data?.goalId) {
      setViewingGoal(node.data.goalData);
    }
  }, []);

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/mentor/dream-goals?user_id=${userId}`);
      const fetchedGoals = (res.data?.goals || []).filter(g => g.status === 'active' || g.status === 'saved');
      setGoals(fetchedGoals);
      const { nodes: treeNodes, edges: treeEdges } = buildTreeFromGoals(fetchedGoals);

      // Восстанавливаем сохранённые позиции из localStorage
      try {
        const savedPositions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (Object.keys(savedPositions).length > 0) {
          treeNodes.forEach((node) => {
            if (savedPositions[node.id]) {
              node.position = { ...savedPositions[node.id] };
            }
          });
        }
      } catch (e) {
        // ignore
      }

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

  // Очищаем сохранённые позиции при загрузке новых целей (кнопка "заново")
  useEffect(() => {
    const handleClearPositions = () => {
      localStorage.removeItem(STORAGE_KEY);
    };
    window.addEventListener('clear-tree-positions', handleClearPositions);
    return () => window.removeEventListener('clear-tree-positions', handleClearPositions);
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Toggle step completed status
  const handleStepToggle = async (goalId, stepIndex, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'available' : 'completed';
    
    // Optimistic UI update — apply immediately for instant response
    setNodes(nds => {
      const goal = viewingGoal;
      if (!goal || goal.goal_id !== goalId) return nds;
      const steps = [...(goal.steps || [])];
      if (stepIndex >= 0 && stepIndex < steps.length) {
        steps[stepIndex] = { ...steps[stepIndex], status: newStatus };
      }
      return updateGoalProgressInNodes(nds, goalId, steps);
    });

    // Update the viewingGoal state too
    setViewingGoal(prev => {
      if (!prev) return prev;
      const steps = [...(prev.steps || [])];
      if (stepIndex >= 0 && stepIndex < steps.length) {
        steps[stepIndex] = { ...steps[stepIndex], status: newStatus };
      }
      return { ...prev, steps };
    });

    // Persist to backend (fire-and-forget — optimistic UI already applied)
    if (goalId != null) {
      axios.patch(
        `${API_URL}/api/mentor/dream-goals/${goalId}/steps/${stepIndex}/status`,
        { user_id: userId, status: newStatus }
      ).catch(err => {
        console.error('Failed to persist step status:', err);
      });
    }
  };

  // Discuss step with mentor
  const handleDiscussStep = async (step, goal) => {
    setChatLoading(true);
    try {
      const stepText = step.title || step.summary || step.text || step.description || '';
      const createRes = await axios.post(`${API_URL}/api/chats`, {
        user_id: userId,
        agent_type: 'mentor',
      });
      const chatId = createRes.data.chat_id || createRes.data.id;
      await axios.post(`${API_URL}/api/chat`, {
        user_id: userId,
        chat_id: chatId,
        agent: 'mentor',
        message: `Привет, хочу обсудить с тобой шаг в рамках цели «${goal.goal_summary}»: ${stepText}${step.description ? `\n${step.description}` : ''}`,
      });
      navigate(`/chat/${chatId}`, { state: { scrollToTop: true } });
    } catch (err) {
      console.error('Failed to create mentor chat:', err);
      setChatLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative">
      <MentorBackground />

      {/* Back arrow to mentor with title */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
        <button
          onClick={() => navigate('/mentor')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-all active:scale-90"
        >
          <ArrowLeft size={20} className="text-gray-700 dark:text-gray-200" />
        </button>
        <span className="text-sm sm:text-base font-semibold text-gray-800 dark:text-white drop-shadow-sm">
          Ваше дерево развития
        </span>
      </div>

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
              onNodeDragStop={onNodeDragStop}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
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

      {/* Goal Detail Modal */}
      {viewingGoal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setViewingGoal(null); }}
        >
          <div
            className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-[3rem] p-6 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl">{categoryEmojis[viewingGoal.category] || '🎯'}</span>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white truncate">
                  {viewingGoal.goal_summary || 'Цель'}
                </h3>
              </div>
              <button
                onClick={() => setViewingGoal(null)}
                className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center transition-all text-gray-500 dark:text-gray-300 shrink-0 ml-2"
              >
                <X size={18} />
              </button>
            </div>

            {/* Category badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
                {categoryLabels[viewingGoal.category] || viewingGoal.category}
              </span>
            </div>

            {/* AI Analysis / Summary */}
            {viewingGoal.analysis && (
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  🧠 AI-резюме ментора
                </h4>
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-[2rem] border border-indigo-100 dark:border-indigo-800/30">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">
                    {viewingGoal.analysis}
                  </p>
                </div>
              </div>
            )}

            {/* Progress bar */}
            {viewingGoal.steps && viewingGoal.steps.length > 0 && (
              <div className="mb-5">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-gray-500 dark:text-gray-400">
                    Прогресс: {viewingGoal.steps.filter(s => s.status === 'completed').length}/{viewingGoal.steps.length} шагов
                  </span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {Math.round((viewingGoal.steps.filter(s => s.status === 'completed').length / viewingGoal.steps.length) * 100)}%
                  </span>
                </div>
                <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((viewingGoal.steps.filter(s => s.status === 'completed').length / viewingGoal.steps.length) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Steps list */}
            {viewingGoal.steps && viewingGoal.steps.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Шаги ({viewingGoal.steps.length})
                </h4>
                <div className="space-y-2">
                  {viewingGoal.steps.map((step, idx) => {
                    const stepText = step.title || step.summary || step.text || step.description || `Шаг ${idx + 1}`;
                    const isCompleted = step.status === 'completed';
                    return (
                      <div
                        key={step.id || idx}
                        className={`flex items-center gap-3 p-3 rounded-[2rem] transition-all ${
                          isCompleted
                            ? 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30'
                            : 'bg-gray-50 dark:bg-gray-700/30 border border-transparent'
                        }`}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStepToggle(viewingGoal.goal_id, idx, step.status || 'available'); }}
                          className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all shrink-0 ${
                            isCompleted
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 dark:border-gray-500 hover:border-green-400'
                          }`}
                        >
                          {isCompleted && <CheckCircle2 size={14} />}
                        </button>

                        {/* Step content */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-tight ${isCompleted ? 'text-green-700 dark:text-green-300 line-through opacity-70' : 'text-gray-800 dark:text-white'}`}>
                            {stepText}
                          </p>
                          {step.description && step.description !== stepText && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                              {step.description}
                            </p>
                          )}
                        </div>

                        {/* Discuss button */}
                        <button
                          onMouseDown={(e) => { e.stopPropagation(); handleDiscussStep(step, viewingGoal); }}
                          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 rounded-[2rem] transition-all shadow-sm hover:shadow-md active:scale-95"
                        >
                          <MessageSquare size={12} />
                          <span className="hidden sm:inline">Обсудить</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dream text if available */}
            {viewingGoal.dream_text && (
              <div className="mb-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  💭 О чём мечта
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed italic">
                  {viewingGoal.dream_text}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Loading Overlay */}
      {chatLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-xl shadow-purple-500/30 animate-pulse">
              <Loader2 size={32} className="text-white animate-spin" />
            </div>
            <p className="text-white text-sm font-medium">Создаём чат с ментором...</p>
          </div>
        </div>
      )}

      {/* Legacy Modal Trigger Fallback — click on branch nodes */}
      {false && (
        <button
          className="hidden"
          onClick={() => {
            const branchNode = nodes.find(n => n.type === 'branch' && n.data?.goalId);
            if (branchNode) setViewingGoal(branchNode.data.goalData);
          }}
        />
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