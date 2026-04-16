"use client";

import { useCommunity } from "@/lib/store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users, MapPin, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  leader:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  amiga: "bg-primary/10 text-primary",
};

export default function MembersPage() {
  const members = useCommunity((s) => s.members);
  const onlineMembers = useCommunity((s) => s.onlineMembers);

  return (
    <div className="p-4 lg:p-6 overflow-auto h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Community Members
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {members.length} amigas · {onlineMembers.length} online
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => {
          const isOnline = onlineMembers.includes(m.id);
          return (
            <Card key={m.id} className="transition-all hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                        {initials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card bg-green-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{m.name}</h3>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${ROLE_COLORS[m.role]}`}
                      >
                        {m.role}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {m.bio}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {m.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {m.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Joined{" "}
                        {format(parseISO(m.joinedDate), "MMM yyyy")}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
