import React from 'react';
import { DayPlan, Week, PlanItem, Plan } from '../types';
import PlanItemCard from './PlanItemCard';
import { FaPlus, FaTrash } from 'react-icons/fa';

interface DayPlanViewProps {
    date: string;
    dayName: string;
    dayPlan: DayPlan;
    week: Week;
    onUpdatePlan: (plan: Plan) => void;
    onAddTask: (week: Week, date: string) => void;
    onEditTask: (item: PlanItem, week: Week, date: string) => void;
    onDeleteTask: (week: Week, date: string, itemId: string) => void;
    onDeleteDay: (week: Week, date: string) => void;
    onSelectTask: (item: PlanItem, weekId: string) => void;
    isAuditor: boolean;
}

const DayPlanView: React.FC<DayPlanViewProps> = ({ date, dayName, dayPlan, week, onUpdatePlan, onAddTask, onEditTask, onDeleteTask, onDeleteDay, onSelectTask, isAuditor }) => {
    
    // Auditor can add new items to any plan except one pending approval from the owner.
    const canAuditorAddItem = isAuditor && week.status !== 'pending_approval';
    
    // Auditor can only edit/delete items if the week has not been approved yet.
    const canAuditorEditItem = isAuditor && week.status !== 'approved' && week.status !== 'pending_changes_approval';


    return (
        <div className="bg-gray-50 rounded-lg p-3 flex flex-col h-full min-h-[150px]">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="font-semibold text-gray-800">{dayName}</p>
                    <p className="text-xs text-gray-500">{new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p>
                </div>
                {canAuditorEditItem && (
                    <button onClick={() => onDeleteDay(week, date)} className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-100" title="Удалить день">
                        <FaTrash size={12} />
                    </button>
                )}
            </div>
            <div className="space-y-2 flex-grow">
                {dayPlan?.tasks?.length > 0 ? (
                    dayPlan.tasks.map(item => (
                        <PlanItemCard
                            key={item.id}
                            item={item}
                            onSelect={() => onSelectTask(item, week.id)}
                            onEdit={canAuditorEditItem ? () => onEditTask(item, week, date) : undefined}
                            onDelete={canAuditorEditItem ? () => onDeleteTask(week, date, item.id) : undefined}
                        />
                    ))
                ) : (
                    <p className="text-sm text-gray-400 italic pt-2">Событий на этот день нет.</p>
                )}
            </div>
             {canAuditorAddItem && (
                <button 
                    onClick={() => onAddTask(week, date)}
                    className="mt-2 w-full text-sm text-blue-600 hover:bg-blue-100 rounded p-2 flex items-center justify-center"
                >
                    <FaPlus className="mr-2" size={12}/> Добавить событие
                </button>
             )}
        </div>
    );
};

export default DayPlanView;
