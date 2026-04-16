"use client";

import { useState } from "react";
import { useAuth } from "@/lib/store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, MapPin, Calendar, Mail, Edit3, Save } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfilePage() {
  const user = useAuth((s) => s.user);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio || "");
  const [location, setLocation] = useState(user?.location || "");

  if (!user) return null;

  function handleSave() {
    setEditing(false);
    toast.success("Profile updated!");
  }

  return (
    <div className="p-4 lg:p-6 overflow-auto h-full">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            My Profile
          </h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h2 className="text-2xl font-bold">{user.name}</h2>
                  <Badge variant="secondary" className="capitalize">
                    {user.role}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {user.email}
                </p>
                <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-muted-foreground">
                  {user.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {user.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Joined{" "}
                    {format(parseISO(user.joinedDate), "MMMM yyyy")}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="text-lg font-semibold">About</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (editing ? handleSave() : setEditing(true))}
            >
              {editing ? (
                <>
                  <Save className="mr-1.5 h-4 w-4" /> Save
                </>
              ) : (
                <>
                  <Edit3 className="mr-1.5 h-4 w-4" /> Edit
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Input
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, State"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Bio
                  </p>
                  <p className="mt-1">{bio || "No bio yet."}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Location
                  </p>
                  <p className="mt-1 flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {location || "Not set"}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Email
                  </p>
                  <p className="mt-1 flex items-center gap-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {user.email}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
