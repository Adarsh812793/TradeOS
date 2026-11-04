
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Button from "../../../../components/ui/Button.jsx";
import Input from "../../../../components/ui/Input.jsx";

import accountApi from "../../account.api.js";
import useNotifications from "../../../notifications/useNotifications.js";
import changePasswordSchema from "../../changePassword.validation.schema.js";

import "./ChangePasswordForm.css";

// Form shown after "Change password": current password, new password, confirm. Escape cancels.
// `onChanged` receives the server's answer ({ signedOutOtherDevices }) after a successful change.
export default function ChangePasswordForm({ onCancel, onChanged }) {
  const { refresh: refreshNotifications } = useNotifications(); // a password change creates a notification: update the bell now
  const formRef = useRef(null);
  const [serverError, setServerError] = useState("");

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  // Put the cursor in the first field as soon as the form appears
  useEffect(() => {
    formRef.current?.elements.namedItem("currentPassword")?.focus();
  }, []);

  // Sends the change to the server; problems with a specific field are shown under that field
  async function onSubmit(data) {
    setServerError("");

    try {
      const response = await accountApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      refreshNotifications();
      onChanged(response.data);
    } catch (err) {
      const code = err.data?.errorCode;

      if (code === "INVALID_CURRENT_PASSWORD") {
        setError("currentPassword", { message: err.message });
      } else if (code === "PASSWORD_UNCHANGED") {
        setError("newPassword", { message: err.message });
      } else {
        setServerError(
          err.message || "Unable to change your password. Please try again."
        );
      }
    }
  }

  // Escape closes the form (unless a save is in progress)
  function handleKeyDown(event) {
    if (event.key === "Escape" && !isSubmitting) {
      onCancel();
    }
  }

  return (
    <form
      ref={formRef}
      className="change-password"
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={handleKeyDown}
      noValidate
    >
      <Controller
        name="currentPassword"
        control={control}
        render={({ field }) => (
          <Input
            label="Current password"
            name={field.name}
            type="password"
            autoComplete="current-password"
            value={field.value}
            onChange={field.onChange}
            error={errors.currentPassword?.message}
            disabled={isSubmitting}
            required
          />
        )}
      />

      <Controller
        name="newPassword"
        control={control}
        render={({ field }) => (
          <Input
            label="New password"
            name={field.name}
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={field.value}
            onChange={field.onChange}
            error={errors.newPassword?.message}
            disabled={isSubmitting}
            required
          />
        )}
      />

      <Controller
        name="confirmPassword"
        control={control}
        render={({ field }) => (
          <Input
            label="Confirm new password"
            name={field.name}
            type="password"
            autoComplete="new-password"
            value={field.value}
            onChange={field.onChange}
            error={errors.confirmPassword?.message}
            disabled={isSubmitting}
            required
          />
        )}
      />

      <p className="change-password__hint">
        You will stay logged in on this device. Every other device will be signed out.
      </p>

      {serverError && (
        <p className="change-password__error" role="alert">
          {serverError}
        </p>
      )}

      <div className="change-password__actions">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Changing..." : "Change password"}
        </Button>

        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
