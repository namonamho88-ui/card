import { createClient } from '@supabase/supabase-js';

// TODO: 아래 URL과 Anon Key를 본인의 Supabase 프로젝트 정보로 변경하세요.
const supabaseUrl = 'YOUR_SUPABASE_PROJECT_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

// URL이 유효한지 확인하여 앱이 크래시되는 것을 방지합니다.
const isValidUrl = (url) => {
    try {
        return url && url.startsWith('http');
    } catch {
        return false;
    }
};

export const supabase = isValidUrl(supabaseUrl)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : { from: () => ({ select: () => ({ data: [], error: null }), insert: () => ({ select: () => ({ data: [], error: null }) }) }) }; // 가짜 클라이언트 객체
