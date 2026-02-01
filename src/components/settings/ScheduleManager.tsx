'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Trash2, CalendarClock, AlertCircle, Loader2 } from 'lucide-react';
import { SearchSchedule } from '@/lib/types';

export function ScheduleManager() {
    const [schedules, setSchedules] = useState<SearchSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('scheduled_searches')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true) // Only show active ones
            .order('created_at', { ascending: false });

        if (!error && data) {
            setSchedules(data as SearchSchedule[]);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 이 예약 스케줄을 삭제(비활성화) 하시겠습니까?')) return;

        setDeletingId(id);
        try {
            const res = await fetch(`/api/settings/schedule/${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Failed to delete');

            // Refresh list
            setSchedules(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error('Delete failed:', error);
            alert('삭제 중 오류가 발생했습니다.');
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) return <div className="h-20 animate-pulse bg-gray-100 rounded-xl" />;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-gray-600" />
                자동 검색 예약 관리
            </h2>

            {schedules.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p>등록된 예약 스케줄이 없습니다.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {schedules.map((schedule) => (
                        <div key={schedule.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${schedule.platform === 'naver'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {schedule.platform === 'naver' ? '네이버' : '구글'}
                                    </span>
                                    <h3 className="font-semibold text-gray-900">{schedule.place_name}</h3>
                                </div>
                                <div className="text-sm text-gray-600">
                                    <span className="font-medium text-gray-900">검색어:</span> {schedule.keywords.join(', ')}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                    매일 {schedule.crawling_time?.slice(0, 5)} 실행
                                </div>
                            </div>

                            <button
                                onClick={() => handleDelete(schedule.id)}
                                disabled={deletingId === schedule.id}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                title="예약 삭제"
                            >
                                {deletingId === schedule.id ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
