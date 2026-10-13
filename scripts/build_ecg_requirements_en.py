"""Build the English PDF translation of the supplied ECG task brief."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "technical-requirements-en.pdf"

SECTIONS = [
    ("1. Intended use", [
        "Record ECG in one lead.",
        "Screen heart rhythm.",
        "Transmit the recording to a physician or telemedicine system.",
    ]),
    ("2. Electrical characteristics", [
        "One channel / one lead.",
        "Input signal range.",
        "Sampling rate, for example at least 500 Hz.",
        "ADC resolution of at least 16 bits.",
        "Input impedance.",
        "Common-mode rejection ratio (CMRR).",
        "Noise level.",
        "Defibrillator protection.",
        "Electrode lead-off detection.",
    ]),
    ("3. Filtering", [
        "Baseline wander.",
        "50/60 Hz mains interference.",
        "Muscle interference.",
        "Ability to disable or adjust filters.",
    ]),
    ("4. Recording", [
        "Recording duration, for example 10-30 seconds.",
        "Automatic signal quality control.",
        "Electrode contact indication.",
        "Heart rate.",
    ]),
    ("5. Software", [
        "Real-time display of the ECG waveform.",
        "Save each examination.",
        "PDF / CSV / XML export.",
        "Patient identification.",
        "Transfer via USB, Bluetooth, or Wi-Fi.",
    ]),
    ("6. Enclosure and power", [
        "Portable form factor.",
        "Rechargeable battery.",
        "USB-C.",
        "Battery life.",
        "Weight and dimensions.",
    ]),
    ("7. Telemedicine", [
        "Transmit ECG recordings to a server.",
        "Associate each recording with a patient ID.",
        "SCP-ECG / XML / DICOM.",
        "API for a medical information system or electronic health record.",
        "Support remote interpretation by a physician or AI.",
    ]),
    ("8. Safety and regulatory requirements", [
        "IEC 60601-1.",
        "IEC 60601-1-2.",
        "IEC 60601-2-47 if the device is intended for ambulatory monitoring.",
        "Requirements for medical-device software.",
        "Biocompatibility of electrodes and other patient-contacting parts.",
        "EAEU / Kazakhstan requirements for medical-device registration.",
    ]),
    ("9. Acceptance tests", [
        "Amplitude accuracy.",
        "Heart-rate accuracy.",
        "Noise level.",
        "Interference immunity.",
        "Filter verification.",
        "Data-transfer verification.",
        "Operation when an electrode becomes disconnected.",
    ]),
]


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdfmetrics.registerFont(TTFont("ArialECG", r"C:\Windows\Fonts\arial.ttf"))
    regular = ParagraphStyle(
        "regular", fontName="ArialECG", fontSize=9.6, leading=14, textColor=colors.HexColor("#253244")
    )
    title = ParagraphStyle(
        "title", parent=regular, fontSize=17, leading=23, alignment=TA_CENTER,
        textColor=colors.HexColor("#102a43"), spaceAfter=6,
    )
    subtitle = ParagraphStyle(
        "subtitle", parent=regular, fontSize=9, leading=13, alignment=TA_CENTER,
        textColor=colors.HexColor("#5a6d82"), spaceAfter=18,
    )
    heading = ParagraphStyle(
        "heading", parent=regular, fontSize=11, leading=15,
        textColor=colors.HexColor("#183b56"), spaceBefore=12, spaceAfter=5,
    )
    bullet = ParagraphStyle("bullet", parent=regular, leftIndent=15, firstLineIndent=-11, spaceAfter=2)
    story = [Paragraph("Technical Requirements for a Single-Channel ECG Device", title),
             Paragraph("English translation of the supplied Russian task brief", subtitle)]
    for name, items in SECTIONS:
        section = [Paragraph(name, heading)]
        section.extend(Paragraph("- " + item, bullet) for item in items)
        story.append(KeepTogether(section))
    doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=48, leftMargin=48,
                            topMargin=50, bottomMargin=48, title="ECG Technical Requirements - English")

    def page_footer(canvas, pdf):
        canvas.saveState()
        canvas.setFont("ArialECG", 8)
        canvas.setFillColor(colors.HexColor("#718096"))
        canvas.drawString(48, 27, "Translation of the supplied technical requirements")
        canvas.drawRightString(A4[0] - 48, 27, str(pdf.page))
        canvas.restoreState()

    doc.build(story, onFirstPage=page_footer, onLaterPages=page_footer)


if __name__ == "__main__":
    build()
