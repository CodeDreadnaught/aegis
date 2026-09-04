import type { Metadata } from "next";
import {
  CheckCircle,
  ClockCounterClockwise,
  ShieldCheck,
  Trash,
  UserCirclePlus,
  UserGear,
  Users,
} from "@phosphor-icons/react/ssr";

import { ActionToastForm } from "@/components/action-toast-form";
import { PaginationControls } from "@/components/table-pagination";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
  deleteUserAction,
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
  const metrics = [
    {
      accent: "bg-[#2f9da7]",
      detail: "Authorised accounts",
      icon: Users,
      label: "Users",
      progress: totals.total ? 100 : 0,
      tone: "bg-[#e8fbf6] text-[#146c74]",
      value: totals.total,
    },
    {
      accent: "bg-[#5ec3cf]",
      detail: "Available operators",
      icon: CheckCircle,
      label: "Active",
      progress: percentage(totals.active, totals.total),
      tone: "bg-[#eefbfc] text-[#146c74]",
      value: totals.active,
    },
    {
      accent: "bg-[#f2bd3f]",
      detail: "Privileged accounts",
      icon: ShieldCheck,
      label: "Admins",
      progress: percentage(totals.administrators, totals.total),
      tone: "bg-[#fff6dc] text-[#8a5a00]",
      value: totals.administrators,
    },
    {
      accent: "bg-[#ef4444]",
      detail: `${auditEntries} audit entries`,
      icon: ClockCounterClockwise,
      label: "Disabled",
      progress: percentage(totals.disabled, totals.total),
      tone: "bg-[#fff0ed] text-[#b13d2e]",
      value: totals.disabled,
    },
  ];

  return (
    <div className="grid w-full max-w-full min-w-0 gap-4">
      <section className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0" data-motion="reveal">
          <p className="text-sm font-medium text-[#2f9da7]">Users</p>
          <h1 className="mt-1 break-words text-3xl font-semibold tracking-normal text-zinc-950">
            Access Control
          </h1>
        </div>
      </section>

      <section className="grid w-full max-w-full min-w-0 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(metric => (
          <MetricCard
            accent={metric.accent}
            detail={metric.detail}
            icon={metric.icon}
            key={metric.label}
            label={metric.label}
            progress={metric.progress}
            tone={metric.tone}
            value={metric.value}
          />
        ))}
      </section>

      <section className="w-full max-w-full min-w-0">
        <Card
          className="w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div className="min-w-0">
              <CardTitle>Authorised Accounts</CardTitle>
              <p className="text-sm text-zinc-500">
                Roles, status and activity
              </p>
            </div>
            <UserGear aria-hidden="true" className="size-5 text-zinc-500" />
          </CardHeader>
          <CardContent className="min-w-0 p-0">
            <div className="max-w-full min-w-0 overflow-x-auto px-4 pb-4">
              <Table className="min-w-[1180px]">
                <TableHeader>
                  <TableRow className="border-zinc-200 bg-zinc-50">
                    <TableHead className="w-[24rem]">User</TableHead>
                    <TableHead className="w-[14rem]">Role</TableHead>
                    <TableHead className="w-[10rem]">Status</TableHead>
                    <TableHead className="w-[12rem]">Activity</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead className="w-[9rem]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.items.map(user => (
                    <TableRow
                      className="border-zinc-100 align-top transition-colors hover:bg-zinc-50"
                      key={user.id}
                    >
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-950 text-sm font-semibold text-white">
                            {userInitials(user.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-950">
                              {user.name}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                          variant="outline"
                        >
                          {userRoleLabels[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={user.status} />
                      </TableCell>
                      <TableCell className="text-sm text-zinc-500">
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
                      <TableCell>
                        <ActionToastForm
                          action={deleteUserAction}
                          errorTitle="User was not deleted"
                          successDescription="The account and active sessions were removed."
                          successTitle="User deleted"
                        >
                          <input name="userId" type="hidden" value={user.id} />
                          <button
                            className={buttonVariants({
                              variant: "outline",
                              size: "sm",
                              className:
                                "rounded-full border-red-200 bg-red-50 px-3 text-red-700 hover:bg-red-600 hover:text-white",
                            })}
                            type="submit"
                          >
                            <Trash />
                            Delete
                          </button>
                        </ActionToastForm>
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
      </section>

      <section className="w-full max-w-full min-w-0">
        <Card
          className="w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div className="min-w-0">
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
  accent,
  detail,
  icon: Icon,
  label,
  progress,
  tone,
  value,
}: {
  accent: string;
  detail: string;
  icon: MetricIcon;
  label: string;
  progress: number;
  tone: string;
  value: number;
}) {
  return (
    <Card
      className="h-full w-full max-w-full min-w-0 rounded-[1.2rem] border-zinc-200 bg-white py-0 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(24,24,27,0.08)]"
      data-motion="metric"
    >
      <CardContent className="flex min-h-36 flex-col px-4 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-500">{label}</p>
            <p className="mt-1 break-words text-2xl font-semibold tracking-normal text-zinc-950">
              {value}
            </p>
          </div>
          <div className={`grid size-8 shrink-0 place-items-center rounded-full ${tone}`}>
            <Icon aria-hidden="true" className="size-4" />
          </div>
        </div>
        <p className="mt-auto pt-3 text-sm font-medium text-zinc-500">
          {detail}
        </p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className={`h-full rounded-full ${accent}`}
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
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

function percentage(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}
