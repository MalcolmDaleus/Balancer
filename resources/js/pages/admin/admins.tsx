import UsersTable from '@/components/admin/users-table';
import { adminCopy } from '@/config/admin-copy';
import AdminLayout from '@/layouts/admin-layout';
import { type AdminPaginator, type AdminUserRow } from '@/types/admin';

export default function AdminAdmins({ users }: { users: AdminPaginator<AdminUserRow> }) {
    return (
        <AdminLayout
            title={adminCopy.admins.headTitle}
            heading={adminCopy.admins.title}
            subtitle={adminCopy.admins.subtitle}
            current="admins"
        >
            <UsersTable users={users} empty={adminCopy.admins.empty} />
        </AdminLayout>
    );
}
