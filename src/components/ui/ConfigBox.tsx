import React, { useState, useEffect } from "react";
import { loadConfig, saveConfig, clearConfig, type EmailConfig } from "../../lib/configStorage";

type NotificationType =
	| "health_alerts"
	| "daily_summary"
	| "emergency_alerts"
	| "medication_reminders";

type Thresholds = {
	temperature: number | "";
	heartRate: number | "";
	spo2: number | "";
	respiratoryRate: number | "";
	systolicBP: number | "";
	diastolicBP: number | "";
	painScale: number | "";
};

const DEFAULT_THRESHOLDS: Thresholds = {
	temperature: 38,
	heartRate: 120,
	spo2: 90,
	respiratoryRate: 24,
	systolicBP: 140,
	diastolicBP: 90,
	painScale: 7,
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ConfigBox: React.FC<{ onSave?: (cfg: EmailConfig) => void }> = ({
	onSave,
}) => {
	const [primaryEmail, setPrimaryEmail] = useState("");
	const [backupEmail, setBackupEmail] = useState("");
	const [notificationTypes, setNotificationTypes] =
		useState<NotificationType[]>(["health_alerts"]);
	const [frequency, setFrequency] =
		useState<EmailConfig["frequency"]>("immediate");
	const [subjectPrefix, setSubjectPrefix] = useState("Healix Alert");
	const [senderName, setSenderName] = useState("Healix Alert System");
	const [useDefaultThresholds, setUseDefaultThresholds] = useState(true);
	const [thresholds, setThresholds] = useState<Thresholds>({
		...DEFAULT_THRESHOLDS,
	});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [loading, setLoading] = useState(true);

	// Load saved config on component mount
	useEffect(() => {
		const loadSavedConfig = async () => {
			const savedConfig = await loadConfig();
			if (savedConfig) {
				setPrimaryEmail(savedConfig.primaryEmail || "");
				setBackupEmail(savedConfig.backupEmail || "");
				setNotificationTypes(savedConfig.notificationTypes || ["health_alerts"]);
				setFrequency(savedConfig.frequency || "immediate");
				setSubjectPrefix(savedConfig.subjectPrefix || "Healix Alert");
				setSenderName(savedConfig.senderName || "Healix Alert System");
				setUseDefaultThresholds(savedConfig.useDefaultThresholds ?? true);
				setThresholds(savedConfig.thresholds || { ...DEFAULT_THRESHOLDS });
			}
			setLoading(false);
		};
		loadSavedConfig();
	}, []);

	const toggleNotification = (t: NotificationType) => {
		setNotificationTypes((prev) =>
			prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
		);
	};

	const validate = (): boolean => {
		const e: Record<string, string> = {};
		if (!primaryEmail || !emailRegex.test(primaryEmail))
			e.primaryEmail = "Enter a valid primary email.";
		if (backupEmail && !emailRegex.test(backupEmail))
			e.backupEmail = "Enter a valid backup email or clear the field.";
		if (notificationTypes.length === 0)
			e.notificationTypes = "Select at least one notification type.";
		if (!senderName.trim()) e.senderName = "Sender name is required.";
		if (!useDefaultThresholds) {
			(Object.entries(thresholds) as [keyof Thresholds, number | ""][]).forEach(
				([k, v]) => {
					if (v === "" || isNaN(Number(v)))
						e[`threshold_${k}`] = "Enter a numeric value.";
				}
			);
		}
		setErrors(e);
		return Object.keys(e).length === 0;
	};

	const handleThresholdChange = (key: keyof Thresholds, value: string) => {
		const num = value === "" ? "" : Number(value);
		setThresholds((prev) => ({ ...prev, [key]: num }));
	};

	const save = async () => {
		if (!validate()) return;
		setSaving(true);
		try {
			const cfg: EmailConfig = {
				primaryEmail,
				backupEmail: backupEmail || undefined,
				notificationTypes,
				frequency,
				subjectPrefix: subjectPrefix || undefined,
				senderName,
				useDefaultThresholds,
				thresholds: useDefaultThresholds ? DEFAULT_THRESHOLDS : thresholds,
			};
			
			// Persist to server
			const saved = await saveConfig(cfg);
			if (!saved) {
				setErrors((prev) => ({
					...prev,
					_global: "Failed to save configuration to file.",
				}));
				setSaving(false);
				return;
			}

			// forward to parent (parent closes dialog)
			if (onSave) await Promise.resolve(onSave(cfg));
			// subtle success micro-feedback (no intrusive alert)
			setSaved(true);
			setTimeout(() => {
				setSaved(false);
			}, 1400);
		} catch {
			setErrors((prev) => ({
				...prev,
				_global: "Failed to save configuration.",
			}));
		} finally {
			setSaving(false);
		}
	};

	const resetToDefaults = async () => {
		// Clear from server
		await clearConfig();
		// Clear local state
		setPrimaryEmail("");
		setBackupEmail("");
		setNotificationTypes(["health_alerts"]);
		setFrequency("immediate");
		setSubjectPrefix("Healix Alert");
		setSenderName("Healix Alert System");
		setUseDefaultThresholds(true);
		setThresholds({ ...DEFAULT_THRESHOLDS });
		setErrors({});
	};

	if (loading) {
		return (
			<div className="w-full max-w-3xl text-center text-slate-500">
				Loading configuration...
			</div>
		);
	}

	// UI: Tailwind driven, compact, elegant, no preview pane
	return (
		<div className="w-full max-w-3xl">
			{/* Card container */}
			<div className="rounded-2xl bg-gradient-to-b from-white to-slate-50 shadow-xl ring-1 ring-slate-100 overflow-hidden">
				<div className="px-6 py-5 border-b border-slate-100">
					<div className="flex items-start justify-between gap-4">
						<div>
							<h3 className="text-lg font-semibold text-slate-900">
								Email & Alerts Configuration
							</h3>
							<p className="mt-1 text-sm text-slate-500">
								Configure delivery, preferences and vitals thresholds.
							</p>
						</div>
						<div className="flex items-center gap-2">
							{/* status hint */}
							{saved ? (
								<div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
									Saved
								</div>
							) : saving ? (
								<div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
									Saving...
								</div>
							) : null}
						</div>
					</div>
				</div>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						save();
					}}
					className="px-6 py-6 grid gap-6"
				>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="flex flex-col gap-2">
							<label className="text-xs font-medium text-slate-600">
								Email Address
							</label>
							<input
								type="email"
								value={primaryEmail}
								onChange={(e) => setPrimaryEmail(e.target.value)}
								placeholder="you@example.com"
								className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
									errors.primaryEmail ? "border-red-300" : "border-slate-200"
								}`}
								required
							/>
							{errors.primaryEmail && (
								<p className="text-xs text-red-500 mt-1">
									{errors.primaryEmail}
								</p>
							)}
						</div>

						<div className="flex flex-col gap-2">
							<label className="text-xs font-medium text-slate-600">
								Backup Email (optional)
							</label>
							<input
								type="email"
								value={backupEmail}
								onChange={(e) => setBackupEmail(e.target.value)}
								placeholder="backup@example.com"
								className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
									errors.backupEmail ? "border-red-300" : "border-slate-200"
								}`}
							/>
							{errors.backupEmail && (
								<p className="text-xs text-red-500 mt-1">
									{errors.backupEmail}
								</p>
							)}
						</div>

						<div className="sm:col-span-1 flex flex-col gap-2">
							<label className="text-xs font-medium text-slate-600">
								Sender Name
							</label>
							<input
								value={senderName}
								onChange={(e) => setSenderName(e.target.value)}
								placeholder="HealRobot System"
								className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
									errors.senderName ? "border-red-300" : "border-slate-200"
								}`}
							/>
							{errors.senderName && (
								<p className="text-xs text-red-500 mt-1">
									{errors.senderName}
								</p>
							)}
						</div>

						<div className="flex flex-col gap-2">
							<label className="text-xs font-medium text-slate-600">
								Email Subject Prefix (optional)
							</label>
							<input
								value={subjectPrefix}
								onChange={(e) => setSubjectPrefix(e.target.value)}
								placeholder="[HealRobot Alert]"
								className="w-full rounded-md border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 border-slate-200"
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="text-xs font-medium text-slate-600 mb-2 inline-block">
								Notification Types
							</label>
							<div className="mt-2 flex flex-col gap-2">
								{[
									{
										key: "health_alerts",
										label: "Health Alerts (abnormal vitals)",
									},
									{ key: "daily_summary", label: "Daily Summary" },
									{ key: "emergency_alerts", label: "Emergency Alerts" },
									{
										key: "medication_reminders",
										label: "Medication Reminders",
									},
								].map((opt) => (
									<label
										key={opt.key}
										className="inline-flex items-center gap-3"
									>
										<input
											type="checkbox"
											checked={
												notificationTypes.includes(opt.key as NotificationType)
											}
											onChange={() =>
												toggleNotification(opt.key as NotificationType)
											}
											className="h-4 w-4 rounded border-slate-200 text-teal-600 focus:ring-teal-500"
										/>
										<span className="text-sm text-slate-700">
											{opt.label}
										</span>
									</label>
								))}
								{errors.notificationTypes && (
									<p className="text-xs text-red-500 mt-1">
										{errors.notificationTypes}
									</p>
								)}
							</div>
						</div>

						<div className="flex flex-col gap-2">
							<label className="text-xs font-medium text-slate-600">
								Notification Frequency
							</label>
							<select
								value={frequency}
								onChange={(e) => setFrequency(e.target.value as any)}
								className="mt-2 h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
							>
								<option value="immediate">Immediate</option>
								<option value="hourly">Hourly</option>
								<option value="daily">Daily</option>
								<option value="weekly">Weekly</option>
							</select>
						</div>
					</div>

					{/* Thresholds */}
					<div className="pt-4 border-t border-slate-100">
						<div className="flex items-center justify-between">
							<h4 className="text-sm font-semibold text-slate-800">
								Vitals Thresholds
							</h4>
							<label className="inline-flex items-center gap-2 text-sm text-slate-600">
								<input
									type="checkbox"
									checked={useDefaultThresholds}
									onChange={(e) => setUseDefaultThresholds(e.target.checked)}
									className="h-4 w-4 rounded border-slate-200 text-teal-600 focus:ring-teal-500"
								/>
								<span>Use user default thresholds</span>
							</label>
						</div>

						<div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
							{[
								{ key: "temperature", label: "Temperature (°C)" },
								{ key: "heartRate", label: "Heart Rate (bpm)" },
								{ key: "spo2", label: "SpO₂ (%)" },
								{
									key: "respiratoryRate",
									label: "Respiratory Rate (breaths/min)",
								},
								{ key: "systolicBP", label: "Systolic BP (mmHg)" },
								{ key: "diastolicBP", label: "Diastolic BP (mmHg)" },
								{ key: "painScale", label: "Pain Scale (0-10)" },
							].map((item) => (
								<div key={item.key} className="flex flex-col gap-1">
									<label className="text-xs font-medium text-slate-600">
										{item.label}
									</label>
									<input
										type="number"
										value={(thresholds as any)[item.key]}
										disabled={useDefaultThresholds}
										onChange={(e) =>
											handleThresholdChange(item.key as keyof Thresholds, e.target.value)
										}
										className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
											!useDefaultThresholds &&
											(errors as any)[`threshold_${item.key}`]
												? "border-red-300"
												: "border-slate-200"
										}`}
									/>
									{!useDefaultThresholds && (errors as any)[`threshold_${item.key}`] && (
										<p className="text-xs text-red-500 mt-1">
											{(errors as any)[`threshold_${item.key}`]}
										</p>
									)}
								</div>
							))}
						</div>
					</div>

					{/* Actions */}
					<div className="flex items-center justify-end gap-3">
						<button
							type="button"
							onClick={resetToDefaults}
							className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
						>
							Reset
						</button>
						<button
							type="submit"
							disabled={saving}
							className="rounded-md bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
						>
							Save Configuration
						</button>
					</div>

					{/* subtle global error */}
					{errors._global && (
						<p className="text-xs text-red-500 text-right">{errors._global}</p>
					)}
				</form>
			</div>
		</div>
	);
};

export default ConfigBox;
