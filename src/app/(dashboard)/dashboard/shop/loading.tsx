export default function ShopLoading() {
    return (
        <div className="max-w-2xl mx-auto animate-pulse">
            {/* 뒤로가기 + 헤더 */}
            <div className="mb-6">
                <div className="h-4 bg-gray-200 rounded w-20 mb-4" />
                <div className="h-8 bg-gray-200 rounded-lg w-52 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-32" />
            </div>

            {/* 현재 보유 티켓 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                <div className="h-4 bg-gray-200 rounded w-28 mb-3" />
                <div className="grid grid-cols-2 gap-3">
                    <div className="h-20 bg-green-50 rounded-lg" />
                    <div className="h-20 bg-blue-50 rounded-lg" />
                </div>
            </div>

            {/* 플랫폼 선택 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
                <div className="grid grid-cols-2 gap-3">
                    <div className="h-24 bg-gray-100 rounded-xl" />
                    <div className="h-24 bg-gray-100 rounded-xl" />
                </div>
            </div>

            {/* 수량 + 금액 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
                <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                    <div className="w-24 h-12 bg-gray-200 rounded-xl" />
                    <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                </div>
                <div className="h-28 bg-gray-50 rounded-lg" />
            </div>

            {/* 결제 버튼 */}
            <div className="h-14 bg-gray-200 rounded-xl" />
        </div>
    )
}
