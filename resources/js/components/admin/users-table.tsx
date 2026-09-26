import {
    AdminEmptyRow,
    AdminPagination,
    AdminRoleChip,
    AdminTable,
    AdminTableBody,
    AdminTableHead,
    AdminTd,
    AdminTh,
} from '@/components/admin/admin-table';
import { StatusChip } from '@/components/creator-suite/shared';
import { adminCopy, formatAdminDate } from '@/config/admin-copy';
import { type AdminPaginator, type AdminUserRow } from '@/types/admin';

export default function UsersTable({
    users,
    empty,
}: {
    users: AdminPaginator<AdminUserRow>;
    empty: string;
}) {
    return (
        <>
            <AdminTable>
                <AdminTableHead>
                    <AdminTh>{adminCopy.userColumns.name}</AdminTh>
                    <AdminTh>{adminCopy.userColumns.email}</AdminTh>
                    <AdminTh>{adminCopy.userColumns.currency}</AdminTh>
                    <AdminTh>{adminCopy.userColumns.verified}</AdminTh>
                    <AdminTh>{adminCopy.userColumns.onboarded}</AdminTh>
                    <AdminTh>{adminCopy.userColumns.role}</AdminTh>
                    <AdminTh>{adminCopy.userColumns.created}</AdminTh>
                </AdminTableHead>
                <AdminTableBody>
                    {users.data.length === 0 ? (
                        <AdminEmptyRow colSpan={7} message={empty} />
                    ) : (
                        users.data.map((user) => (
                            <tr key={user.id}>
                                <AdminTd className="font-medium text-slate-900 dark:text-neutral-50">
                                    {user.first_name} {user.last_name}
                                </AdminTd>
                                <AdminTd>{user.email}</AdminTd>
                                <AdminTd>{user.currency}</AdminTd>
                                <AdminTd>
                                    <StatusChip
                                        label={user.email_verified_at ? adminCopy.yes : adminCopy.no}
                                        color={user.email_verified_at ? 'green' : 'amber'}
                                    />
                                </AdminTd>
                                <AdminTd>
                                    <StatusChip
                                        label={user.onboarded_at ? adminCopy.yes : adminCopy.no}
                                        color={user.onboarded_at ? 'green' : 'amber'}
                                    />
                                </AdminTd>
                                <AdminTd>
                                    <AdminRoleChip isAdmin={user.is_admin} />
                                </AdminTd>
                                <AdminTd className="whitespace-nowrap text-slate-500 dark:text-neutral-400">
                                    {formatAdminDate(user.created_at)}
                                </AdminTd>
                            </tr>
                        ))
                    )}
                </AdminTableBody>
            </AdminTable>
            <AdminPagination paginator={users} />
        </>
    );
}
