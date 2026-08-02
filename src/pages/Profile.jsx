import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VIBE_BADGE_CATEGORIES, FETISH_OPTIONS } from "@/lib/demoData";
import { Camera, Save, LogOut, Droplets, Shield, Plus, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";

const SCENT_CATEGORIES = ["Fresh", "Musky", "Ripe", "Earthy", "Neutral"];
const SHOWER_OPTIONS = ["Daily", "Every other day", "Twice a week", "Weekly", "When inspired", "Classified"];
const LOOKING_FOR_OPTIONS = ["Casual chat", "Meetup", "Just browsing", "Friends", "Whatever happens"];
const GENDER_OPTIONS = ["Man", "Woman", "Non-binary", "Genderfluid", "Agender", "Prefer not to say"];
const SEXUALITY_OPTIONS = ["Straight", "Gay", "Lesbian", "Bisexual", "Pansexual", "Asexual", "Queer", "Prefer not to say"];
const MAX_VIBE_BADGES = 5;
const MAX_FETISHES = 6;

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { data: profiles = [] } = useQuery({
    queryKey: ["my-profile", user?.email],
    queryFn: () => base44.entities.ScentProfile.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  const myProfile = profiles[0];

  const [form, setForm] = useState({
    display_name: "",
    age: "",
    bio: "",
    scent_category: "Neutral",
    scent_intensity: 3,
    vibe_badges: [],
    fetishes: [],
    shower_frequency: "Classified",
    scent_preferences: [],
    fuzzy_location: false,
    looking_for: "",
    gender: "",
    sexuality: "",
  });

  useEffect(() => {
    if (myProfile) {
      setForm({
        display_name: myProfile.display_name || "",
        age: myProfile.age?.toString() || "",
        bio: myProfile.bio || "",
        scent_category: myProfile.scent_category || "Neutral",
        scent_intensity: myProfile.scent_intensity || 3,
        vibe_badges: myProfile.vibe_badges || [],
        fetishes: myProfile.fetishes || [],
        shower_frequency: myProfile.shower_frequency || "Classified",
        scent_preferences: myProfile.scent_preferences || [],
        fuzzy_location: myProfile.fuzzy_location || false,
        looking_for: myProfile.looking_for || "",
        gender: myProfile.gender || "",
        sexuality: myProfile.sexuality || "",
      });
    }
  }, [myProfile]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (myProfile) {
        return base44.entities.ScentProfile.update(myProfile.id, data);
      } else {
        return base44.entities.ScentProfile.create({ ...data, user_email: user.email, onboarding_complete: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast({ title: "Profile saved!", description: "Your scent profile has been updated." });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      display_name: form.display_name,
      age: parseInt(form.age) || undefined,
      bio: form.bio,
      scent_category: form.scent_category,
      scent_intensity: form.scent_intensity,
      vibe_badges: form.vibe_badges,
      fetishes: form.fetishes,
      shower_frequency: form.shower_frequency,
      scent_preferences: form.scent_preferences,
      fuzzy_location: form.fuzzy_location,
      looking_for: form.looking_for || undefined,
      gender: form.gender || undefined,
      sexuality: form.sexuality || undefined,
    });
  };

  const compressImage = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error("Could not load image"));
        img.onload = () => {
          const maxSize = 512;
          let { width, height } = img;
          if (width > height) {
            if (width > maxSize) { height = Math.round((height * maxSize) / width); width = maxSize; }
          } else {
            if (height > maxSize) { width = Math.round((width * maxSize) / height); height = maxSize; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("Canvas not supported")); return; }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) { reject(new Error("Compression failed")); return; }
              resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
            },
            "image/jpeg",
            0.85
          );
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      let fileToUpload;
      try {
        fileToUpload = await compressImage(file);
      } catch {
        // Fallback: upload the original file if compression fails
        fileToUpload = file;
      }
      const { file_url } = await base44.integrations.Core.UploadFile({ file: fileToUpload });
      if (myProfile) {
        await base44.entities.ScentProfile.update(myProfile.id, { avatar_url: file_url });
        queryClient.invalidateQueries({ queryKey: ["my-profile"] });
        toast({ title: "Photo updated!" });
      }
    } catch (err) {
      toast({ title: "Upload failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    if (!myProfile?.avatar_url) return;
    await base44.entities.ScentProfile.update(myProfile.id, { avatar_url: "" });
    queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    toast({ title: "Photo removed" });
  };

  const handleGalleryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Use higher res for gallery (1024px)
    const compressed = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const maxSize = 1024;
          let { width, height } = img;
          if (width > height) {
            if (width > maxSize) { height = Math.round((height * maxSize) / width); width = maxSize; }
          } else {
            if (height > maxSize) { width = Math.round((width * maxSize) / height); height = maxSize; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(new File([blob], "gallery.jpg", { type: "image/jpeg" })), "image/jpeg", 0.88);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
    if (myProfile) {
      const gallery = [...(myProfile.photo_gallery || []), file_url];
      await base44.entities.ScentProfile.update(myProfile.id, { photo_gallery: gallery });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast({ title: "Photo added to gallery!" });
    }
  };

  const handleDeleteGalleryPhoto = async (url) => {
    if (!myProfile) return;
    const gallery = (myProfile.photo_gallery || []).filter(u => u !== url);
    await base44.entities.ScentProfile.update(myProfile.id, { photo_gallery: gallery });
    queryClient.invalidateQueries({ queryKey: ["my-profile"] });
  };

  const toggleArray = (key, value) => {
    setForm((p) => ({
      ...p,
      [key]: p[key].includes(value) ? p[key].filter((v) => v !== value) : [...p[key], value],
    }));
  };

  const toggleBadge = (badge) => {
    setForm((p) => {
      if (p.vibe_badges.includes(badge)) {
        return { ...p, vibe_badges: p.vibe_badges.filter((v) => v !== badge) };
      }
      if (p.vibe_badges.length >= MAX_VIBE_BADGES) return p;
      return { ...p, vibe_badges: [...p.vibe_badges, badge] };
    });
  };

  const toggleFetish = (fetish) => {
    setForm((p) => {
      if (p.fetishes.includes(fetish)) {
        return { ...p, fetishes: p.fetishes.filter((v) => v !== fetish) };
      }
      if (p.fetishes.length >= MAX_FETISHES) return p;
      return { ...p, fetishes: [...p.fetishes, fetish] };
    });
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Your Profile</h1>
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground font-body" onClick={() => base44.auth.logout("/")}>
          <LogOut className="w-4 h-4" />
          Log out
        </Button>
      </div>

      {/* Avatar */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-muted overflow-hidden flex items-center justify-center text-4xl">
            {uploadingPhoto ? (
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            ) : myProfile?.avatar_url ? (
              <img src={myProfile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              "🤙"
            )}
          </div>
          <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
            <Camera className="w-4 h-4 text-primary-foreground" />
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
          </label>
          {myProfile?.avatar_url && !uploadingPhoto && (
            <button
              onClick={handleRemovePhoto}
              className="absolute top-0 right-0 w-7 h-7 rounded-full bg-destructive flex items-center justify-center hover:bg-destructive/90 transition-colors"
              title="Remove photo"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="font-body text-sm">Display Name</Label>
            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className="font-body bg-muted border-0" />
          </div>
          <div className="space-y-2">
            <Label className="font-body text-sm">Age</Label>
            <Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="font-body bg-muted border-0" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-body text-sm">Bio</Label>
          <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="font-body bg-muted border-0 min-h-[80px]" />
        </div>

        <div className="space-y-2">
          <Label className="font-body text-sm">Looking For</Label>
          <Select value={form.looking_for} onValueChange={(val) => setForm({ ...form, looking_for: val })}>
            <SelectTrigger className="font-body bg-muted border-0"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {LOOKING_FOR_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="font-body text-sm">Gender</Label>
            <Select value={form.gender} onValueChange={(val) => setForm({ ...form, gender: val })}>
              <SelectTrigger className="font-body bg-muted border-0"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-body text-sm">Sexuality</Label>
            <Select value={form.sexuality} onValueChange={(val) => setForm({ ...form, sexuality: val })}>
              <SelectTrigger className="font-body bg-muted border-0"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {SEXUALITY_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="font-body text-sm">Scent Category</Label>
            <Select value={form.scent_category} onValueChange={(val) => setForm({ ...form, scent_category: val })}>
              <SelectTrigger className="font-body bg-muted border-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCENT_CATEGORIES.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-body text-sm">Shower Frequency</Label>
            <Select value={form.shower_frequency} onValueChange={(val) => setForm({ ...form, shower_frequency: val })}>
              <SelectTrigger className="font-body bg-muted border-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SHOWER_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-body text-sm">Scent Intensity: {form.scent_intensity}/5</Label>
          <div className="flex items-center gap-2">
            <input type="range" min={1} max={5} value={form.scent_intensity} onChange={(e) => setForm({ ...form, scent_intensity: parseInt(e.target.value) })} className="flex-1 accent-primary" />
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Droplets key={i} className={`w-3.5 h-3.5 ${i < form.scent_intensity ? "text-primary" : "text-muted-foreground/20"}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-body text-sm">Scent Preferences</Label>
          <div className="flex flex-wrap gap-2">
            {SCENT_CATEGORIES.map((cat) => (
              <Badge key={cat} variant={form.scent_preferences.includes(cat) ? "default" : "outline"} className="cursor-pointer font-body text-xs" onClick={() => toggleArray("scent_preferences", cat)}>
                {cat}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-body text-sm">Vibe Badges</Label>
            <span className="font-body text-xs text-muted-foreground">{form.vibe_badges.length} / {MAX_VIBE_BADGES} pinned</span>
          </div>
          {form.vibe_badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.vibe_badges.map((b) => (
                <Badge key={b} className="cursor-pointer font-body text-[10px] bg-secondary text-secondary-foreground gap-1" onClick={() => toggleBadge(b)}>
                  {b} <span className="opacity-60">✕</span>
                </Badge>
              ))}
            </div>
          )}
          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {VIBE_BADGE_CATEGORIES.map((cat) => (
              <div key={cat.name}>
                <p className="font-heading text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <span>{cat.emoji}</span> {cat.name}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {cat.badges.map((vibe) => {
                    const selected = form.vibe_badges.includes(vibe);
                    const atCap = !selected && form.vibe_badges.length >= MAX_VIBE_BADGES;
                    return (
                      <Badge
                        key={vibe}
                        variant={selected ? "default" : "outline"}
                        className={`cursor-pointer font-body text-[10px] transition-all ${selected ? "bg-secondary text-secondary-foreground" : atCap ? "opacity-40 cursor-not-allowed" : ""}`}
                        onClick={() => toggleBadge(vibe)}
                      >
                        {vibe}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-body text-sm">Fetishes & Kinks</Label>
            <span className="font-body text-xs text-muted-foreground">{form.fetishes.length} / {MAX_FETISHES}</span>
          </div>
          {form.fetishes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.fetishes.map((f) => (
                <Badge key={f} className="cursor-pointer font-body text-[10px] bg-secondary text-secondary-foreground gap-1" onClick={() => toggleFetish(f)}>
                  {f} <span className="opacity-60">✕</span>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
            {FETISH_OPTIONS.map((fetish) => {
              const selected = form.fetishes.includes(fetish);
              const atCap = !selected && form.fetishes.length >= MAX_FETISHES;
              return (
                <Badge
                  key={fetish}
                  variant={selected ? "default" : "outline"}
                  className={`cursor-pointer font-body text-[10px] transition-all ${selected ? "bg-secondary text-secondary-foreground" : atCap ? "opacity-40 cursor-not-allowed" : ""}`}
                  onClick={() => toggleFetish(fetish)}
                >
                  {fetish}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Proximity Privacy */}
        <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="font-body text-sm font-semibold">Approximate Location</p>
              <p className="font-body text-xs text-muted-foreground">Show your location within ~½ mile for extra privacy</p>
            </div>
          </div>
          <button
            onClick={() => setForm((f) => ({ ...f, fuzzy_location: !f.fuzzy_location }))}
            className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${form.fuzzy_location ? "bg-primary" : "bg-muted-foreground/30"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${form.fuzzy_location ? "left-5.5 left-[22px]" : "left-0.5"}`} />
          </button>
        </div>

        {/* Photo Gallery */}
        <div className="space-y-2">
          <Label className="font-body text-sm">Photo Gallery</Label>
          <div className="flex flex-wrap gap-2">
            {(myProfile?.photo_gallery || []).map((url, idx) => (
              <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden group">
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setLightboxIndex(idx)}
                />
                <button
                  onClick={() => handleDeleteGalleryPhoto(url)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                >
                  <Trash2 className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {(myProfile?.photo_gallery || []).length < 6 && (
              <label className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                <Plus className="w-5 h-5 text-muted-foreground" />
                <input type="file" accept="image/*" onChange={handleGalleryUpload} className="hidden" />
              </label>
            )}
          </div>
          <p className="font-body text-xs text-muted-foreground">Add up to 6 photos · tap to view</p>
        </div>

        {/* Lightbox */}
        {lightboxIndex !== null && (() => {
          const gallery = myProfile?.photo_gallery || [];
          const canPrev = lightboxIndex > 0;
          const canNext = lightboxIndex < gallery.length - 1;
          return (
            <div
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
              onClick={() => setLightboxIndex(null)}
            >
              <button
                onClick={() => setLightboxIndex(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              {canPrev && (
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
                  className="absolute left-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
              )}
              <img
                src={gallery[lightboxIndex]}
                alt=""
                className="max-w-[90vw] max-h-[85vh] rounded-xl object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              {canNext && (
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
                  className="absolute right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              )}
              <div className="absolute bottom-4 flex gap-1.5">
                {gallery.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                    className={`w-2 h-2 rounded-full transition-colors ${i === lightboxIndex ? "bg-white" : "bg-white/30"}`}
                  />
                ))}
              </div>
            </div>
          );
        })()}

        <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full gap-2 font-body font-semibold">
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  );
}