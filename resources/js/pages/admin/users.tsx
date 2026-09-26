import UsersTable from '@/components/admin/users-table';
import { adminCopy } from '@/config/admin-copy';
import AdminLayout from '@/layouts/admin-layout';
import { type AdminPaginator, type AdminUserRow } from '@/types/admin';

export default function AdminUsers({ users }: { users: AdminPaginator<AdminUserRow> }) {
    return (
        <AdminLayout
            title={adminCopy.users.headTitle}
            heading={adminCopy.users.title}
            subtitle={adminCopy.users.subtitle}
            current="users"
        >
            <UsersTable users={users} empty={adminCopy.users.empty} />
        </AdminLayout>
    );
}
