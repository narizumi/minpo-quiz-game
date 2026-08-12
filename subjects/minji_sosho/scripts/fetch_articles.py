"""Fetch 民事訴訟法 (Code of Civil Procedure) article texts from the e-Gov Law API.

Reads data/curation.json for the list of needed article numbers, fetches
each one's plain text (plus its official ArticleCaption heading) from
e-Gov, and writes data/articles_raw.json.
"""
import json
import time
import urllib.request
from pathlib import Path
from xml.etree import ElementTree as ET

LAW_ID = "408AC0000000109"  # 民事訴訟法
API_BASE = "https://laws.e-gov.go.jp/api/1/articles"
ROOT = Path(__file__).resolve().parent.parent
CURATION_PATH = ROOT / "data" / "curation.json"
OUTPUT_PATH = ROOT / "data" / "articles_raw.json"


def extract_text(elem):
    """Recursively extract element text, skipping <Rt> furigana annotations
    but keeping tail text after inline elements like <Ruby>."""
    parts = [elem.text or ""]
    for child in elem:
        if child.tag != "Rt":
            parts.append(extract_text(child))
        parts.append(child.tail or "")
    return "".join(parts)


def join_sentences(container):
    if container is None:
        return ""
    return "".join(extract_text(s) for s in container.findall("Sentence"))


def format_item(item):
    title = (item.findtext("ItemTitle") or "").strip()
    sentence = item.find("ItemSentence")
    columns = sentence.findall("Column") if sentence is not None else []
    if columns:
        body = "".join(join_sentences(c) for c in columns)
    else:
        body = join_sentences(sentence)
    return f"{title} {body}".strip()


def format_paragraph(paragraph):
    parts = [join_sentences(paragraph.find("ParagraphSentence"))]
    for item in paragraph.findall("Item"):
        parts.append(format_item(item))
    return "".join(parts)


def format_article(article_element):
    title = (article_element.findtext("ArticleTitle") or "").strip()
    caption_elem = article_element.find("ArticleCaption")
    caption = extract_text(caption_elem).strip().strip("（）") if caption_elem is not None else ""
    paragraphs = article_element.findall("Paragraph")
    body = "\n".join(format_paragraph(p) for p in paragraphs)
    return title, caption, body


def fetch_article(article_number):
    url = f"{API_BASE};lawId={LAW_ID};article={article_number}"
    with urllib.request.urlopen(url, timeout=10) as resp:
        xml_text = resp.read()
    root = ET.fromstring(xml_text)
    code = root.findtext("Result/Code")
    if code != "0":
        raise RuntimeError(f"article {article_number}: e-Gov returned code {code}")
    article_element = root.find("ApplData/LawContents/Article")
    if article_element is None:
        raise RuntimeError(f"article {article_number}: no Article element in response")
    return format_article(article_element)


def main():
    curation = json.loads(CURATION_PATH.read_text(encoding="utf-8"))
    numbers = []
    seen = set()
    for topic in curation:
        for art in topic["articles"]:
            n = art["num"]
            if n not in seen:
                seen.add(n)
                numbers.append(n)

    results = {}
    errors = []
    for i, num in enumerate(numbers, 1):
        try:
            title, caption, body = fetch_article(num)
            results[num] = {"title": title, "caption": caption, "text": body}
            print(f"[{i}/{len(numbers)}] OK {num} {title} {caption}")
        except Exception as exc:  # noqa: BLE001
            errors.append((num, str(exc)))
            print(f"[{i}/{len(numbers)}] FAIL {num}: {exc}")
        time.sleep(0.15)

    OUTPUT_PATH.write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\nSaved {len(results)} articles to {OUTPUT_PATH}")
    if errors:
        print(f"\n{len(errors)} FAILED:")
        for num, err in errors:
            print(f"  {num}: {err}")


if __name__ == "__main__":
    main()
