"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { User } from "@/types";
import { Card, CardHeader, CardTitle, Badge } from "@/components/ui/CardsAndFeedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatRole } from "@/lib/utils";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { success, error: toastError } = useToast();

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false);

  // Password fields
  const [oldPassword, setOldPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdatingProfile(true);
      await apiClient<User>("/auth/me/", {
        method: "PATCH",
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone,
        }),
      });
      await refreshUser();
      success("Profile updated", "Your personal details have been saved.");
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError("Update failed", apiErr?.detail || "Could not update profile.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      return;
    }

    try {
      setIsChangingPassword(true);
      await apiClient<{ detail: string }>("/auth/change-password/", {
        method: "POST",
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      success("Password changed", "Your password has been successfully updated.");
    } catch (err: unknown) {
      const apiErr = err as { detail?: string; fields?: { old_password?: string[]; new_password?: string[] } };
      const msg = apiErr?.fields?.old_password?.[0] || apiErr?.fields?.new_password?.[0] || apiErr?.detail || "Could not change password.";
      setPasswordError(msg);
      toastError("Password change failed", msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Profile & Settings</h2>
        <p className="text-xs text-slate-500">Manage your personal information and account credentials.</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <Badge variant="info">{formatRole(user.role)}</Badge>
        </CardHeader>

        <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              value={user.email}
              disabled
              title="Email cannot be changed directly"
            />
            <Input
              label="Phone Number"
              type="tel"
              placeholder="+91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {user.student_profile && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-700">Student Profile: </span>
              <span className="text-slate-600">
                Roll No: {user.student_profile.roll_no} · Admission Year: {user.student_profile.admission_year}
              </span>
            </div>
          )}

          {user.faculty_profile && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-700">Faculty Profile: </span>
              <span className="text-slate-600">
                Employee ID: {user.faculty_profile.employee_id} · Designation: {user.faculty_profile.designation}
              </span>
            </div>
          )}

          <div className="pt-2">
            <Button type="submit" isLoading={isUpdatingProfile}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md text-xs">
          <Input
            label="Current Password"
            type="password"
            placeholder="••••••••"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
          />

          <Input
            label="New Password"
            type="password"
            placeholder="Minimum 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {passwordError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {passwordError}
            </div>
          )}

          <Button type="submit" variant="secondary" isLoading={isChangingPassword}>
            Update Password
          </Button>
        </form>
      </Card>
    </div>
  );
}
