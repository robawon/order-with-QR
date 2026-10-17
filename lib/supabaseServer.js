import { createClient } from '@supabase/supabase-js';

// Server-only Supabase client with Service Role privileges
export function getServiceRoleClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined in the server environment.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Extracts and verifies the bearer token from the incoming Request.
 * Returns { user, staff } or throws an error object with HTTP status and message.
 * @param {Request} req
 * @param {string[]} [allowedRoles] e.g. ['super_admin', 'cafe_admin']
 */
export async function verifyStaffSession(req, allowedRoles = []) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    const error = new Error('Missing or invalid Authorization header');
    error.status = 401;
    throw error;
  }

  const supabaseAdmin = getServiceRoleClient();

  // 1. Verify user JWT with Supabase Auth
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    const error = new Error('Invalid or expired authentication token');
    error.status = 401;
    throw error;
  }

  // 2. Fetch staff record
  const { data: staff, error: staffError } = await supabaseAdmin
    .from('staff')
    .select('user_id, cafe_id, role, station, full_name, active, created_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (staffError || !staff) {
    const error = new Error('No staff record found for this user');
    error.status = 403;
    throw error;
  }

  // 3. Check if staff account is active
  if (!staff.active) {
    const error = new Error('Your staff account is inactive. Please contact your administrator.');
    error.status = 403;
    throw error;
  }

  // 4. Check cafe active status (for cafe-scoped roles)
  if (staff.cafe_id && staff.role !== 'super_admin') {
    const { data: cafe } = await supabaseAdmin
      .from('cafes')
      .select('id, name, active')
      .eq('id', staff.cafe_id)
      .maybeSingle();

    if (cafe && !cafe.active) {
      const error = new Error('This cafe account is currently deactivated.');
      error.status = 403;
      throw error;
    }
  }

  // 5. Verify role matches allowed roles if specified
  if (allowedRoles.length > 0 && !allowedRoles.includes(staff.role)) {
    const error = new Error(`Forbidden: required role [${allowedRoles.join(', ')}], got [${staff.role}]`);
    error.status = 403;
    throw error;
  }

  return { user, staff, supabaseAdmin };
}
