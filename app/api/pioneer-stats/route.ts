import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Call the API function to get pioneer stats
    const { data, error } = await supabase.rpc('api_get_pioneer_stats')
    
    if (error) {
      console.error('Error fetching pioneer stats:', error)
      return NextResponse.json({ error: 'Failed to fetch pioneer stats' }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error in pioneer stats API:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
