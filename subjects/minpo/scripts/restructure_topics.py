"""One-off migration: add newly-requested articles to their topics, move
already-registered articles to their newly-specified topic, and drop the
物権的請求権(占有訴権) topic once all its articles have been moved into 占有権.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CURATION_PATH = ROOT / "data" / "curation.json"

NEW_ARTICLES = {
    "114": {"label": "無権代理の相手方の催告権", "blanks": [
        ("追認を拒絶したものとみなす", "効果"),
        ("相当の期間を定めて", "要件語"),
    ]},
    "115": {"label": "無権代理の相手方の取消権", "blanks": [
        ("取り消すことができる", "効果"),
    ]},
    "121_2": {"label": "無効な行為の原状回復義務", "blanks": [
        ("原状に復させる義務", "効果"),
        ("意思能力を有しなかった者", "主体"),
        ("現に利益を受けている限度", "要件語"),
    ]},
    "124": {"label": "追認の要件", "blanks": [
        ("取消権を有することを知った後", "要件語"),
        ("法定代理人", "主体"),
    ]},
    "125": {"label": "法定追認", "blanks": [
        ("追認をしたものとみなす", "効果"),
        ("異議をとどめたとき", "要件語"),
    ]},
    "184": {"label": "指図による占有移転", "blanks": [
        ("占有権を取得する", "効果"),
    ]},
    "186": {"label": "占有の態様等に関する推定", "blanks": [
        ("所有の意思", "要件語"),
    ]},
    "188": {"label": "占有物について行使する権利の適法の推定", "blanks": [
        ("適法に有するものと推定する", "効果"),
    ]},
    "189": {"label": "善意の占有者による果実の取得等", "blanks": [
        ("果実を取得する", "効果"),
    ]},
    "196": {"label": "占有者による費用の償還請求", "blanks": [
        ("必要費", "要件語"),
        ("有益費", "要件語"),
        ("相当の期限を許与する", "要件語"),
    ]},
    "333": {"label": "先取特権と第三取得者", "blanks": [
        ("第三取得者に引き渡した後", "要件語"),
    ]},
    "412_2": {"label": "履行不能", "blanks": [
        ("履行を請求することができない", "効果"),
        ("契約の成立の時に不能であった", "要件語"),
    ]},
    "413": {"label": "受領遅滞における保管義務等", "blanks": [
        ("自己の財産に対するのと同一の注意", "要件語"),
        ("債権者の負担とする", "効果"),
    ]},
    "413_2": {"label": "履行遅滞中又は受領遅滞中の履行不能", "blanks": [
        ("債務者の責めに帰すべき事由によるものとみなす", "効果"),
        ("債権者の責めに帰すべき事由によるものとみなす", "効果"),
        ("遅滞の責任を負っている間", "要件語"),
    ]},
    "418": {"label": "過失相殺", "blanks": [
        ("債権者に過失があった", "要件語"),
    ]},
}


def make_article(num):
    spec = NEW_ARTICLES[num]
    return {
        "num": num,
        "label": spec["label"],
        "blanks": [{"answer": a, "cat": c} for a, c in spec["blanks"]],
    }


def find_topic(curation, name):
    for t in curation:
        if t["topic"] == name:
            return t
    raise KeyError(name)


def pop_articles(topic, nums):
    popped = []
    keep = []
    for a in topic["articles"]:
        if a["num"] in nums:
            popped.append(a)
        else:
            keep.append(a)
    topic["articles"] = keep
    return popped


def main():
    curation = json.loads(CURATION_PATH.read_text(encoding="utf-8"))

    doutan = find_topic(curation, "動産物権変動と即時取得")
    senyu_ken = find_topic(curation, "占有権")
    senyu_soken = find_topic(curation, "物権的請求権(占有訴権)")
    dairi = find_topic(curation, "代理")
    muko = find_topic(curation, "無効・取消し")
    ryuchi = find_topic(curation, "留置権・先取特権")
    saimu = find_topic(curation, "債務不履行と損害賠償")

    moved_182_183 = pop_articles(doutan, {"182", "183"})
    moved_198_199_200 = pop_articles(senyu_soken, {"198", "199", "200"})
    assert len(senyu_soken["articles"]) == 0, "占有訴権 should be fully emptied"

    senyu_ken["articles"] = (
        senyu_ken["articles"]
        + moved_182_183
        + moved_198_199_200
        + [make_article(n) for n in ["184", "186", "188", "189", "196"]]
    )
    senyu_ken["articles"].sort(key=lambda a: (int(a["num"].split("_")[0]), a["num"]))

    dairi["articles"] = dairi["articles"] + [make_article(n) for n in ["114", "115"]]
    dairi["articles"].sort(key=lambda a: (int(a["num"].split("_")[0]), a["num"]))

    muko["articles"] = muko["articles"] + [make_article(n) for n in ["121_2", "124", "125"]]
    muko["articles"].sort(key=lambda a: (int(a["num"].split("_")[0]), a["num"]))

    ryuchi["articles"] = ryuchi["articles"] + [make_article("333")]
    ryuchi["articles"].sort(key=lambda a: (int(a["num"].split("_")[0]), a["num"]))

    saimu["articles"] = saimu["articles"] + [make_article(n) for n in ["412_2", "413", "413_2", "418"]]
    saimu["articles"].sort(key=lambda a: (int(a["num"].split("_")[0]), a["num"]))

    curation = [t for t in curation if t["topic"] != "物権的請求権(占有訴権)"]

    CURATION_PATH.write_text(
        json.dumps(curation, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Topics: {len(curation)}")
    print("占有権:", [a["num"] for a in senyu_ken["articles"]])
    print("動産物権変動と即時取得:", [a["num"] for a in doutan["articles"]])
    print("代理:", [a["num"] for a in dairi["articles"]])
    print("無効・取消し:", [a["num"] for a in muko["articles"]])
    print("留置権・先取特権:", [a["num"] for a in ryuchi["articles"]])
    print("債務不履行と損害賠償:", [a["num"] for a in saimu["articles"]])


if __name__ == "__main__":
    main()
