export default function SettingsLoading() {
    return (
        <div className="max-w-2xl mx-auto animate-pulse">
            {/* Header */}
            <div className="mb-8">
                <div className="h-8 bg-gray-200 rounded-lg w-24 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-40" />
            </div>

            {/* Profile Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                <div className="h-6 bg-gray-200 rounded w-16 mb-4" />
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full" />
                    <div className="flex-1">
                        <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-48 mb-1" />
                        <div className="h-3 bg-gray-200 rounded w-36" />
                    </div>
                </div>
            </div>

            {/* Plan Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                <div className="h-6 bg-gray-200 rounded w-24 mb-4" />
                <div className="h-20 bg-gray-100 rounded-xl mb-4" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-24 bg-blue-50 rounded-xl" />
                    <div className="h-24 bg-green-50 rounded-xl" />
                </div>
            </div>

            {/* Actions Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="h-6 bg-gray-200 rounded w-16 mb-4" />
                <div className="h-12 bg-red-50 rounded-xl" />
            </div>
        </div>
    )
}
