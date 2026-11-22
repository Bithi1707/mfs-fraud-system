import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Lock,
  KeyRound,
  ShieldCheck,
  LogOut,
  LoaderCircle,
  CheckCircle2
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import {
  PHONE_REGEX,
  PIN_LENGTH,
  PIN_REGEX,
  changePassword,
  changePin,
  claimPhoneNumber,
  getErrorMessage,
  resetPinWithPassword,
  savePin,
  updateName,
  saveCurrentAddress,
  savePermanentAddress
} from "../services/profileService";

import "./Profile.css";

const digitsOnly = (value, max) => value.replace(/\D/g, "").slice(0, max);

function Notice({ status }) {
  if (!status) return null;

  return (
    <p
      className={`pf-notice ${status.type}`}
      role={status.type === "error" ? "alert" : "status"}
    >
      {status.text}
    </p>
  );
}

function SubmitButton({ busy, disabled, children, ...props }) {
  return (
    <button className="pf-primary" disabled={busy || disabled} {...props}>
      {busy ? (
        <>
          <LoaderCircle size={17} className="pf-spin" /> Saving...
        </>
      ) : (
        children
      )}
    </button>
  );
}

/* ---------------------------------------------------------- */
/* Name                                                       */
/* ---------------------------------------------------------- */

function NameSection({ user, profile }) {
  const current = profile?.name || user.displayName || "";
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const changed = name.trim().replace(/\s+/g, " ") !== current;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    try {
      setBusy(true);
      await updateName(name);
      setStatus({ type: "success", text: "Name updated." });
    } catch (err) {
      setStatus({ type: "error", text: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="pf-card" onSubmit={handleSubmit}>
      <h3>Personal information</h3>

      <label htmlFor="pf-name">Full name</label>
      <div className="pf-input">
        <User size={18} />
        <input
          id="pf-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          required
        />
      </div>

      <label htmlFor="pf-email">Email address</label>
      <div className="pf-input readonly">
        <Mail size={18} />
        <input id="pf-email" value={user.email || ""} readOnly />
        <Lock size={15} />
      </div>

      <Notice status={status} />

      <SubmitButton busy={busy} type="submit" disabled={!changed}>
        Save name
      </SubmitButton>
    </form>
  );
}

/* ---------------------------------------------------------- */
/* Mobile number (set once, then locked)                      */
/* ---------------------------------------------------------- */

function PhoneSection({ profile }) {
  const savedPhone = profile?.phone || "";

  const [phone, setPhone] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const handleContinue = (e) => {
    e.preventDefault();
    setStatus(null);

    if (!PHONE_REGEX.test(phone)) {
      setStatus({
        type: "error",
        text: "Enter a valid Bangladesh mobile number (01XXXXXXXXX)."
      });
      return;
    }

    setConfirming(true);
  };

  const handleSave = async () => {
    setStatus(null);

    try {
      setBusy(true);
      await claimPhoneNumber(phone);
      setConfirming(false);
      setStatus({
        type: "success",
        text: "Mobile number saved. It is now locked to your account."
      });
    } catch (err) {
      setConfirming(false);
      setStatus({ type: "error", text: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  if (savedPhone) {
    return (
      <section className="pf-card">
        <h3>Mobile number</h3>

        <div className="pf-input readonly">
          <Phone size={18} />
          <input value={savedPhone} readOnly aria-label="Mobile number" />
          <Lock size={15} />
        </div>

        <p className="pf-help">
          This is the number people use to send you money. It cannot be changed.
        </p>

        <Notice status={status} />
      </section>
    );
  }

  return (
    <form className="pf-card" onSubmit={handleContinue}>
      <h3>Mobile number</h3>
      <p className="pf-help">
        Add the number people will use to send you money. You can only set it once.
      </p>

      <label htmlFor="pf-phone">Mobile number</label>
      <div className="pf-input">
        <Phone size={18} />
        <input
          id="pf-phone"
          value={phone}
          onChange={(e) => {
            setPhone(digitsOnly(e.target.value, 11));
            setConfirming(false);
          }}
          placeholder="01XXXXXXXXX"
          inputMode="numeric"
          maxLength={11}
          disabled={busy}
        />
      </div>

      <Notice status={status} />

      {confirming ? (
        <div className="pf-confirm">
          <p>
            Save <strong>{phone}</strong> permanently? You will not be able to
            change it later.
          </p>

          <div className="pf-confirm-actions">
            <button
              type="button"
              className="pf-secondary"
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              Cancel
            </button>

            <button
              type="button"
              className="pf-primary"
              onClick={handleSave}
              disabled={busy}
            >
              {busy ? "Saving..." : "Yes, save number"}
            </button>
          </div>
        </div>
      ) : (
        <button className="pf-primary" type="submit">
          Save mobile number
        </button>
      )}
    </form>
  );
}

/* ---------------------------------------------------------- */
/* Transaction PIN                                            */
/* ---------------------------------------------------------- */

function PinSection({ profile }) {
  const hasPin = Boolean(profile?.hasPin);

  const [open, setOpen] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [password, setPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const closeForm = () => {
    setOpen(false);
    setForgot(false);
    setCurrentPin("");
    setPassword("");
    setNewPin("");
    setConfirmPin("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    if (!PIN_REGEX.test(newPin)) {
      setStatus({ type: "error", text: `PIN must be exactly ${PIN_LENGTH} digits.` });
      return;
    }

    if (newPin !== confirmPin) {
      setStatus({ type: "error", text: "The two PINs do not match." });
      return;
    }

    try {
      setBusy(true);

      if (hasPin && forgot) {
        await resetPinWithPassword({ password, newPin });
      } else if (hasPin) {
        await changePin({ currentPin, newPin });
      } else {
        await savePin(newPin);
      }

      closeForm();
      setStatus({
        type: "success",
        text: hasPin ? "PIN changed." : "PIN set."
      });
    } catch (err) {
      setStatus({ type: "error", text: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pf-card">
      <div className="pf-row">
        <div className="pf-row-icon">
          <KeyRound size={20} />
        </div>

        <div className="pf-row-text">
          <h3>Transaction PIN</h3>
          <p>{hasPin ? `${PIN_LENGTH}-digit PIN is set` : "Not set yet"}</p>
        </div>

        {!open && (
          <button
            type="button"
            className="pf-link"
            onClick={() => {
              setStatus(null);
              setOpen(true);
            }}
          >
            {hasPin ? "Change" : "Set PIN"}
          </button>
        )}
      </div>

      {!open && <Notice status={status} />}

      {open && (
        <form onSubmit={handleSubmit} className="pf-form">
          {hasPin && !forgot && (
            <>
              <label htmlFor="pf-current-pin">Current PIN</label>
              <input
                id="pf-current-pin"
                className="pf-plain"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={PIN_LENGTH}
                value={currentPin}
                onChange={(e) => setCurrentPin(digitsOnly(e.target.value, PIN_LENGTH))}
                placeholder="Enter current PIN"
                required
              />
            </>
          )}

          {hasPin && forgot && (
            <>
              <label htmlFor="pf-pin-password">Account password</label>
              <input
                id="pf-pin-password"
                className="pf-plain"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password"
                required
              />
            </>
          )}

          <label htmlFor="pf-new-pin">{hasPin ? "New PIN" : "Choose a PIN"}</label>
          <input
            id="pf-new-pin"
            className="pf-plain"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={PIN_LENGTH}
            value={newPin}
            onChange={(e) => setNewPin(digitsOnly(e.target.value, PIN_LENGTH))}
            placeholder={`${PIN_LENGTH} digits`}
            required
          />

          <label htmlFor="pf-confirm-pin">Confirm PIN</label>
          <input
            id="pf-confirm-pin"
            className="pf-plain"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={PIN_LENGTH}
            value={confirmPin}
            onChange={(e) => setConfirmPin(digitsOnly(e.target.value, PIN_LENGTH))}
            placeholder="Enter the PIN again"
            required
          />

          {hasPin && (
            <button
              type="button"
              className="pf-link left"
              onClick={() => {
                setForgot(!forgot);
                setStatus(null);
              }}
            >
              {forgot ? "I remember my current PIN" : "Forgot PIN? Verify with password"}
            </button>
          )}

          <Notice status={status} />

          <div className="pf-confirm-actions">
            <button type="button" className="pf-secondary" onClick={closeForm} disabled={busy}>
              Cancel
            </button>
            <SubmitButton busy={busy} type="submit">
              {hasPin ? "Change PIN" : "Set PIN"}
            </SubmitButton>
          </div>
        </form>
      )}
    </section>
  );
}



/* ---------------------------------------------------------- */
/* Address Information                                       */
/* ---------------------------------------------------------- */

function AddressSection({ profile }) {
  const [currentAddress, setCurrentAddress] = useState({
    city: profile?.currentAddress?.city ||
      profile?.currentAddress?.district || "",
    fullAddress: profile?.currentAddress?.fullAddress || ""
  });

  const emptyPermanentAddress = {
    division: "",
    district: "",
    upazila: "",
    union: "",
    village: "",
    postOffice: "",
    postalCode: "",
    houseRoad: "",
    fullAddress: ""
  };

  const [permanentAddress, setPermanentAddress] = useState({
    ...emptyPermanentAddress,
    ...profile?.permanentAddress
  });

  const [currentBusy, setCurrentBusy] = useState(false);
  const [permanentBusy, setPermanentBusy] = useState(false);

  const [currentStatus, setCurrentStatus] = useState(null);
  const [permanentStatus, setPermanentStatus] = useState(null);

  const handleCurrentSubmit = async (e) => {
    e.preventDefault();
    setCurrentStatus(null);

    try {
      setCurrentBusy(true);

      await saveCurrentAddress(currentAddress);

      setCurrentStatus({
        type: "success",
        text: "Current address saved successfully."
      });
    } catch (err) {
      setCurrentStatus({
        type: "error",
        text: getErrorMessage(err)
      });
    } finally {
      setCurrentBusy(false);
    }
  };

  const handlePermanentSubmit = async (e) => {
    e.preventDefault();
    setPermanentStatus(null);

    try {
      setPermanentBusy(true);

      await savePermanentAddress(permanentAddress);

      setPermanentStatus({
        type: "success",
        text: "Permanent address saved successfully."
      });
    } catch (err) {
      setPermanentStatus({
        type: "error",
        text: getErrorMessage(err)
      });
    } finally {
      setPermanentBusy(false);
    }
  };

  const updatePermanent = (field, value) => {
    setPermanentAddress(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const permanentFields = [
    ["division", "Division / বিভাগ"],
    ["district", "District / জেলা"],
    ["upazila", "Upazila / Thana"],
    ["union", "Union / Ward"],
    ["village", "Village / Area"],
    ["postOffice", "Post Office"],
    ["postalCode", "Postal Code / ZIP Code"],
    ["houseRoad", "House / Road Number"],
    ["fullAddress", "Complete Address"]
  ];

  return (
    <section className="pf-card">
      <h3>Address Information</h3>

      <p className="pf-help">
        Your address information is manually provided.
        No GPS or location tracking is used.
      </p>

      {/* CURRENT ADDRESS - SIMPLE */}

      <form onSubmit={handleCurrentSubmit}>
        <h3>Current Address</h3>

        <label htmlFor="pf-current-city">
          Current City / District
        </label>

        <input
          id="pf-current-city"
          className="pf-plain"
          value={currentAddress.city}
          onChange={e =>
            setCurrentAddress(prev => ({
              ...prev,
              city: e.target.value
            }))
          }
          placeholder="Enter your current city or district"
          required
        />

        <label htmlFor="pf-current-full">
          Complete Current Address
        </label>

        <textarea
          id="pf-current-full"
          className="pf-plain"
          rows={3}
          value={currentAddress.fullAddress}
          onChange={e =>
            setCurrentAddress(prev => ({
              ...prev,
              fullAddress: e.target.value
            }))
          }
          placeholder="Enter your current full address"
          required
        />

        <Notice status={currentStatus} />

        <SubmitButton
          busy={currentBusy}
          type="submit"
        >
          Save Current Address
        </SubmitButton>
      </form>

      <hr />

      {/* PERMANENT ADDRESS - UNCHANGED FIELDS */}

      <form onSubmit={handlePermanentSubmit}>
        <h3>Permanent Address</h3>

        {permanentFields.map(([field, label]) => (
          <div key={field}>
            <label htmlFor={`pf-permanent-${field}`}>
              {label}
            </label>

            {field === "fullAddress" ? (
              <textarea
                id={`pf-permanent-${field}`}
                className="pf-plain"
                rows={4}
                value={permanentAddress[field]}
                onChange={e =>
                  updatePermanent(field, e.target.value)
                }
                placeholder="Write your complete permanent address..."
                required
              />
            ) : (
              <input
                id={`pf-permanent-${field}`}
                className="pf-plain"
                value={permanentAddress[field]}
                onChange={e =>
                  updatePermanent(field, e.target.value)
                }
                placeholder={`Enter ${label}`}
                required={[
                  "division",
                  "district",
                  "upazila"
                ].includes(field)}
              />
            )}
          </div>
        ))}

        <Notice status={permanentStatus} />

        <SubmitButton
          busy={permanentBusy}
          type="submit"
        >
          Save Permanent Address
        </SubmitButton>
      </form>
    </section>
  );
}


/* ---------------------------------------------------------- */
/* Password                                                   */
/* ---------------------------------------------------------- */

function PasswordSection() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const closeForm = () => {
    setOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    if (newPassword !== confirmPassword) {
      setStatus({ type: "error", text: "The two passwords do not match." });
      return;
    }

    try {
      setBusy(true);
      await changePassword({ currentPassword, newPassword });
      closeForm();
      setStatus({ type: "success", text: "Password changed." });
    } catch (err) {
      setStatus({ type: "error", text: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pf-card">
      <div className="pf-row">
        <div className="pf-row-icon">
          <ShieldCheck size={20} />
        </div>

        <div className="pf-row-text">
          <h3>Password</h3>
          <p>Used to login to your account</p>
        </div>

        {!open && (
          <button
            type="button"
            className="pf-link"
            onClick={() => {
              setStatus(null);
              setOpen(true);
            }}
          >
            Change
          </button>
        )}
      </div>

      {!open && <Notice status={status} />}

      {open && (
        <form onSubmit={handleSubmit} className="pf-form">
          <label htmlFor="pf-current-password">Current password</label>
          <input
            id="pf-current-password"
            className="pf-plain"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <label htmlFor="pf-new-password">New password</label>
          <input
            id="pf-new-password"
            className="pf-plain"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            required
          />

          <label htmlFor="pf-confirm-password">Confirm new password</label>
          <input
            id="pf-confirm-password"
            className="pf-plain"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Notice status={status} />

          <div className="pf-confirm-actions">
            <button type="button" className="pf-secondary" onClick={closeForm} disabled={busy}>
              Cancel
            </button>
            <SubmitButton busy={busy} type="submit">
              Change password
            </SubmitButton>
          </div>
        </form>
      )}
    </section>
  );
}

/* ---------------------------------------------------------- */
/* Page                                                       */
/* ---------------------------------------------------------- */

export default function Profile() {
  const { user, profile, profileLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const notice = location.state?.notice;

  const displayName = profile?.name || user.displayName || "NextPay User";

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Unable to logout. Please try again.");
    }
  };

  return (
    <div className="pf-page">
      <header className="pf-header">
        <button
          className="pf-back"
          onClick={() => navigate("/")}
          aria-label="Back to home"
        >
          <ArrowLeft size={21} />
        </button>

        <div>
          <h2>My Profile</h2>
          <p>Manage your account details</p>
        </div>
      </header>

      <section className="pf-hero">
        <div className="pf-avatar">{displayName.charAt(0).toUpperCase()}</div>

        <div className="pf-hero-text">
          <h1>{displayName}</h1>
          <p>{user.email}</p>
        </div>

        <span className={`pf-chip ${profile?.phone ? "ok" : ""}`}>
          {profile?.phone ? (
            <>
              <CheckCircle2 size={13} /> {profile.phone}
            </>
          ) : (
            "No mobile number"
          )}
        </span>
      </section>

      {notice && <p className="pf-notice warning">{notice}</p>}

      {profileLoading ? (
        <p className="pf-loading">
          <LoaderCircle size={18} className="pf-spin" /> Loading your profile...
        </p>
      ) : (
        <>
          <NameSection user={user} profile={profile} />
          <PhoneSection profile={profile} />
          <AddressSection profile={profile} />
          <PinSection profile={profile} />
          <PasswordSection />
        </>
      )}

      <button className="pf-logout" onClick={handleLogout}>
        <LogOut size={16} />
        Logout
      </button>
    </div>
  );
}
