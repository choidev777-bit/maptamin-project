export default function DashboardLoading() {
    return (
        <div className="max-w-6xl mx-auto animate-pulse">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <div className="h-8 bg-gray-200 rounded-lg w-32 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-48" />
                </div>
                <div className="h-11 bg-gray-200 rounded-xl w-28" />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-1">
                    <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl" />
                </div>
                <div className="lg:col-span-2">
                    <div className="h-48 bg-gray-100 rounded-2xl" />
                </div>
            </div>

            {/* Section Title */}
            <div className="h-6 bg-gray-200 rounded w-24 mb-4" />

            {/* Search Cards */}
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 bg-gray-200 rounded-full" />
                            <div className="flex-1">
                                <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
                                <div className="h-4 bg-gray-200 rounded w-64 mb-3" />
                                <div className="flex gap-2">
                                    <div className="h-6 bg-gray-200 rounded-full w-16" />
                                    <div className="h-6 bg-gray-200 rounded-full w-20" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
