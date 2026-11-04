
import { CalendarDays, Mail, Pencil, UserRound } from "lucide-react";

import Button from "../../../../components/ui/Button.jsx";
import AvatarUploader from "./AvatarUploader.jsx";

import "./ProfileOverview.css";

// Read-only summary of the profile (photo, name, email, member since) with an Edit Profile button.
// The photo can be changed or removed right here through AvatarUploader.
export default function ProfileOverview({
  user,
  onEdit,
  editButtonRef,
  onUserUpdated,
  onStatus,
}) {
  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Not available";

  return (
    <div className="profile-overview">
      <div className="profile-overview__top">
        <div className="profile-overview__identity">
          <AvatarUploader
            user={user}
            onUserUpdated={onUserUpdated}
            onStatus={onStatus}
          />

          <div className="profile-overview__text">
            <h3 className="profile-overview__name">{user.name || "User"}</h3>
            <p className="profile-overview__email">{user.email}</p>
          </div>
        </div>

        <Button variant="secondary" onClick={onEdit} ref={editButtonRef}>
          <Pencil size={16} aria-hidden="true" />
          Edit Profile
        </Button>
      </div>

      <dl className="profile-overview__fields">
        <div className="profile-overview__field">
          <dt>
            <UserRound size={16} aria-hidden="true" />
            Full Name
          </dt>
          <dd>{user.name || "Not available"}</dd>
        </div>

        <div className="profile-overview__field">
          <dt>
            <Mail size={16} aria-hidden="true" />
            Email Address
          </dt>
          <dd>{user.email || "Not available"}</dd>
        </div>

        <div className="profile-overview__field">
          <dt>
            <CalendarDays size={16} aria-hidden="true" />
            Member Since
          </dt>
          <dd>{joinedDate}</dd>
        </div>
      </dl>
    </div>
  );
}
