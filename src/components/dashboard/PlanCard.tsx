import { Check } from 'lucide-react'

export interface PlanFeature {
    text: string
    included: boolean
}

export interface PlanCardData {
    id: string
    name: string
    tagline: string
    monthly: string
    featured: boolean
    badge?: string
    features: PlanFeature[]
    cta: string
    ctaStyle: 'solid' | 'ghost'
}

interface PlanCardProps {
    plan: PlanCardData
    currentPlanId: string
    onSelect: (planId: string) => void
}

export function PlanCard({ plan, currentPlanId, onSelect }: PlanCardProps) {
    const isCurrentPlan = plan.id === currentPlanId
    const planOrder: Record<string, number> = { free: 0, starter: 1, pro: 2, premium: 3 }
    const isHigherPlan = (planOrder[plan.id] || 0) > (planOrder[currentPlanId] || 0)
    const showFeatured = plan.featured && isHigherPlan

    // Helper to determine button text
    const getButtonText = () => {
        if (isCurrentPlan) return '현재 이용 중'

        // Simple logic for upgrade vs switch
        // You might want to make this more robust if you have a strict plan hierarchy
        // For now, mirroring the logic from UpgradePageContent but simplified or reused if possible.
        // In UpgradePageContent, it had specific logic. Let's replicate it or make it generic.
        // For generic usage:
        const planOrder: Record<string, number> = { free: 0, starter: 1, pro: 2, premium: 3 }
        const currentOrder = planOrder[currentPlanId] || 0
        const targetOrder = planOrder[plan.id] || 0

        if (targetOrder > currentOrder) return '업그레이드'
        return `${plan.name}로 전환`
    }

    return (
        <div
            data-testid={`plan-card-${plan.id}`}
            className={`relative flex flex-col rounded-3xl border p-7 transition-all duration-300 sm:p-8 ${isCurrentPlan
                ? 'border-2 border-[#001011] bg-white shadow-lg'
                : showFeatured
                    ? 'scale-[1.03] border-2 border-[#00C896] bg-white shadow-2xl shadow-[#00C896]/10 lg:scale-105'
                    : 'border border-gray-200 bg-white shadow-sm hover:-translate-y-1 hover:shadow-lg'
                }`}
        >


            {/* Recommended Badge (if not current) */}
            {plan.badge && !isCurrentPlan && isHigherPlan && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="whitespace-nowrap rounded-full bg-[#00C896] px-4 py-1.5 text-xs font-bold text-white shadow-md">
                        {plan.badge}
                    </span>
                </div>
            )}

            <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
            <p className="mt-1 text-sm text-gray-500">{plan.tagline}</p>

            <div className="mt-5">
                <div className="flex items-baseline gap-1">
                    <span
                        data-testid={`plan-price-${plan.id}`}
                        className="text-3xl font-extrabold text-gray-900 sm:text-4xl"
                    >
                        {plan.monthly}
                    </span>
                    <span className="text-sm text-gray-500">/월</span>
                </div>
                <p className="mt-0.5 text-xs text-gray-400">VAT 포함</p>
            </div>

            <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                    <li
                        key={feature.text}
                        className="flex items-start gap-2.5 text-sm"
                    >
                        {feature.included ? (
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00C896]/10 text-xs text-[#00C896]">
                                <Check className="w-3 h-3" strokeWidth={3} />
                            </span>
                        ) : (
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400">
                                <span className="block w-2.5 h-px bg-gray-400 rotate-45 transform origin-center absolute" />
                                <span className="block w-2.5 h-px bg-gray-400 -rotate-45 transform origin-center absolute" />
                                {/* OR just use X icon from lucide if available. UpgradePage used text symbols "✕" inside a span. 
                                    I'll use lucide Check for checkmark, and for X, UpgradePage likely used text.
                                    Let's check UpgradePageContent.tsx again... it used text symbols inside the spans.
                                    I will import Check from lucide for the checkmark to be consistent with my code above, 
                                    and for X, I'll stick to the text symbol as in the reference unless I import X from lucide.
                                    Wait, the reference used:
                                    ✓ symbol and ✕ symbol.
                                    I'll just use lucide Check and X for better consistency.
                                */}
                                ✕
                            </span>
                        )}
                        <span
                            className={
                                feature.included ? 'text-gray-700' : 'text-gray-400'
                            }
                        >
                            {feature.text}
                        </span>
                    </li>
                ))}
            </ul>

            <button
                type="button"
                disabled={isCurrentPlan}
                onClick={() => onSelect(plan.id)}
                className={`mt-6 w-full rounded-xl py-3.5 text-sm font-bold transition-all duration-300 ${isCurrentPlan
                    ? 'cursor-not-allowed border-2 border-gray-100 bg-gray-50 text-gray-400'
                    : isHigherPlan
                        ? 'bg-[#00C896] text-white shadow-lg shadow-[#00C896]/25 hover:-translate-y-0.5 hover:bg-[#00B386] hover:shadow-xl'
                        : 'border-2 border-gray-100 bg-white text-[#00C896] hover:-translate-y-0.5 hover:border-[#00C896] hover:bg-[#00C896]/5'
                    }`}
            >
                {getButtonText()}
            </button>
        </div>
    )
}
