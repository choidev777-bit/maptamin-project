'use client'

import { useState, useCallback } from 'react'
import { Mail, ChevronDown } from 'lucide-react'

/* ──────────────────────────────────────────────
 * 도메인 선택 방식 이메일 입력 컴포넌트
 *
 * 구성:
 * ┌──────────────┐   ┌─────────────────────┐
 * │  아이디 입력   │ @ │  gmail.com        ▼ │
 * └──────────────┘   └─────────────────────┘
 *
 * "직접입력" 선택 시 도메인 직접 입력 가능
 * ────────────────────────────────────────────── */

const DOMAIN_OPTIONS = [
    'gmail.com',
    'naver.com',
    'daum.net',
    'hanmail.net',
    'nate.com',
    'kakao.com',
    'icloud.com',
] as const

const CUSTOM_DOMAIN_KEY = '__custom__'

interface EmailInputProps {
    value: string
    onChange: (email: string) => void
    required?: boolean
    disabled?: boolean
    label?: string
    /** 에러 메시지 (외부에서 검증 후 전달) */
    error?: string | null
}

export function EmailInput({
    value,
    onChange,
    required = false,
    disabled = false,
    label = '알림 이메일',
    error,
}: EmailInputProps) {
    // 기존 email을 local/domain으로 분리
    const parseEmail = useCallback((email: string) => {
        if (!email || !email.includes('@')) return { local: email || '', domain: DOMAIN_OPTIONS[0] }
        const [local, domain] = email.split('@')
        const isKnown = DOMAIN_OPTIONS.includes(domain as typeof DOMAIN_OPTIONS[number])
        return { local, domain: isKnown ? domain : domain, isCustom: !isKnown }
    }, [])

    const parsed = parseEmail(value)
    const [localPart, setLocalPart] = useState(parsed.local)
    const [selectedDomain, setSelectedDomain] = useState<string>(
        parsed.isCustom ? CUSTOM_DOMAIN_KEY : parsed.domain
    )
    const [customDomain, setCustomDomain] = useState(parsed.isCustom ? parsed.domain : '')

    const updateEmail = useCallback((local: string, domain: string, custom: string) => {
        const effectiveDomain = domain === CUSTOM_DOMAIN_KEY ? custom : domain
        if (local && effectiveDomain) {
            onChange(`${local}@${effectiveDomain}`)
        } else {
            onChange(local ? `${local}@` : '')
        }
    }, [onChange])

    const handleLocalChange = (val: string) => {
        // @ 기호 제거
        const clean = val.replace(/@/g, '')
        setLocalPart(clean)
        updateEmail(clean, selectedDomain, customDomain)
    }

    const handleDomainChange = (val: string) => {
        setSelectedDomain(val)
        if (val !== CUSTOM_DOMAIN_KEY) {
            setCustomDomain('')
        }
        updateEmail(localPart, val, val === CUSTOM_DOMAIN_KEY ? customDomain : '')
    }

    const handleCustomDomainChange = (val: string) => {
        setCustomDomain(val)
        updateEmail(localPart, CUSTOM_DOMAIN_KEY, val)
    }

    return (
        <div>
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <div className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4" />
                        {label}
                        {required && <span className="text-red-500">*</span>}
                    </div>
                </label>
            )}

            <div className="flex items-center gap-1">
                {/* 로컬 파트 */}
                <input
                    type="text"
                    value={localPart}
                    onChange={(e) => handleLocalChange(e.target.value)}
                    placeholder="아이디"
                    disabled={disabled}
                    className={`flex-1 min-w-0 px-3 py-2.5 rounded-lg border text-sm transition-colors
                        ${error
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-300 dark:border-gray-600 focus:ring-[#00C896] focus:border-[#00C896]'
                        }
                        bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                        disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
                        focus:outline-none focus:ring-2`}
                />

                <span className="text-gray-400 font-medium text-sm flex-shrink-0">@</span>

                {/* 도메인 선택 */}
                {selectedDomain === CUSTOM_DOMAIN_KEY ? (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                        <input
                            type="text"
                            value={customDomain}
                            onChange={(e) => handleCustomDomainChange(e.target.value)}
                            placeholder="도메인 입력"
                            disabled={disabled}
                            className={`flex-1 min-w-0 px-3 py-2.5 rounded-lg border text-sm transition-colors
                                ${error
                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                    : 'border-gray-300 dark:border-gray-600 focus:ring-[#00C896] focus:border-[#00C896]'
                                }
                                bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                                disabled:bg-gray-100 disabled:text-gray-500
                                focus:outline-none focus:ring-2`}
                        />
                        <button
                            type="button"
                            onClick={() => handleDomainChange(DOMAIN_OPTIONS[0])}
                            disabled={disabled}
                            className="px-2 py-2.5 text-xs text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
                            title="목록에서 선택"
                        >
                            목록
                        </button>
                    </div>
                ) : (
                    <div className="relative flex-1 min-w-0">
                        <select
                            value={selectedDomain}
                            onChange={(e) => handleDomainChange(e.target.value)}
                            disabled={disabled}
                            className={`w-full appearance-none px-3 py-2.5 pr-8 rounded-lg border text-sm transition-colors
                                ${error
                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                    : 'border-gray-300 dark:border-gray-600 focus:ring-[#00C896] focus:border-[#00C896]'
                                }
                                bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                                disabled:bg-gray-100 disabled:text-gray-500
                                focus:outline-none focus:ring-2 cursor-pointer`}
                        >
                            {DOMAIN_OPTIONS.map((domain) => (
                                <option key={domain} value={domain}>
                                    {domain}
                                </option>
                            ))}
                            <option value={CUSTOM_DOMAIN_KEY}>직접입력</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                )}
            </div>

            {error && (
                <p className="mt-1.5 text-xs text-red-500">{error}</p>
            )}
        </div>
    )
}

/** 이메일 형식 간단 검증 */
export function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
