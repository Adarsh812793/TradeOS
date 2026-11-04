
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Button from "../../../../components/ui/Button.jsx";
import Input from "../../../../components/ui/Input.jsx";

import accountApi from "../../account.api.js";
import profileSchema from "../../profile.validation.schema.js";

import "./ProfileEditForm.css";

// Form shown after "Edit Profile": change the name and save, or cancel (the Escape key also cancels).
// `onSaved` receives the updated user returned by the server.
export default function ProfileEditForm({ user, onCancel, onSaved }) {
  const formRef = useRef(null);
  const [serverError, setServerError] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name },
  });

  // Put the cursor in the name field as soon as the form appears
  useEffect(() => {
    formRef.current?.elements.namedItem("name")?.focus();
  }, []);

  // Sends the new name to the server and hands the updated profile to the parent
  async function onSubmit(data) {
    setServerError("");

    try {
      const response = await accountApi.updateProfile({ name: data.name });
      onSaved(response.data);
    } catch (err) {
      setServerError(
        err.message || "Unable to update your profile. Please try again."
      );
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
      className="profile-edit"
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={handleKeyDown}
      noValidate
    >
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <Input
            label="Full Name"
            name={field.name}
            placeholder="Enter your full name"
            value={field.value}
            onChange={field.onChange}
            error={errors.name?.message}
            disabled={isSubmitting}
            required
          />
        )}
      />

      <div>
        <Input
          label="Email Address"
          name="email"
          type="email"
          value={user.email}
          disabled
        />

        <p className="profile-edit__hint">
          Your email can't be changed yet.
        </p>
      </div>

      {serverError && (
        <p className="profile-edit__error" role="alert">
          {serverError}
        </p>
      )}

      <div className="profile-edit__actions">
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? "Saving..." : "Save changes"}
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
