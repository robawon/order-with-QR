import { NextResponse } from 'next/server';
import { verifyStaffSession } from '../../../../lib/supabaseServer';

export async function GET(req) {
  try {
    const { user, staff } = await verifyStaffSession(req);
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      staff: {
        role: staff.role,
        full_name: staff.full_name,
        cafe_id: staff.cafe_id,
        station: staff.station,
        active: staff.active,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: err.status || 500 }
    );
  }
}
