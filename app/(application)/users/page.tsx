import type { Metadata } from "next";
import {
  CheckCircle,
  ClockCounterClockwise,
  ShieldCheck,
  UserCirclePlus,
  UserGear,
  Users,
} from "@phosphor-icons/react/ssr";

import { PaginationControls } from "@/components/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createUserAction,
  updateUserAccessAction,
} from "@/features/users/actions";
import { CreateUserForm } from "@/features/users/create-user-form";
import { getUserAdministrationData } from "@/features/users/queries";
import {
  userInitials,
  userRoleLabels,
  userStatusLabels,
} from "@/features/users/validation";
import { UserAccessForm } from "@/features/users/user-access-form";
import { paginateItems, parsePageParam } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "User Management",
};

type UsersPageProps = {
  searchParams?: Promise<{ page?: string | string[] }>;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const page = parsePageParam(params?.page);
  const { totals, users } = await getUserAdministrationData();
  const paginatedUsers = paginateItems(users, page);
  const auditEntries = users.reduce(
    (sum, user) => sum + user._count.auditLogs,
    0,
  );

  return (
    <div className="grid gap-4">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div data-motion="reveal">
          <p className="text-sm font-medium text-zinc-500">Users</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-950 md:text-4xl">
            Access Control
          </h1>
        </div>
      </section>

      <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
        <MetricCard
          detail="Authorised accounts"
          icon={Users}
          label="Users"
          value={totals.total}
        />
        <MetricCard
          detail="Available operators"
          icon={CheckCircle}
          label="Active"
          value={totals.active}
        />
        <MetricCard
          detail="Privileged accounts"
          icon={ShieldCheck}
          label="Admins"
          value={totals.administrators}
        />
        <MetricCard
          detail={`${auditEntries} audit entries`}
          icon={ClockCounterClockwise}
          label="Disabled"
          value={totals.disabled}
        />
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <Card
          className="min-w-0 rounded-lg border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div>
              <CardTitle>Authorised Accounts</CardTitle>
              <p className="text-sm text-zinc-500">
                Roles, status and activity
              </p>
            </div>
            <UserGear aria-hidden="true" className="size-5 text-zinc-500" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-4 pb-4">
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow className="border-zinc-200 bg-zinc-50">
                    <TableHead className="w-[30%]">User</TableHead>
                    <TableHead className="hidden text-center md:table-cell">
                      Role
                    </TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="hidden text-center lg:table-cell">
                      Activity
                    </TableHead>
                    <TableHead className="text-center">Access</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.items.map(user => (
                    <TableRow
                      className="border-zinc-100 transition-colors hover:bg-zinc-50"
                      key={user.id}
                    >
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-950 text-sm font-semibold text-white">
                            {userInitials(user.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-zinc-950">
                              {user.name}
                            </p>
                            <p className="truncate text-xs text-zinc-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-center md:table-cell">
                        <Badge
                          className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                          variant="outline"
                        >
                          {userRoleLabels[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={user.status} />
                      </TableCell>
                      <TableCell className="hidden text-center text-sm text-zinc-500 lg:table-cell">
                        <span className="font-semibold text-zinc-950">
                          {user._count.sessions}
                        </span>{" "}
                        sessions
                        <p className="text-xs text-zinc-400">
                          {user._count.auditLogs} audit entries
                        </p>
                      </TableCell>
                      <TableCell>
                        <UserAccessForm
                          action={updateUserAccessAction}
                          role={user.role}
                          status={user.status}
                          userId={user.id}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationControls
              page={paginatedUsers.currentPage}
              searchParams={params}
              total={paginatedUsers.total}
            />
          </CardContent>
        </Card>

        <Card
          className="h-fit rounded-lg border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div>
              <CardTitle>Create Account</CardTitle>
              <p className="text-sm text-zinc-500">Operator access</p>
            </div>
            <UserCirclePlus
              aria-hidden="true"
              className="size-5 text-zinc-500"
            />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <CreateUserForm action={createUserAction} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

type MetricIcon = typeof Users;

function MetricCard({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: MetricIcon;
  label: string;
  value: number;
}) {
  return (
    <Card
      className="min-w-0 rounded-lg border-zinc-200 bg-white shadow-sm"
      data-motion="metric"
    >
      <CardContent className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">{value}</p>
          </div>
          <div className="grid size-8 place-items-center rounded-full bg-zinc-950 text-white">
            <Icon aria-hidden="true" className="size-4" />
          </div>
        </div>
        <p className="mt-2 text-xs font-medium text-zinc-500">{detail}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "ACTIVE"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-zinc-300 bg-zinc-100 text-zinc-700";

  return (
    <Badge className={`rounded-full ${className}`} variant="outline">
      {userStatusLabels[status as keyof typeof userStatusLabels]}
    </Badge>
  );
}
