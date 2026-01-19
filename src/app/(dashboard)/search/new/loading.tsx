export default function NewSearchLoading() {
    return (
        <div className="max-w-4xl mx-auto animate-pulse">
            {/* Header */}
            <div className="mb-8">
                <div className="h-8 bg-gray-200 rounded-lg w-48 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-72" />
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-4 mb-8">
                {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full" />
                        {step < 3 && <div className="w-16 h-1 bg-gray-200 rounded" />}
                    </div>
                ))}
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
                {/* Place Search */}
                <div className="mb-6">
                    <div className="h-5 bg-gray-200 rounded w-24 mb-2" />
                    <div className="h-12 bg-gray-100 rounded-xl" />
                </div>

                {/* Keywords */}
                <div className="mb-6">
                    <div className="h-5 bg-gray-200 rounded w-20 mb-2" />
                    <div className="flex gap-2">
                        <div className="h-10 bg-gray-100 rounded-lg flex-1" />
                        <div className="h-10 bg-gray-200 rounded-lg w-16" />
                    </div>
                </div>

                {/* Grid */}
                <div className="mb-6">
                    <div className="h-5 bg-gray-200 rounded w-28 mb-2" />
                    <div className="h-64 bg-gray-100 rounded-xl" />
                </div>

                {/* Submit Button */}
                <div className="h-12 bg-gray-200 rounded-xl" />
            </div>
        </div>
    )
}
