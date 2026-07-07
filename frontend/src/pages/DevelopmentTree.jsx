import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { TreePine, Target, BookOpen, Brain, Star, Plus, Sparkles, ChevronRight, ArrowRight, Lightbulb, Zap, Flag, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiClient } from '../utils/apiClient';
import DreamInputModal from '../components/DreamInputModal';

// ── Custom Node Component: Branch Node ──
const BranchNode = ({ data, selected }) => {
  const getGradient = () => {
    switch (data.branchType) {
      case 'books': return 'from-blue-500 to-indigo-600';
      case 'skills': return 'from-purple-500 to-pink-600';
      case 'tasks': return 'from-green-500 to-emerald-600';
      case 'health': return 'from-orange-500 to-red-600';
      case 'finance': return 'from-yellow-500 to-amber-600';
      case 'social': return 'from-pink-500 to-rose-600';
      case 'spirit': return 'from-violet-500 to-purple-600';
      default: return 'from-emerald-500 to-teal-600';
    }
  };

  const getIcon = () => {
    switch (data.branchType) {
      case 'books': return '📚';
      case 'skills': return '⚡';
      case 'tasks': return '✅';
      case 'health': return '💪';
      case 'finance': return '💰';
      case 'social': return '🤝';
      case 'spirit': return '🧘';
      default: return '🌱';
    }
  };

  return (
    <div className={`relative group ${data.isRoot ? 'scale-110' : ''}`}>
      {/* Decorative glow */}
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
        {/* Branch type badge */}
        {!data.isRoot && (
          <div className={`absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-gradient-to-br ${getGradient()} flex items-center justify-center text-xs shadow-md`}>
            {getIcon()}
          </div>
        )}

        {/* Content */}
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

          {/* Progress bar for non-root nodes */}
          {!data.isRoot && data.progress !== undefined && (
            <div className="mt-1">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-gray-400">{data.itemsCount || 0} задач</span>
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

          {/* Expand hint */}
          {!data.isRoot && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-indigo-500 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight size={12} />
              <span>Нажмите для выбора</span>
            </div>
          )}
        </div>
      </div>

      {/* Handles for React Flow edges */}
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

// ── Initial empty tree ──
const createEmptyTree = () => ({
  nodes: [],
  edges: [],
});

// ── Initial root node ──
const createRootNode = (dream, onNodeClick) => ({
  id: 'root',
  type: 'branch',
  position: { x: 300, y: 50 },
  data: {
    label: dream || 'Моя мечта',
    description: dream ? '' : 'Добавьте свою мечту и выстройте дерево развития',
    isRoot: true,
    isCompleted: false,
    onClick: onNodeClick,
  },
});

// ── Generate tree layout from AI response ──
const generateTreeFromPlan = (dream, plan, onNodeClick, onTaskClick) => {
  const nodes = [];
  const edges = [];

  // Root node
  nodes.push(createRootNode(dream, onNodeClick));

  const branches = plan.branches || [];
  const startY = 220;
  const totalWidth = Math.max(600, branches.length * 220);
  const startX = (totalWidth - (branches.length - 1) * 200) / 2;

  branches.forEach((branch, index) => {
    const branchId = `branch-${index}`;
    const branchX = startX + index * 200;

    // Branch node
    nodes.push({
      id: branchId,
      type: 'branch',
      position: { x: branchX, y: startY },
      data: {
        label: branch.title,
        description: branch.description,
        branchType: branch.type,
        progress: 0,
        itemsCount: branch.tasks?.length || 0,
        isCompleted: false,
        onClick: onNodeClick,
      },
    });

    // Edge from root to branch
    edges.push({
      id: `edge-root-${branchId}`,
      source: 'root',
      target: branchId,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#a78bfa', strokeWidth: 2, opacity: 0.6 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' },
    });

    // Task nodes for this branch
    const tasks = branch.tasks || [];
    const taskStartY = startY + 160;
    const taskOffsetX = tasks.length > 1 ? (tasks.length - 1) * 30 : 0;

    tasks.forEach((task, taskIndex) => {
      const taskId = `task-${index}-${taskIndex}`;
      const taskX = branchX - taskOffsetX / 2 + taskIndex * 60;

      nodes.push({
        id: taskId,
        type: 'task',
        position: { x: taskX, y: taskStartY + taskIndex * 100 },
        data: {
          label: task.title,
          status: 'available',
          resourceCount: task.resources?.length || 0,
          resources: task.resources || [],
          branchType: branch.type,
          branchId: branchId,
          onClick: onTaskClick,
        },
      });

      // Edge from branch to task
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
const DevelopmentTreeContent = ({ onBack }) => {
  const { t } = useLanguage();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showDreamModal, setShowDreamModal] = useState(false);
  const [dreamText, setDreamText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const reactFlowInstance = useReactFlow();

  // On mount, show empty tree with root prompt
  useEffect(() => {
    const rootNode = createRootNode('', (data) => {
      setShowDreamModal(true);
    });
    setNodes([rootNode]);
    setEdges([]);
  }, []);

  // Handle dream submission to AI
  const handleDreamSubmit = useCallback(async (dream) => {
    setDreamText(dream);
    setIsAnalyzing(true);
    setShowDreamModal(false);

    try {
      // Call AI to analyze dream
      const response = await apiClient.post('/api/mentor/analyze-dream', {
        dream: dream,
        user_id: 1,
      });

      const plan = response.data;
      
      // Generate tree from plan
      const { nodes: newNodes, edges: newEdges } = generateTreeFromPlan(
        dream,
        plan,
        (nodeData) => {
          // Handle branch/task click
          if (nodeData.branchType) {
            // It's a branch - could expand or show details
            console.log('Branch clicked:', nodeData);
          }
        },
        (taskData) => {
          // Show task details modal with resources
          setSelectedTask(taskData);
          setShowTaskModal(true);
        }
      );

      setNodes(newNodes);
      setEdges(newEdges);

      // Auto-fit view
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.3, duration: 800 });
      }, 100);

    } catch (error) {
      console.error('Failed to analyze dream:', error);
      // Fallback: show error message
      alert('Не удалось проанализировать мечту. Попробуйте ещё раз.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [reactFlowInstance]);

  // Add task to active goals
  const handleAddTaskToGoals = useCallback(async (task) => {
    try {
      await apiClient.post('/api/mentor/active-goals', {
        user_id: 1,
        title: task.label,
        branch_type: task.branchType,
        resources: task.resources || [],
      });

      // Update node status
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === selectedTask?.id) {
            return {
              ...node,
              data: {
                ...node.data,
                status: 'in_progress',
              },
            };
          }
          // Update parent branch progress
          if (node.id === task.branchId) {
            const branchTasks = nodes.filter(n => n.data.branchId === task.branchId);
            const completedCount = branchTasks.filter(n => n.data.status === 'in_progress' || n.data.status === 'completed').length;
            const totalCount = branchTasks.length;
            return {
              ...node,
              data: {
                ...node.data,
                progress: Math.round((completedCount / totalCount) * 100),
              },
            };
          }
          return node;
        })
      );

      setShowTaskModal(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Failed to add task to goals:', error);
    }
  }, [selectedTask, nodes]);

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Loading overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 shadow-2xl max-w-sm text-center">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <TreePine size={64} className="text-emerald-500 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              Анализируем вашу мечту...
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ИИ разбивает мечту на достижимые цели, подбирает литературу и задачи
            </p>
            <div className="flex gap-1 justify-center mt-4">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {nodes.length <= 1 && !isAnalyzing && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center pointer-events-auto bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 shadow-xl max-w-[90%] sm:max-w-md mx-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center animate-float">
              <TreePine size={32} className="text-white sm:text-[40px]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Дерево развития
            </h2>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-5 sm:mb-6 leading-relaxed">
              Добавьте свою мечту и выстройте дерево развития. 
              ИИ поможет разбить её на реальные, достижимые задачи.
            </p>
            <button
              onClick={() => setShowDreamModal(true)}
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-[2rem] font-medium text-sm sm:text-base shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all active:scale-95"
            >
              <Sparkles size={16} className="sm:w-[18px] sm:h-[18px]" />
              Начать
            </button>
          </div>
        </div>
      )}

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

      {/* Dream Input Modal */}
      <DreamInputModal
        isOpen={showDreamModal}
        onClose={() => setShowDreamModal(false)}
        onSubmit={handleDreamSubmit}
        isLoading={isAnalyzing}
      />

      {/* Task Detail Modal — bottom sheet on mobile, centered on desktop */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowTaskModal(false)}>
          <div
            className="w-full sm:max-w-lg bg-white dark:bg-gray-800 rounded-t-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 sm:p-6 text-white shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Target size={16} className="text-white sm:w-[24px] sm:h-[24px]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-xl font-bold truncate">{selectedTask.label}</h3>
                    <p className="text-white/80 text-[10px] sm:text-sm truncate">Рекомендованные материалы и задачи</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
                >
                  <X size={14} className="text-white sm:w-[18px] sm:h-[18px]" />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto p-4 sm:p-6">
              {/* Resources */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
                  <BookOpen size={14} />
                  Рекомендованные материалы
                </h4>
                {selectedTask.resources && selectedTask.resources.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTask.resources.map((resource, idx) => (
                      <label key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors border border-gray-200 dark:border-gray-600">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded text-amber-500 focus:ring-amber-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-white">{resource.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{resource.description}</p>
                          {resource.type && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              {resource.type}
                            </span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 text-center">
                    <BookOpen size={20} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-400 dark:text-gray-500">Нет рекомендованных материалов</p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-[2rem] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                >
                  Закрыть
                </button>
                <button
                  onClick={() => handleAddTaskToGoals(selectedTask)}
                  className="flex-1 px-4 py-2.5 rounded-[2rem] bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium shadow-lg shadow-amber-500/25 transition-all text-sm active:scale-95"
                >
                  <Zap size={14} className="inline mr-1" />
                  Добавить в цели
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats bar at bottom */}
      {nodes.length > 1 && !isAnalyzing && (
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-10 max-w-[95%] sm:max-w-none">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full px-3 sm:px-5 py-2 sm:py-2.5 shadow-lg flex items-center gap-2 sm:gap-4 text-[10px] sm:text-sm">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Flag size={12} className="text-amber-500 sm:w-[14px] sm:h-[14px]" />
              <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
                {nodes.filter(n => n.type === 'branch').length} напр.
              </span>
            </div>
            <div className="w-px h-3 sm:h-4 bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Target size={12} className="text-indigo-500 sm:w-[14px] sm:h-[14px]" />
              <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
                {nodes.filter(n => n.type === 'task').length} задач
              </span>
            </div>
            <div className="w-px h-3 sm:h-4 bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-1 sm:gap-1.5">
              <BookOpen size={12} className="text-emerald-500 sm:w-[14px] sm:h-[14px]" />
              <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
                {nodes.filter(n => n.type === 'task' && n.data.status === 'in_progress').length} в работе
              </span>
            </div>
          </div>
        </div>
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