import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "./auth-context";
import { signOut, authError } from "../lib/auth-api";
import { requireSupabase } from "../lib/supabase";
import QRCode from "react-native-qrcode-svg";
import {
  capturePayPalOrder,
  createPayPalOrder,
  payWithPayPalSandbox,
  PayPalOrder,
} from "../lib/paypal-api";
import {
  active,
  available,
  Booking,
  cancellationRefund,
  emptyStore,
  equipment,
  money,
  overtimeCharge,
  overlaps,
  plans,
  spaces,
  stationLaptopPromos,
  laptopRentalRates,
  laptopSpecifications,
  laptopMonthlyRate,
  Store,
} from "./catalog";
import {
  Action,
  Badge,
  BottomNav,
  Card,
  Icon,
  IconName,
  MenuRow,
  palette,
  Row,
  Section,
  ui,
} from "../components/hq-ui";
import { Calendar } from "../components/hq-calendar";

const usesLivePayPal = process.env.EXPO_PUBLIC_PAYPAL_ENVIRONMENT === "live";
type Screen =
  | "Home"
  | "Space Availability"
  | "Select Date & Time"
  | "Booking Details"
  | "Select Equipment"
  | "Payment Method"
  | "Booking Confirmed"
  | "Bookings"
  | "Check-in"
  | "Payments"
  | "Profile"
  | "Membership Plans"
  | "Membership Renewal"
  | "Notifications"
  | "Cancellation & Refund"
  | "Help & Support"
  | "Visit Details"
  | "Features"
  | "My Usage"
  | "Station + Laptop Promo"
  | "Laptop Rental";
type PayPalCheckout = {
  kind: "booking" | "membership";
  stage: "review" | "checkout";
  order?: PayPalOrder;
  reservationId?: string;
};
export type MemberIdentity = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  verified: boolean;
};
const SCREENS: Screen[] = [
  "Home",
  "Space Availability",
  "Select Date & Time",
  "Booking Details",
  "Select Equipment",
  "Payment Method",
  "Booking Confirmed",
  "Bookings",
  "Check-in",
  "Payments",
  "Profile",
  "Membership Plans",
  "Membership Renewal",
  "Notifications",
  "Cancellation & Refund",
  "Help & Support",
  "Visit Details",
  "Features",
  "My Usage",
  "Station + Laptop Promo",
  "Laptop Rental",
];
const resolveScreen = (value?: string): Screen =>
  SCREENS.includes(value as Screen) ? (value as Screen) : "Home";
const HOUR = 3600000;
const dateLabel = (n: number) =>
  new Date(n).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const timeLabel = (n: number) =>
  new Date(n).toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
  });
const initialStart = () =>
  new Date(Math.ceil(Date.now() / HOUR) * HOUR + HOUR + 8 * HOUR)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
function Chips({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
      {items.map((item) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: value === item }}
          key={item}
          onPress={() => onChange(item)}
          style={[ui.chip, value === item && ui.chipSelected]}
        >
          <Text style={[ui.chipText, value === item && ui.chipTextSelected]}>
            {item}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
function Stepper({
  value,
  onChange,
  min = 0,
  max = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={s.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
        style={s.step}
      >
        <Text style={s.stepText}>−</Text>
      </Pressable>
      <Text style={ui.heading}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        style={s.step}
      >
        <Text style={s.stepText}>+</Text>
      </Pressable>
    </View>
  );
}
export default function Workspace() {
  const { session } = useAuth();
  const p = useLocalSearchParams<{ view?: string }>();
  if (!session) return null;
  const u = session.user;
  return (
    <MemberWorkspace
      key={u.id}
      initialView={p.view}
      member={{
        id: u.id,
        name:
          typeof u.user_metadata.full_name === "string"
            ? u.user_metadata.full_name
            : "HeadQuarters Member",
        email: u.email || "",
        mobile: u.user_metadata.mobile_number || "Not provided",
        verified: !!u.email_confirmed_at,
      }}
    />
  );
}
export function MemberWorkspace({
  member,
  initialView,
}: {
  member: MemberIdentity;
  initialView?: string;
}) {
  const KEY = "headquarters-member-v1:" + member.id;
  const [screen, setScreen] = useState<Screen>(resolveScreen(initialView));
  const scroll = useRef<ScrollView>(null);
  const history = useRef<Screen[]>([]);
  const fade = useRef(new Animated.Value(1)).current;
  const reduceMotion = useRef(false);
  const [equipmentFirst, setEquipmentFirst] = useState(false);
  const [data, setData] = useState<Store>(emptyStore);
  const dataRef = useRef(data);
  const busy = useRef(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategoryValue] = useState("Desks");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(spaces[0].id);
  const [unit, setUnit] = useState(1);
  const [startText, setStartText] = useState(initialStart);
  const [hours, setHours] = useState(3);
  const [addons, setAddons] = useState<string[]>([]);
  const [laptopRentalHours, setLaptopRentalHours] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [bookingId, setBookingId] = useState("");
  const [bookingFilter, setBookingFilter] = useState("Upcoming");
  const [renewPlan, setRenewPlan] = useState(plans[0].id);
  const [payment, setPayment] = useState<"paypal_sandbox" | "cash">(
    "paypal_sandbox",
  );
  const [paypalCheckout, setPaypalCheckout] = useState<PayPalCheckout | null>(
    null,
  );
  const [serverResources, setServerResources] = useState<Record<string, string>>({});
  const [accessPass, setAccessPass] = useState<{ token: string; validUntil: string } | null>(null);
  const paypalReturnHandled = useRef(false);
  const [promoId, setPromoId] = useState<string>("");
  const [studentDiscount, setStudentDiscount] = useState(false);
  const [passGroup, setPassGroup] = useState("standard");
  const [passDuration, setPassDuration] = useState<"Hours" | "Week" | "Month">(
    "Hours",
  );
  function setCategory(next: string) {
    setCategoryValue(next);
    const first = spaces.find(
      (x) => x.category === (next === "Desks" ? "Desk" : "Room"),
    );
    if (first) {
      setSelected(first.id);
      setUnit(1);
    }
  }
  function show(next: Screen) {
    setScreen(next);
    setMessage("");
    router.setParams({ view: next });
  }
  function go(next: Screen) {
    if (next === screen) return;
    if (next === "Select Equipment" && screen === "Home") {
      setEquipmentFirst(true);
    }
    if (
      next === "Booking Confirmed" ||
      (next === "Bookings" && screen === "Cancellation & Refund") ||
      (next === "Membership Plans" && screen === "Membership Renewal")
    ) {
      history.current = [];
    } else {
      history.current.push(screen);
    }
    show(next);
  }
  function setBookingHours(next: number) {
    setHours(next);
    if (laptopRentalHours && next !== laptopRentalHours)
      setLaptopRentalHours(0);
  }
  function chooseLaptopRental(rentalHours: number) {
    setPromoId("");
    setCategoryValue("Desks");
    setSelected("standard");
    setUnit(1);
    setAddons((current) => [
      ...current.filter((id) => id !== "laptop"),
      "laptop",
    ]);
    setLaptopRentalHours(rentalHours);
    setHours(rentalHours);
    go("Space Availability");
  }
  function choosePromo(id: string) {
    const selectedPromo = stationLaptopPromos.find((x) => x.id === id);
    if (!selectedPromo) return;
    setPromoId(id);
    setLaptopRentalHours(0);
    setCategoryValue("Desks");
    setSelected(selectedPromo.spaceId);
    setUnit(1);
    setHours(selectedPromo.hours);
    setAddons(["laptop"]);
    if (selectedPromo.window.startsWith("DAYTIME"))
      setStartText(startText.slice(0, 10) + " 06:00");
    if (selectedPromo.window.startsWith("OVERNIGHT"))
      setStartText(startText.slice(0, 10) + " 18:00");
    go("Space Availability");
  }
  function goBack() {
    const previous = history.current.pop();
    show(previous || back[screen] || "Home");
  }
  useEffect(() => {
    const next = resolveScreen(initialView);
    setScreen(next);
  }, [initialView]);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) reduceMotion.current = value;
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => {
        reduceMotion.current = value;
      },
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    fade.stopAnimation();
    fade.setValue(reduceMotion.current ? 1 : 0);
    const animation = Animated.timing(fade, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [screen, fade]);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (screen === "Home") return false;
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [screen]);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!mounted) return;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            !Array.isArray(parsed.bookings) ||
            !Array.isArray(parsed.purchases) ||
            !Array.isArray(parsed.notices) ||
            !Array.isArray(parsed.favorites)
          )
            throw new Error("Invalid saved data");
          dataRef.current = parsed;
          setData(parsed);
        }
        setReady(true);
      })
      .catch(() => {
        if (mounted)
          setMessage(
            "Saved account data could not be loaded. Restart the app to retry.",
          );
      });
    const timer = setInterval(() => setClock(Date.now()), 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [KEY]);
  useEffect(() => {
    let mounted = true;
    void requireSupabase()
      .from("hq_resources")
      .select("id,name")
      .eq("active", true)
      .then(({ data, error }) => {
        if (!mounted || error || !data) return;
        const mapped: Record<string, string> = {};
        for (const resource of data) {
          if (resource.name === "Standard Station") mapped.standard = resource.id;
          if (resource.name === "Private Station") mapped.private = resource.id;
          if (resource.name === "Huddle Room" || resource.name === "Meeting Room") mapped.meeting = resource.id;
        }
        setServerResources(mapped);
      });
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (!Object.keys(serverResources).length) return;
    let mounted = true;
    const ids = Object.fromEntries(Object.entries(serverResources).map(([spaceId, resourceId]) => [resourceId, spaceId]));
    void Promise.all([
      requireSupabase().from("hq_reservations").select("id,resource_id,starts_at,ends_at,status,quoted_total,created_at").order("starts_at", { ascending: false }),
      requireSupabase().from("hq_payments").select("reservation_id,status"),
    ]).then(([reservations, payments]) => {
      if (!mounted || reservations.error || payments.error || !reservations.data) return;
      const paid = new Set((payments.data || []).filter((item) => item.status === "paid").map((item) => item.reservation_id));
      const remoteBookings: Booking[] = reservations.data
        .map((item) => ({
          id: String(item.id),
          spaceId: ids[item.resource_id] || "standard",
          start: Date.parse(item.starts_at),
          end: Date.parse(item.ends_at),
          hours: Math.max(1, Math.ceil((Date.parse(item.ends_at) - Date.parse(item.starts_at)) / HOUR)),
          addons: [],
          total: Number(item.quoted_total),
          status: item.status as Booking["status"],
          created: Date.parse(item.created_at),
          paymentStatus: paid.has(item.id) ? ("paid" as const) : ("pending" as const),
        }))
        .filter((item) => Number.isFinite(item.start) && Number.isFinite(item.end));
      const cached = dataRef.current;
      const cachedById = new Map(cached.bookings.map((item) => [item.id, item]));
      const next = { ...cached, bookings: remoteBookings.map((item) => ({ ...cachedById.get(item.id), ...item })) };
      dataRef.current = next;
      setData(next);
      void AsyncStorage.setItem(KEY, JSON.stringify(next));
    });
    return () => { mounted = false; };
  }, [KEY, serverResources]);
  async function commit(next: Store, notice: string) {
    if (busy.current || !ready) return false;
    busy.current = true;
    setSaving(true);
    const updated = {
      ...next,
      notices: [notice, ...next.notices].slice(0, 60),
    };
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(updated));
      dataRef.current = updated;
      setData(updated);
      setMessage(notice);
      return true;
    } catch {
      setMessage("Could not save. Your change was not applied. Please retry.");
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const start = Date.parse(startText.replace(" ", "T") + ":00+08:00"),
    end = start + hours * HOUR;
  const validDate =
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(startText) &&
    Number.isFinite(start) &&
    new Date(start + 8 * HOUR).toISOString().slice(0, 16).replace("T", " ") ===
      startText;
  const space = spaces.find((x) => x.id === selected)!;
  const membership =
    data.membership && data.membership.expires > clock ? data.membership : null;
  const plan = plans.find((p) => p.id === membership?.planId);
  const laptopRate = equipment.find((e) => e.id === "laptop")!.rate;
  const laptopRental = laptopRentalRates.find(
    (rate) => rate.hours === laptopRentalHours,
  );
  const addonRate = equipment
    .filter((e) => addons.includes(e.id) && e.id !== "laptop")
    .reduce((sum, e) => sum + e.rate, 0);
  const laptopCost = addons.includes("laptop")
    ? (laptopRental?.price ?? hours * laptopRate)
    : 0;
  const promo = stationLaptopPromos.find((x) => x.id === promoId);
  const iliganHour = validDate ? (new Date(start).getUTCHours() + 8) % 24 : -1;
  const promoEligible =
    !!promo &&
    promo.spaceId === selected &&
    promo.hours === hours &&
    (promo.window === "OPEN TIME" ||
      (promo.window.startsWith("DAYTIME")
        ? iliganHour >= 6 && iliganHour < 18
        : iliganHour >= 18 || iliganHour < 6));
  const total = promoEligible
    ? promo!.price
    : hours * (space.rate + addonRate) + laptopCost;
  const locked = !ready || saving;
  const booking = data.bookings.find((b) => b.id === bookingId);
  const upcoming = data.bookings
    .filter((b) => active(b) && b.end > clock)
    .sort((a, b) => a.start - b.start)[0];
  const current =
    data.bookings.find((b) => b.status === "checked-in") || upcoming;
  const seatLabel = (id: string, n: number) =>
    `${id === "meeting" ? "Room" : "Desk"} ${id.slice(0, 1).toUpperCase()}${String(n).padStart(2, "0")}`;
  function blockedUnits() {
    const list = data.bookings.filter(
      (b) => b.spaceId === selected && validDate && overlaps(b, start, end),
    );
    const units = new Set(list.filter((b) => b.unit).map((b) => b.unit!));
    for (const b of list.filter((b) => !b.unit)) {
      for (let i = 1; i <= space.capacity; i++) {
        if (!units.has(i)) {
          units.add(i);
          break;
        }
      }
    }
    return units;
  }
  const visibleSpaces = spaces.filter(
    (x) =>
      x.category === (category === "Desks" ? "Desk" : "Room") &&
      x.name.toLowerCase().includes(query.toLowerCase()) &&
      (filter !== "Favorites" || data.favorites.includes(x.id)),
  );
  useEffect(() => {
    if (visibleSpaces.length && !visibleSpaces.some((x) => x.id === selected)) {
      setSelected(visibleSpaces[0].id);
      setUnit(1);
    }
  }, [category, query, filter, data.favorites, selected]);
  const blocked = blockedUnits();
  const paymentLabel =
    payment === "paypal_sandbox" ? "PayPal" : "Cash Payment";
  const paymentNotice =
    payment === "paypal_sandbox"
      ? usesLivePayPal
        ? "PayPal payment selected. You will securely approve the payment with PayPal."
        : "PayPal test payment selected. No real money is charged."
      : "Cash payment selected. Please pay at HeadQuarters; staff must confirm it.";
  function startSelectedPayment(kind: "booking" | "membership") {
    if (payment === "paypal_sandbox") {
      setPaypalCheckout({ kind, stage: "review" });
      return;
    }
    if (kind === "booking") void reserve();
    else void buyPlan();
  }
  async function createServerReservation() {
    const resourceId = serverResources[selected];
    if (!resourceId) {
      throw new Error("Booking services are still loading. Please wait a moment and try again.");
    }
    const { data: reservationId, error } = await requireSupabase().rpc(
      "hq_member_create_reservation",
      { p_resource: resourceId, p_start: new Date(start).toISOString(), p_end: new Date(end).toISOString() },
    );
    if (error || !reservationId) throw new Error(error?.message || "Could not save your reservation.");
    return reservationId as string;
  }
  async function requestAccessPass(b: Booking) {
    if (b.paymentStatus !== "paid") {
      setMessage("A confirmed payment or staff cash approval is required before QR access is available.");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await requireSupabase().rpc("hq_issue_access_pass", { p_reservation: b.id });
      const pass = Array.isArray(data) ? data[0] : data;
      if (error || !pass?.token) throw new Error(error?.message || "Could not issue the access pass.");
      setAccessPass({ token: String(pass.token), validUntil: String(pass.valid_until) });
      setMessage("Your secure QR access pass is ready. Present it to staff at check-in.");
    } catch (error) {
      setMessage(authError(error));
    } finally {
      setSaving(false);
    }
  }
  async function confirmPayPalCheckout() {
    const checkout = paypalCheckout;
    if (!checkout) return;
    if (checkout.kind === "membership" && studentDiscount) {
      setPaypalCheckout(null);
      setMessage(
        "Student-discount subscriptions require cash payment and staff ID verification.",
      );
      return;
    }
    if (checkout.kind === "booking") {
      const currentData = dataRef.current;
      if (!validDate || start <= Date.now()) {
        setPaypalCheckout(null);
        setMessage("Select a future Iligan date and time.");
        return;
      }
      if (promo && !promoEligible) {
        setPaypalCheckout(null);
        setMessage(`${promo.name} needs its matching ${promo.window.toLowerCase()} schedule.`);
        return;
      }
      if (!available(currentData.bookings, space.id, space.capacity, start, end) || blocked.has(unit)) {
        setPaypalCheckout(null);
        setMessage("Your selected space is unavailable for this time. Choose another slot.");
        return;
      }
    }
    setSaving(true);
    try {
      const reservationId = checkout.kind === "booking" ? await createServerReservation() : undefined;
      const order = await createPayPalOrder(
        checkout.kind === "booking"
          ? { kind: "booking", reservationId: reservationId! }
          : { kind: "membership", planId: renewPlan },
      );
      paypalReturnHandled.current = false;
      setPaypalCheckout({ kind: checkout.kind, stage: "checkout", order, reservationId });
    } catch (error) {
      setPaypalCheckout(null);
      setMessage(authError(error));
    } finally {
      setSaving(false);
    }
  }
  async function finishEmbeddedPayPalCheckout(url: string) {
    const checkout = paypalCheckout;
    if (
      !checkout?.order ||
      paypalReturnHandled.current ||
      !url.startsWith("headquartersapp://paypal-return")
    ) return;
    paypalReturnHandled.current = true;
    if (url.includes("cancelled=1")) {
      setPaypalCheckout(null);
      setMessage("PayPal checkout was cancelled.");
      return;
    }
    const callback = new URL(url);
    if (callback.searchParams.get("token") !== checkout.order.orderId) {
      setPaypalCheckout(null);
      setMessage("The PayPal return did not match this checkout. Please try again.");
      return;
    }
    setSaving(true);
    try {
      await capturePayPalOrder(checkout.order.orderId);
      const kind = checkout.kind;
      setPaypalCheckout(null);
      if (kind === "booking") await reserve(true, checkout.reservationId);
      else await buyPlan(true);
    } catch (error) {
      setPaypalCheckout(null);
      setMessage(authError(error));
    } finally {
      setSaving(false);
    }
  }
  async function reserve(alreadyPaid = false, existingReservationId?: string) {
    if (busy.current) return;
    const currentData = dataRef.current;
    if (!validDate || start <= Date.now()) {
      setMessage("Select a future Iligan date and time.");
      return;
    }
    if (promo && !promoEligible) {
      setMessage(
        `${promo.name} needs its matching ${promo.window.toLowerCase()} schedule.`,
      );
      return;
    }
    if (
      !available(currentData.bookings, space.id, space.capacity, start, end) ||
      blocked.has(unit)
    ) {
      setMessage(
        "Your selected space is unavailable for this time. Choose another slot.",
      );
      return;
    }
    for (const e of equipment.filter((e) => addons.includes(e.id))) {
      if (!available(currentData.bookings, e.id, e.capacity, start, end)) {
        setMessage(`${e.name} is unavailable for this slot.`);
        return;
      }
    }
    let paymentStatus: "pending" | "paid" = "pending";
    let serverReservationId = existingReservationId;
    if (payment === "paypal_sandbox" && !alreadyPaid) {
      setPaypalCheckout({ kind: "booking", stage: "review" });
      return;
    }
    try {
      if (!serverReservationId) serverReservationId = await createServerReservation();
      if (payment === "cash") {
        const { error } = await requireSupabase().rpc("hq_member_request_cash_payment", { p_reservation: serverReservationId });
        if (error) throw new Error(error.message);
      }
    } catch (error) {
      setMessage(authError(error));
      return;
    }
    if (payment === "paypal_sandbox" && alreadyPaid) paymentStatus = "paid";
    const id = serverReservationId;
    const b: Booking = {
      id,
      spaceId: selected,
      unit,
      start,
      end,
      hours,
      addons: [...addons],
      total,
      status: "reserved",
      created: Date.now(),
      paymentMethod: payment,
      paymentStatus,
    };
    const notice =
      payment === "paypal_sandbox"
        ? `PayPal payment confirmed for reservation ${id}. No real money was charged.`
        : `Reservation ${id} created. ${paymentNotice}`;
    if (
      await commit(
        { ...currentData, bookings: [b, ...currentData.bookings] },
        notice,
      )
    ) {
      setBookingId(id);
      go("Booking Confirmed");
    }
  }
  async function updateBooking(b: Booking, action: "cancel" | "in" | "out") {
    const now = Date.now(),
      currentData = dataRef.current,
      latest = currentData.bookings.find((x) => x.id === b.id);
    if (!latest || busy.current) return;
    const updated = { ...latest };
    let notice = "";
    if (action === "cancel" && latest.status === "reserved") {
      updated.status = "cancelled";
      updated.refund = cancellationRefund(latest, now);
      notice = `Cancelled ${b.id}. Demo refund estimate: ${money(updated.refund)}.`;
    } else if (action === "in" && latest.status === "reserved") {
      if (now < latest.start || now >= latest.end) {
        setMessage("Check-in is available during your reserved time.");
        return;
      }
      updated.status = "checked-in";
      updated.checkedIn = now;
      notice = `Checked in to ${b.id}.`;
    } else if (action === "out" && latest.status === "checked-in") {
      const rate =
        spaces.find((x) => x.id === b.spaceId)!.rate +
        equipment
          .filter((e) => b.addons.includes(e.id))
          .reduce((n, e) => n + e.rate, 0);
      updated.status = "completed";
      updated.checkedOut = now;
      updated.overtime = overtimeCharge(latest, now, rate);
      notice = `Checked out. Additional-hour estimate: ${money(updated.overtime)}.`;
    } else return;
    if (
      await commit(
        {
          ...currentData,
          bookings: currentData.bookings.map((x) =>
            x.id === b.id ? updated : x,
          ),
        },
        notice,
      )
    ) {
      if (action === "cancel") go("Bookings");
    }
  }
  async function buyPlan(alreadyPaid = false) {
    const p = plans.find((x) => x.id === renewPlan)!;
    const currentData = dataRef.current,
      m = currentData.membership;
    if (m && m.expires > Date.now() && m.planId !== p.id) {
      setMessage(
        "Renew your current active plan or wait until it expires to switch plans.",
      );
      return;
    }
    if (payment === "paypal_sandbox" && studentDiscount) {
      setMessage(
        "Student-discount subscriptions require cash payment and staff ID verification.",
      );
      return;
    }
    const live = !!m && m.expires > Date.now();
    const base = live ? m!.expires : Date.now();
    const studentRate = p.days > 1 ? 5 : 10;
    const price = studentDiscount
      ? Math.round(p.price * (100 - studentRate)) / 100
      : p.price;
    let paymentStatus: "pending" | "paid" = "pending";
    if (payment === "paypal_sandbox" && !alreadyPaid) {
      setSaving(true);
      try {
        await payWithPayPalSandbox({ kind: "membership", planId: p.id });
        paymentStatus = "paid";
      } catch (error) {
        setMessage(authError(error));
        return;
      } finally {
        setSaving(false);
      }
    }
    if (payment === "paypal_sandbox" && alreadyPaid) paymentStatus = "paid";
    const activated = paymentStatus === "paid";
    const suffix = studentDiscount
      ? ` Student ${studentRate}% discount applied; valid ID must be presented.`
      : "";
    const nextMembership = activated
      ? {
          planId: p.id,
          expires: base + p.days * 24 * HOUR,
          remaining: (live ? m!.remaining : 0) + p.hours,
        }
      : currentData.membership;
    const notice = activated
      ? `${p.name} PayPal payment confirmed. Your pass is active.`
      : `${p.name} cash-payment request created. Staff will activate it after payment confirmation.${suffix}`;
    if (
      await commit(
        {
          ...currentData,
          membership: nextMembership,
          purchases: [
            {
              id: `PLAN-${Date.now()}`,
              title: p.name + (studentDiscount ? " · Student rate" : ""),
              amount: price,
              created: Date.now(),
              paymentMethod: payment,
              paymentStatus,
            },
            ...currentData.purchases,
          ],
        },
        notice,
      )
    ) {
      go("Membership Plans");
    }
  }
  function openVisit(b: Booking, next: Screen = "Visit Details") {
    setBookingId(b.id);
    go(next);
  }
  const back: Partial<Record<Screen, Screen>> = {
    "Space Availability": "Home",
    "Select Date & Time": "Space Availability",
    "Booking Details": "Select Date & Time",
    "Select Equipment": equipmentFirst ? "Home" : "Booking Details",
    "Payment Method": "Booking Details",
    "Booking Confirmed": "Bookings",
    "Membership Plans": "Home",
    "Membership Renewal": "Membership Plans",
    Notifications: "Home",
    "Cancellation & Refund": "Visit Details",
    "Help & Support": "Profile",
    "Visit Details": "Bookings",
    Features: "Home",
    "My Usage": "Profile",
    "Station + Laptop Promo": "Home",
    "Laptop Rental": "Home",
  };
  const activeNav =
    screen === "Profile" || screen === "My Usage" || screen === "Help & Support"
      ? "Profile"
      : screen === "Payments" || screen === "Payment Method"
        ? "Payments"
        : screen === "Check-in"
          ? "Check-in"
          : [
                "Bookings",
                "Visit Details",
                "Cancellation & Refund",
                "Booking Confirmed",
              ].includes(screen)
            ? "Bookings"
            : "Home";
  const selectedSummary = (
    <View style={ui.row}>
      <Image source={space.image} style={s.thumb} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={ui.heading}>{seatLabel(selected, unit)}</Text>
        <Text style={ui.body}>{space.name}</Text>
        <Text style={ui.caption}>
          {space.category === "Room"
            ? "Up to 6 guests"
            : "Individual workspace"}
        </Text>
      </View>
    </View>
  );
  const scheduleSummary = (
    <>
      <View style={ui.row}>
        <Icon name="calendar" size={16} />
        <Text style={ui.body}>
          {validDate ? dateLabel(start) : "Choose your date"}
        </Text>
      </View>
      <View style={ui.row}>
        <Icon name="clock" size={16} />
        <Text style={ui.body}>
          {validDate
            ? `${timeLabel(start)} – ${timeLabel(end)} (${hours} hrs)`
            : "Choose your time"}
        </Text>
      </View>
    </>
  );
  function bookingCard(b: Booking, compact = false) {
    const x = spaces.find((x) => x.id === b.spaceId)!;
    return (
      <Card key={b.id}>
        <View style={ui.between}>
          <Text style={[ui.caption, { flex: 1 }]}>
            {dateLabel(b.start)} · {timeLabel(b.start)} – {timeLabel(b.end)}
          </Text>
          <Badge
            text={b.status.toUpperCase()}
            muted={b.status === "cancelled"}
          />
        </View>
        <View style={ui.between}>
          <View style={{ gap: 4, flex: 1 }}>
            <Text style={ui.heading}>
              {b.unit ? seatLabel(b.spaceId, b.unit) : x.name}
            </Text>
            <Text style={ui.caption}>{x.name}</Text>
          </View>
          {!compact && <Text style={ui.link}>{money(b.total)}</Text>}
        </View>
        <View style={ui.row}>
          <View style={{ flex: 1 }}>
            <Action
              title={
                b.status === "checked-in"
                  ? "Check out"
                  : compact
                    ? "View booking"
                    : "View details"
              }
              onPress={() =>
                openVisit(
                  b,
                  b.status === "checked-in" ? "Check-in" : "Visit Details",
                )
              }
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open check-in"
            style={s.scanButton}
            onPress={() => openVisit(b, "Check-in")}
          >
            <Icon name="scan" color={palette.purple} />
          </Pressable>
        </View>
      </Card>
    );
  }
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[
        ui.safe,
        {
          backgroundColor:
            screen === "Home" ? palette.navy : palette.background,
        },
      ]}
    >
      <StatusBar style={screen === "Home" ? "light" : "dark"} />
      <View style={ui.frame}>
        {screen !== "Home" && (
          <View style={ui.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={ui.iconButton}
              onPress={goBack}
            >
              <Icon name="back" size={19} />
            </Pressable>
            <Text style={ui.headerTitle}>
              {screen === "Bookings"
                ? "Booking History"
                : screen === "Visit Details"
                  ? "Booking Details"
                  : screen === "Profile"
                    ? "Profile & Membership"
                    : screen === "Payments"
                      ? "Payments & Billing"
                      : screen}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              style={ui.iconButton}
              onPress={() => go("Notifications")}
            >
              <Icon name="bell" size={18} />
            </Pressable>
          </View>
        )}
        <Animated.View style={{ flex: 1, opacity: fade }}>
          <ScrollView
            ref={scroll}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={
              screen === "Home" ? { paddingBottom: 22 } : ui.content
            }
          >
            {screen === "Home" && (
              <>
                <View style={s.homeHero}>
                  <View style={ui.between}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Open profile"
                      style={ui.iconButton}
                      onPress={() => go("Profile")}
                    >
                      <Icon name="menu" color="white" />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Notifications"
                      style={ui.iconButton}
                      onPress={() => go("Notifications")}
                    >
                      <Icon name="bell" color="white" />
                      <View style={s.notificationDot} />
                    </Pressable>
                  </View>
                  <Text style={s.greeting}>
                    Hello, {member.name.split(" ")[0]}! ☀
                  </Text>
                  <Text style={s.welcome}>
                    Welcome back to HeadQuarters Iligan
                  </Text>
                  <ImageBackground
                    source={require("../../assets/images/hq-standard.jpg")}
                    style={s.banner}
                    resizeMode="cover"
                    imageStyle={{
                      borderRadius: 12,
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <View style={s.bannerShade}>
                      <View style={ui.row}>
                        <Text style={s.hq}>HQ.</Text>
                        <View>
                          <Text style={s.bannerName}>HEADQUARTERS</Text>
                          <Text style={s.bannerLocation}>ILIGAN</Text>
                        </View>
                      </View>
                      <Text style={s.slogan}>WORK. CONNECT. GROW.</Text>
                    </View>
                  </ImageBackground>
                </View>
                <View style={s.homeBody}>
                  <Section
                    title="Upcoming Booking"
                    action="View all"
                    onPress={() => go("Bookings")}
                  />
                  {upcoming ? (
                    bookingCard(upcoming, true)
                  ) : (
                    <Card>
                      <View style={ui.row}>
                        <View style={s.featureIcon}>
                          <Icon name="calendar" color={palette.purple} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={ui.heading}>
                            Your next productive day awaits
                          </Text>
                          <Text style={ui.caption}>
                            Find a desk or room that fits your plans.
                          </Text>
                        </View>
                      </View>
                      <Action
                        title="Reserve a workspace"
                        onPress={() => go("Space Availability")}
                      />
                    </Card>
                  )}
                  <Section
                    title="Quick Actions"
                    action="All features"
                    onPress={() => go("Features")}
                  />
                  <View style={s.quickActions}>
                    {(
                      [
                        [
                          "Reserve",
                          "Desk / Room",
                          "desk",
                          "Space Availability",
                        ],
                        ["Check-in", "Access pass", "scan", "Check-in"],
                        ["Book", "Equipment", "monitor", "Select Equipment"],
                        ["My", "Membership", "card", "Membership Plans"],
                      ] as [string, string, IconName, Screen][]
                    ).map(([a, b, icon, target]) => (
                      <Pressable
                        key={b}
                        accessibilityRole="button"
                        onPress={() => go(target)}
                        style={s.quickAction}
                      >
                        <View style={s.quickIcon}>
                          <Icon name={icon} color={palette.purple} size={23} />
                        </View>
                        <Text style={s.quickLabel}>
                          {a}
                          {"\n"}
                          {b}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Section
                    title="Station + Laptop Promo"
                    action="See all"
                    onPress={() => go("Station + Laptop Promo")}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => go("Station + Laptop Promo")}
                    style={s.promoStrip}
                  >
                    <View style={s.promoIcon}>
                      <Icon name="monitor" color="white" size={22} />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={ui.heading}>
                        Work-ready station + laptop
                      </Text>
                      <Text style={ui.caption}>
                        Choose 5-hour, daytime, or overnight passes from{" "}
                        {money(329)}
                      </Text>
                    </View>
                    <Icon name="arrow" color={palette.purple} size={17} />
                  </Pressable>
                  <Section
                    title="Laptop Rental"
                    action="View rates & specs"
                    onPress={() => go("Laptop Rental")}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="View laptop rental rates and specifications"
                    onPress={() => go("Laptop Rental")}
                    style={s.laptopStrip}
                  >
                    <View style={s.laptopIcon}>
                      <Icon name="monitor" color={palette.navy} size={22} />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={ui.heading}>
                        Laptop rental · Tubod Branch
                      </Text>
                      <Text style={ui.caption}>
                        From {money(50)} / hour · See rental packages and device
                        specifications
                      </Text>
                    </View>
                    <Icon name="arrow" color={palette.purple} size={17} />
                  </Pressable>
                  <Section title="Membership" />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => go("Membership Plans")}
                    style={s.membershipStrip}
                  >
                    <View style={{ gap: 5, flex: 1 }}>
                      <Text style={ui.heading}>
                        {plan?.name || "Find your membership"}
                      </Text>
                      <Text style={ui.caption}>
                        {membership
                          ? `Valid until ${dateLabel(membership.expires)}`
                          : "Explore flexible passes and memberships"}
                      </Text>
                    </View>
                    <Text style={ui.link}>View Details ›</Text>
                  </Pressable>
                  <Section
                    title="Space Availability"
                    action="Explore"
                    onPress={() => go("Space Availability")}
                  />
                  <View style={s.stats}>
                    {["Desk", "Room"].map((kind) => {
                      const list = spaces.filter((x) => x.category === kind);
                      return (
                        <Pressable
                          accessibilityRole="button"
                          key={kind}
                          onPress={() => {
                            setCategory(
                              kind === "Desk" ? "Desks" : "Meeting Rooms",
                            );
                            go("Space Availability");
                          }}
                          style={s.stat}
                        >
                          <Text style={ui.caption}>
                            {kind === "Desk" ? "Open Desks" : "Meeting Rooms"}
                          </Text>
                          <Text style={s.statValue}>
                            {list.reduce(
                              (n, x) =>
                                n +
                                available(
                                  data.bookings,
                                  x.id,
                                  x.capacity,
                                  clock,
                                  clock + 1,
                                ),
                              0,
                            )}{" "}
                            Available
                          </Text>
                          <Text style={ui.caption}>
                            of {list.reduce((n, x) => n + x.capacity, 0)} ·
                            availability shown
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={s.demoLabel}>
                    LIVE BOOKING VALIDATION · Availability is confirmed by HeadQuarters
                  </Text>
                </View>
              </>
            )}
            {!ready && (
              <Text style={[ui.caption, { paddingHorizontal: 18 }]}>
                Loading your saved bookings…
              </Text>
            )}
            {!!message && (
              <View
                accessibilityLiveRegion="polite"
                style={[ui.notice, screen === "Home" && { margin: 18 }]}
              >
                <Text style={ui.body}>{message}</Text>
              </View>
            )}
            {screen === "Space Availability" && (
              <>
                <View style={s.segment}>
                  <Pressable
                    style={[
                      s.segmentItem,
                      category === "Desks" && s.segmentActive,
                    ]}
                    onPress={() => setCategory("Desks")}
                  >
                    <Text
                      style={[
                        s.segmentText,
                        category === "Desks" && s.segmentTextActive,
                      ]}
                    >
                      Desks
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      s.segmentItem,
                      category === "Meeting Rooms" && s.segmentActive,
                    ]}
                    onPress={() => setCategory("Meeting Rooms")}
                  >
                    <Text
                      style={[
                        s.segmentText,
                        category === "Meeting Rooms" && s.segmentTextActive,
                      ]}
                    >
                      Meeting Rooms
                    </Text>
                  </Pressable>
                </View>
                <Pressable
                  accessibilityRole="button"
                  style={s.dateBar}
                  onPress={() => go("Select Date & Time")}
                >
                  <Icon name="calendar" size={17} />
                  <Text style={[ui.heading, { fontSize: 12, flex: 1 }]}>
                    {validDate ? dateLabel(start) : "Select date"} · {hours}{" "}
                    hours
                  </Text>
                  <Icon name="arrow" size={15} />
                </Pressable>
                <TextInput
                  accessibilityLabel="Search spaces"
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search a workspace"
                  style={ui.input}
                />
                <Chips
                  items={["All", "Favorites"]}
                  value={filter}
                  onChange={setFilter}
                />
                <ScrollView
                  horizontal
                  style={{ flexGrow: 0, flexShrink: 0 }}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {visibleSpaces.map((x) => (
                    <Pressable
                      accessibilityRole="button"
                      key={x.id}
                      onPress={() => {
                        setSelected(x.id);
                        setUnit(1);
                      }}
                      style={[ui.chip, selected === x.id && ui.chipSelected]}
                    >
                      <Text
                        style={[
                          ui.chipText,
                          selected === x.id && ui.chipTextSelected,
                        ]}
                      >
                        {x.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {visibleSpaces.length > 0 && (
                  <Card>
                    <Image source={space.image} style={s.stationImage} />
                    <Text style={s.planName}>{space.name}</Text>
                    <Text style={ui.body}>{space.description}</Text>
                    <View style={s.stationFeatures}>
                      {space.features.map((feature) => (
                        <View key={feature} style={s.stationFeature}>
                          <Icon name="check" size={12} color={palette.purple} />
                          <Text style={ui.caption}>{feature}</Text>
                        </View>
                      ))}
                    </View>
                  </Card>
                )}
                {!visibleSpaces.length ? (
                  <Card>
                    <Text style={ui.heading}>No matching spaces</Text>
                    <Text style={ui.body}>
                      Try another search or save a workspace to your favorites.
                    </Text>
                  </Card>
                ) : (
                  <>
                    <View style={s.floor}>
                      <View style={s.floorTop}>
                        <Text style={s.floorLabel}>
                          HQ · {space.name.toUpperCase()}
                        </Text>
                        <Icon name="wifi" size={14} color="#9A9BAB" />
                      </View>
                      <View style={s.seats}>
                        {Array.from(
                          { length: space.capacity },
                          (_, i) => i + 1,
                        ).map((n) => (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`${seatLabel(selected, n)} ${blocked.has(n) ? "booked" : "available"}`}
                            disabled={blocked.has(n)}
                            accessibilityState={{
                              selected: unit === n,
                              disabled: blocked.has(n),
                            }}
                            key={n}
                            onPress={() => setUnit(n)}
                            style={[
                              s.seat,
                              blocked.has(n) && s.seatBooked,
                              unit === n && !blocked.has(n) && s.seatSelected,
                            ]}
                          >
                            <Text
                              style={[
                                s.seatText,
                                unit === n &&
                                  !blocked.has(n) && { color: "white" },
                              ]}
                            >
                              {space.category === "Room" ? "R" : "D"}
                              {String(n).padStart(2, "0")}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      <View style={s.floorBottom}>
                        <Text style={s.floorLabel}>ENTRY</Text>
                        <Text style={s.floorLabel}>COMMON AREA</Text>
                        <Text style={s.floorLabel}>PANTRY</Text>
                      </View>
                    </View>
                    <View style={s.legend}>
                      {[
                        ["#D3F1DE", "Available"],
                        ["#DDDDE6", "Booked"],
                        [palette.purple, "Selected"],
                      ].map(([color, label]) => (
                        <View style={[ui.row, { gap: 5 }]} key={label}>
                          <View
                            style={{
                              height: 8,
                              width: 8,
                              borderRadius: 4,
                              backgroundColor: color,
                            }}
                          />
                          <Text style={ui.caption}>{label}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={ui.caption}>
                      Illustrative layout · your local demo inventory
                    </Text>
                    <Card>
                      <View style={ui.between}>
                        <Text style={ui.heading}>
                          {seatLabel(selected, unit)}
                        </Text>
                        <Badge
                          text={blocked.has(unit) ? "BOOKED" : "AVAILABLE"}
                          muted={blocked.has(unit)}
                        />
                      </View>
                      <Text style={ui.body}>{space.name}</Text>
                      <Text style={ui.heading}>{money(space.rate)} / hour</Text>
                      <View style={s.amenities}>
                        <View style={ui.row}>
                          <Icon name="wifi" size={13} />
                          <Text style={ui.caption}>Wi-Fi</Text>
                        </View>
                        <View style={ui.row}>
                          <Icon name="monitor" size={13} />
                          <Text style={ui.caption}>Power outlet</Text>
                        </View>
                        <Text style={ui.caption}>Comfortable seating</Text>
                      </View>
                      <Action
                        title="Select this space"
                        disabled={blocked.has(unit)}
                        onPress={() => go("Select Date & Time")}
                      />
                      <Action
                        title={
                          data.favorites.includes(selected)
                            ? "Remove from favorites"
                            : "Save to favorites"
                        }
                        secondary
                        disabled={locked}
                        onPress={() =>
                          void commit(
                            {
                              ...dataRef.current,
                              favorites: data.favorites.includes(selected)
                                ? data.favorites.filter((id) => id !== selected)
                                : [...data.favorites, selected],
                            },
                            "Favorites updated.",
                          )
                        }
                      />
                    </Card>
                  </>
                )}
              </>
            )}
            {screen === "Select Date & Time" && (
              <>
                <Card>
                  <Calendar
                    value={startText.slice(0, 10)}
                    onChange={(day) =>
                      setStartText(day + " " + startText.slice(11))
                    }
                  />
                </Card>
                <Section title="Select Time" />
                <View style={s.timeGrid}>
                  {Array.from({ length: 16 }, (_, i) => i + 6).map((h) => {
                    const t = String(h).padStart(2, "0") + ":00";
                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={h}
                        onPress={() =>
                          setStartText(startText.slice(0, 10) + " " + t)
                        }
                        style={[
                          s.time,
                          startText.slice(11) === t && s.segmentActive,
                        ]}
                      >
                        <Text
                          style={[
                            ui.chipText,
                            startText.slice(11) === t && { color: "white" },
                          ]}
                        >
                          {h % 12 || 12}:00 {h < 12 ? "AM" : "PM"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Section title="Duration" />
                <View style={s.dateBar}>
                  <Text style={[ui.heading, { flex: 1 }]}>{hours} hours</Text>
                  <Stepper
                    value={hours}
                    min={1}
                    max={12}
                    onChange={setBookingHours}
                  />
                </View>
                {laptopRental && (
                  <Text style={ui.caption}>
                    {laptopRental.label} laptop rental package selected ·{" "}
                    {money(laptopRental.price)}
                  </Text>
                )}
                <Text style={ui.caption}>
                  Iligan time (UTC+8). Select a future arrival time.
                </Text>
                <Action
                  title="Continue"
                  disabled={!validDate || start <= clock}
                  onPress={() => go("Booking Details")}
                />
              </>
            )}
            {screen === "Booking Details" && (
              <>
                <Card>
                  <Section title="Selected Space" />
                  {selectedSummary}
                </Card>
                <Card>
                  <Section
                    title="Date & Time"
                    action="Change"
                    onPress={() => go("Select Date & Time")}
                  />
                  {scheduleSummary}
                </Card>
                <Card>
                  <Section
                    title="Add-ons & Equipment"
                    action="Edit"
                    onPress={() => {
                      setEquipmentFirst(false);
                      go("Select Equipment");
                    }}
                  />
                  {addons.length ? (
                    equipment
                      .filter((e) => addons.includes(e.id))
                      .map((e) => (
                        <View style={ui.between} key={e.id}>
                          <View style={ui.row}>
                            <Icon
                              name={e.id === "laptop" ? "monitor" : "desk"}
                              size={19}
                            />
                            <View>
                              <Text style={ui.heading}>{e.name}</Text>
                              <Text style={ui.caption}>
                                {e.id === "laptop" && laptopRental
                                  ? `${laptopRental.label} package · ${money(laptopRental.price)}`
                                  : `${money(e.rate)}/hour`}
                              </Text>
                            </View>
                          </View>
                          <Text style={ui.body}>1</Text>
                        </View>
                      ))
                  ) : (
                    <Text style={ui.body}>
                      No equipment selected. Add a laptop, projector, or locker.
                    </Text>
                  )}
                </Card>
                <Card>
                  <Section title="Payment Summary" />
                  {promoEligible && (
                    <>
                      <Row label={promo!.name} value={money(promo!.price)} />
                      <Row label="Included" value={`${space.name} + laptop`} />
                      <Text style={ui.caption}>
                        {promo!.window} · fixed promo price
                      </Text>
                      <View style={ui.divider} />
                    </>
                  )}
                  <Row
                    label={`${hours} hours × ${money(space.rate)}`}
                    value={promoEligible ? money(0) : money(hours * space.rate)}
                  />
                  {addons.includes("laptop") && (
                    <Row
                      label={
                        laptopRental
                          ? `Laptop rental · ${laptopRental.label}`
                          : "Laptop rental"
                      }
                      value={promoEligible ? money(0) : money(laptopCost)}
                    />
                  )}
                  <Row
                    label="Other equipment & amenities"
                    value={promoEligible ? money(0) : money(hours * addonRate)}
                  />
                  <View style={ui.divider} />
                  <Row label="Total" value={money(total)} />
                  <Text style={ui.caption}>
                    Membership credits are not applied to demo bookings.
                  </Text>
                </Card>
                <Action
                  title="Continue to payment preview"
                  onPress={() => go("Payment Method")}
                />
              </>
            )}
            {screen === "Select Equipment" && (
              <>
                <Text style={ui.body}>
                  Make your workspace work for you. Equipment follows your
                  reserved hours.
                </Text>
                <View style={s.equipmentGrid}>
                  {equipment.map((e) => (
                    <View
                      style={[
                        ui.card,
                        s.equipment,
                        addons.includes(e.id) && s.selectedCard,
                      ]}
                      key={e.id}
                    >
                      <Icon
                        name={
                          e.id === "laptop"
                            ? "monitor"
                            : e.id === "locker"
                              ? "shield"
                              : "desk"
                        }
                        size={42}
                        color={
                          addons.includes(e.id) ? palette.purple : palette.navy
                        }
                      />
                      <Text style={ui.heading}>{e.name}</Text>
                      <Text style={ui.caption}>
                        {e.id === "laptop" && laptopRental
                          ? `${laptopRental.label} package · ${money(laptopRental.price)}`
                          : `${money(e.rate)} / hour`}
                      </Text>
                      <Stepper
                        value={addons.includes(e.id) ? 1 : 0}
                        onChange={(n) => {
                          if (e.id === "laptop") setLaptopRentalHours(0);
                          setAddons((a) =>
                            n
                              ? [...a.filter((x) => x !== e.id), e.id]
                              : a.filter((x) => x !== e.id),
                          );
                        }}
                      />
                    </View>
                  ))}
                </View>
                <Card>
                  <Row label="Laptop rental" value={money(laptopCost)} />
                  <Row label="Other add-ons" value={money(hours * addonRate)} />
                  <Text style={ui.caption}>
                    One of each item per booking · {hours} reserved hours
                  </Text>
                </Card>
                <Action
                  title={
                    equipmentFirst
                      ? "Choose a space & schedule"
                      : "Add to booking"
                  }
                  onPress={() => {
                    if (equipmentFirst) {
                      setEquipmentFirst(false);
                      go("Space Availability");
                    } else go("Booking Details");
                  }}
                />
              </>
            )}
            {screen === "Payment Method" && (
              <>
                <Card>
                  <Text style={ui.caption}>Total booking amount</Text>
                  <Text style={ui.amount}>{money(total)}</Text>
                </Card>
                <Section title="Choose Payment Method" />
                {(
                  [
                    [
                      "paypal_sandbox",
                      "PP",
                      "PayPal",
                      usesLivePayPal
                        ? "Securely sign in to PayPal to approve your payment."
                        : "Use your PayPal test personal account. No real money is charged.",
                    ],
                    [
                      "cash",
                      "₱",
                      "Cash Payment",
                      "Pay at HeadQuarters. Your reservation needs staff confirmation.",
                    ],
                  ] as const
                ).map(([method, mark, title, description]) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: payment === method }}
                    style={[
                      s.paymentMethod,
                      payment === method && s.selectedCard,
                    ]}
                    key={method}
                    onPress={() => setPayment(method)}
                  >
                    <View
                      style={[s.radio, payment === method && s.radioSelected]}
                    />
                    <View style={s.paymentLogo}>
                      <Text
                        style={{
                          color: palette.purple,
                          fontSize: 11,
                          fontWeight: "900",
                        }}
                      >
                        {mark}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={ui.heading}>{title}</Text>
                      <Text style={ui.caption}>{description}</Text>
                    </View>
                  </Pressable>
                ))}
                <View style={ui.notice}>
                  <Text style={ui.heading}>
                    {payment === "paypal_sandbox"
                      ? usesLivePayPal
                        ? "Secure PayPal checkout"
                        : "PayPal test checkout"
                      : "Pay cash at HeadQuarters"}
                  </Text>
                  <Text style={ui.body}>
                    {paymentNotice} A secure payment endpoint is required before
                    PayPal can mark a booking paid automatically.
                  </Text>
                </View>
                <Action
                  title={
                    payment === "paypal_sandbox"
                      ? "Continue with PayPal"
                      : "Create cash-payment reservation"
                  }
                  disabled={locked || !validDate || blocked.has(unit)}
                  onPress={() => startSelectedPayment("booking")}
                />
                <Pressable onPress={() => go("Help & Support")}>
                  <Text style={[ui.caption, { textAlign: "center" }]}>
                    View booking policies and support
                  </Text>
                </Pressable>
              </>
            )}
            {screen === "Booking Confirmed" && booking && (
              <>
                <View style={s.successArea}>
                  <View style={s.successCircle}>
                    <Icon name="check" size={34} color="white" />
                  </View>
                  <Text style={ui.heading}>
                    Your reservation request is created
                  </Text>
                  <Text style={ui.caption}>
                    Your space to work, meet, and create.
                  </Text>
                </View>
                <Card>
                  <Text style={[ui.caption, { textAlign: "center" }]}>
                    Booking ID
                  </Text>
                  <Text
                    selectable
                    style={[ui.heading, { textAlign: "center" }]}
                  >
                    {booking.id}
                  </Text>
                  <View style={ui.divider} />
                  <Row
                    label="Space"
                    value={
                      booking.unit
                        ? seatLabel(booking.spaceId, booking.unit)
                        : space.name
                    }
                  />
                  <Row label="Date" value={dateLabel(booking.start)} />
                  <Row
                    label="Time"
                    value={`${timeLabel(booking.start)} – ${timeLabel(booking.end)}`}
                  />
                  <Row label="Booking total" value={money(booking.total)} />
                  <Row
                    label="Payment method"
                    value={
                      booking.paymentMethod === "cash"
                        ? "Cash Payment"
                        : "PayPal"
                    }
                  />
                  <Badge
                    text={
                      booking.paymentMethod === "cash"
                        ? "PENDING CASH CONFIRMATION"
                        : "PAYPAL · TEST PAYMENT"
                    }
                    muted
                  />
                </Card>
                <Action
                  title="View booking details"
                  onPress={() => go("Visit Details")}
                />
                <Action
                  title="Go to my bookings"
                  secondary
                  onPress={() => go("Bookings")}
                />
              </>
            )}
            {screen === "Bookings" && (
              <>
                <View style={s.segment}>
                  {["Upcoming", "Past"].map((f) => (
                    <Pressable
                      key={f}
                      onPress={() => setBookingFilter(f)}
                      style={[
                        s.segmentItem,
                        bookingFilter === f && s.segmentActive,
                      ]}
                    >
                      <Text
                        style={[
                          s.segmentText,
                          bookingFilter === f && s.segmentTextActive,
                        ]}
                      >
                        {f}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {data.bookings
                  .filter((b) =>
                    bookingFilter === "Upcoming"
                      ? active(b) &&
                        (b.end > clock || b.status === "checked-in")
                      : !active(b) ||
                        (b.end <= clock && b.status !== "checked-in"),
                  )
                  .map((b) => bookingCard(b))}
                {!data.bookings.some((b) =>
                  bookingFilter === "Upcoming"
                    ? active(b) && (b.end > clock || b.status === "checked-in")
                    : !active(b) ||
                      (b.end <= clock && b.status !== "checked-in"),
                ) && (
                  <Card>
                    <Text style={ui.heading}>
                      No {bookingFilter.toLowerCase()} bookings
                    </Text>
                    <Text style={ui.body}>
                      Reserve a workspace and your visits will appear here.
                    </Text>
                    <Action
                      title="Explore spaces"
                      onPress={() => go("Space Availability")}
                    />
                  </Card>
                )}
              </>
            )}
            {[
              "Visit Details",
              "Booking Confirmed",
              "Cancellation & Refund",
            ].includes(screen) &&
              !booking && (
                <Card>
                  <Text style={ui.heading}>Select a reservation</Text>
                  <Text style={ui.body}>
                    Open a booking from your history to view its details.
                  </Text>
                  <Action
                    title="Open my bookings"
                    onPress={() => go("Bookings")}
                  />
                </Card>
              )}
            {screen === "Visit Details" && booking && (
              <>
                <Card>
                  <View style={ui.between}>
                    <Text style={ui.heading}>
                      {spaces.find((x) => x.id === booking.spaceId)?.name}
                    </Text>
                    <Badge text={booking.status.toUpperCase()} />
                  </View>
                  <Text selectable style={ui.caption}>
                    {booking.id}
                  </Text>
                  <Row label="Date" value={dateLabel(booking.start)} />
                  <Row
                    label="Time"
                    value={`${timeLabel(booking.start)} – ${timeLabel(booking.end)}`}
                  />
                  <Row label="Reserved hours" value={String(booking.hours)} />
                  <Row
                    label="Equipment"
                    value={booking.addons.join(", ") || "None"}
                  />
                  <Row label="Booking total" value={money(booking.total)} />
                  {booking.status === "completed" && (
                    <Row
                      label="Additional-hour bill"
                      value={money(booking.overtime || 0)}
                    />
                  )}
                  <Badge text="DEMO BOOKING" muted />
                </Card>
                <Action
                  title="Book this space again"
                  secondary
                  onPress={() => {
                    setCategoryValue(
                      booking.spaceId === "meeting" ? "Meeting Rooms" : "Desks",
                    );
                    setQuery("");
                    setFilter("All");
                    setSelected(booking.spaceId);
                    setUnit(booking.unit || 1);
                    setHours(booking.hours);
                    setAddons([...booking.addons]);
                    setStartText(initialStart());
                    go("Space Availability");
                  }}
                />
                {active(booking) && (
                  <Action
                    title={
                      booking.status === "checked-in"
                        ? "Check out"
                        : "Open check-in"
                    }
                    onPress={() => go("Check-in")}
                  />
                )}
                {booking.status === "reserved" && (
                  <Action
                    title="Cancellation & refund"
                    secondary
                    onPress={() => go("Cancellation & Refund")}
                  />
                )}
              </>
            )}
            {screen === "Check-in" && (
              <>
                {(booking && active(booking) ? booking : current) ? (
                  (() => {
                    const b = booking && active(booking) ? booking : current!;
                    return (
                      <>
                        <View style={s.successArea}>
                          <View
                            style={[
                              s.successCircle,
                              {
                                backgroundColor:
                                  b.status === "checked-in"
                                    ? palette.green
                                    : "#F0EAFD",
                              },
                            ]}
                          >
                            <Icon
                              name={
                                b.status === "checked-in" ? "check" : "scan"
                              }
                              size={30}
                              color={
                                b.status === "checked-in"
                                  ? "white"
                                  : palette.purple
                              }
                            />
                          </View>
                          <Text style={ui.heading}>
                            {b.status === "checked-in"
                              ? "You’re checked in"
                              : "Your workspace access"}
                          </Text>
                          <Text style={ui.caption}>
                            Welcome to HeadQuarters Iligan
                          </Text>
                        </View>
                        <Card>
                          <View style={s.accessPass}>
                            <Text style={ui.heading}>
                              {b.status === "checked-in" ? "Access checked in" : "Secure QR access pass"}
                            </Text>
                            {accessPass ? (
                              <View style={s.qrFrame}>
                                <QRCode value={`HQ1:${accessPass.token}`} size={188} color={palette.navy} backgroundColor="white" />
                              </View>
                            ) : (
                              <Icon name="scan" size={68} color={palette.purple} />
                            )}
                            <Text style={ui.heading}>
                              {spaces.find((x) => x.id === b.spaceId)?.name}
                            </Text>
                            <Text style={ui.body}>
                              {dateLabel(b.start)} · {timeLabel(b.start)}
                            </Text>
                          </View>
                          <Text style={ui.caption}>
                            {accessPass
                              ? `Valid until ${new Date(accessPass.validUntil).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}. Present this QR to staff.`
                              : "A paid reservation can receive a secure QR pass for staff validation."}
                          </Text>
                        </Card>
                        {b.status === "reserved" && (
                          <Action
                            title={accessPass ? "Refresh secure QR pass" : "Generate secure QR pass"}
                            disabled={locked || b.paymentStatus !== "paid"}
                            onPress={() => void requestAccessPass(b)}
                          />
                        )}
                        <Text style={[ui.caption, { textAlign: "center" }]}>
                          Staff scans the QR during your booked time. Extra time is billed per started hour.
                        </Text>
                      </>
                    );
                  })()
                ) : (
                  <Card>
                    <Text style={ui.heading}>No active reservation</Text>
                    <Text style={ui.body}>
                      Book your space before checking in.
                    </Text>
                    <Action
                      title="Reserve a space"
                      onPress={() => go("Space Availability")}
                    />
                  </Card>
                )}
              </>
            )}
            {screen === "Cancellation & Refund" && booking && (
              <>
                <Card>
                  <Text style={ui.caption}>Booking ID: {booking.id}</Text>
                  <Text style={ui.heading}>
                    {spaces.find((x) => x.id === booking.spaceId)?.name}
                  </Text>
                  <Text style={ui.body}>
                    {dateLabel(booking.start)} · {timeLabel(booking.start)}
                  </Text>
                </Card>
                <Card>
                  <Section title="Cancellation Policy" />
                  <Text style={ui.body}>
                    • Cancel at least 24 hours before arrival for a full demo
                    refund estimate.{"\n"}• Later cancellations have no refund.
                    {"\n"}• Checked-in and completed visits cannot be cancelled.
                  </Text>
                  <View style={ui.divider} />
                  <Row
                    label="Estimated refund"
                    value={money(cancellationRefund(booking, clock))}
                  />
                  <Text style={ui.caption}>
                    No money was collected, so no funds will be returned.
                  </Text>
                </Card>
                <Action
                  title="Confirm cancellation"
                  danger
                  disabled={locked || booking.status !== "reserved"}
                  onPress={() => void updateBooking(booking, "cancel")}
                />
                <Action
                  title="Keep my booking"
                  secondary
                  onPress={() => go("Visit Details")}
                />
              </>
            )}
            {screen === "Station + Laptop Promo" && (
              <>
                <Card>
                  <View style={ui.row}>
                    <View style={s.promoIcon}>
                      <Icon name="monitor" color="white" size={22} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={s.planName}>Station + Laptop Promo</Text>
                      <Text style={ui.body}>
                        Every offer includes one station, one laptop, Wi-Fi, and
                        power.
                      </Text>
                    </View>
                  </View>
                </Card>
                <Section title="Day & overnight passes" />
                {stationLaptopPromos
                  .filter((item) => item.hours === 12)
                  .map((item) => (
                    <Card key={item.id}>
                      <View style={ui.between}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={ui.heading}>{item.name}</Text>
                          <Text style={ui.caption}>{item.window}</Text>
                        </View>
                        <Text style={ui.amount}>{money(item.price)}</Text>
                      </View>
                      <Text style={ui.body}>
                        {spaces.find((x) => x.id === item.spaceId)?.name} ·
                        laptop included · 12 hours
                      </Text>
                      <Action
                        title="Select this promo"
                        onPress={() => choosePromo(item.id)}
                      />
                    </Card>
                  ))}
                <Section title="Open-time 5-hour passes" />
                {stationLaptopPromos
                  .filter((item) => item.hours === 5)
                  .map((item) => (
                    <Card key={item.id}>
                      <View style={ui.between}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={ui.heading}>{item.name}</Text>
                          <Text style={ui.caption}>{item.window}</Text>
                        </View>
                        <Text style={ui.amount}>{money(item.price)}</Text>
                      </View>
                      <Text style={ui.body}>
                        {spaces.find((x) => x.id === item.spaceId)?.name} ·
                        laptop included · 5 hours
                      </Text>
                      <Action
                        title="Select this promo"
                        onPress={() => choosePromo(item.id)}
                      />
                    </Card>
                  ))}
                <Card>
                  <Section title="Need more flexibility?" />
                  <Row label="Standard Station" value={`${money(45)} / hour`} />
                  <Row label="Private Station" value={`${money(60)} / hour`} />
                  <Text style={ui.caption}>
                    Use a regular workspace booking for open-time hourly
                    reservations or extra equipment.
                  </Text>
                  <Action
                    title="Book hourly workspace"
                    secondary
                    onPress={() => {
                      setPromoId("");
                      setAddons([]);
                      setHours(3);
                      go("Space Availability");
                    }}
                  />
                </Card>
              </>
            )}
            {screen === "Laptop Rental" && (
              <>
                <Card>
                  <View style={ui.row}>
                    <View style={s.laptopIcon}>
                      <Icon name="monitor" color={palette.navy} size={24} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={s.planName}>Laptop Rental</Text>
                      <Text style={ui.body}>
                        Tubod Branch only · daily and monthly rentals
                      </Text>
                    </View>
                  </View>
                  <Text style={ui.caption}>
                    Reserve a laptop with a workspace booking. Availability is
                    checked when you confirm the booking.
                  </Text>
                </Card>
                <Section title="Device specifications" />
                <Card>
                  <View style={s.specGrid}>
                    {laptopSpecifications.map((spec) => (
                      <View key={spec} style={s.specChip}>
                        <Icon name="check" size={13} color={palette.purple} />
                        <Text style={s.specText}>{spec}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
                <Section title="Rental packages" />
                {laptopRentalRates.map((rate) => (
                  <Card key={rate.hours}>
                    <View style={ui.between}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={ui.heading}>{rate.label}</Text>
                        <Text style={ui.caption}>
                          Laptop rental package · Tubod Branch
                        </Text>
                      </View>
                      <Text style={ui.amount}>{money(rate.price)}</Text>
                    </View>
                    <Action
                      title={`Add ${rate.label} rental to booking`}
                      onPress={() => chooseLaptopRental(rate.hours)}
                    />
                  </Card>
                ))}
                <Section title="Monthly rental" />
                <Card>
                  <Text style={ui.amount}>{laptopMonthlyRate}</Text>
                  <Text style={ui.body}>Monthly rental rate range</Text>
                  <Text style={ui.caption}>
                    Exact monthly price and availability depend on the assigned
                    device. Please contact HeadQuarters Tubod Branch to arrange
                    a monthly rental.
                  </Text>
                </Card>
                <Text style={[ui.caption, { textAlign: "center" }]}>
                  Rates and specifications shown are for Tubod Branch only.
                </Text>
              </>
            )}
            {screen === "Membership Plans" && (
              <>
                <Card>
                  <Text style={s.planName}>Subscriptions & Passes</Text>
                  <Text style={ui.body}>
                    Choose your workspace, then compare its matching passes.
                  </Text>
                  <Text style={ui.caption}>
                    Students receive 5% off subscriptions and 10% off hourly
                    passes with a valid ID.
                  </Text>
                </Card>
                {membership && (
                  <View style={s.memberHero}>
                    <View style={ui.between}>
                      <Icon name="card" color="white" />
                      <Badge text="ACTIVE" />
                    </View>
                    <Text style={s.memberName}>{plan?.name}</Text>
                    <Text style={s.memberMeta}>
                      {plan?.unlimited
                        ? "Unlimited access"
                        : `${membership.remaining} pass hours`}{" "}
                      · until {dateLabel(membership.expires)}
                    </Text>
                  </View>
                )}
                <Section title="Choose a station" />
                {(() => {
                  const groups = [
                    [
                      "standard",
                      "Standard Stations",
                      "Open-space focus · ergonomic chairs",
                    ],
                    [
                      "private",
                      "Private Stations",
                      "Enclosed, quiet space · upgraded ergonomic chair",
                    ],
                    [
                      "meeting",
                      "Huddle Room",
                      "Hourly group space · 2+ people · own aircon",
                    ],
                    [
                      "premium-solo",
                      "Premium Solo",
                      "Private subscription workspace",
                    ],
                    [
                      "premium-trio",
                      "Premium Trio",
                      "Private group subscription workspace",
                    ],
                    [
                      "lifting-table",
                      "Lifting Table",
                      "Height-adjustable work setup",
                    ],
                    [
                      "collab-area",
                      "Collab Area",
                      "Shared collaborative workspace",
                    ],
                    ["lounge-area", "Lounge Area", "Relaxed shared workspace"],
                  ] as const;
                  const current = groups.find(([id]) => id === passGroup)!;
                  const baseOffers = plans.filter(
                    (p) => p.spaceId === passGroup,
                  );
                  const offers = baseOffers
                    .filter((p) =>
                      passDuration === "Hours"
                        ? p.days === 1
                        : passDuration === "Week"
                          ? p.days === 7
                          : p.days === 30,
                    )
                    .sort(
                      (a, b) =>
                        a.days - b.days || (a.hours || 999) - (b.hours || 999),
                    );
                  return (
                    <>
                      <View style={s.passTabs}>
                        {groups.map(([id, title]) => (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ selected: passGroup === id }}
                            key={id}
                            onPress={() => {
                              setPassGroup(id);
                              setPassDuration(
                                id === "standard" ||
                                  id === "private" ||
                                  id === "meeting"
                                  ? "Hours"
                                  : "Week",
                              );
                            }}
                            style={[
                              s.passTab,
                              passGroup === id && s.passTabActive,
                            ]}
                          >
                            <Text
                              style={[
                                s.passTabText,
                                passGroup === id && s.passTabTextActive,
                              ]}
                            >
                              {title}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      <Text style={s.durationLabel}>Choose pass length</Text>
                      <View style={s.durationTabs}>
                        {(["Hours", "Week", "Month"] as const).map(
                          (duration) => {
                            const available = baseOffers.some((p) =>
                              duration === "Hours"
                                ? p.days === 1
                                : duration === "Week"
                                  ? p.days === 7
                                  : p.days === 30,
                            );
                            return (
                              <Pressable
                                accessibilityRole="button"
                                accessibilityState={{
                                  selected: passDuration === duration,
                                  disabled: !available,
                                }}
                                disabled={!available}
                                key={duration}
                                onPress={() => setPassDuration(duration)}
                                style={[
                                  s.durationTab,
                                  passDuration === duration &&
                                    s.durationTabActive,
                                  !available && s.durationTabDisabled,
                                ]}
                              >
                                <Text
                                  style={[
                                    s.durationTabText,
                                    passDuration === duration &&
                                      s.durationTabTextActive,
                                    !available && s.durationTabTextDisabled,
                                  ]}
                                >
                                  {duration}
                                </Text>
                              </Pressable>
                            );
                          },
                        )}
                      </View>
                      <View
                        style={[
                          s.passGroup,
                          passGroup === "standard"
                            ? s.standardGroup
                            : passGroup === "private"
                              ? s.privateGroup
                              : s.huddleGroup,
                        ]}
                      >
                        <View style={s.passGroupHeader}>
                          <View style={s.passGroupIcon}>
                            <Icon
                              name={passGroup === "meeting" ? "desk" : "card"}
                              color="white"
                              size={19}
                            />
                          </View>
                          <View style={{ flex: 1, gap: 3 }}>
                            <Text style={s.passGroupTitle}>{current[1]}</Text>
                            <Text style={s.passGroupDetail}>{current[2]}</Text>
                          </View>
                          <Text style={s.passGroupCount}>
                            {offers.length} offers
                          </Text>
                        </View>
                        {offers.map((p) => (
                          <View key={p.id} style={s.passCard}>
                            <View style={ui.between}>
                              <View style={{ flex: 1, gap: 4 }}>
                                <Text style={ui.heading}>
                                  {p.name.replace(`${current[1]} `, "")}
                                </Text>
                                <Text style={ui.caption}>
                                  {p.unlimited
                                    ? `Unlimited use for ${p.days === 7 ? "the entire week" : "the entire month"}`
                                    : `${p.hours} pass hours · ${p.days}-day validity`}
                                </Text>
                              </View>
                              {p.discount > 0 && (
                                <Badge text={`${p.discount}% OFF`} muted />
                              )}
                            </View>
                            <View style={ui.between}>
                              <Text style={s.originalPrice}>
                                {money(p.originalPrice)}
                              </Text>
                              <Text style={ui.amount}>{money(p.price)}</Text>
                            </View>
                            {p.freeHours > 0 && (
                              <Text style={ui.body}>
                                Includes {p.freeHours} free hour
                                {p.freeHours === 1 ? "" : "s"}.
                              </Text>
                            )}
                            {passGroup === "meeting" && (
                              <Text style={ui.caption}>
                                Free-hours promotion does not apply to Huddle
                                Room passes.
                              </Text>
                            )}
                            <Action
                              title={
                                membership?.planId === p.id
                                  ? "Renew pass"
                                  : "Select this offer"
                              }
                              secondary
                              disabled={
                                !!membership && membership.planId !== p.id
                              }
                              onPress={() => {
                                setRenewPlan(p.id);
                                setStudentDiscount(false);
                                go("Membership Renewal");
                              }}
                            />
                          </View>
                        ))}
                      </View>
                    </>
                  );
                })()}
                <Text style={ui.caption}>
                  Rates are shown before the optional student discount. Passes
                  are for the subscribed person only; companions and
                  substitutions are not allowed.
                </Text>
              </>
            )}
            {screen === "Membership Renewal" &&
              (() => {
                const p = plans.find((x) => x.id === renewPlan)!;
                const studentRate = p.days > 1 ? 5 : 10;
                const price = studentDiscount
                  ? Math.round(p.price * (100 - studentRate)) / 100
                  : p.price;
                return (
                  <>
                    <View style={s.memberHero}>
                      <Icon name="card" color="white" />
                      <Text style={s.memberName}>{p.name}</Text>
                      <Text style={s.memberMeta}>
                        {p.unlimited
                          ? "Unlimited access"
                          : `${p.hours} pass hours`}{" "}
                        · {p.days}-day validity
                      </Text>
                    </View>
                    <Section
                      title={membership ? "Renew your pass" : "Start your pass"}
                    />
                    <Card>
                      <Row label="Offer price" value={money(p.price)} />
                      <Row
                        label="Regular price"
                        value={money(p.originalPrice)}
                      />
                      {p.discount > 0 && (
                        <Row
                          label="Included discount"
                          value={`${p.discount}% off`}
                        />
                      )}
                      {p.freeHours > 0 && (
                        <Row
                          label="Bonus"
                          value={`${p.freeHours} free hour${p.freeHours === 1 ? "" : "s"}`}
                        />
                      )}
                      {p.spaceId === "meeting" && (
                        <Text style={ui.caption}>
                          Huddle Room passes do not include free hours.
                        </Text>
                      )}
                      <View style={ui.divider} />
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: studentDiscount }}
                        onPress={() => setStudentDiscount((value) => !value)}
                        style={[
                          s.studentChoice,
                          studentDiscount && s.studentChoiceActive,
                        ]}
                      >
                        <Icon
                          name={studentDiscount ? "check" : "card"}
                          size={17}
                          color={studentDiscount ? "white" : palette.purple}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              ui.heading,
                              studentDiscount && { color: "white" },
                            ]}
                          >
                            Student discount
                          </Text>
                          <Text
                            style={[
                              ui.caption,
                              studentDiscount && { color: "#EEE7FF" },
                            ]}
                          >
                            Apply an extra {studentRate}% with a valid student
                            ID
                          </Text>
                        </View>
                      </Pressable>
                      {studentDiscount && (
                        <Row
                          label="Student discount"
                          value={`−${money(p.price - price)}`}
                        />
                      )}
                      <Row
                        label="New expiry date"
                        value={dateLabel(
                          (membership?.expires || Date.now()) +
                            p.days * 24 * HOUR,
                        )}
                      />
                      <View style={ui.divider} />
                      <Row label="Total amount" value={money(price)} />
                    </Card>
                    <Section title="Payment method" />
                    {(
                      [
                        [
                          "paypal_sandbox",
                          "PayPal",
                          usesLivePayPal
                            ? "Secure checkout through PayPal."
                            : "Test checkout · no real money is charged.",
                        ],
                        [
                          "cash",
                          "Cash Payment",
                          "Pay at HeadQuarters · staff confirmation required.",
                        ],
                      ] as const
                    ).map(([method, title, description]) => (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ selected: payment === method }}
                        style={[
                          s.paymentMethod,
                          payment === method && s.selectedCard,
                        ]}
                        key={method}
                        onPress={() => setPayment(method)}
                      >
                        <View
                          style={[
                            s.radio,
                            payment === method && s.radioSelected,
                          ]}
                        />
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text style={ui.heading}>{title}</Text>
                          <Text style={ui.caption}>{description}</Text>
                        </View>
                      </Pressable>
                    ))}
                    <View style={ui.notice}>
                      <Text style={ui.body}>
                        {studentDiscount
                          ? "Bring your valid student ID for staff verification. "
                          : ""}
                        {paymentNotice}
                      </Text>
                    </View>
                    <Action
                      title={
                        membership
                          ? payment === "paypal_sandbox"
                            ? "Continue renewal with PayPal"
                            : "Create cash-payment renewal"
                          : payment === "paypal_sandbox"
                            ? "Continue with PayPal"
                            : "Create cash-payment subscription"
                      }
                      disabled={locked}
                      onPress={() => startSelectedPayment("membership")}
                    />
                  </>
                );
              })()}
            {screen === "Payments" && (
              <>
                <Card>
                  <Text style={ui.caption}>Reservation value</Text>
                  <Text style={[ui.amount, { color: palette.navy }]}>
                    {money(
                      data.bookings
                        .filter((b) => b.status !== "cancelled")
                        .reduce((n, b) => n + b.total + (b.overtime || 0), 0),
                    )}
                  </Text>
                  <Text style={ui.caption}>
                    {usesLivePayPal
                      ? "PayPal payments are processed securely; cash requests require staff confirmation."
                      : "PayPal test payments do not use real money; cash requests require staff confirmation."}
                  </Text>
                </Card>
                <Section title="Transaction requests" />
                {data.bookings.map((b) => (
                  <Pressable
                    accessibilityRole="button"
                    key={b.id}
                    onPress={() => openVisit(b)}
                    style={s.transaction}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={ui.heading}>
                        {spaces.find((x) => x.id === b.spaceId)?.name}
                      </Text>
                      <Text style={ui.caption}>
                        {dateLabel(b.created)} · {b.hours} reserved hours ·{" "}
                        {b.paymentMethod === "cash"
                          ? "Cash Payment"
                          : "PayPal"}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 5 }}>
                      <Text style={ui.heading}>{money(b.total)}</Text>
                      <Badge
                        text={
                          b.paymentMethod === "cash"
                            ? "CASH PENDING"
                            : usesLivePayPal
                              ? "PAYPAL PAID"
                              : "PAYPAL TEST"
                        }
                        muted
                      />
                    </View>
                  </Pressable>
                ))}
                {data.purchases.map((p) => (
                  <View style={s.transaction} key={p.id}>
                    <View style={{ flex: 1 }}>
                      <Text style={ui.heading}>{p.title}</Text>
                      <Text style={ui.caption}>
                        {dateLabel(p.created)} ·{" "}
                        {p.paymentMethod === "cash"
                          ? "Cash Payment"
                          : "PayPal"}
                      </Text>
                    </View>
                    <Text style={ui.heading}>{money(p.amount)}</Text>
                  </View>
                ))}
                {!data.bookings.length && !data.purchases.length && (
                  <Card>
                    <Text style={ui.body}>
                      Your booking and membership transaction requests will
                      appear here.
                    </Text>
                  </Card>
                )}
                <Card>
                  <MenuRow
                    icon="card"
                    title="Payment methods"
                    description={usesLivePayPal ? "PayPal and Cash Payment" : "PayPal (test) and Cash Payment"}
                    onPress={() =>
                      setMessage(
                        usesLivePayPal
                          ? "PayPal payments are processed securely. Cash requests must be confirmed by staff."
                          : "PayPal test payments do not use real money. Cash requests must be confirmed by staff.",
                      )
                    }
                  />
                </Card>
              </>
            )}
            {screen === "Notifications" && (
              <>
                {upcoming && (
                  <Card>
                    <Section title="Next visit reminder" />
                    <Text style={ui.heading}>
                      {spaces.find((x) => x.id === upcoming.spaceId)?.name}
                    </Text>
                    <Text style={ui.body}>
                      {dateLabel(upcoming.start)} · {timeLabel(upcoming.start)}
                    </Text>
                    <Action
                      title="View reservation"
                      onPress={() => openVisit(upcoming)}
                    />
                  </Card>
                )}
                {membership && membership.expires - clock <= 7 * 24 * HOUR && (
                  <Card>
                    <Text style={ui.heading}>Your membership expires soon</Text>
                    <Text style={ui.body}>
                      Valid until {dateLabel(membership.expires)}
                    </Text>
                    <Action
                      title="Review renewal options"
                      onPress={() => go("Membership Plans")}
                    />
                  </Card>
                )}
                <Chips
                  items={["All updates"]}
                  value="All updates"
                  onChange={() => {}}
                />
                {data.notices.map((notice, i) => (
                  <View key={i} style={s.transaction}>
                    <View style={s.featureIcon}>
                      <Icon name="bell" size={17} color={palette.purple} />
                    </View>
                    <Text style={[ui.body, { flex: 1, color: palette.navy }]}>
                      {notice}
                    </Text>
                  </View>
                ))}
                {!data.notices.length && (
                  <Card>
                    <Text style={ui.heading}>You’re all caught up</Text>
                    <Text style={ui.body}>
                      Booking and membership updates will appear here.
                    </Text>
                  </Card>
                )}
                <Text style={ui.caption}>
                  In-app history saved on this device. Push notifications are
                  not connected.
                </Text>
              </>
            )}
            {screen === "Profile" && (
              <>
                <View style={s.memberHero}>
                  <View style={ui.row}>
                    <View style={s.avatar}>
                      <Text
                        style={{
                          fontSize: 23,
                          color: palette.purple,
                          fontWeight: "800",
                        }}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={s.memberName}>{member.name}</Text>
                      <Text style={s.memberMeta}>{member.email}</Text>
                      <Text style={s.memberMeta}>{member.mobile}</Text>
                    </View>
                  </View>
                </View>
                <Section title="Membership" />
                <Pressable
                  accessibilityRole="button"
                  style={s.membershipStrip}
                  onPress={() => go("Membership Plans")}
                >
                  <View style={{ gap: 5, flex: 1 }}>
                    <Text style={ui.heading}>
                      {plan?.name || "No active plan"}
                    </Text>
                    <Text style={ui.caption}>
                      {membership
                        ? `Valid until ${dateLabel(membership.expires)}`
                        : "Explore daily passes and memberships"}
                    </Text>
                  </View>
                  <Text style={ui.link}>
                    {membership ? "Renew Now" : "View Plans"} ›
                  </Text>
                </Pressable>
                <Section title="Account" />
                <Card>
                  <MenuRow
                    icon="desk"
                    title="All features"
                    onPress={() => go("Features")}
                  />
                  <MenuRow
                    icon="clock"
                    title="My usage & activity"
                    onPress={() => go("My Usage")}
                  />
                  <MenuRow
                    icon="wallet"
                    title="Payments & billing"
                    onPress={() => go("Payments")}
                  />
                  <MenuRow
                    icon="calendar"
                    title="Booking history"
                    onPress={() => go("Bookings")}
                  />
                  <MenuRow
                    icon="card"
                    title="Membership renewal"
                    onPress={() => go("Membership Plans")}
                  />
                  <MenuRow
                    icon="bell"
                    title="Notifications"
                    onPress={() => go("Notifications")}
                  />
                  <MenuRow
                    icon="help"
                    title="Help & support"
                    onPress={() => go("Help & Support")}
                  />
                  <MenuRow
                    icon="shield"
                    title="Staff portal"
                    description="Requires an assigned Supabase staff role"
                    onPress={() => router.push("/admin")}
                  />
                </Card>
                <Badge
                  text={
                    member.verified ? "EMAIL VERIFIED" : "EMAIL NOT VERIFIED"
                  }
                  muted={!member.verified}
                />
                <Action
                  title={saving ? "Signing out…" : "Sign out"}
                  secondary
                  disabled={saving}
                  onPress={() => {
                    setSaving(true);
                    void signOut().catch((e) => {
                      setMessage(authError(e));
                      setSaving(false);
                    });
                  }}
                />
                <Text style={[ui.caption, { textAlign: "center" }]}>
                  HeadQuarters Iligan · Version 1.0.0
                </Text>
              </>
            )}
            {screen === "Features" && (
              <>
                <Card>
                  <Text style={ui.heading}>HeadQuarters Iligan</Text>
                  <Text style={ui.body}>
                    Coworking Reservation and Membership System
                  </Text>
                  <Text style={ui.caption}>
                    Local demo features. Staff tools use a separate connected
                    database.
                  </Text>
                </Card>
                <Card>
                  {(
                    [
                      [
                        "monitor",
                        "Station + laptop promos",
                        "Station + Laptop Promo",
                      ],
                      [
                        "monitor",
                        "Laptop rental rates & specifications",
                        "Laptop Rental",
                      ],
                      [
                        "desk",
                        "Reserve desks & meeting rooms",
                        "Space Availability",
                      ],
                      [
                        "card",
                        "Daily passes & memberships",
                        "Membership Plans",
                      ],
                      [
                        "calendar",
                        "My reservations & cancellation",
                        "Bookings",
                      ],
                      ["scan", "Check-in & additional hours", "Check-in"],
                      ["wallet", "Payments & receipts", "Payments"],
                      ["bell", "Updates & visit reminders", "Notifications"],
                      ["clock", "My usage & activity", "My Usage"],
                      ["help", "Rules & support", "Help & Support"],
                    ] as [IconName, string, Screen][]
                  ).map(([icon, title, target]) => (
                    <MenuRow
                      key={target}
                      icon={icon}
                      title={title}
                      onPress={() => go(target)}
                    />
                  ))}
                </Card>
                <Card>
                  <MenuRow
                    icon="star"
                    title="Saved workspaces"
                    description="Quickly find your favorite desks and rooms"
                    onPress={() => {
                      setQuery("");
                      setFilter("Favorites");
                      go("Space Availability");
                    }}
                  />
                  <MenuRow
                    icon="monitor"
                    title="Equipment & amenities"
                    description="Select add-ons, then choose a space and schedule"
                    onPress={() => {
                      setEquipmentFirst(true);
                      go("Select Equipment");
                    }}
                  />
                  <MenuRow
                    icon="shield"
                    title="Facility management & reports"
                    description="Capacity, members, refunds, revenue, and audit history · staff role required"
                    onPress={() => router.push("/admin")}
                  />
                </Card>
              </>
            )}
            {screen === "My Usage" && (
              <>
                <Card>
                  <Section title="Your activity on this device" />
                  <Row
                    label="Completed visits"
                    value={String(
                      data.bookings.filter((b) => b.status === "completed")
                        .length,
                    )}
                  />
                  <Row
                    label="Completed reserved hours"
                    value={String(
                      data.bookings
                        .filter((b) => b.status === "completed")
                        .reduce((n, b) => n + b.hours, 0),
                    )}
                  />
                  <Row
                    label="Upcoming reservations"
                    value={String(
                      data.bookings.filter(
                        (b) => b.status === "reserved" && b.end > clock,
                      ).length,
                    )}
                  />
                  <Row
                    label="Saved workspaces"
                    value={String(data.favorites.length)}
                  />
                  <Row
                    label="Additional-hour estimates"
                    value={money(
                      data.bookings.reduce((n, b) => n + (b.overtime || 0), 0),
                    )}
                  />
                  <Text style={ui.caption}>
                    Demo activity only. These totals are not facility revenue
                    reports.
                  </Text>
                </Card>
                <Action
                  title="View booking history"
                  onPress={() => go("Bookings")}
                />
                <Action
                  title="Manage membership"
                  secondary
                  onPress={() => go("Membership Plans")}
                />
              </>
            )}
            {screen === "Help & Support" && (
              <>
                <View style={s.supportHero}>
                  <Icon name="help" size={48} color={palette.purple} />
                  <Text style={s.planName}>How can we help you?</Text>
                  <Text style={[ui.body, { textAlign: "center" }]}>
                    Your space to work, connect, and grow.
                  </Text>
                </View>
                <Card>
                  <Section title="Booking & cancellation" />
                  <Text style={ui.body}>
                    Choose a space, date, and equipment, then review the total.
                    Cancel at least 24 hours before arrival for a full demo
                    refund estimate. Additional time is billed per started hour.
                  </Text>
                </Card>
                <Card>
                  <Section title="Your account & privacy" />
                  <Text style={ui.body}>
                    Login uses Supabase Authentication. Demo bookings and
                    memberships are stored on this device for your account. They
                    do not sync with the staff database or other devices.
                  </Text>
                </Card>
                <Card>
                  <Section title="Payments & access" />
                  <Text style={ui.body}>
                    Digital payments, push notifications, and signed QR access
                    are not connected. No card details are stored, no money is
                    charged, and the manual demo pass is not a valid entrance
                    credential.
                  </Text>
                </Card>
                <Action
                  title="Back to my profile"
                  secondary
                  onPress={() => go("Profile")}
                />
              </>
            )}
          </ScrollView>
        </Animated.View>
        <BottomNav
          selected={activeNav}
          onSelect={(value) => {
            if (value === "Check-in") setBookingId(current?.id || "");
            history.current = [];
            show(value as Screen);
          }}
        />
        <Modal
          visible={paypalCheckout !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setPaypalCheckout(null)}
        >
          <View style={s.checkoutModalBackdrop}>
            {paypalCheckout?.stage === "checkout" && paypalCheckout.order ? (
              <View style={s.paypalWebSheet}>
                <View style={s.checkoutModalHeader}>
                  <Text style={s.checkoutModalTitle}>PayPal checkout</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancel PayPal checkout"
                    onPress={() => setPaypalCheckout(null)}
                  >
                    <Text style={ui.link}>Cancel</Text>
                  </Pressable>
                </View>
                <Text style={s.paypalWebHint}>
                  Complete the payment below. HeadQuarters will confirm it automatically.
                </Text>
                <WebView
                  source={{ uri: paypalCheckout.order.approveUrl }}
                  originWhitelist={["https://*", "http://*", "headquartersapp://*"]}
                  startInLoadingState
                  renderLoading={() => (
                    <View style={s.paypalWebLoading}>
                      <Text style={ui.caption}>Loading secure PayPal checkout…</Text>
                    </View>
                  )}
                  onShouldStartLoadWithRequest={(request) => {
                    if (request.url.startsWith("headquartersapp://paypal-return")) {
                      void finishEmbeddedPayPalCheckout(request.url);
                      return false;
                    }
                    return true;
                  }}
                  onNavigationStateChange={(state) => {
                    if (state.url.startsWith("headquartersapp://paypal-return")) {
                      void finishEmbeddedPayPalCheckout(state.url);
                    }
                  }}
                />
              </View>
            ) : (
              <>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  accessibilityRole="button"
                  accessibilityLabel="Close PayPal checkout"
                  onPress={() => setPaypalCheckout(null)}
                />
                <View style={s.checkoutModalSheet}>
                  <View style={s.checkoutModalHandle} />
                  <View style={s.checkoutModalIcon}>
                    <Text style={s.checkoutModalIconText}>PP</Text>
                  </View>
                  <Text style={s.checkoutModalTitle}>Pay with PayPal</Text>
                  <Text style={s.checkoutModalBody}>
                    {usesLivePayPal
                      ? "A secure PayPal checkout will open inside HeadQuarters. After approval, your payment is confirmed automatically."
                      : "A PayPal Sandbox test checkout will open inside HeadQuarters. No real money is charged."}
                  </Text>
                  <View style={s.checkoutModalSummary}>
                    <Text style={ui.caption}>Amount due</Text>
                    <Text style={ui.amount}>
                      {paypalCheckout?.kind === "booking"
                        ? money(total)
                        : money(plans.find((item) => item.id === renewPlan)?.price || 0)}
                    </Text>
                  </View>
                  <Action
                    title={saving ? "Opening PayPal…" : "Continue to PayPal"}
                    disabled={saving}
                    onPress={() => void confirmPayPalCheckout()}
                  />
                  <Action
                    title="Cancel"
                    secondary
                    onPress={() => setPaypalCheckout(null)}
                  />
                </View>
              </>
            )}
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  homeHero: {
    backgroundColor: palette.navy,
    paddingHorizontal: 18,
    paddingTop: 5,
    paddingBottom: 31,
    gap: 8,
  },
  greeting: { fontSize: 19, fontWeight: "800", color: "white", marginTop: 2 },
  welcome: { fontSize: 11, color: "#D7D9E7", marginBottom: 8 },
  banner: {
    height: 142,
    width: "100%",
    overflow: "hidden",
    borderRadius: 12,
    justifyContent: "flex-end",
  },
  bannerShade: {
    backgroundColor: "rgba(12,15,32,0.38)",
    padding: 16,
    borderRadius: 12,
    gap: 14,
  },
  hq: { fontSize: 40, fontWeight: "900", color: "white", letterSpacing: -3 },
  bannerName: {
    fontSize: 14,
    fontWeight: "900",
    color: "white",
    letterSpacing: 0.5,
  },
  bannerLocation: {
    fontSize: 13,
    fontWeight: "700",
    color: "white",
    letterSpacing: 2,
  },
  slogan: {
    fontSize: 12,
    fontWeight: "800",
    color: "white",
    letterSpacing: 0.8,
  },
  homeBody: {
    marginTop: -15,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    backgroundColor: palette.background,
    gap: 15,
  },
  notificationDot: {
    position: "absolute",
    right: 10,
    top: 8,
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: "#A870FF",
  },
  quickActions: { flexDirection: "row", gap: 8 },
  quickAction: { flex: 1, alignItems: "center", gap: 8 },
  quickIcon: {
    height: 47,
    width: 49,
    borderRadius: 12,
    backgroundColor: "#F0ECFC",
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 15,
    color: palette.navy,
    textAlign: "center",
  },
  membershipStrip: {
    borderWidth: 1,
    borderColor: palette.line,
    borderLeftWidth: 3,
    borderLeftColor: palette.purple,
    borderRadius: 11,
    backgroundColor: "white",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stats: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    padding: 13,
    gap: 5,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 11,
  },
  statValue: { fontSize: 15, fontWeight: "800", color: palette.purple },
  demoLabel: {
    fontSize: 8,
    color: "#8C7D63",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  featureIcon: {
    height: 36,
    width: 36,
    borderRadius: 10,
    backgroundColor: "#F1ECFD",
    alignItems: "center",
    justifyContent: "center",
  },
  scanButton: {
    height: 44,
    width: 44,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#F0F0F6",
    padding: 3,
    borderRadius: 9,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: { backgroundColor: palette.purple },
  segmentText: { fontSize: 11, fontWeight: "700", color: palette.navy },
  segmentTextActive: { fontSize: 11, fontWeight: "700", color: "white" },
  dateBar: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  floor: {
    borderWidth: 2,
    borderColor: "#D2D4DB",
    borderRadius: 3,
    padding: 12,
    backgroundColor: "#F5F5F8",
    gap: 16,
  },
  floorTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#DDDDE6",
    paddingBottom: 10,
  },
  floorLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: "#9293A2",
    letterSpacing: 0.6,
  },
  floorBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: "#DDDDE6",
    paddingTop: 12,
  },
  seats: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  seat: {
    width: "21%",
    height: 37,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A5DDB7",
    backgroundColor: "#EAF7EF",
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 4,
  },
  seatBooked: { backgroundColor: "#E4E4EB", borderColor: "#D3D3DE" },
  seatSelected: { backgroundColor: palette.purple, borderColor: "#4113AA" },
  seatText: { fontSize: 10, fontWeight: "800", color: palette.navy },
  legend: { flexDirection: "row", justifyContent: "space-evenly" },
  amenities: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  thumb: { width: 65, height: 65, borderRadius: 9 },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  time: {
    width: "30%",
    flexGrow: 1,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2DDEF",
    borderRadius: 7,
    gap: 10,
  },
  step: {
    height: 32,
    width: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  stepText: { fontSize: 19, color: palette.purple },
  equipmentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  equipment: {
    width: "47%",
    flexGrow: 1,
    alignItems: "center",
    gap: 12,
    paddingVertical: 22,
  },
  selectedCard: { borderColor: "#BBA3F2", backgroundColor: "#FCFAFF" },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "white",
    minHeight: 61,
  },
  paymentLogo: {
    height: 29,
    minWidth: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  radio: {
    height: 14,
    width: 14,
    borderWidth: 1,
    borderColor: "#C9C8D6",
    borderRadius: 8,
  },
  radioSelected: { borderWidth: 4, borderColor: palette.purple },
  successArea: { alignItems: "center", gap: 12, paddingVertical: 24 },
  successCircle: {
    width: 61,
    height: 61,
    borderRadius: 32,
    backgroundColor: palette.green,
    alignItems: "center",
    justifyContent: "center",
  },
  accessPass: {
    alignItems: "center",
    gap: 15,
    paddingVertical: 22,
    backgroundColor: "#F9F8FC",
    borderRadius: 12,
  },
  qrFrame: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E1DBED",
  },
  memberHero: {
    backgroundColor: palette.purple,
    borderRadius: 14,
    padding: 20,
    gap: 12,
  },
  memberName: { fontSize: 17, fontWeight: "800", color: "white" },
  memberMeta: { fontSize: 11, lineHeight: 17, color: "#E4D9FF" },
  planName: { fontSize: 18, fontWeight: "800", color: palette.navy },
  originalPrice: {
    fontSize: 12,
    color: "#8B8798",
    textDecorationLine: "line-through",
  },
  passTabs: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  passTab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E1DCEB",
    backgroundColor: "white",
  },
  passTabActive: {
    backgroundColor: palette.purple,
    borderColor: palette.purple,
  },
  passTabText: { fontSize: 11, fontWeight: "700", color: palette.navy },
  passTabTextActive: { color: "white" },
  durationLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: palette.navy,
    marginTop: 3,
  },
  durationTabs: { flexDirection: "row", gap: 8 },
  durationTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E1DCEB",
    alignItems: "center",
    backgroundColor: "white",
  },
  durationTabActive: {
    backgroundColor: "#EEE6FF",
    borderColor: palette.purple,
  },
  durationTabDisabled: { backgroundColor: "#F4F3F6", borderColor: "#EBE9EF" },
  durationTabText: { fontSize: 11, fontWeight: "700", color: palette.navy },
  durationTabTextActive: { color: palette.purple },
  durationTabTextDisabled: { color: "#B4B0BC" },
  passGroup: {
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 2,
  },
  standardGroup: { backgroundColor: "#F8FBFF", borderColor: "#CFE2F8" },
  privateGroup: { backgroundColor: "#FBF9FF", borderColor: "#DDCFFC" },
  huddleGroup: { backgroundColor: "#FFFCF4", borderColor: "#F3DDA5" },
  passGroupHeader: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  passGroupIcon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: palette.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  passGroupTitle: { fontSize: 16, fontWeight: "800", color: palette.navy },
  passGroupDetail: { fontSize: 10, lineHeight: 15, color: "#625B76" },
  passGroupCount: {
    fontSize: 10,
    fontWeight: "800",
    color: palette.purple,
    backgroundColor: "white",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: "hidden",
  },
  passCard: {
    backgroundColor: "white",
    marginHorizontal: 8,
    marginBottom: 8,
    padding: 13,
    gap: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#EAE6F2",
  },
  studentChoice: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#D9C9FF",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FBF9FF",
  },
  studentChoiceActive: {
    backgroundColor: palette.purple,
    borderColor: palette.purple,
  },
  transaction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderColor: palette.line,
    paddingVertical: 15,
  },
  avatar: {
    height: 53,
    width: 53,
    borderRadius: 28,
    backgroundColor: "#F5F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  promoStrip: {
    borderWidth: 1,
    borderColor: "#D9C9FF",
    borderRadius: 12,
    backgroundColor: "#FBF9FF",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  promoIcon: {
    height: 42,
    width: 42,
    borderRadius: 12,
    backgroundColor: palette.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  laptopStrip: {
    borderWidth: 1,
    borderColor: "#F1D787",
    borderRadius: 12,
    backgroundColor: "#FFFCF3",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  laptopIcon: {
    height: 44,
    width: 44,
    borderRadius: 12,
    backgroundColor: "#F8C744",
    alignItems: "center",
    justifyContent: "center",
  },
  specGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  specChip: {
    width: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 9,
    backgroundColor: "#F7F4FC",
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
  specText: {
    fontSize: 11,
    fontWeight: "700",
    color: palette.navy,
    flexShrink: 1,
  },
  stationImage: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginBottom: 13,
  },
  stationFeatures: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stationFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F4F0FC",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  checkoutModalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(20, 13, 40, 0.48)",
  },
  checkoutModalSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 30,
    gap: 15,
  },
  checkoutModalHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D8D2E4",
    marginBottom: 4,
  },
  checkoutModalIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0EBFC",
    alignSelf: "center",
  },
  checkoutModalIconText: {
    color: palette.purple,
    fontWeight: "900",
    fontSize: 16,
  },
  checkoutModalTitle: {
    color: palette.navy,
    fontWeight: "800",
    fontSize: 21,
    textAlign: "center",
  },
  checkoutModalBody: {
    color: "#5B5870",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  checkoutModalSummary: {
    borderRadius: 12,
    backgroundColor: "#F7F4FC",
    padding: 15,
    alignItems: "center",
    gap: 3,
  },
  paypalWebSheet: {
    flex: 1,
    marginTop: 48,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  checkoutModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EAE5F2",
  },
  paypalWebHint: {
    color: "#5B5870",
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#F7F4FC",
  },
  paypalWebLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  supportHero: {
    padding: 25,
    backgroundColor: "#F0EBFC",
    alignItems: "center",
    gap: 16,
    borderRadius: 15,
  },
});
