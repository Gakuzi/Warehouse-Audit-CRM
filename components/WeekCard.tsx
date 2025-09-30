
import React, { useState } from 'react';
import { Week, Plan, PlanItem } from '../types';
import { supabase } from '../services/supabaseClient';
import { FaChevronDown, FaChevronUp, FaEdit, FaTrash, FaPlus, FaBrain, FaCheckCircle, FaCalendarAlt } from 'react-icons/fa';
import DayPlanView from './DayPlanView';
import EditWeekModal from './EditWeekModal';
import AddDayModal from './AddDayModal';
import WeekStats from './WeekStats';

interface WeekCardProps {
  week: Week;
  isAuditor: boolean;
  onUpdatePlan: (plan: Plan) => void;
  onTaskSelect: (item: PlanItem) => void;
  onDeleteRequest: () => void;
  onGenerateReport: () => void;
}

const WeekCard: React.FC<WeekCardProps> = ({ week, isAuditor, onUpdatePlan, onTaskSelect, onDeleteRequest, onGenerateReport }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddDayModalOpen, setIsAddDayModalOpen] = useState(false);
  const [rejectionComment, setRejectionComment] = useState(week.rejection_comment || '');

  const handleStatusChange = async (newStatus: Week['status']) => {
    let updateData: Partial<Week> = { status: newStatus };
    if (newStatus === 'rejected') {
        const comment = prompt("Пожалуйста, укажите причину отклонения:", rejectionComment);
        if (comment === null) return; // User cancelled
        updateData.rejection_comment = comment;
        setRejectionComment(comment);
    } else {
        updateData.rejection_comment = null;
    }

    const { error } = await supabase.from('weeks').update(updateData).eq('id', week.id);
    if (error) {
      alert('Ошибка изменения статуса: ' + error.message);
    }
  };
  
  const statusConfig: { [key in Week['status']]: { label: string; color: string; } } = {
    draft: { label: 'Черновик', color: 'bg-gray-200 text-gray-800' },
    pending_approval: { label: 'Ожидает согласования', color: 'bg-yellow-200 text-yellow-800' },
    approved: { label: 'Согласовано', color: 'bg-green-200 text-green-800' },
    rejected: { label: 'Отклонено', color: 'bg-red-200 text-red-800' },
    completed: { label: 'Завершен', color: 'bg-blue-200 text-blue-800' },
  };
  
  // Fix: Use Object.keys with map to ensure proper type inference for day plans.
  const allTasks = Object.keys(week.plan).flatMap(date => week.plan[date].tasks);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(task => (task.event_count || 0) > 0).length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const getActionButtons = () => {
    switch (week.status) {
        case 'draft':
            return isAuditor && <button onClick={() => handleStatusChange('pending_approval')} className="btn-primary">Отправить на согласование</button>;
        case 'pending_approval':
            return !isAuditor && (
                <div className="flex gap-2">
                    <button onClick={() => handleStatusChange('rejected')} className="btn-secondary bg-red-500 text-white hover:bg-red-600">Отклонить</button>
                    <button onClick={() => handleStatusChange('approved')} className="btn-primary bg-green-600 hover:bg-green-700">Согласовать</button>
                </div>
            );
        case 'approved':
             return isAuditor && <button onClick={() => handleStatusChange('completed')} className="btn-primary flex items-center gap-2"><FaCheckCircle/> Завершить этап</button>;
        case 'rejected':
             return isAuditor && <button onClick={() => handleStatusChange('draft')} className="btn-secondary">Вернуть в черновик</button>;
        case 'completed':
             return isAuditor && <button onClick={onGenerateReport} className="btn-primary bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"><FaBrain/> Отчет с AI</button>;
        default:
            return null;
    }
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <header
        className="p-4 cursor-pointer border-b"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold text-gray-800 truncate pr-4">{week.title}</h2>
            <div className="flex items-center gap-4">
                 {isAuditor && week.status === 'draft' && (
                     <>
                        <button onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }} title="Редактировать этап" className="p-2 text-gray-500 hover:text-blue-600"><FaEdit /></button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteRequest(); }} title="Удалить этап" className="p-2 text-gray-500 hover:text-red-600"><FaTrash /></button>
                     </>
                 )}
                <button className="p-2">
                    {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                </button>
            </div>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
           <div className="flex items-center gap-2">
                <FaCalendarAlt/>
                <span>{new Date(week.start_date + 'T00:00:00').toLocaleDateString()} - {new Date(week.end_date + 'T00:00:00').toLocaleDateString()}</span>
           </div>
            <span className={`px-3 py-1 font-semibold rounded-full ${statusConfig[week.status].color}`}>
                {statusConfig[week.status].label}
            </span>
        </div>
        <div>
             <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
      </header>

      {isExpanded && (
        <div className="p-4">
            {week.rejection_comment && week.status === 'rejected' && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-800">
                    <p className="font-bold">Причина отклонения:</p>
                    <p>{week.rejection_comment}</p>
                </div>
            )}
            
            <DayPlanView 
                week={week}
                onUpdatePlan={onUpdatePlan}
                onTaskSelect={onTaskSelect}
                isAuditor={isAuditor}
            />
            
            <div className="mt-4 pt-4 border-t flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    {getActionButtons()}
                </div>
                {isAuditor && (week.status === 'draft' || week.status === 'approved') && (
                     <button onClick={() => setIsAddDayModalOpen(true)} className="flex items-center text-sm btn-secondary">
                        <FaPlus className="mr-2"/> Добавить день
                    </button>
                )}
            </div>

            <div className="mt-4">
                <WeekStats week={week} />
            </div>

        </div>
      )}

      {isAuditor && (
          <>
            <EditWeekModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                week={week}
            />
            <AddDayModal
                isOpen={isAddDayModalOpen}
                onClose={() => setIsAddDayModalOpen(false)}
                week={week}
                onUpdatePlan={onUpdatePlan}
            />
          </>
      )}

    </div>
  );
};

export default WeekCard;
