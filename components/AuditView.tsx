import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { Project, Week, PlanItem, Plan, WeekStatus } from '../types';
import { supabase } from '../services/supabaseClient';
import WeekCard from './WeekCard';
import { Spinner } from './ui/Spinner';
import { FaArrowLeft, FaPlus, FaCog, FaShareAlt } from 'react-icons/fa';
import AddWeekModal from './AddWeekModal';
import EditWeekModal from './EditWeekModal';
import ConfirmationModal from './ConfirmationModal';
import AddPlanItemModal from './AddPlanItemModal';
import EditPlanItemModal from './EditPlanItemModal';
import SettingsModal from './SettingsModal';
import ShareModal from './ShareModal';
import TaskDetailView from './TaskDetailView';

interface AuditViewProps {
  project: Project;
  user: User | null;
  onBack: () => void;
}

const AuditView: React.FC<AuditViewProps> = ({ project: initialProject, user, onBack }) => {
    const [project, setProject] = useState(initialProject);
    const [weeks, setWeeks] = useState<Week[]>([]);
    const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [isAuditor, setIsAuditor] = useState(false);
    
    // Modals state
    const [isAddWeekModalOpen, setIsAddWeekModalOpen] = useState(false);
    const [weekToEdit, setWeekToEdit] = useState<Week | null>(null);
    const [weekToDelete, setWeekToDelete] = useState<Week | null>(null);
    const [addPlanItemContext, setAddPlanItemContext] = useState<{ week: Week, date: string } | null>(null);
    const [editPlanItemContext, setEditPlanItemContext] = useState<{ item: PlanItem, week: Week, date: string } | null>(null);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    // Task Detail View state
    const [selectedTask, setSelectedTask] = useState<{ item: PlanItem, weekId: string, projectId: string } | null>(null);

    const fetchProjectData = useCallback(async () => {
        setLoading(true);

        const projectPromise = supabase
            .from('projects')
            .select('*')
            .eq('id', initialProject.id)
            .single();
        
        const weeksPromise = supabase
            .from('weeks')
            .select('*')
            .eq('project_id', initialProject.id)
            .order('start_date', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: true });
        
        const countsPromise = supabase.rpc('get_event_counts_for_project', { p_project_id: initialProject.id });

        const [projectResult, weeksResult, countsResult] = await Promise.all([projectPromise, weeksPromise, countsPromise]);

        if (projectResult.error) {
            console.error("Error fetching project:", projectResult.error.message, projectResult.error);
             // Handle case where project was deleted after initial load
            if (projectResult.error.code === 'PGRST116') { // "0 rows returned" for .single()
                alert('Проект не найден. Возможно, он был удален. Вы будете перенаправлены на главную страницу.');
                onBack();
            }
            setLoading(false);
            return;
        }
        setProject(projectResult.data);
        
        if (weeksResult.error) {
            console.error("Error fetching weeks:", weeksResult.error.message, weeksResult.error);
        } else {
             const enrichedWeeks = weeksResult.data.map(week => {
                const newPlan: Plan = {};
                for (const date in week.plan) {
                    newPlan[date] = {
                        tasks: week.plan[date].tasks.map((task: PlanItem) => ({
                            ...task,
                            event_count: countsResult.data?.[task.id] || 0,
                        }))
                    };
                }
                return { ...week, plan: newPlan };
            });
            setWeeks(enrichedWeeks || []);
        }

        if (countsResult.error) {
            console.error("Error fetching event counts:", countsResult.error.message, countsResult.error);
        } else {
            setEventCounts(countsResult.data || {});
        }

        setLoading(false);
    }, [initialProject.id, onBack]);

    useEffect(() => {
        fetchProjectData();
        setIsAuditor(user?.id === project.user_id);
    }, [user, project.user_id, fetchProjectData]);

    useEffect(() => {
        const channel = supabase.channel(`project-channel-${project.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'weeks', filter: `project_id=eq.${project.id}` }, fetchProjectData)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${project.id}`}, (payload) => setProject(payload.new as Project))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events', filter: `project_id=eq.${project.id}`}, (payload) => {
                // Increment count locally for responsiveness
                const newEvent = payload.new as { task_id: string };
                setWeeks(currentWeeks => currentWeeks.map(week => {
                    const newPlan: Plan = {};
                    let changed = false;
                    for (const date in week.plan) {
                        newPlan[date] = {
                            tasks: week.plan[date].tasks.map(task => {
                                if (task.id === newEvent.task_id) {
                                    changed = true;
                                    return { ...task, event_count: (task.event_count || 0) + 1 };
                                }
                                return task;
                            })
                        };
                    }
                    return changed ? { ...week, plan: newPlan } : week;
                }));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [project.id, fetchProjectData]);

    const handleAddWeek = async (title: string, startDate: string, endDate: string) => {
        const { error } = await supabase.from('weeks').insert({
            project_id: project.id,
            user_id: project.user_id,
            title,
            plan: {},
            status: 'draft',
            start_date: startDate,
            end_date: endDate,
        });
        if (error) alert("Ошибка: " + error.message);
    };

    const handleUpdateWeek = async (updatedWeek: Week) => {
        const { error } = await supabase.from('weeks')
          .update({ title: updatedWeek.title, status: updatedWeek.status, start_date: updatedWeek.start_date, end_date: updatedWeek.end_date })
          .eq('id', updatedWeek.id);
        if (error) {
            alert("Ошибка обновления: " + error.message);
        } else {
            setWeekToEdit(null);
        }
    };

    const handleDeleteWeek = async () => {
        if (!weekToDelete) return;
        const { error } = await supabase.from('weeks').delete().eq('id', weekToDelete.id);
        if (error) {
            alert("Ошибка удаления: " + error.message);
        } else {
            setWeekToDelete(null);
        }
    };
    
    const handleUpdatePlan = async (weekId: string, newPlan: Plan) => {
        const { error } = await supabase.from('weeks').update({ plan: newPlan }).eq('id', weekId);
        if (error) alert('Ошибка обновления плана: ' + error.message);
    };

    const handleDeleteDay = (week: Week, date: string) => {
        const newPlan = { ...week.plan };
        delete newPlan[date];
        handleUpdatePlan(week.id, newPlan);
    }
    
    const handleDeletePlanItem = (week: Week, date: string, itemId: string) => {
         const newPlan = { ...week.plan };
         if (newPlan[date]) {
            newPlan[date].tasks = newPlan[date].tasks.filter(item => item.id !== itemId);
            handleUpdatePlan(week.id, newPlan);
         }
    }
    
    const handleUpdatePlanItem = (week: Week, date: string, updatedItem: PlanItem) => {
        const newPlan = { ...week.plan };
        if (newPlan[date]) {
            const itemIndex = newPlan[date].tasks.findIndex(item => item.id === updatedItem.id);
            if (itemIndex > -1) {
                newPlan[date].tasks[itemIndex] = updatedItem;
                handleUpdatePlan(week.id, newPlan);
            }
        }
        setEditPlanItemContext(null);
    }

    const handleUpdateStatus = async (weekId: string, status: WeekStatus) => {
        const { error } = await supabase.from('weeks').update({ status }).eq('id', weekId);
        if (error) alert('Ошибка обновления статуса: ' + error.message);
    };
    
    if (loading) {
        return <div className="flex justify-center items-center h-96"><Spinner size="lg" /></div>;
    }

    return (
        <div>
            <div className="w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="text-blue-600 hover:text-blue-800"><FaArrowLeft size={20} /></button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{project.name}</h1>
                            <p className="text-gray-500 text-sm">{project.description}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                            <button onClick={() => setIsShareModalOpen(true)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100" title="Поделиться">
                            <FaShareAlt />
                        </button>
                        {isAuditor && (
                            <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100" title="Настройки">
                                <FaCog />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-700">План аудита</h2>
                    {isAuditor && (
                        <button onClick={() => setIsAddWeekModalOpen(true)} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm">
                            <FaPlus className="mr-2" /> Добавить этап
                        </button>
                    )}
                </div>

                <div className="space-y-6">
                    {weeks.map(week => (
                        <WeekCard
                            key={week.id}
                            week={week}
                            onEdit={() => setWeekToEdit(week)}
                            onDelete={() => setWeekToDelete(week)}
                            onUpdatePlan={(plan) => handleUpdatePlan(week.id, plan)}
                            onUpdateStatus={(status) => handleUpdateStatus(week.id, status)}
                            onAddTask={(w, date) => setAddPlanItemContext({ week: w, date })}
                            onEditTask={(item, w, date) => setEditPlanItemContext({ item, week: w, date })}
                            onDeleteTask={(w, date, itemId) => handleDeletePlanItem(w, date, itemId)}
                            onDeleteDay={(w, date) => handleDeleteDay(w, date)}
                            onSelectTask={(item, weekId) => setSelectedTask({ item, weekId, projectId: project.id })}
                            isAuditor={isAuditor}
                        />
                    ))}
                    {weeks.length === 0 && (
                        <div className="text-center py-10 bg-white rounded-lg shadow-md">
                            <p className="text-gray-500">Для этого проекта еще не создано ни одного этапа.</p>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Full screen Task Detail Modal */}
            {selectedTask && (
                <TaskDetailView 
                    isOpen={!!selectedTask}
                    onClose={() => setSelectedTask(null)}
                    user={user}
                    context={selectedTask}
                />
            )}

            {/* Other Modals */}
            {isAuditor && (
                <>
                    <AddWeekModal isOpen={isAddWeekModalOpen} onClose={() => setIsAddWeekModalOpen(false)} onAddWeek={handleAddWeek} />
                    {weekToEdit && <EditWeekModal isOpen={!!weekToEdit} onClose={() => setWeekToEdit(null)} onUpdateWeek={handleUpdateWeek} weekData={weekToEdit} />}
                    {weekToDelete && <ConfirmationModal isOpen={!!weekToDelete} onClose={() => setWeekToDelete(null)} onConfirm={handleDeleteWeek} title="Удалить этап" message={`Вы уверены, что хотите удалить этап "${weekToDelete.title}"?`} />}
                    {addPlanItemContext && <AddPlanItemModal isOpen={!!addPlanItemContext} onClose={() => setAddPlanItemContext(null)} onUpdatePlan={(plan) => handleUpdatePlan(addPlanItemContext.week.id, plan)} week={addPlanItemContext.week} date={addPlanItemContext.date} />}
                    {editPlanItemContext && <EditPlanItemModal isOpen={!!editPlanItemContext} onClose={() => setEditPlanItemContext(null)} onUpdateItem={(item) => handleUpdatePlanItem(editPlanItemContext.week, editPlanItemContext.date, item)} item={editPlanItemContext.item} />}
                    <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} project={project} onProjectUpdate={fetchProjectData} />
                </>
            )}
            <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} projectId={project.id} />
        </div>
    );
};

export default AuditView;