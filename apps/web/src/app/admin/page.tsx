import { redirect } from 'next/navigation';

export default function AdminHomePage() {
  // Sellers list is the admin's default/recurring view (the pending queue),
  // matching the same landing choice already made for the mockup's Frame 5a.
  redirect('/admin/sellers');
}
