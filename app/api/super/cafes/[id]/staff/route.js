import { NextResponse } from 'next/server';
import { verifyStaffSession, getServiceRoleClient } from '../../../../../../lib/supabaseServer';

export async function GET(req, { params }) {
  try {
    const { id: cafeId } = params;
    await verifyStaffSession(req, ['super_admin']);
    const supabaseAdmin = getServiceRoleClient();

    const { data: staff, error } = await supabaseAdmin
      .from('staff')
      .select('user_id, cafe_id, role, station, full_name, active, created_at')
      .eq('cafe_id', cafeId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Also get emails from auth users
    const staffWithEmail = await Promise.all(
      (staff || []).map(async (s) => {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(s.user_id);
        return {
          ...s,
          email: user?.email || '',
        };
      })
    );

    return NextResponse.json({ success: true, staff: staffWithEmail });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: err.status || 500 }
    );
  }
}
