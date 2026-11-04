
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Button from "../../../../components/ui/Button.jsx";
import Input from "../../../../components/ui/Input.jsx";
import Modal from "../../../../components/ui/Modal.jsx";

import accountApi from "../../account.api.js";
import deleteAccountSchema from "../../deleteAccount.validation.schema.js";

import "./DeleteAccountDialog.css";

const FORM_ID = "delete-account-form";

// Confirmation popup for deleting the account: lists what will be lost, asks for the password again
// (re-authentication) and for a tick in the "I understand" box. `onDeleted` runs once the server has
// deleted everything. It cannot be closed by Escape / x while the deletion is running.
export default function DeleteAccountDialog({ onClose, onDeleted }) {
  const formRef = useRef(null);
  const [serverError, setServerError] = useState("");

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { password: "", understood: false },
  });

  const understood = useWatch({ control, name: "understood" });

  // Put the cursor in the password field as soon as the popup opens
  useEffect(() => {
    formRef.current?.elements.namedItem("password")?.focus();
  }, []);

  // Closing is not allowed in the middle of the deletion
  function handleClose() {
    if (!isSubmitting) {
      onClose();
    }
  }

  // Sends the password to the server; a wrong password is shown under the field
  async function onSubmit(data) {
    setServerError("");

    try {
      await accountApi.deleteAccount({ password: data.password });
    } catch (err) {
      if (err.data?.errorCode === "INVALID_PASSWORD") {
        setError("password", { message: err.message });
      } else {
        setServerError(
          err.message || "Unable to delete your account. Please try again."
        );
      }

      return;
    }

    onDeleted();
  }

  return (
    <Modal
      isOpen
      onClose={handleClose}
      title="Delete your account?"
      closeOnOverlayClick={false}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <Button
            variant="danger"
            type="submit"
            form={FORM_ID}
            disabled={!understood || isSubmitting}
          >
            {isSubmitting ? "Deleting..." : "Delete my account"}
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        ref={formRef}
        className="delete-account"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <p className="delete-account__warning">
          This permanently deletes your TradeOS account. It cannot be undone.
        </p>

        <ul className="delete-account__list">
          <li>Your profile and profile photo</li>
          <li>Your virtual wallet and balance</li>
          <li>Your holdings, orders and transactions</li>
          <li>Your watchlist</li>
          <li>Your login on every device</li>
        </ul>

        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Input
              label="Enter your password to confirm"
              name={field.name}
              type="password"
              autoComplete="current-password"
              value={field.value}
              onChange={field.onChange}
              error={errors.password?.message}
              disabled={isSubmitting}
              required
            />
          )}
        />

        <Controller
          name="understood"
          control={control}
          render={({ field }) => (
            <label className="delete-account__confirm">
              <input
                type="checkbox"
                name={field.name}
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
                disabled={isSubmitting}
              />
              <span>
                I understand that my account and all its data will be deleted
                permanently.
              </span>
            </label>
          )}
        />

        {serverError && (
          <p className="delete-account__error" role="alert">
            {serverError}
          </p>
        )}
      </form>
    </Modal>
  );
}
