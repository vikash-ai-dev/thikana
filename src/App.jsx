import React, { useState, useEffect, useMemo } from "react";
import { db, auth } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import {
  Search,
  MapPin,
  MessageCircle,
  Plus,
  Upload,
  X,
  User,
  LogOut,
  CheckCircle2,
  Home,
  ChevronLeft,
  Send,
  Wifi,
  UtensilsCrossed,
  Car,
  Snowflake,
  Zap,
  Bath,
  Trash2,
  Inbox as InboxIcon,
  ListChecks,
} from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

/* ---------------------------------------------------------
   Design tokens
   --------------------------------------------------------- */
const C = {
  yellow: "#F0B429",
  yellowDark: "#C98E10",
  ink: "#1B1812",
  paper: "#FBF7EE",
  paperDim: "#F1EBDC",
  terracotta: "#C2542C",
  teal: "#0E5C56",
  slate: "#7A7263",
};

const FONT_DISPLAY = "'Alfa Slab One', serif";
const FONT_BODY = "'Inter', sans-serif";
const FONT_MONO = "'Space Mono', monospace";
const FONT_HAND = "'Caveat', cursive";

const AMENITIES = [
  { key: "wifi", label: "WiFi", icon: Wifi },
  { key: "food", label: "Food included", icon: UtensilsCrossed },
  { key: "parking", label: "Parking", icon: Car },
  { key: "ac", label: "AC", icon: Snowflake },
  { key: "power", label: "Power backup", icon: Zap },
  { key: "bathroom", label: "Attached bathroom", icon: Bath },
];

const TYPES = ["PG", "Room", "Flat"];
const GENDERS = ["Boys", "Girls", "Co-ed"];

/* ---------------------------------------------------------
   Storage helpers (used only for conversations — a shared
   Firestore "scratch" doc. Sessions and users/listings now
   go through real Firestore collections + Firebase Auth.)
   --------------------------------------------------------- */
async function loadKey(key, fallback) {
  try {
    const ref = doc(db, "thikana", key);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data().value : fallback;
  } catch (e) {
    console.error("Storage load failed for", key, e);
    return fallback;
  }
}
async function saveKey(key, value) {
  try {
    const ref = doc(db, "thikana", key);
    await setDoc(ref, { value });
  } catch (e) {
    console.error("Storage save failed for", key, e);
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function formatINR(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  return Math.floor(hrs / 24) + "d ago";
}

function resizeImage(file, maxWidth = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---------------------------------------------------------
   Small shared UI pieces
   --------------------------------------------------------- */
function FontStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Inter:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&family=Caveat:wght@600;700&display=swap');
      * { box-sizing: border-box; }
      button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {
        outline: 2px solid ${C.teal};
        outline-offset: 2px;
      }
    `}</style>
  );
}

function Pill({ children, bg, color }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: bg, color, fontFamily: FONT_BODY }}
    >
      {children}
    </span>
  );
}

function PrimaryButton({ children, onClick, type = "button", className = "", disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-transform active:scale-95 disabled:opacity-60 ${className}`}
      style={{ backgroundColor: C.ink, color: C.paper, fontFamily: FONT_BODY }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, type = "button", className = "" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-5 py-2.5 rounded-lg font-semibold text-sm border-2 transition-transform active:scale-95 ${className}`}
      style={{ borderColor: C.ink, color: C.ink, backgroundColor: "transparent", fontFamily: FONT_BODY }}
    >
      {children}
    </button>
  );
}

function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: C.paperDim, color: C.slate }}
      >
        <Icon size={26} />
      </div>
      <p className="font-semibold text-base mb-1" style={{ color: C.ink, fontFamily: FONT_BODY }}>
        {title}
      </p>
      <p className="text-sm mb-4 max-w-xs" style={{ color: C.slate, fontFamily: FONT_BODY }}>
        {subtitle}
      </p>
      {action}
    </div>
  );
}

/* ---------------------------------------------------------
   Header
   --------------------------------------------------------- */
function Header({ currentUser, onNav, onLogout, unreadCount }) {
  return (
    <header className="sticky top-0 z-30 border-b-2" style={{ backgroundColor: C.paper, borderColor: C.ink }}>
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3 gap-3">
        <button onClick={() => onNav("home")} className="flex items-center gap-2">
          <span style={{ fontFamily: FONT_DISPLAY, color: C.ink, fontSize: 20 }}>Thikana</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNav("home")}
            className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium"
            style={{ color: C.ink, fontFamily: FONT_BODY }}
          >
            <Search size={16} /> Browse
          </button>

          {currentUser && currentUser.role === "Owner" && (
            <button
              onClick={() => onNav("add")}
              className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium"
              style={{ color: C.ink, fontFamily: FONT_BODY }}
            >
              <Plus size={16} /> List a place
            </button>
          )}

          {currentUser && (
            <button
              onClick={() => onNav("inbox")}
              className="relative flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium"
              style={{ color: C.ink, fontFamily: FONT_BODY }}
            >
              <InboxIcon size={16} />
              <span className="hidden sm:inline">Messages</span>
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold"
                  style={{ backgroundColor: C.terracotta, color: "white" }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          )}

          {currentUser ? (
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium border"
              style={{ color: C.ink, borderColor: C.ink, fontFamily: FONT_BODY }}
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">{currentUser.name.split(" ")[0]}</span>
            </button>
          ) : (
            <PrimaryButton onClick={() => onNav("auth")}>Sign in</PrimaryButton>
          )}
        </div>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------
   Hero
   --------------------------------------------------------- */
function Hero({ onBrowse, onList }) {
  return (
    <section className="px-4 pt-10 pb-14" style={{ backgroundColor: C.paper }}>
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.terracotta, fontFamily: FONT_BODY }}>
            Bardoli · Student Housing
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-4" style={{ color: C.ink, fontFamily: FONT_BODY }}>
            Stop walking past TO-LET boards.
            <br />
            Start messaging the owner.
          </h1>
          <p className="text-base mb-6 max-w-md" style={{ color: C.slate, fontFamily: FONT_BODY }}>
            "Thikana" is Gujarati for <em>your place</em>. Every PG, shared room and flat near Bardoli's colleges, with photos, real rent, and a chat box — no more knocking on doors.
          </p>
          <div className="flex flex-wrap gap-3">
            <PrimaryButton onClick={onBrowse}>Browse rooms</PrimaryButton>
            <SecondaryButton onClick={onList}>List your place</SecondaryButton>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <div
            className="relative w-64 sm:w-72 px-6 py-8 rounded-sm shadow-lg"
            style={{ backgroundColor: C.yellow, border: `5px solid ${C.ink}`, transform: "rotate(-3deg)" }}
          >
            <p className="text-center leading-none" style={{ fontFamily: FONT_DISPLAY, color: C.ink, fontSize: 40 }}>
              TO-LET
            </p>
            <div className="mt-4 border-t-2 pt-3" style={{ borderColor: C.ink }}>
              <p className="text-center text-sm font-semibold" style={{ color: C.ink, fontFamily: FONT_BODY }}>
                Near UTU · PG &amp; Rooms
              </p>
              <p className="text-center mt-2" style={{ fontFamily: FONT_HAND, color: C.terracotta, fontSize: 22 }}>
                chat in-app, no calls needed →
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------
   Filter bar
   --------------------------------------------------------- */
function FilterBar({ filters, setFilters }) {
  return (
    <div className="max-w-5xl mx-auto px-4 -mt-6 mb-8 relative z-10">
      <div
        className="rounded-xl shadow-md p-4 grid grid-cols-2 sm:grid-cols-5 gap-3"
        style={{ backgroundColor: "white", border: `1px solid ${C.paperDim}` }}
      >
        <div className="col-span-2 sm:col-span-2 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: C.paperDim }}>
          <Search size={16} style={{ color: C.slate }} />
          <input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search area or landmark"
            className="bg-transparent outline-none text-sm w-full"
            style={{ color: C.ink, fontFamily: FONT_BODY }}
          />
        </div>

        <select
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ backgroundColor: C.paperDim, color: C.ink, fontFamily: FONT_BODY }}
        >
          <option value="All">Any type</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filters.gender}
          onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value }))}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ backgroundColor: C.paperDim, color: C.ink, fontFamily: FONT_BODY }}
        >
          <option value="All">Anyone</option>
          {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        <select
          value={filters.budgetMax}
          onChange={(e) => setFilters((f) => ({ ...f, budgetMax: Number(e.target.value) }))}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ backgroundColor: C.paperDim, color: C.ink, fontFamily: FONT_BODY }}
        >
          <option value={3000}>Up to ₹3,000</option>
          <option value={4000}>Up to ₹4,000</option>
          <option value={5000}>Up to ₹5,000</option>
          <option value={7000}>Up to ₹7,000</option>
          <option value={100000}>Any budget</option>
        </select>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Listing card + grid
   --------------------------------------------------------- */
function ListingCard({ listing, onOpen }) {
  return (
    <button
      onClick={() => onOpen(listing.id)}
      className="text-left rounded-xl overflow-hidden border hover:shadow-lg transition-shadow flex flex-col"
      style={{ borderColor: C.paperDim, backgroundColor: "white" }}
    >
      <div className="h-36 flex items-center justify-center" style={{ backgroundColor: C.paperDim }}>
        {listing.photos && listing.photos[0] ? (
          <img src={listing.photos[0]} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <Home size={32} style={{ color: C.slate }} />
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-sm leading-snug" style={{ color: C.ink, fontFamily: FONT_BODY }}>{listing.title}</h3>
          {listing.verified && (
            <Pill bg="rgba(14,92,86,0.1)" color={C.teal}><CheckCircle2 size={12} /> Verified</Pill>
          )}
        </div>
        <p className="text-xs flex items-center gap-1" style={{ color: C.slate, fontFamily: FONT_BODY }}>
          <MapPin size={12} /> {listing.nearLandmark}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Pill bg="rgba(194,84,44,0.1)" color={C.terracotta}>{listing.type}</Pill>
          <Pill bg={C.paperDim} color={C.slate}>{listing.gender}</Pill>
        </div>
        <p className="mt-auto pt-2 font-bold text-base" style={{ color: C.ink, fontFamily: FONT_MONO }}>
          {formatINR(listing.rent)}<span className="text-xs font-normal" style={{ fontFamily: FONT_BODY }}>/month</span>
        </p>
      </div>
    </button>
  );
}

function ListingGrid({ listings, onOpen }) {
  if (listings.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No listings match yet"
        subtitle="Try a wider budget or a different type. New rooms get added as owners list them."
      />
    );
  }
  return (
    <div className="max-w-5xl mx-auto px-4 pb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {listings.map((l) => <ListingCard key={l.id} listing={l} onOpen={onOpen} />)}
    </div>
  );
}

/* ---------------------------------------------------------
   Listing detail
   --------------------------------------------------------- */
function ListingDetail({ listing, currentUser, onBack, onMessage, onNav, onDelete }) {
  if (!listing) return null;
  const isOwnListing = currentUser && currentUser.username === listing.ownerUsername;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-16">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold mb-4" style={{ color: C.ink, fontFamily: FONT_BODY }}>
        <ChevronLeft size={16} /> Back to listings
      </button>

      <div className="rounded-xl overflow-hidden mb-5" style={{ backgroundColor: C.paperDim }}>
        {listing.photos && listing.photos.length > 0 ? (
          <img src={listing.photos[0]} alt={listing.title} className="w-full max-h-80 object-cover" />
        ) : (
          <div className="h-48 flex items-center justify-center">
            <Home size={40} style={{ color: C.slate }} />
          </div>
        )}
      </div>

      {listing.photos && listing.photos.length > 1 && (
        <div className="flex gap-2 mb-5 overflow-x-auto">
          {listing.photos.slice(1).map((p, i) => (
            <img key={i} src={p} className="w-20 h-20 object-cover rounded-lg" style={{ border: `1px solid ${C.paperDim}` }} />
          ))}
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-2">
        <h1 className="text-2xl font-extrabold" style={{ color: C.ink, fontFamily: FONT_BODY }}>{listing.title}</h1>
        {listing.verified && (
          <Pill bg="rgba(14,92,86,0.1)" color={C.teal}><CheckCircle2 size={13} /> Verified</Pill>
        )}
      </div>
      <p className="flex items-center gap-1 text-sm mb-4" style={{ color: C.slate, fontFamily: FONT_BODY }}>
        <MapPin size={14} /> {listing.nearLandmark}
      </p>

      <div className="flex items-center gap-2 mb-5">
        <Pill bg="rgba(194,84,44,0.1)" color={C.terracotta}>{listing.type}</Pill>
        <Pill bg={C.paperDim} color={C.slate}>{listing.gender}</Pill>
        <span className="font-bold text-lg ml-2" style={{ color: C.ink, fontFamily: FONT_MONO }}>
          {formatINR(listing.rent)}<span className="text-xs font-normal" style={{ fontFamily: FONT_BODY }}>/month</span>
        </span>
      </div>

      <p className="text-sm leading-relaxed mb-6" style={{ color: C.ink, fontFamily: FONT_BODY }}>{listing.description}</p>

      {listing.amenities && listing.amenities.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: C.slate, fontFamily: FONT_BODY }}>Amenities</p>
          <div className="flex flex-wrap gap-3">
            {listing.amenities.map((key) => {
              const a = AMENITIES.find((x) => x.key === key);
              if (!a) return null;
              const Icon = a.icon;
              return (
                <span key={key} className="flex items-center gap-1.5 text-sm" style={{ color: C.ink, fontFamily: FONT_BODY }}>
                  <Icon size={15} style={{ color: C.teal }} /> {a.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-sm mb-6" style={{ color: C.slate, fontFamily: FONT_BODY }}>
        Listed by <span className="font-semibold" style={{ color: C.ink }}>{listing.ownerName}</span> · {timeAgo(listing.createdAt)}
      </p>

      {!currentUser && <SecondaryButton onClick={() => onNav("auth")}>Sign in to message the owner</SecondaryButton>}

      {currentUser && currentUser.role === "Student" && !isOwnListing && (
        <PrimaryButton onClick={() => onMessage(listing)}>
          <span className="flex items-center gap-2"><MessageCircle size={16} /> Message owner</span>
        </PrimaryButton>
      )}

      {isOwnListing && (
        <button onClick={() => onDelete(listing.id)} className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.terracotta, fontFamily: FONT_BODY }}>
          <Trash2 size={15} /> Remove this listing
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Auth screen
   --------------------------------------------------------- */
function AuthScreen({ onSignup, onLogin, onBack }) {
  const [mode, setMode] = useState("signup");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Student");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const result =
      mode === "signup"
        ? await onSignup(username, name, role, email, password)
        : await onLogin(email, password);

    setBusy(false);

    if (result && result.error) {
      setError(result.error);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-10">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold mb-6" style={{ color: C.ink, fontFamily: FONT_BODY }}>
        <ChevronLeft size={16} /> Back
      </button>

      <h1 className="text-2xl font-extrabold mb-1" style={{ color: C.ink, fontFamily: FONT_BODY }}>
        {mode === "signup" ? "Create an account" : "Welcome back"}
      </h1>
      <p className="text-sm mb-6" style={{ color: C.slate, fontFamily: FONT_BODY }}>
        Use a real email and password — this now creates a real Firebase account.
      </p>

      <div className="flex rounded-lg overflow-hidden mb-6 border" style={{ borderColor: C.ink }}>
        {["signup", "login"].map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(""); }}
            className="flex-1 py-2 text-sm font-semibold"
            style={{ backgroundColor: mode === m ? C.ink : "transparent", color: mode === m ? C.paper : C.ink, fontFamily: FONT_BODY }}
          >
            {m === "signup" ? "Sign up" : "Log in"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        {mode === "signup" && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wide" style={{ color: C.slate, fontFamily: FONT_BODY }}>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. ravipatel"
              className="w-full mt-1 px-3 py-2.5 rounded-lg border text-sm"
              style={{ borderColor: C.paperDim, fontFamily: FONT_BODY, color: C.ink }}
              required
            />
          </div>
        )}

        <div>
          <label className="text-xs font-bold uppercase tracking-wide" style={{ color: C.slate, fontFamily: FONT_BODY }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@gmail.com"
            className="w-full mt-1 px-3 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: C.paperDim, fontFamily: FONT_BODY, color: C.ink }}
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide" style={{ color: C.slate, fontFamily: FONT_BODY }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
            className="w-full mt-1 px-3 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: C.paperDim, fontFamily: FONT_BODY, color: C.ink }}
            required
          />
        </div>

        {mode === "signup" && (
          <>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide" style={{ color: C.slate, fontFamily: FONT_BODY }}>Your name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ravi Patel"
                className="w-full mt-1 px-3 py-2.5 rounded-lg border text-sm"
                style={{ borderColor: C.paperDim, fontFamily: FONT_BODY, color: C.ink }}
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide" style={{ color: C.slate, fontFamily: FONT_BODY }}>I am a...</label>
              <div className="flex gap-2 mt-1">
                {["Student", "Owner"].map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setRole(r)}
                    className="flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold"
                    style={{ borderColor: C.ink, backgroundColor: role === r ? C.yellow : "transparent", color: C.ink, fontFamily: FONT_BODY }}
                  >
                    {r === "Student" ? "Student looking for a place" : "Owner listing a place"}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {error && <p className="text-sm font-medium" style={{ color: C.terracotta, fontFamily: FONT_BODY }}>{error}</p>}

        <PrimaryButton type="submit" className="mt-1" disabled={busy}>
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
        </PrimaryButton>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------
   Add listing form
   --------------------------------------------------------- */
function AddListingForm({ onSubmit, onBack }) {
  const [title, setTitle] = useState("");
  const [nearLandmark, setNearLandmark] = useState("");
  const [type, setType] = useState("PG");
  const [gender, setGender] = useState("Co-ed");
  const [rent, setRent] = useState("");
  const [description, setDescription] = useState("");
  const [amenities, setAmenities] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  function toggleAmenity(key) {
    setAmenities((a) => (a.includes(key) ? a.filter((x) => x !== key) : [...a, key]));
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []).slice(0, 5 - photos.length);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const resized = await Promise.all(files.map((f) => resizeImage(f)));
      setPhotos((p) => [...p, ...resized].slice(0, 5));
    } catch (err) {
      console.error(err);
    }
    setUploading(false);
  }

  function submit(e) {
    e.preventDefault();
    if (!title.trim() || !nearLandmark.trim() || !rent) return;
    onSubmit({
      title: title.trim(),
      nearLandmark: nearLandmark.trim(),
      type,
      gender,
      rent: Number(rent),
      description: description.trim(),
      amenities,
      photos,
    });
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-16">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold mb-4" style={{ color: C.ink, fontFamily: FONT_BODY }}>
        <ChevronLeft size={16} /> Back
      </button>
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: C.ink, fontFamily: FONT_BODY }}>List your place</h1>
      <p className="text-sm mb-6" style={{ color: C.slate, fontFamily: FONT_BODY }}>
        Takes two minutes. Students filter by budget and distance first, so be specific.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-5">
        <div>
          <label className="text-xs font-bold uppercase tracking-wide" style={{ color: C.slate, fontFamily: FONT_BODY }}>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sunny room near UTU"
            className="w-full mt-1 px-3 py-2.5 rounded-lg border text-sm" style={{ borderColor: C.paperDim, fontFamily: FONT_BODY, color: C.ink }} required />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide" style={{ color: C.slate, fontFamily: FONT_BODY }}>Landmark / area</label>
          <input value={nearLandmark} onChange={(e) => setNearLandmark(e.target.value)} placeholder="e.g. 5 min walk from Uka Tarsadia University"
            className="w-full mt-1 px-3 py-2.5 rounded-lg border text-sm" style={{ borderColor: C.paperDim, fontFamily: FONT_BODY, color: C.ink }} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide" style={{ color: C.slate, fontFamily: FONT_BODY }}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-lg border text-sm" style={{ borderColor: C.paperDim, fontFamily: FONT_BODY, color: C.ink }}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide" style={{ color: C.slate, fontFamily: FONT_BODY }}>For</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-lg border text-sm" style={{ borderColor: C.paperDim, fontFamily: FONT_BODY, color: C.ink }}>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide" style={{ color: C.slate, fontFamily: FONT_BODY }}>Rent per month (₹)</label>
          <input type="number" min="0" value={rent} onChange={(e) => setRent(e.target.value)} placeholder="4500"
            className="w-full mt-1 px-3 py-2.5 rounded-lg border text-sm" style={{ borderColor: C.paperDim, fontFamily: FONT_MONO, color: C.ink }} required />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide" style={{ color: C.slate, fontFamily: FONT_BODY }}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Food included? Furnished? Anything a student should know before messaging you."
            className="w-full mt-1 px-3 py-2.5 rounded-lg border text-sm" style={{ borderColor: C.paperDim, fontFamily: FONT_BODY, color: C.ink }} />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide" style={{ color: C.slate, fontFamily: FONT_BODY }}>Amenities</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {AMENITIES.map((a) => {
              const Icon = a.icon;
              const active = amenities.includes(a.key);
              return (
                <button type="button" key={a.key} onClick={() => toggleAmenity(a.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold"
                  style={{ borderColor: active ? C.teal : C.paperDim, backgroundColor: active ? "rgba(14,92,86,0.1)" : "white", color: active ? C.teal : C.slate, fontFamily: FONT_BODY }}>
                  <Icon size={13} /> {a.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide" style={{ color: C.slate, fontFamily: FONT_BODY }}>Photos (up to 5)</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {photos.map((p, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden" style={{ border: `1px solid ${C.paperDim}` }}>
                <img src={p} className="w-full h-full object-cover" />
                <button type="button" onClick={() => setPhotos((ph) => ph.filter((_, idx) => idx !== i))}
                  className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5">
                  <X size={12} color="white" />
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <label className="w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer text-xs"
                style={{ borderColor: C.slate, color: C.slate, fontFamily: FONT_BODY }}>
                <Upload size={16} />
                {uploading ? "…" : "Add"}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
              </label>
            )}
          </div>
        </div>

        <PrimaryButton type="submit" className="mt-1">Publish listing</PrimaryButton>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------
   My listings (owner dashboard)
   --------------------------------------------------------- */
function MyListings({ listings, currentUser, onOpen, onAdd, onDelete }) {
  const mine = listings.filter((l) => l.ownerUsername === currentUser.username);
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-16">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold" style={{ color: C.ink, fontFamily: FONT_BODY }}>Your listings</h1>
        <PrimaryButton onClick={onAdd}><span className="flex items-center gap-1"><Plus size={15} /> Add</span></PrimaryButton>
      </div>

      {mine.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No listings yet"
          subtitle="Put up your first room or PG and students nearby will be able to find and message you."
          action={<PrimaryButton onClick={onAdd}>List your place</PrimaryButton>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {mine.map((l) => (
            <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: C.paperDim }}>
              <div className="w-16 h-16 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: C.paperDim }}>
                {l.photos && l.photos[0] ? <img src={l.photos[0]} className="w-full h-full object-cover rounded-lg" /> : <Home size={20} style={{ color: C.slate }} />}
              </div>
              <button onClick={() => onOpen(l.id)} className="flex-1 text-left">
                <p className="font-semibold text-sm" style={{ color: C.ink, fontFamily: FONT_BODY }}>{l.title}</p>
                <p className="text-xs" style={{ color: C.slate, fontFamily: FONT_BODY }}>{formatINR(l.rent)}/month · {l.type}</p>
              </button>
              <button onClick={() => onDelete(l.id)} style={{ color: C.terracotta }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Inbox
   --------------------------------------------------------- */
function Inbox({ conversations, onOpen }) {
  if (conversations.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-extrabold mb-6" style={{ color: C.ink, fontFamily: FONT_BODY }}>Messages</h1>
        <EmptyState icon={MessageCircle} title="No conversations yet" subtitle="Messages with owners or students will show up here once you start chatting on a listing." />
      </div>
    );
  }
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-16">
      <h1 className="text-2xl font-extrabold mb-6" style={{ color: C.ink, fontFamily: FONT_BODY }}>Messages</h1>
      <div className="flex flex-col gap-2">
        {conversations.map((c) => (
          <button key={c.cid} onClick={() => onOpen(c)} className="flex items-center gap-3 p-3 rounded-xl border text-left" style={{ borderColor: C.paperDim }}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: C.paperDim, color: C.slate }}>
              <User size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: C.ink, fontFamily: FONT_BODY }}>{c.otherName}</p>
              <p className="text-xs truncate" style={{ color: C.slate, fontFamily: FONT_BODY }}>{c.listing.title} · {c.lastMsg ? c.lastMsg.text : "Say hello"}</p>
            </div>
            {c.lastMsg && <span className="text-xs shrink-0" style={{ color: C.slate, fontFamily: FONT_BODY }}>{timeAgo(c.lastMsg.ts)}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Chat screen
   --------------------------------------------------------- */
function ChatScreen({ listing, otherName, messages, currentUser, onBack, onSend }) {
  const [text, setText] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-4 flex flex-col" style={{ minHeight: "70vh" }}>
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold mb-3 shrink-0" style={{ color: C.ink, fontFamily: FONT_BODY }}>
        <ChevronLeft size={16} /> Messages
      </button>
      <div className="pb-3 mb-3 border-b shrink-0" style={{ borderColor: C.paperDim }}>
        <p className="font-bold text-sm" style={{ color: C.ink, fontFamily: FONT_BODY }}>{otherName}</p>
        <p className="text-xs" style={{ color: C.slate, fontFamily: FONT_BODY }}>About: {listing.title}</p>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2 mb-3">
        {messages.length === 0 && (
          <p className="text-sm text-center mt-10" style={{ color: C.slate, fontFamily: FONT_BODY }}>
            Say hello and ask what you'd like to know about the place.
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.from === currentUser.username;
          return (
            <div key={i} className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${mine ? "self-end" : "self-start"}`}
              style={{ backgroundColor: mine ? C.ink : C.paperDim, color: mine ? C.paper : C.ink, fontFamily: FONT_BODY }}>
              {m.text}
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 shrink-0">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
          className="flex-1 px-3 py-2.5 rounded-lg border text-sm"
          style={{ borderColor: C.paperDim, fontFamily: FONT_BODY, color: C.ink }}
        />
        <button type="submit" className="p-2.5 rounded-lg" style={{ backgroundColor: C.ink, color: C.paper }}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------
   Main App
   --------------------------------------------------------- */
export default function ThikanaApp() {
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState({});
  const [conversations, setConversations] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  const [screen, setScreen] = useState("home");
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [activeChat, setActiveChat] = useState(null);

  const [filters, setFilters] = useState({ search: "", type: "All", gender: "All", budgetMax: 100000 });

  // Load listings, users, conversations once on mount
  useEffect(() => {
    (async () => {
      const listingsSnapshot = await getDocs(collection(db, "listings"));
      const l = listingsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      const usersSnapshot = await getDocs(collection(db, "users"));
      const u = {};
      usersSnapshot.forEach((d) => {
        const data = d.data();
        u[data.username] = data; // keyed by username, not doc id (doc id is uid)
      });

      const c = await loadKey("thikana:conversations", {});

      setListings(l);
      setUsers(u);
      setConversations(c);
      setLoading(false);
    })();
  }, []);

  // Firebase Auth is the single source of truth for "who is logged in
  // on this browser". This fixes the bug where one shared session
  // document logged every visitor in as the same person.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const snap = await getDoc(doc(db, "users", fbUser.uid));
          if (snap.exists()) {
            setCurrentUser(snap.data());
          }
        } catch (err) {
          console.error("Failed to load profile for signed-in user", err);
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      if (filters.type !== "All" && l.type !== filters.type) return false;
      if (filters.gender !== "All" && l.gender !== filters.gender) return false;
      if (l.rent > filters.budgetMax) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (!l.title.toLowerCase().includes(s) && !l.nearLandmark.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [listings, filters]);

  const myConversations = useMemo(() => {
    if (!currentUser) return [];
    const result = [];
    Object.entries(conversations).forEach(([cid, msgs]) => {
      const idx = cid.indexOf("__");
      const listingId = cid.slice(0, idx);
      const studentUsername = cid.slice(idx + 2);
      const listing = listings.find((l) => l.id === listingId);
      if (!listing) return;
      const isStudentSide = currentUser.role === "Student" && studentUsername === currentUser.username;
      const isOwnerSide = currentUser.role === "Owner" && listing.ownerUsername === currentUser.username;
      if (isStudentSide || isOwnerSide) {
        const lastMsg = msgs[msgs.length - 1];
        const otherName = isStudentSide ? listing.ownerName : (users[studentUsername]?.name || studentUsername);
        result.push({ cid, listing, studentUsername, lastMsg, otherName });
      }
    });
    return result.sort((a, b) => (b.lastMsg?.ts || 0) - (a.lastMsg?.ts || 0));
  }, [conversations, listings, currentUser, users]);

  function goNav(s) {
    setScreen(s);
  }

  async function handleSignup(usernameRaw, name, role, email, password) {
    const username = usernameRaw.trim().toLowerCase();
    if (!username) return { error: "Enter a username" };
    if (users[username]) return { error: "That username is taken — try logging in instead." };

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const newUser = {
        uid: firebaseUser.uid,
        username,
        email,
        name: name.trim() || username,
        role,
        joined: Date.now(),
      };

      // Document ID is the Firebase uid — stable, unique, and matches
      // what onAuthStateChanged gives us back on every future visit.
      await setDoc(doc(db, "users", firebaseUser.uid), newUser);

      setUsers((prev) => ({ ...prev, [username]: newUser }));
      setCurrentUser(newUser);
      setScreen("home");

      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  async function handleLogin(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, "users", userCredential.user.uid));

      if (!snap.exists()) {
        return { error: "Signed in, but no profile found for this account." };
      }

      setCurrentUser(snap.data());
      setScreen("home");
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  async function handleLogout() {
    await signOut(auth);
    setScreen("home");
  }

  async function handleAddListing(data) {
    const newListing = {
      id: uid(),
      ownerUsername: currentUser.username,
      ownerName: currentUser.name,
      verified: false,
      createdAt: Date.now(),
      ...data,
    };

    try {
      await setDoc(doc(db, "listings", newListing.id), newListing);
      setListings((prev) => [newListing, ...prev]);
      setScreen("mylistings");
    } catch (error) {
      console.error("Error saving listing:", error);
    }
  }

  async function handleDeleteListing(id) {
    try {
      await deleteDoc(doc(db, "listings", id));
      setListings((prev) => prev.filter((l) => l.id !== id));
      if (screen === "detail") setScreen("home");
    } catch (error) {
      console.error("Error deleting listing:", error);
    }
  }

  function openListing(id) {
    setSelectedListingId(id);
    setScreen("detail");
  }

  function startMessage(listing) {
    setActiveChat({ listingId: listing.id, studentUsername: currentUser.username });
    setScreen("chat");
  }

  function openConversation(c) {
    setActiveChat({ listingId: c.listing.id, studentUsername: c.studentUsername });
    setScreen("chat");
  }

  async function sendMessage(text) {
    const cid = `${activeChat.listingId}__${activeChat.studentUsername}`;
    const existing = conversations[cid] || [];
    const msg = { from: currentUser.username, text, ts: Date.now() };
    const updated = { ...conversations, [cid]: [...existing, msg] };
    setConversations(updated);
    await saveKey("thikana:conversations", updated);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.paper }}>
        <FontStyles />
        <p style={{ fontFamily: FONT_DISPLAY, color: C.ink, fontSize: 22 }}>Thikana</p>
      </div>
    );
  }

  const selectedListing = listings.find((l) => l.id === selectedListingId);
  const activeListing = activeChat ? listings.find((l) => l.id === activeChat.listingId) : null;
  const activeMessages = activeChat ? (conversations[`${activeChat.listingId}__${activeChat.studentUsername}`] || []) : [];
  const activeOtherName = activeChat
    ? (currentUser.role === "Student" ? activeListing?.ownerName : (users[activeChat.studentUsername]?.name || activeChat.studentUsername))
    : "";

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.paper }}>
      <FontStyles />
      <Header currentUser={currentUser} onNav={goNav} onLogout={handleLogout} unreadCount={0} />

      {screen === "home" && (
        <>
          <Hero onBrowse={() => window.scrollTo({ top: 480, behavior: "smooth" })} onList={() => goNav(currentUser ? (currentUser.role === "Owner" ? "add" : "auth") : "auth")} />
          <FilterBar filters={filters} setFilters={setFilters} />
          <ListingGrid listings={filteredListings} onOpen={openListing} />
        </>
      )}

      {screen === "detail" && (
        <ListingDetail
          listing={selectedListing}
          currentUser={currentUser}
          onBack={() => goNav("home")}
          onMessage={startMessage}
          onNav={goNav}
          onDelete={handleDeleteListing}
        />
      )}

      {screen === "auth" && (
        <AuthScreen onSignup={handleSignup} onLogin={handleLogin} onBack={() => goNav("home")} />
      )}

      {screen === "add" && currentUser && currentUser.role === "Owner" && (
        <AddListingForm onSubmit={handleAddListing} onBack={() => goNav("mylistings")} />
      )}

      {screen === "mylistings" && currentUser && currentUser.role === "Owner" && (
        <MyListings listings={listings} currentUser={currentUser} onOpen={openListing} onAdd={() => goNav("add")} onDelete={handleDeleteListing} />
      )}

      {screen === "inbox" && currentUser && (
        <Inbox conversations={myConversations} onOpen={openConversation} />
      )}

      {screen === "chat" && currentUser && activeListing && (
        <ChatScreen
          listing={activeListing}
          otherName={activeOtherName}
          messages={activeMessages}
          currentUser={currentUser}
          onBack={() => goNav("inbox")}
          onSend={sendMessage}
        />
      )}

      <footer className="text-center py-6 text-xs" style={{ color: C.slate, fontFamily: FONT_BODY }}>
        Thikana — demo prototype.
      </footer>
    </div>
  );
}
