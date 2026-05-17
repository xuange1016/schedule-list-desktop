from __future__ import annotations

import re
import sys
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
)


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "docs" / "todoist-like-desktop-app-prd-v1.md"
DEFAULT_OUTPUT = ROOT / "docs" / "todoist-like-desktop-app-prd-v1.pdf"


def register_fonts() -> tuple[str, str]:
    candidates = [
        Path(r"C:\Windows\Fonts\NotoSansSC-VF.ttf"),
        Path(r"C:\Windows\Fonts\Deng.ttf"),
        Path(r"C:\Windows\Fonts\simhei.ttf"),
    ]
    bold_candidates = [
        Path(r"C:\Windows\Fonts\Dengb.ttf"),
        Path(r"C:\Windows\Fonts\simhei.ttf"),
        Path(r"C:\Windows\Fonts\NotoSansSC-VF.ttf"),
    ]

    normal = next((path for path in candidates if path.exists()), None)
    bold = next((path for path in bold_candidates if path.exists()), normal)
    if normal is None:
        return "Helvetica", "Helvetica-Bold"

    pdfmetrics.registerFont(TTFont("ChineseNormal", str(normal)))
    pdfmetrics.registerFont(TTFont("ChineseBold", str(bold)))
    return "ChineseNormal", "ChineseBold"


def styles(font_name: str, bold_font_name: str) -> dict[str, ParagraphStyle]:
    base = ParagraphStyle(
        "Base",
        fontName=font_name,
        fontSize=10.5,
        leading=17,
        textColor=colors.HexColor("#222222"),
        wordWrap="CJK",
        spaceAfter=5,
    )
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base,
            fontName=bold_font_name,
            fontSize=22,
            leading=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#111111"),
            spaceAfter=16,
        ),
        "h2": ParagraphStyle(
            "Heading2",
            parent=base,
            fontName=bold_font_name,
            fontSize=15,
            leading=22,
            textColor=colors.HexColor("#111111"),
            spaceBefore=10,
            spaceAfter=7,
        ),
        "h3": ParagraphStyle(
            "Heading3",
            parent=base,
            fontName=bold_font_name,
            fontSize=12.5,
            leading=19,
            textColor=colors.HexColor("#222222"),
            spaceBefore=7,
            spaceAfter=5,
        ),
        "body": base,
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base,
            leftIndent=14,
            firstLineIndent=0,
            bulletIndent=0,
        ),
        "meta": ParagraphStyle(
            "Meta",
            parent=base,
            textColor=colors.HexColor("#555555"),
            alignment=TA_CENTER,
        ),
        "code": ParagraphStyle(
            "Code",
            fontName="Courier",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#222222"),
            backColor=colors.HexColor("#f7f7f7"),
            borderColor=colors.HexColor("#dddddd"),
            borderWidth=0.4,
            borderPadding=6,
            leftIndent=0,
            rightIndent=0,
            spaceBefore=6,
            spaceAfter=8,
        ),
    }


def inline_markup(text: str) -> str:
    text = escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`(.+?)`", r"<font backColor='#f3f4f6'>\1</font>", text)
    return text


def build_story(markdown: str, style_map: dict[str, ParagraphStyle]):
    story = []
    title_seen = False
    pending_meta = []
    in_code_block = False
    code_lines = []

    for raw_line in markdown.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()

        if stripped.startswith("```"):
            if in_code_block:
                story.append(Preformatted("\n".join(code_lines), style_map["code"]))
                code_lines.clear()
                in_code_block = False
            else:
                if pending_meta:
                    story.append(Paragraph("<br/>".join(pending_meta), style_map["meta"]))
                    pending_meta.clear()
                in_code_block = True
            continue

        if in_code_block:
            code_lines.append(line)
            continue

        if not stripped:
            if pending_meta:
                story.append(Paragraph("<br/>".join(pending_meta), style_map["meta"]))
                pending_meta.clear()
            story.append(Spacer(1, 4))
            continue

        if stripped == "---":
            if pending_meta:
                story.append(Paragraph("<br/>".join(pending_meta), style_map["meta"]))
                pending_meta.clear()
            story.append(Spacer(1, 4))
            story.append(HRFlowable(width="100%", thickness=0.4, color=colors.HexColor("#dddddd")))
            story.append(Spacer(1, 8))
            continue

        if stripped.startswith("# "):
            if title_seen:
                story.append(PageBreak())
            story.append(Paragraph(inline_markup(stripped[2:]), style_map["title"]))
            title_seen = True
            continue

        if title_seen and not stripped.startswith("## ") and "：" in stripped and len(pending_meta) < 5:
            pending_meta.append(inline_markup(stripped))
            continue

        if pending_meta:
            story.append(Paragraph("<br/>".join(pending_meta), style_map["meta"]))
            pending_meta.clear()

        if stripped.startswith("## "):
            story.append(Paragraph(inline_markup(stripped[3:]), style_map["h2"]))
        elif stripped.startswith("### "):
            story.append(Paragraph(inline_markup(stripped[4:]), style_map["h3"]))
        elif stripped.startswith("- "):
            story.append(Paragraph(inline_markup(stripped[2:]), style_map["bullet"], bulletText="•"))
        elif re.match(r"^\d+\. ", stripped):
            number, content = stripped.split(" ", 1)
            story.append(Paragraph(inline_markup(content), style_map["bullet"], bulletText=number))
        else:
            story.append(Paragraph(inline_markup(stripped), style_map["body"]))

    if pending_meta:
        story.append(Paragraph("<br/>".join(pending_meta), style_map["meta"]))

    if code_lines:
        story.append(Preformatted("\n".join(code_lines), style_map["code"]))

    return story


def draw_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#777777"))
    canvas.drawRightString(200 * mm, 12 * mm, f"第 {doc.page} 页")
    canvas.restoreState()


def main() -> int:
    source = Path(sys.argv[1]) if len(sys.argv) >= 2 else DEFAULT_SOURCE
    output = Path(sys.argv[2]) if len(sys.argv) >= 3 else DEFAULT_OUTPUT
    if not source.is_absolute():
        source = ROOT / source
    if not output.is_absolute():
        output = ROOT / output

    font_name, bold_font_name = register_fonts()
    markdown = source.read_text(encoding="utf-8")
    story = build_story(markdown, styles(font_name, bold_font_name))

    doc = SimpleDocTemplate(
        str(output),
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="桌面端任务管理应用 V1 产品需求说明书",
        author="Codex",
    )
    doc.build(story, onFirstPage=draw_footer, onLaterPages=draw_footer)
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
