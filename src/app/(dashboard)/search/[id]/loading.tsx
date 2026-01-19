export default function SearchResultLoading() {
    return (
        <div className="max-w-6xl mx-auto animate-pulse">
            {/* Header */}
            <div className="mb-6">
                <div className="h-8 bg-gray-200 rounded-lg w-64 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-96 mb-3" />
                <div className="flex gap-2">
                    <div className="h-7 bg-blue-100 rounded-full w-20" />
                    <div className="h-7 bg-blue-100 rounded-full w-24" />
                    <div className="h-7 bg-blue-100 rounded-full w-16" />
                </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <div className="h-6 bg-gray-200 rounded w-24 mb-4" />
                <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-full" />
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </div>
                </div>
            </div>

            {/* Keyword Tabs */}
            <div className="flex gap-2 mb-6">
                <div className="h-12 bg-gray-200 rounded-xl w-32" />
                <div className="h-12 bg-gray-200 rounded-xl w-28" />
                <div className="h-12 bg-gray-200 rounded-xl w-36" />
            </div>

            {/* Map Placeholder */}
            <div className="h-[500px] bg-gray-200 rounded-2xl" />

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-200 rounded-full" />
                        <div className="h-4 bg-gray-200 rounded w-12" />
                    </div>
                ))}
            </div>
        </div>
    )
}
