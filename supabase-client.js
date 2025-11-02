const SUPABASE_URL = 'https://uwgeszjlcnrooxtihdpq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2VzempsY25yb294dGloZHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODY4NDMsImV4cCI6MjA3NTY2Mjg0M30._zN3kXPiuNkDY0fPn6jqnE5NVojmyQ9u4A9Vi3GGsTo';

// The global "supabase" object is created by the CDN script.
// We initialize our client here and assign it to a new variable, `_supabase`.
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);