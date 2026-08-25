import type { Metadata } from "next";
import {
  CheckCircle,
  ClockCounterClockwise,
  ShieldCheck,
  UserCirclePlus,
  UserGear,
  Users,
} from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export const metadata: Metadata = {
  title: "AEGIS - User Management",
};

export default async function UsersPage() {
  const { totals, users } = await getUserAdministrationData();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="absolute right-6 top-5 hidden h-28 w-28 rounded-full bg-primary/10 blur-2xl lg:block" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <Badge variant="outline" className="border-primary/25 text-primary">
              Administrator workspace
            </Badge>
            <div className="space-y-2">
              <h1 className="font-heading text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
                User Administration
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Manage authorised AEGIS operators, administrator coverage and
                account availability without exposing credentials or sensitive
                authentication material.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[34rem]">
            <MetricCard icon={Users} label="Total users" value={totals.total} />
            <MetricCard
              icon={CheckCircle}
              label="Active"
              value={totals.active}
            />
            <MetricCard
              icon={ShieldCheck}
              label="Admins"
              value={totals.administrators}
            />
            <MetricCard
              icon={ClockCounterClockwise}
              label="Disabled"
              value={totals.disabled}
            />
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <Card className="rounded-xl border-border/70 shadow-sm transition-all duration-300 hover:shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <UserGear className="size-5 text-primary" />
              Authorised accounts
            </CardTitle>
            <CardDescription>
              Role and status changes are enforced again on the server.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-6">User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead className="pr-6 text-right">Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="group">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-sm font-semibold text-foreground shadow-inner transition-transform duration-300 group-hover:scale-105">
                          {userInitials(user.name)}
                        </div>
                        <div className="min-w-44">
                          <div className="font-medium text-foreground">
                            {user.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {userRoleLabels[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.status === "ACTIVE" ? "default" : "outline"
                        }
                        className={
                          user.status === "ACTIVE"
                            ? "bg-emerald-600 text-white"
                            : "text-muted-foreground"
                        }
                      >
                        {userStatusLabels[user.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {user._count.sessions} sessions
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user._count.auditLogs} audit entries
                      </div>
                    </TableCell>
                    <TableCell className="pr-6">
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
          </CardContent>
        </Card>

        <Card className="h-fit rounded-xl border-border/70 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCirclePlus className="size-5 text-primary" />
              Create account
            </CardTitle>
            <CardDescription>
              New users receive a hashed password and no credential material is
              returned to the interface.
            </CardDescription>
            <CardAction>
              <Badge variant="outline">Admin only</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <CreateUserForm action={createUserAction} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type MetricIcon = typeof Users;

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: MetricIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border bg-background/80 p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {value}
          </div>
        </div>
        <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}
