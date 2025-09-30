import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Event, PlanItem } from '../types';
import EventItem from './EventItem';
import AddEventForm from './AddEventForm';
import { Spinner } from './ui/Spinner';
import { FaTimes, FaPlus } from 'react-icons/fa';
import AddEventModal from './AddEventModal';
import InterviewActionBar from './InterviewActionBar';


interface TaskDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  context: { item: PlanItem; weekId: string; projectId: string; };
}

const TaskDetailView: React.FC<TaskDetailViewProps> = ({ isOpen, onClose, user, context }) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
    const [quotedEvent, setQuotedEvent] = useState<Event | null>(null);
    const mainRef = useRef<HTMLElement>(null);


    const fetchEvents = useCallback(async () => {
        if (!context) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('events')
            .select('*, parent:events!parent_event_id(content, author_email)')
            .eq('task_id', context.item.id)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error("Error fetching events:", error);
        } else {
            setEvents(data || []);
        }
        setLoading(false);
    }, [context]);

    useEffect(() => {
        if (isOpen) {
            fetchEvents();
        }
    }, [isOpen, fetchEvents]);

    const handleNewEvent = (newEvent: Event) => {
        setEvents(currentEvents => {
            // Optimistic update: add if not already present from subscription
            if (!currentEvents.some(e => e.id === newEvent.id)) {
                return [...currentEvents, newEvent];
            }
            return currentEvents;
        });
    };

    useEffect(() => {
        if (!context) return;
        
        const subscription = supabase.channel(`public:events:task_id=eq.${context.item.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events', filter: `task_id=eq.${context.item.id}` }, 
            (payload) => {
                 setEvents(currentEvents => {
                    // Prevent duplicates from optimistic update
                    if (!currentEvents.some(e => e.id === payload.new.id)) {
                        return [...currentEvents, payload.new as Event];
                    }
                    return currentEvents;
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [context]);
    
    const handleQuoteClick = (eventId: string) => {
        const element = document.getElementById(`event-${eventId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight');
            setTimeout(() => {
                element.classList.remove('highlight');
            }, 1500);
        }
    };
    
    if (!isOpen || !context) return null;

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-40 flex flex-col">
            <style>{`
                .highlight {
                    background-color: #eef2ff; /* indigo-100 */
                    transition: background-color 0.5s ease-in-out;
                }
            `}</style>
            <div className="bg-white m-2 md:m-4 lg:m-8 rounded-lg shadow-xl flex flex-col flex-1 overflow-hidden">
                {/* Header */}
                <header className="flex justify-between items-center p-4 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Обсуждение задачи</h2>
                        <p className="text-gray-600">{context.item.content}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100">
                        <FaTimes size={20} />
                    </button>
                </header>
                
                 {/* Specialized Action Bar */}
                {user && context.item.type === 'interview' && (
                    <InterviewActionBar
                        user={user}
                        context={context}
                        events={events}
                        onNewEvent={handleNewEvent}
                    />
                )}


                {/* Event Feed */}
                <main ref={mainRef} className="flex-1 overflow-y-auto p-4">
                     {loading ? <div className="flex justify-center pt-10"><Spinner size="lg" /></div> : (
                        events.length > 0 ? (
                            <div className="divide-y divide-gray-200">
                                {events.map(event => (
                                    <EventItem 
                                        key={event.id} 
                                        event={event} 
                                        onReply={setQuotedEvent}
                                        onQuoteClick={handleQuoteClick}
                                        isLoggedIn={!!user}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center pt-8">Событий пока нет. Начните обсуждение!</p>
                        )
                    )}
                </main>

                {/* Footer / Input */}
                <footer className="p-4 bg-gray-50 border-t">
                    {user ? (
                        <div className="flex items-start space-x-3">
                             <button 
                                onClick={() => setIsAddEventModalOpen(true)}
                                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-transform transform hover:scale-110"
                                title="Добавить событие"
                             >
                                <FaPlus />
                            </button>
                            <div className="flex-1">
                                <AddEventForm 
                                    user={user} 
                                    context={{ weekId: context.weekId, taskId: context.item.id, projectId: context.projectId }} 
                                    quotedEvent={quotedEvent}
                                    onClearQuote={() => setQuotedEvent(null)}
                                    onNewEvent={handleNewEvent}
                                />
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-center text-gray-500">Войдите, чтобы участвовать в обсуждении.</p>
                    )}
                </footer>
            </div>
            
             {user && (
                <AddEventModal
                    isOpen={isAddEventModalOpen}
                    onClose={() => setIsAddEventModalOpen(false)}
                    user={user}
                    context={{ weekId: context.weekId, taskId: context.item.id, projectId: context.projectId }}
                    onNewEvent={handleNewEvent}
                />
            )}
        </div>
    );
};

export default TaskDetailView;