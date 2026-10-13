"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const EMPTY = {
  full_name: "",
  sex: "",
  age: "",
  participant_type: "",
  department_office_org: "",
  position_designation: "",
  program_year_section: "",
};

const inputCls =
  "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1";

export default function AttendContent() {
  const params = useParams();
  const eventId = params?.id;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!eventId) return;
      setLoading(true);
      try {
        const res = await axios.get(`/api/events/public/${eventId}`);
        setEvent(res.data?.data || null);
      } catch (err) {
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.full_name.trim()) return setError("Full name is required.");
    if (!form.sex) return setError("Sex is required.");
    if (!form.age || Number(form.age) < 1) return setError("Age is required.");
    if (!form.participant_type) return setError("Participant type is required.");
    setSubmitting(true);
    try {
      const res = await axios.post("/api/events/guest-attendance", {
        event_id: eventId,
        ...form,
      });
      setDone({ already: !!res.data?.already_attended, at: res.data?.attended_at });
    } catch (err) {
      const data = err.response?.data;
      if (data?.already_attended) {
        setDone({ already: true, at: data?.attended_at });
      } else {
        setError(data?.message || "Unable to record attendance.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading event...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <p className="text-sm text-gray-600">Event not found. Check the QR code and try again.</p>
      </div>
    );
  }

  if (event.status === "cancelled") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <p className="text-sm text-gray-600">This event has been cancelled.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border p-6 text-center">
          <div className="text-5xl mb-3">{done.already ? "📋" : "✅"}</div>
          <h1 className="text-xl font-bold text-gray-900">
            {done.already ? "Already Recorded" : "Attendance Confirmed!"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {done.already ? "You were already marked as attended for" : "Your attendance has been recorded for"} {event.title}.
          </p>
          {done.at && (
            <p className="text-xs text-gray-400 mt-2">{new Date(done.at).toLocaleString()}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white">
          <p className="text-xs uppercase tracking-wide text-white/70">Event Attendance</p>
          <h1 className="text-xl font-bold mt-1">{event.title}</h1>
          {event.venue && <p className="text-sm text-white/80 mt-1">{event.venue}</p>}
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className={labelCls}>Full Name *</label>
            <input className={inputCls} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Juan D. Cruz" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Sex *</label>
              <select className={inputCls} value={form.sex} onChange={(e) => set("sex", e.target.value)}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Age *</label>
              <input type="number" min="1" max="120" className={inputCls} value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="21" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Participant Type *</label>
            <select className={inputCls} value={form.participant_type} onChange={(e) => set("participant_type", e.target.value)}>
              <option value="">Select</option>
              <option value="Student">Student</option>
              <option value="Employee">Employee</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Department / Office / Organization</label>
            <input className={inputCls} value={form.department_office_org} onChange={(e) => set("department_office_org", e.target.value)} placeholder="College / Office / Org" />
          </div>
          {form.participant_type === "Student" ? (
            <div>
              <label className={labelCls}>Program / Year / Section (For Students)</label>
              <input className={inputCls} value={form.program_year_section} onChange={(e) => set("program_year_section", e.target.value)} placeholder="BSIT 2-A" />
            </div>
          ) : (
            <div>
              <label className={labelCls}>Position / Designation (Employee)</label>
              <input className={inputCls} value={form.position_designation} onChange={(e) => set("position_designation", e.target.value)} placeholder="Position" />
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Recording..." : "Submit Attendance"}
          </button>
        </form>
      </div>
    </div>
  );
}
