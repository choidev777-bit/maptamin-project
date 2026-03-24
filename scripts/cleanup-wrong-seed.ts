/**
 * 잘못된 place_id로 삽입된 시드 데이터 삭제
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const WRONG_NAVER_PLACE_ID  = '7Zek7J207Y+s7JejLeyEnOyauO2KueuzhOyLnCAxMOqwgOq4uCAxMC0y'
const WRONG_GOOGLE_PLACE_ID = 'ChIJlXAY_IejfDURxEXnnXsatGk'
const USER_ID = 'c9441bda-c9b0-44fa-ac95-d7449d928c87'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
    console.log('🗑️  잘못된 시드 데이터 삭제 시작\n')

    // 잘못된 searches ID 조회
    const { data: wrongSearches, error: fetchErr } = await supabase
        .from('searches')
        .select('id')
        .eq('user_id', USER_ID)
        .in('place_id', [WRONG_NAVER_PLACE_ID, WRONG_GOOGLE_PLACE_ID])

    if (fetchErr) { console.error('❌ 조회 실패:', fetchErr.message); process.exit(1) }
    if (!wrongSearches || wrongSearches.length === 0) {
        console.log('✅ 삭제할 잘못된 데이터가 없습니다.')
        return
    }

    const ids = wrongSearches.map(s => s.id)
    console.log(`  발견된 잘못된 searches: ${ids.length}건`)

    // search_results 먼저 삭제
    const { error: resErr } = await supabase
        .from('search_results')
        .delete()
        .in('search_id', ids)
    if (resErr) { console.error('❌ search_results 삭제 실패:', resErr.message); process.exit(1) }
    console.log('  ✅ search_results 삭제 완료')

    // searches 삭제
    const { error: searchErr } = await supabase
        .from('searches')
        .delete()
        .in('id', ids)
    if (searchErr) { console.error('❌ searches 삭제 실패:', searchErr.message); process.exit(1) }
    console.log('  ✅ searches 삭제 완료')

    console.log('\n🎉 정리 완료!')
}

main().catch(e => { console.error(e); process.exit(1) })
