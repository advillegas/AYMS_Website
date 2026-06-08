"use client";

/**
 * Shared rich profile view — used by both /community/profile (own,
 * with edit mode) and /community/profile/[userId] (others, read-only).
 */

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  CalendarDays,
  Mail,
  Globe,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { type User } from "@/lib/store";
import { useUserRoles } from "@/lib/use-roles-store";
import { useMemberStatus } from "@/lib/use-community-members";
import { useEmailVisible } from "@/lib/profile-lookup";
import { formatDisplayName } from "@/lib/name-format";
import { LANGUAGE_OPTIONS } from "@/lib/profile-constants";
import { geocodeLocation, type ManualLocation } from "@/lib/geo";
import { useProfileGamification } from "@/lib/use-badges";
import { AvatarStatusOverlay, statusLabel } from "./status-indicator";
import { AvatarUploader } from "./avatar-uploader";
import { CoverPhotoUploader } from "./cover-photo-uploader";
import { InterestPicker } from "./interest-picker";
import { TopFriendsEditor } from "./top-friends-editor";
import { PhotoGallery } from "./photo-gallery";
import { PassportSection } from "./passport-section";
import { BadgeShelf } from "./badge-shelf";
import { JourneyRing } from "./journey-ring";
import { PassportWrapped } from "./passport-wrapped";
import { cn, initials } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";

interface ProfileViewProps {
  profile: User;
  isSelf: boolean;
  onSave?: (patch: Partial<User>) => Promise<void>;
}

export function ProfileView({ profile, isSelf, onSave }: ProfileViewProps) {
  const roles = useUserRoles(profile.id);
  const { status } = useMemberStatus(profile.id);
  const emailVisible = useEmailVisible(profile);
  const primaryColor = roles[0]?.color;
  const displayName = formatDisplayName(profile.name, profile.nameDisplay);

  // --- Identity & Gamification ---------------------------------------
  // One facade hook subscribes to the viewed profile's passport + badges,
  // computes completeness, and (for the owner only) persists + celebrates
  // newly-earned milestones. See use-badges.ts.
  const { stamps, badgeItems, earnedCount, completeness } =
    useProfileGamification(profile, isSelf);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [bioLong, setBioLong] = useState(profile.bioLong ?? "");
  const [location, setLocation] = useState(profile.location);
  const [pronouns, setPronouns] = useState(profile.pronouns ?? "");
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [coverPhoto, setCoverPhoto] = useState(profile.coverPhoto ?? "");
  const [instagram, setInstagram] = useState(profile.instagram ?? "");
  const [tiktok, setTiktok] = useState(profile.tiktok ?? "");
  const [twitter, setTwitter] = useState(profile.twitter ?? "");
  const [linkedin, setLinkedin] = useState(profile.linkedin ?? "");
  const [website, setWebsite] = useState(profile.website ?? "");
  const [interests, setInterests] = useState(profile.interests ?? []);
  const [languages, setLanguages] = useState(profile.languages ?? []);
  const [topFriendIds, setTopFriendIds] = useState(profile.topFriendIds ?? []);
  const [galleryPhotos, setGalleryPhotos] = useState(profile.galleryPhotos ?? []);
  const [manualLocations, setManualLocations] = useState<ManualLocation[]>(profile.manualLocations ?? []);
  const [localRadiusMiles, setLocalRadiusMiles] = useState(profile.localRadiusMiles ?? 50);
  const [eventRadiusMiles, setEventRadiusMiles] = useState(profile.eventRadiusMiles ?? 100);
  const [localChatVisibility, setLocalChatVisibility] = useState<"everyone" | "radius">(profile.localChatVisibility ?? "everyone");
  const [newLocationQuery, setNewLocationQuery] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  function startEdit() {
    setName(profile.name);
    setBio(profile.bio);
    setBioLong(profile.bioLong ?? "");
    setLocation(profile.location);
    setPronouns(profile.pronouns ?? "");
    setHeadline(profile.headline ?? "");
    setCoverPhoto(profile.coverPhoto ?? "");
    setInstagram(profile.instagram ?? "");
    setTiktok(profile.tiktok ?? "");
    setTwitter(profile.twitter ?? "");
    setLinkedin(profile.linkedin ?? "");
    setWebsite(profile.website ?? "");
    setInterests(profile.interests ?? []);
    setLanguages(profile.languages ?? []);
    setTopFriendIds(profile.topFriendIds ?? []);
    setGalleryPhotos(profile.galleryPhotos ?? []);
    setManualLocations(profile.manualLocations ?? []);
    setLocalRadiusMiles(profile.localRadiusMiles ?? 50);
    setEventRadiusMiles(profile.eventRadiusMiles ?? 100);
    setLocalChatVisibility(profile.localChatVisibility ?? "everyone");
    setEditing(true);
  }

  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim() || profile.name,
        bio: bio.trim(),
        bioLong: bioLong.trim(),
        location: location.trim(),
        pronouns: pronouns.trim(),
        headline: headline.trim(),
        coverPhoto,
        instagram: instagram.trim(),
        tiktok: tiktok.trim(),
        twitter: twitter.trim(),
        linkedin: linkedin.trim(),
        website: website.trim(),
        interests,
        languages,
        topFriendIds,
        galleryPhotos,
        manualLocations,
        localRadiusMiles,
        eventRadiusMiles,
        localChatVisibility,
      });
      toast.success("Profile updated!");
      setEditing(false);
    } catch (err) {
      console.error("[profile-save]", err);
      toast.error("Couldn't save your profile. Please try again.");
      // Stay in edit mode so the user's unsaved changes aren't lost.
    } finally {
      setSaving(false);
    }
  }

  // joinedDate may be missing or unparseable; only show a label when it
  // resolves to a valid date so we never render "Invalid Date".
  let joinedLabel = "";
  if (profile.joinedDate) {
    const parsed = parseISO(profile.joinedDate);
    if (isValid(parsed)) joinedLabel = format(parsed, "MMMM yyyy");
  }

  const socialLinks = [
    { key: "instagram", value: editing ? instagram : profile.instagram, icon: Globe, prefix: "https://instagram.com/" },
    { key: "tiktok", value: editing ? tiktok : profile.tiktok, icon: Globe, prefix: "https://tiktok.com/@" },
    { key: "twitter", value: editing ? twitter : profile.twitter, icon: Globe, prefix: "https://x.com/" },
    { key: "linkedin", value: editing ? linkedin : profile.linkedin, icon: Globe, prefix: "https://linkedin.com/in/" },
    { key: "website", value: editing ? website : profile.website, icon: Globe, prefix: "" },
  ];

  return (
    <div className="mx-auto max-w-3xl pb-12">
      {/* Cover photo */}
      <CoverPhotoUploader
        url={editing ? coverPhoto : profile.coverPhoto}
        onChange={setCoverPhoto}
        editable={editing}
        className="rounded-t-xl"
      />

      {/* Avatar + name hero */}
      <div className="relative px-4 sm:px-6">
        <div className="-mt-12 sm:-mt-16 flex flex-wrap items-end gap-4 sm:flex-nowrap">
          <div className="relative">
            {editing ? (
              <AvatarUploader />
            ) : (
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32 ring-4 ring-[#FF0099]/30 shadow-[0_0_24px_rgb(255_0_153/0.18)] elevate-3">
                {profile.avatar && <AvatarImage src={profile.avatar} alt={displayName} />}
                <AvatarFallback className="bg-gradient-to-br from-primary to-magenta text-white text-2xl sm:text-3xl font-bold">
                  {initials(displayName)}
                </AvatarFallback>
              </Avatar>
            )}
            <AvatarStatusOverlay status={status} size="lg" borderClass="border-card" className="bottom-1 right-1" />
          </div>
          <div className="flex-1 min-w-0 pb-2">
            {editing ? (
              <div className="space-y-1">
                <Input value={name} onChange={(e) => setName(e.target.value)} className="text-lg font-bold h-9" placeholder="Your name" />
                <Input value={headline} onChange={(e) => setHeadline(e.target.value)} className="text-sm h-7" placeholder="Headline (e.g. Travel lover & amiga)" />
                <Input value={pronouns} onChange={(e) => setPronouns(e.target.value)} className="text-xs h-6 w-32" placeholder="Pronouns" />
              </div>
            ) : (
              <>
                <h1 className="text-title font-bold font-[family-name:var(--font-heading)] truncate" style={primaryColor ? { color: primaryColor } : { color: "#B51760" }}>
                  {displayName}
                </h1>
                {(profile.headline || profile.pronouns) && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {profile.headline}
                    {profile.headline && profile.pronouns && " · "}
                    {profile.pronouns && <span className="text-xs">{profile.pronouns}</span>}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">{statusLabel(status)}</p>
              </>
            )}
          </div>
          {isSelf && !editing && (
            <Button variant="outline" size="sm" onClick={startEdit} className="w-full shrink-0 sm:w-auto">
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Profile
            </Button>
          )}
        </div>

        {/* Role badges */}
        {roles.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {roles.map((r) => (
              <span key={r.id} className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border" style={{ borderColor: `${r.color}55`, backgroundColor: `${r.color}1A`, color: r.color }}>
                <span className="mr-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: r.color }} />
                {r.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Journey Ring (self-only) + Travel Wrapped (self-only) */}
      {isSelf && !editing && (
        <div className="px-4 sm:px-6 mt-5 space-y-4">
          {!completeness.complete && (
            <JourneyRing profile={profile} onEdit={startEdit} />
          )}
          <PassportWrapped
            stamps={stamps}
            earnedBadgeCount={earnedCount}
            joinedDate={profile.joinedDate}
          />
        </div>
      )}

      <div className="px-4 sm:px-6 mt-6 space-y-6">
        {/* About */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-gradient-brand mb-2">About</h2>
          {editing ? (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Short bio</Label>
                <Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="One-liner about you" />
              </div>
              <div>
                <Label className="text-xs">Full bio</Label>
                <textarea value={bioLong} onChange={(e) => setBioLong(e.target.value)} rows={4} placeholder="Tell the community about yourself..." className="w-full rounded-md border border-input [background-color:#fff] px-3 py-2 text-sm focus:outline-none focus:border-primary/40 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Location</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State" />
                </div>
                <div>
                  <Label className="text-xs">Languages</Label>
                  <select multiple value={languages} onChange={(e) => setLanguages(Array.from(e.target.selectedOptions, (o) => o.value))} className="w-full h-20 rounded-md border border-input bg-background px-2 py-1 text-xs">
                    {LANGUAGE_OPTIONS.map((l) => (<option key={l} value={l}>{l}</option>))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {profile.bio && <p className="text-sm text-foreground/80">{profile.bio}</p>}
              {profile.bioLong && <p className="text-sm text-foreground/70 whitespace-pre-wrap">{profile.bioLong}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {profile.location && (<span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.location}</span>)}
                {joinedLabel && (<span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />Joined {joinedLabel}</span>)}
                {emailVisible && (<span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{profile.email}</span>)}
              </div>
              {(profile.languages ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {profile.languages!.map((l) => (<span key={l} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground/70">{l}</span>))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Social links */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-gradient-brand mb-2">Social</h2>
          {editing ? (
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Instagram</Label><Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@handle" /></div>
              <div><Label className="text-xs">TikTok</Label><Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@handle" /></div>
              <div><Label className="text-xs">Twitter/X</Label><Input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="@handle" /></div>
              <div><Label className="text-xs">LinkedIn</Label><Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="username" /></div>
              <div className="col-span-2"><Label className="text-xs">Website</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." /></div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {socialLinks.filter((s) => s.value).map((s) => (
                <a key={s.key} href={s.prefix ? `${s.prefix}${s.value}` : s.value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-rosa/30 px-3 py-1 text-xs font-medium text-foreground/80 hover:bg-primary/10 hover:text-primary transition-colors">
                  <s.icon className="h-3.5 w-3.5" />
                  {s.key === "website" ? "Website" : `@${s.value}`}
                </a>
              ))}
              {socialLinks.every((s) => !s.value) && !editing && (
                <p className="text-xs text-muted-foreground italic">No social links added yet.</p>
              )}
            </div>
          )}
        </section>

        <Separator />

        {/* Interests */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-gradient-brand mb-2">Interests</h2>
          <InterestPicker selected={editing ? interests : (profile.interests ?? [])} onChange={setInterests} readOnly={!editing} />
          {!editing && (profile.interests ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground italic">No interests added yet.</p>
          )}
        </section>

        <Separator />

        {/* Top Friends */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-gradient-brand mb-2">
            {isSelf ? "Top Friends" : "Friends"}
          </h2>
          <TopFriendsEditor topFriendIds={editing ? topFriendIds : (profile.topFriendIds ?? [])} onChange={setTopFriendIds} readOnly={!editing} />
          {!editing && (profile.topFriendIds ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground italic">{isSelf ? "Add your top friends!" : "No top friends set."}</p>
          )}
        </section>

        <Separator />

        {/* Photo Gallery */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-gradient-brand mb-2">Photos</h2>
          <PhotoGallery photos={editing ? galleryPhotos : (profile.galleryPhotos ?? [])} onChange={setGalleryPhotos} editable={editing} />
          {!editing && (profile.galleryPhotos ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground italic">No photos yet.</p>
          )}
        </section>

        {/* Travel Passport + Milestones (display view; self + others) */}
        {!editing && (
          <>
            <Separator />
            <PassportSection uid={profile.id} isSelf={isSelf} name={displayName} />
            <Separator />
            <BadgeShelf items={badgeItems} isSelf={isSelf} name={displayName} />
          </>
        )}

        {/* Location Settings (edit only) */}
        {editing && (
          <>
            <Separator />
            <section>
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-gradient-brand mb-2">Location Settings</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium">My locations</Label>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Add cities or zip codes you want to follow. Events and local chat within your radius of any of these locations will be shown.
                  </p>
                  <div className="space-y-1.5 mb-2">
                    {manualLocations.map((ml, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-md border border-rosa/20 px-2 py-1.5 text-xs">
                        <MapPin className="h-3 w-3 text-primary shrink-0" />
                        <span className="flex-1 truncate">{ml.label}</span>
                        <span className="text-[9px] text-muted-foreground tabular-nums">
                          {ml.lat.toFixed(2)}, {ml.lng.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setManualLocations(manualLocations.filter((_, j) => j !== i))}
                          className="text-destructive hover:underline text-[10px]"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newLocationQuery}
                      onChange={(e) => setNewLocationQuery(e.target.value)}
                      placeholder="City, state or zip code"
                      className="text-xs h-8 flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void (async () => {
                            setGeocoding(true);
                            const result = await geocodeLocation(newLocationQuery);
                            setGeocoding(false);
                            if (result) {
                              setManualLocations([...manualLocations, result]);
                              setNewLocationQuery("");
                            } else {
                              toast.error("Couldn't find that location. Try a different city or zip.");
                            }
                          })();
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={!newLocationQuery.trim() || geocoding}
                      onClick={async () => {
                        setGeocoding(true);
                        const result = await geocodeLocation(newLocationQuery);
                        setGeocoding(false);
                        if (result) {
                          setManualLocations([...manualLocations, result]);
                          setNewLocationQuery("");
                        } else {
                          toast.error("Couldn't find that location.");
                        }
                      }}
                      className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-magenta disabled:opacity-40"
                    >
                      {geocoding ? "..." : "Add"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium">Local chat radius</Label>
                    <p className="text-[10px] text-muted-foreground mb-1">
                      See #local messages from people within this distance.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={10}
                        max={200}
                        step={10}
                        value={localRadiusMiles}
                        onChange={(e) => setLocalRadiusMiles(Number(e.target.value))}
                        className="flex-1 accent-primary"
                      />
                      <span className="text-xs font-medium w-14 text-right tabular-nums">
                        {localRadiusMiles} mi
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Event radius</Label>
                    <p className="text-[10px] text-muted-foreground mb-1">
                      Only show events within this distance. 0 = show all.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={500}
                        step={25}
                        value={eventRadiusMiles}
                        onChange={(e) => setEventRadiusMiles(Number(e.target.value))}
                        className="flex-1 accent-primary"
                      />
                      <span className="text-xs font-medium w-14 text-right tabular-nums">
                        {eventRadiusMiles === 0 ? "All" : `${eventRadiusMiles} mi`}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium">Local chat visibility</Label>
                  <p className="text-[10px] text-muted-foreground mb-1">
                    Who can see your messages in #local?
                  </p>
                  <div className="flex gap-2">
                    {(["everyone", "radius"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setLocalChatVisibility(opt)}
                        className={cn(
                          "flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                          localChatVisibility === opt
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        {opt === "everyone" ? "Everyone" : "Only nearby"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Save / Cancel */}
        {editing && (
          <div className="flex gap-3 pt-4 border-t border-rosa/20">
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white border-0 shadow-[0_4px_14px_rgb(255_0_153/0.3)] hover:brightness-110">
              {saving ? <><Save className="h-3.5 w-3.5 mr-1 animate-spin" /> Saving...</> : <><Save className="h-3.5 w-3.5 mr-1" /> Save Profile</>}
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              <X className="h-3.5 w-3.5 mr-1" /> Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
