import React, { useState } from 'react';
import { Week, PlanItem, Plan, WeekStatus } from '../types';
import DayPlanView from './DayPlanView';
import { FaEdit, FaTrash, FaChevronDown, FaChevronUp, FaPaperPlane, FaCheckCircle, FaExclamationCircle, FaUndo } from 'react-icons/fa';
import { DAY_NAMES } from '../constants';

interface WeekCardProps {
    week: Week;
    onEdit: () => void;
    onDelete: () => void;
    onUpdatePlan: (plan: Plan) => void;
    onUpdateStatus: (status: WeekStatus) => void;
    onAddTask: (week: Week, date: string) => void;
    onEditTask: (item: PlanItem, week: Week, date: string) => void;
    onDeleteTask: (week: Week, date: string, itemId: string) => void;
    onDeleteDay: (week: Week, date: string) => void;
    onSelectTask: (item: PlanItem, weekId: string) => void;
    isAuditor: boolean;
}

const getStatusBadge = (status: WeekStatus) => {
    switch (status) {
        case 'draft':
            return <span className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800">Черновик</span>;
        case 'pending_approval':
            return <span className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800">На согласовании</span>;
        case 'approved':
            return <span className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">Утверждено</span>;
        case 'changes_requested':
            return <span className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800">Требует доработки</span>;
        case 'pending_changes_approval':
            return <span className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800">Изменения на согласовании</span>;
    }
};

const getDaysArray = (start: string, end: string): string[] => {
    const arr = [];
    if (!start || !end) return [];
    try {
        for (let dt = new Date(start); dt <= new Date(end); dt.setDate(dt.getDate() + 1)) {
            arr.push(new Date(dt).toISOString().slice(0, 10));
        }
    } catch (e) {
        console.error("Invalid date range for getDaysArray", start, end);
        return [];
    }
    return arr;
};

const WeekCard: React.FC<WeekCardProps> = ({ week, onEdit, onDelete, onUpdatePlan, onUpdateStatus, onAddTask, onEditTask, onDeleteTask, onDeleteDay, onSelectTask, isAuditor }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const weekDays = week.start_date && week.end_date
        ? getDaysArray(week.start_date, week.end_date)
        : Object.keys(week.plan).sort();
    
    const canAuditorEditWeek = isAuditor && week.status !== 'approved';

    const renderActionButtons = () => {
        if (isAuditor) {
            if (week.status === 'draft' || week.status === 'changes_requested') {
                return (
                    <button onClick={() => onUpdateStatus('pending_approval')} className="flex items-center text-sm bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600">
                        <FaPaperPlane className="mr-2" />
                        Отправить на согласование
                    </button>
                )
            }
            if (week.status === 'approved') {
                 return (
                    <button onClick={() => onUpdateStatus('pending_changes_approval')} className="flex items-center text-sm bg-yellow-500 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-600">
                        <FaUndo className="mr-2" />
                        Запросить изменения
                    </button>
                )
            }
        } else { // Owner view
            if (week.status === 'pending_approval') {
                return (
                    <div className="flex items-center space-x-2">
                        <button onClick={() => onUpdateStatus('changes_requested')} className="flex items-center text-sm bg-yellow-500 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-600">
                             <FaExclamationCircle className="mr-2" />
                            Запросить изменения
                        </button>
                        <button onClick={() => onUpdateStatus('approved')} className="flex items-center text-sm bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600">
                            <FaCheckCircle className="mr-2" />
                            Утвердить план
                        </button>
                    </div>
                )
            }
            if (week.status === 'pending_changes_approval') {
                return (
                     <div className="flex items-center space-x-2">
                        <button onClick={() => onUpdateStatus('approved')} className="flex items-center text-sm bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600">
                            <FaCheckCircle className="mr-2" />
                            Согласовать изменения
                        </button>
                    </div>
                )
            }
        }
        return null;
    }
    
    const showChangesWarning = !isAuditor && week.status === 'pending_changes_approval';

    return (
        <div className={`bg-white rounded-lg shadow-md overflow-hidden transition-all ${showChangesWarning ? 'border-2 border-red-400' : ''}`}>
            <header 
                className="p-4 border-b border-gray-200 flex justify-between items-center"
            >
                <div className="flex items-center flex-wrap gap-y-2">
                    <h2 className="text-xl font-bold text-gray-800 mr-4">{week.title}</h2>
                    {getStatusBadge(week.status)}
                    <div className="hidden md:block ml-auto md:ml-4"> {renderActionButtons()}</div>
                </div>
                <div className="flex items-center space-x-2">
                    {canAuditorEditWeek && (
                         <>
                            <button onClick={onEdit} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"><FaEdit /></button>
                            <button onClick={onDelete} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100"><FaTrash /></button>
                         </>
                    )}
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 text-gray-500">
                        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                </div>
            </header>
            <div className="md:hidden p-4 border-b border-gray-200">
                 {renderActionButtons()}
            </div>
            
            {showChangesWarning && (
                 <div className="p-3 bg-red-50 text-red-700 text-sm">
                    <p><b>Внимание:</b> Аудитор внес изменения в ранее согласованный план и ожидает вашего повторного утверждения.</p>
                </div>
            )}

            {isExpanded && (
                <div className="p-4">
                    {weekDays.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {weekDays.map(date => {
                                const dayDate = new Date(date + 'T00:00:00');
                                const dayIndex = dayDate.getDay();
                                const dayName = DAY_NAMES[dayIndex === 0 ? 6 : dayIndex - 1];

                                return (
                                    <DayPlanView
                                        key={date}
                                        date={date}
                                        dayName={dayName}
                                        dayPlan={week.plan[date] || { tasks: [] }}
                                        week={week}
                                        onUpdatePlan={onUpdatePlan}
                                        onAddTask={onAddTask}
                                        onEditTask={onEditTask}
                                        onDeleteTask={onDeleteTask}
                                        onDeleteDay={onDeleteDay}
                                        onSelectTask={(item, weekId) => onSelectTask(item, weekId)}
                                        isAuditor={isAuditor}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-center py-4 text-gray-500">
                            {isAuditor && week.status !== 'approved' ? "В этом этапе пока нет дней. Отредактируйте этап, чтобы задать период." : "План для этого этапа еще не составлен."}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default WeekCard;
