"""Anomaly detection engine implementing diagnostic rules from the PDF."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class AnomalyResult:
    anomaly_type: str
    severity: str
    rule_number: int
    description: str
    triggered_by: dict[str, Any]
    exclusion_check: str | None
    scientific_citation: str
    recommendation: str
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"))


def detect_anomalies(
    temperature_c: float,
    rumen_ph: float,
) -> list[AnomalyResult]:
    """Run diagnostic rules against current cow state. Returns list of detected anomalies."""
    results: list[AnomalyResult] = []
    temp = temperature_c
    ph = rumen_ph

    triggered: dict[str, Any] = {}
    exclusion: str | None = None

    # --- Rule #1: Subacute Ruminal Acidosis (SARA) ---
    triggered = {}
    exclusion = None
    if ph > 39.5:
        exclusion = "Fever present — exclude SARA, suspect Clinical Mastitis or Metritis"
    if ph < 5.8:
        triggered = {"rumen_ph": ph}
        severity = "High"
        if exclusion:
            severity = "Medium"
        results.append(AnomalyResult(
            anomaly_type="Subacute Ruminal Acidosis (SARA)",
            severity=severity,
            rule_number=1,
            description="Prolonged low rumen pH — indicates insufficient peNDF and excess fermentable carbohydrates.",
            triggered_by=triggered,
            exclusion_check=exclusion,
            scientific_citation="Zebeli et al., 2008, J. Dairy Science — pH < 5.8 for >310 min/day with clinical signs",
            recommendation="Increase dietary forage-to-concentrate ratio. Evaluate TMR particle size. Monitor for displaced abomasum.",
        ))

    # --- Rule #2: Acute Ruminal Acidosis (ARA) ---
    triggered = {}
    exclusion = None
    if ph < 5.5:
        triggered = {"rumen_ph": ph}
        results.append(AnomalyResult(
            anomaly_type="Acute Ruminal Acidosis (ARA)",
            severity="High",
            rule_number=2,
            description="Life-threatening pH crash — D-lactic acid surge from Streptococcus bovis fermentation.",
            triggered_by=triggered,
            exclusion_check=exclusion,
            scientific_citation="Plaizier et al., 2008, The Veterinary Journal — pH < 5.5 for >180 min with clinical signs",
            recommendation="Emergency veterinary intervention required. Administer rumen buffer and thiamine. Evaluate diet change history.",
        ))

    # --- Rule #3: Severe Clinical Mastitis (Coliform) ---
    triggered = {}
    exclusion = None
    if ph < 5.6:
        exclusion = "Severe acidosis detected — exclude primary Mastitis, suspect acidosis with secondary toxemia"
    if temp > 40.4:
        triggered = {"temperature_c": temp}
        results.append(AnomalyResult(
            anomaly_type="Severe Clinical Mastitis (Coliform)",
            severity="High",
            rule_number=3,
            description="High fever with extreme udder inflammation — lipopolysaccharide endotoxins from E. coli.",
            triggered_by=triggered,
            exclusion_check=exclusion,
            scientific_citation="Adams et al., 2023, Animals — Temp > 40.4°C with clinical signs",
            recommendation="Immediate veterinary examination of udder. Culture milk sample. Administer anti-inflammatory and broad-spectrum antibiotics.",
        ))

    # --- Rule #4: Moderate-to-Severe Heat Stress ---
    triggered = {}
    exclusion = None
    if temp > 39.5:
        triggered = {"temperature_c": temp}
        results.append(AnomalyResult(
            anomaly_type="Moderate-to-Severe Heat Stress",
            severity="High",
            rule_number=4,
            description="Core temperature elevated — cow potentially experiencing heat stress.",
            triggered_by=triggered,
            exclusion_check=exclusion,
            scientific_citation="Cook et al., 2007, J. Dairy Science — Temp > 39.5°C with clinical signs",
            recommendation="Provide immediate shade and cooling (sprinklers/fans). Check THI. Ensure fresh water availability. Consider feeding during cooler hours.",
        ))

    # --- Rule #5: Subclinical Ketosis (SCK) ---
    triggered = {}
    exclusion = None
    if temp > 39.5:
        exclusion = "Fever detected — exclude Subclinical Ketosis, suspect infectious disease causing anorexia"
    if ph > 6.2:
        triggered = {"rumen_ph": ph}
        results.append(AnomalyResult(
            anomaly_type="Subclinical Ketosis (SCK)",
            severity="Medium",
            rule_number=5,
            description="Negative energy balance causing ketone accumulation — common in early lactation.",
            triggered_by=triggered,
            exclusion_check=exclusion,
            scientific_citation="Antanaitis et al., 2020, Animals — elevated pH > 6.2 with clinical signs",
            recommendation="Test blood BHB levels. Administer propylene glycol drench. Evaluate transition diet energy density. Monitor for DA displacement.",
        ))

    # --- Rule #6: Impending Parturition (Calving) ---
    triggered = {}
    exclusion = None
    if ph < 5.8:
        exclusion = "Low pH — exclude Parturition, suspect SARA"
    if temp < 38.5:
        triggered = {"temperature_c": temp}
        results.append(AnomalyResult(
            anomaly_type="Impending Parturition (Calving)",
            severity="High",
            rule_number=6,
            description="Characteristic temperature nadir preceding calving.",
            triggered_by=triggered,
            exclusion_check=exclusion,
            scientific_citation="Clark et al., 2015, Animal — temp < 38.5°C prior to calving",
            recommendation="Move to clean maternity pen within 12 hours. Monitor for dystocia. Prepare calving kit. Observe every 2 hours.",
        ))

    # --- Rule #7: Clinical Hypocalcemia (Milk Fever) ---
    triggered = {}
    exclusion = None
    if temp > 39.5:
        exclusion = "Fever present — exclude Milk Fever, suspect Toxic Mastitis causing recumbency"
    if temp < 38.0:
        triggered = {"temperature_c": temp}
        results.append(AnomalyResult(
            anomaly_type="Clinical Hypocalcemia (Milk Fever)",
            severity="High",
            rule_number=7,
            description="Hypothermia indicating calcium depletion — life-threatening metabolic emergency.",
            triggered_by=triggered,
            exclusion_check=exclusion,
            scientific_citation="Sturm et al., 2020, Animals — temp < 38.0°C with clinical signs",
            recommendation="Emergency intravenous calcium borogluconate. Prevent further recumbency complications. Evaluate pre-partum DCAD diet.",
        ))

    # --- Rule #8: Simple Indigestion / Rumen Stasis ---
    triggered = {}
    exclusion = None
    if temp > 39.5:
        exclusion = "Fever detected — exclude Simple Indigestion, suspect systemic infection causing anorexia"
    if ph > 6.8:
        triggered = {"rumen_ph": ph}
        results.append(AnomalyResult(
            anomaly_type="Simple Indigestion / Rumen Stasis",
            severity="Medium",
            rule_number=8,
            description="Alkaline rumen — spoiled feed, sudden diet change, or moldy silage causing rumen stasis.",
            triggered_by=triggered,
            exclusion_check=exclusion,
            scientific_citation="Hu et al., 2023, Microorganisms — pH > 6.8 with clinical signs",
            recommendation="Check feed quality for spoilage/mold. Offer fresh palatable feed. Provide rumen motility stimulant. Monitor for bloat.",
        ))

    # --- Rule #9: Clinical Metritis (Postpartum Uterine Infection) ---
    triggered = {}
    exclusion = None
    if ph < 5.6:
        exclusion = "Severe acidosis — exclude primary Metritis, suspect Acute Acidosis causing secondary fever"
    if temp > 39.5:
        triggered = {"temperature_c": temp}
        results.append(AnomalyResult(
            anomaly_type="Clinical Metritis (Postpartum Uterine Infection)",
            severity="High",
            rule_number=9,
            description="Postpartum fever — uterine bacterial infection releasing endotoxins into bloodstream.",
            triggered_by=triggered,
            exclusion_check=exclusion,
            scientific_citation="Liboreiro et al., 2015, J. Dairy Science — temp > 39.5°C with clinical signs",
            recommendation="Veterinary uterine examination. Administer antibiotics and NSAIDs. Evaluate hygiene in calving area. Monitor for retained placenta.",
        ))

    return results


def generate_report_text(anomaly: AnomalyResult, cow_name: str, cow_id: str) -> str:
    lines = [
        "=" * 60,
        "  DAIRY 4.0 — HEALTH ANOMALY REPORT",
        "=" * 60,
        "",
        f"  Cow:          {cow_name} ({cow_id})",
        f"  Detected at:  {anomaly.timestamp}",
        f"  Condition:    {anomaly.anomaly_type}",
        f"  Severity:     {anomaly.severity} Probability",
        f"  Rule #:       {anomaly.rule_number}",
        "",
        "-" * 60,
        "  DESCRIPTION",
        "-" * 60,
        "",
        f"  {anomaly.description}",
        "",
        "-" * 60,
        "  TRIGGERED VALUES",
        "-" * 60,
        "",
    ]
    for key, val in anomaly.triggered_by.items():
        lines.append(f"    {key}: {val}")
    lines.append("")

    if anomaly.exclusion_check:
        lines += [
            "-" * 60,
            "  EXCLUSION CHECK",
            "-" * 60,
            "",
            f"  {anomaly.exclusion_check}",
            "",
        ]

    lines += [
        "-" * 60,
        "  RECOMMENDATION",
        "-" * 60,
        "",
        f"  {anomaly.recommendation}",
        "",
        "-" * 60,
        "  SCIENTIFIC REFERENCE",
        "-" * 60,
        "",
        f"  {anomaly.scientific_citation}",
        "",
        "=" * 60,
        "  This report was generated automatically by",
        "  the Dairy 4.0 Sensor Fusion Platform.",
        "  Consult a licensed veterinarian for diagnosis.",
        "=" * 60,
    ]
    return "\n".join(lines)
