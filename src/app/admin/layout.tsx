import Link from "next/link";
import { BookOpen, Building2, LayoutDashboard, LogOut, Settings2, Wine, Warehouse } from "lucide-react";
import { ActionForm } from "../../components/action-form";
import { requireAdmin } from "../../lib/supabase";
import { logout } from "../login/actions";

const navigation = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/vini", label: "Catalogo vini", Icon: BookOpen },
  { href: "/admin/cantine", label: "Cantine", Icon: Warehouse },
  { href: "/admin/ristoranti", label: "Ristoranti", Icon: Building2 },
  { href: "/admin/anagrafiche", label: "Anagrafiche", Icon: Settings2 },
];

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user } = await requireAdmin();
  return <div className="admin-shell">
    <aside className="sidebar">
      <Link href="/admin" className="brand"><Wine size={22} /><span>SuPeR<small>Wine &amp; Menu</small></span></Link>
      <nav aria-label="Navigazione gestionale">
        {navigation.map(({ href, label, Icon }) => <Link key={href} href={href}><Icon size={17} />{label}</Link>)}
      </nav>
      <div className="sidebar-account">
        <p className="note truncate" title={user.email}>{user.email}</p>
        <ActionForm run={logout}><button className="secondary compact justify-self-start"><LogOut size={16} /> Esci</button></ActionForm>
      </div>
    </aside>
    <main className="admin-main">{children}</main>
  </div>;
}
