import { useState } from "react";
import { Save, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Profile() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    nickname: "",
    bio: "",
    age: "",
    role: "student",
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="container max-w-lg px-4 pb-12 pt-6">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
            <span className="font-serif text-2xl font-bold text-primary">
              {form.nickname?.[0]?.toUpperCase() ||
                form.firstName?.[0]?.toUpperCase() ||
                "U"}
            </span>
          </div>
          <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground">
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Tap to change avatar</p>
      </div>

      {/* Form */}
      <div className="mt-8 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="firstName"
              className="text-xs text-muted-foreground"
            >
              First name
            </Label>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              placeholder="John"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="text-xs text-muted-foreground">
              Last name
            </Label>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              placeholder="Doe"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nickname" className="text-xs text-muted-foreground">
            Nickname
          </Label>
          <Input
            id="nickname"
            value={form.nickname}
            onChange={(e) => update("nickname", e.target.value)}
            placeholder="johndoe"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio" className="text-xs text-muted-foreground">
            Bio
          </Label>
          <Textarea
            id="bio"
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
            placeholder="Tell us a bit about yourself..."
            rows={3}
            className="resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="age" className="text-xs text-muted-foreground">
              Age
            </Label>
            <Input
              id="age"
              type="number"
              min={13}
              max={120}
              value={form.age}
              onChange={(e) => update("age", e.target.value)}
              placeholder="18"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <Select value={form.role} onValueChange={(v) => update("role", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button className="w-full gap-2">
          <Save className="h-4 w-4" /> Save changes
        </Button>
      </div>
    </div>
  );
}
