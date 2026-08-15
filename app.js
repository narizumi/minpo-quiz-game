(function () {
  "use strict";

  var REGISTRY = window.SUBJECT_REGISTRY || {};
  var SUBJECT_ORDER = ["minpo", "kenpo", "keihou", "minji_sosho", "keiji_sosho", "kaisha", "gyosei_sosho"];
  var DATA = null; // set to REGISTRY[state.subject] once a subject is chosen

  var root = document.getElementById("screen-root");

  var state = {
    subject: null,
    selectedTopicIds: [],
    mode: null,
    questionCount: 20,
    quiz: [],
    quizIndex: 0,
    score: 0,
    log: [], // {question, chosen, correct, isCorrect}
    showArticleNumbers: false,
  };

  var MODES = [
    {
      id: "fill",
      name: "① 条文穴埋め",
      desc: "条文の中の重要キーワードを選択肢から選ぶ",
    },
    {
      id: "link",
      name: "② 条文の関連付け",
      desc: "トピック内の条文一覧から、隠された見出しを選択肢から選ぶ",
    },
    {
      id: "guess",
      name: "③ 条文番号あて",
      desc: "条文の内容から条文番号を選択肢から選ぶ",
    },
  ];

  function topicStorageKey() {
    return "quizapp-selected-topics-" + state.subject;
  }

  function loadSelectedTopics() {
    try {
      var raw = localStorage.getItem(topicStorageKey());
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return DATA.topics.map(function (t) { return t.id; }); // default: all selected
  }

  function saveSelectedTopics() {
    try {
      localStorage.setItem(topicStorageKey(), JSON.stringify(state.selectedTopicIds));
    } catch (e) {}
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null) return;
      if (k === "class") node.className = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else if (k.indexOf("on") === 0) node.addEventListener(k.slice(2), attrs[k]);
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      if (typeof c === "string") node.appendChild(document.createTextNode(c));
      else node.appendChild(c);
    });
    return node;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function sample(arr, n) {
    return shuffle(arr).slice(0, n);
  }

  function selectedTopics() {
    return DATA.topics.filter(function (t) {
      return state.selectedTopicIds.indexOf(t.id) !== -1;
    });
  }

  function selectedArticlesFlat() {
    var out = [];
    selectedTopics().forEach(function (t) {
      t.articles.forEach(function (a) {
        out.push({ topic: t, article: a });
      });
    });
    return out;
  }

  // ---------- Screen: Subject selection ----------
  function availableSubjects() {
    return SUBJECT_ORDER.filter(function (id) { return REGISTRY[id]; })
      .map(function (id) { return REGISTRY[id]; })
      .concat(
        Object.keys(REGISTRY)
          .filter(function (id) { return SUBJECT_ORDER.indexOf(id) === -1; })
          .map(function (id) { return REGISTRY[id]; })
      );
  }

  function selectSubject(id) {
    state.subject = id;
    DATA = REGISTRY[id];
    state.selectedTopicIds = loadSelectedTopics();
    state.mode = null;
    document.title = DATA.name + "条文マスター";
    renderTopicScreen();
  }

  function renderSubjectScreen() {
    root.innerHTML = "";
    document.title = "六法条文マスター";
    var panel = el("div", { class: "panel" });
    panel.appendChild(el("h2", { class: "section-title" }, ["科目を選ぶ"]));
    panel.appendChild(el("p", { class: "section-desc" }, ["学習する科目を選択してください。"]));

    var grid = el("div", { class: "mode-grid" });
    var subjects = availableSubjects();
    subjects.forEach(function (s) {
      var totalArticles = s.topics.reduce(function (sum, t) { return sum + t.articles.length; }, 0);
      var card = el("button", {
        class: "mode-card btn subject-card subject-" + s.id,
        onclick: function () { selectSubject(s.id); },
      }, [
        el("div", { class: "mode-name" }, [s.name]),
        el("div", { class: "mode-desc" }, [s.topics.length + "トピック・全" + totalArticles + "か条"]),
      ]);
      grid.appendChild(card);
    });
    panel.appendChild(grid);
    if (subjects.length === 0) {
      panel.appendChild(el("p", { class: "section-desc" }, ["利用可能な科目がありません。"]));
    }
    root.appendChild(panel);
  }

  // ---------- Screen: Topic selection ----------
  function renderTopicScreen() {
    root.innerHTML = "";
    document.title = DATA.name + "条文マスター";
    var panel = el("div", { class: "panel" });
    panel.appendChild(el("div", { class: "toolbar" }, [
      el("button", { class: "quit-link", onclick: renderSubjectScreen }, ["← 科目選択に戻る"]),
    ]));
    panel.appendChild(el("h2", { class: "section-title" }, [DATA.name + "：学習する条文トピックを選ぶ"]));
    var totalArticles = DATA.topics.reduce(function (sum, t) { return sum + t.articles.length; }, 0);
    panel.appendChild(el("p", { class: "section-desc" }, [
      DATA.topics.length + "トピック・全" + totalArticles + "か条を収録。学習したいトピックを選択してください。",
    ]));

    var toolbar = el("div", { class: "toolbar" }, [
      el("button", {
        class: "btn",
        onclick: function () {
          state.selectedTopicIds = DATA.topics.map(function (t) { return t.id; });
          saveSelectedTopics();
          renderTopicScreen();
        },
      }, ["全選択"]),
      el("button", {
        class: "btn",
        onclick: function () {
          state.selectedTopicIds = [];
          saveSelectedTopics();
          renderTopicScreen();
        },
      }, ["全解除"]),
      el("button", {
        class: "btn" + (state.showArticleNumbers ? " selected" : ""),
        onclick: function () {
          state.showArticleNumbers = !state.showArticleNumbers;
          renderTopicScreen();
        },
      }, [state.showArticleNumbers ? "範囲表示に戻す" : "条文番号を表示"]),
    ]);
    panel.appendChild(toolbar);

    var byCategory = {};
    var categoryOrder = [];
    DATA.topics.forEach(function (t) {
      if (byCategory[t.category] === undefined) {
        byCategory[t.category] = [];
        categoryOrder.push(t.category);
      }
      byCategory[t.category].push(t);
    });

    categoryOrder.forEach(function (cat) {
      var group = el("div", { class: "category-group" });
      group.appendChild(el("h3", {}, [cat]));
      var grid = el("div", { class: "topic-grid" });
      byCategory[cat].forEach(function (t) {
        var checked = state.selectedTopicIds.indexOf(t.id) !== -1;
        var chip = el("label", { class: "topic-chip" + (checked ? " checked" : "") }, [
          el("input", {
            type: "checkbox",
            checked: checked ? "checked" : null,
            onchange: function (e) {
              var idx = state.selectedTopicIds.indexOf(t.id);
              if (e.target.checked && idx === -1) state.selectedTopicIds.push(t.id);
              if (!e.target.checked && idx !== -1) state.selectedTopicIds.splice(idx, 1);
              saveSelectedTopics();
              renderTopicScreen();
            },
          }),
          el("span", { class: "topic-chip-text" }, [
            el("span", { class: "topic-chip-name" }, [t.name]),
            el("span", { class: "topic-chip-range" }, [
              state.showArticleNumbers
                ? t.articles.map(function (a) { return a.displayNum; }).join("、")
                : t.range,
            ]),
          ]),
        ]);
        if (checked) chip.querySelector("input").checked = true;
        grid.appendChild(chip);
      });
      group.appendChild(grid);
      panel.appendChild(group);
    });

    root.appendChild(panel);

    var articleCount = selectedArticlesFlat().length;
    var footer = el("div", { class: "panel" });
    footer.appendChild(el("div", { class: "selection-summary" }, [
      "選択中: " + state.selectedTopicIds.length + " トピック / " + articleCount + " か条",
    ]));
    footer.appendChild(el("button", {
      class: "btn btn-primary",
      disabled: articleCount === 0 ? "disabled" : null,
      onclick: function () { renderModeScreen(); },
    }, ["次へ：ゲームを選ぶ"]));
    root.appendChild(footer);
  }

  // ---------- Screen: Mode selection ----------
  function renderModeScreen() {
    root.innerHTML = "";
    var panel = el("div", { class: "panel" });
    panel.appendChild(el("h2", { class: "section-title" }, ["ゲームモードを選ぶ"]));
    panel.appendChild(el("p", { class: "section-desc" }, ["3種類のゲームから選んでください。"]));

    var grid = el("div", { class: "mode-grid" });
    MODES.forEach(function (m) {
      var card = el("button", {
        class: "mode-card btn" + (state.mode === m.id ? " selected" : ""),
        onclick: function () { state.mode = m.id; renderModeScreen(); },
      }, [
        el("div", { class: "mode-name" }, [m.name]),
        el("div", { class: "mode-desc" }, [m.desc]),
      ]);
      grid.appendChild(card);
    });
    panel.appendChild(grid);
    root.appendChild(panel);

    var maxCount = selectedArticlesFlat().length;
    var countPanel = el("div", { class: "panel" });
    countPanel.appendChild(el("h2", { class: "section-title" }, ["出題数"]));
    var options = [10, 20, 30, maxCount].filter(function (n, i, arr) {
      return n > 0 && n <= maxCount && arr.indexOf(n) === i;
    }).sort(function (a, b) { return a - b; });
    var chips = el("div", { class: "count-choices" });
    options.forEach(function (n) {
      var isAll = n === maxCount;
      var chip = el("button", {
        class: "count-chip btn" + (state.questionCount === n ? " selected" : ""),
        onclick: function () { state.questionCount = n; renderModeScreen(); },
      }, [isAll ? "全" + n + "問" : n + "問"]);
      chips.appendChild(chip);
    });
    countPanel.appendChild(chips);
    root.appendChild(countPanel);

    var footer = el("div", { class: "panel" });
    var canStart = !!state.mode && maxCount > 0;
    if (state.questionCount > maxCount) state.questionCount = maxCount;
    footer.appendChild(el("div", { class: "toolbar" }, [
      el("button", { class: "btn", onclick: renderTopicScreen }, ["← トピック選択に戻る"]),
      el("button", {
        class: "btn btn-primary",
        disabled: canStart ? null : "disabled",
        onclick: function () { startQuiz(); },
      }, ["ゲーム開始"]),
    ]));
    root.appendChild(footer);
  }

  // ---------- Quiz generation ----------
  function buildDistractorsForBlank(blank, excludeAnswers) {
    var exclude = [blank.answer].concat(excludeAnswers || []);
    var pool = (DATA.catPool[blank.cat] || []).filter(function (w) {
      return exclude.indexOf(w) === -1;
    });
    if (pool.length < 3) {
      var extra = [];
      Object.keys(DATA.catPool).forEach(function (c) {
        DATA.catPool[c].forEach(function (w) { extra.push(w); });
      });
      extra = extra.filter(function (w) {
        return exclude.indexOf(w) === -1 && pool.indexOf(w) === -1;
      });
      pool = pool.concat(sample(extra, 3 - pool.length));
    }
    return sample(pool, 3);
  }

  function buildQuizQuestion(type, entry, allEntries) {
    var topic = entry.topic;
    var article = entry.article;

    if (type === "fill") {
      var allAnswers = article.blanks.map(function (b) { return b.answer; });
      var blankChoiceSets = article.blanks.map(function (b, i) {
        var siblingAnswers = allAnswers.filter(function (a, j) { return j !== i; });
        var distractors = buildDistractorsForBlank(b, siblingAnswers);
        return {
          answer: b.answer,
          choices: shuffle([b.answer].concat(distractors)),
        };
      });
      return {
        type: "fill",
        topicName: topic.name,
        article: article,
        prompt: article.displayNum + "（" + article.label + "）",
        blanksContextText: article.blanksContextText,
        blankChoiceSets: blankChoiceSets,
      };
    }

    if (type === "link") {
      var siblings = topic.articles.filter(function (a) { return a.num !== article.num; });
      var distractorLabels = sample(
        siblings.map(function (a) { return a.label; }),
        Math.min(3, siblings.length)
      );
      var choiceLabels = shuffle([article.label].concat(distractorLabels));
      var listItems = topic.articles.map(function (a) {
        return {
          displayNum: a.displayNum,
          label: a.num === article.num ? null : a.label,
          isTarget: a.num === article.num,
        };
      });
      return {
        type: "link",
        topicName: topic.name,
        article: article,
        prompt: "「" + topic.name + "」の条文一覧です。" + article.displayNum + "の見出し（？？？の部分）はどれですか？",
        listItems: listItems,
        choices: choiceLabels,
        correct: article.label,
      };
    }

    // guess
    var seenNums = {};
    var others = [];
    allEntries.forEach(function (e) {
      if (e.article.num === article.num || seenNums[e.article.num]) return;
      seenNums[e.article.num] = true;
      others.push(e.article);
    });
    var wrongArticles = sample(others, 3);
    var guessChoices = shuffle([article].concat(wrongArticles));
    return {
      type: "guess",
      topicName: topic.name,
      article: article,
      prompt: "次の条文の内容は、" + DATA.name + "何条ですか？",
      bodyText: article.text,
      choices: guessChoices.map(function (a) { return a.displayNum; }),
      correct: article.displayNum,
    };
  }

  function startQuiz() {
    var entries = selectedArticlesFlat();
    var chosen = sample(entries, state.questionCount);
    state.quiz = chosen.map(function (entry) {
      return buildQuizQuestion(state.mode, entry, entries);
    });
    state.quizIndex = 0;
    state.score = 0;
    state.log = [];
    renderQuizScreen();
  }

  // ---------- Screen: Quiz ----------
  function renderQuizScreen() {
    root.innerHTML = "";
    var q = state.quiz[state.quizIndex];
    var total = state.quiz.length;

    function quitTo(target) {
      if (window.confirm("ゲームを中断しますか？現在の回答状況は破棄されます。")) {
        target();
      }
    }

    var progressWrap = el("div", {});
    progressWrap.appendChild(el("div", { class: "quiz-quit-row" }, [
      el("button", { class: "quit-link", onclick: function () { quitTo(renderModeScreen); } }, ["✕ モード選択に戻る"]),
      el("button", { class: "quit-link", onclick: function () { quitTo(renderTopicScreen); } }, ["✕ トピック選択に戻る"]),
    ]));
    progressWrap.appendChild(el("div", { class: "quiz-progress" }, [
      el("span", {}, ["問題 " + (state.quizIndex + 1) + " / " + total]),
      el("span", {}, ["正解 " + state.score]),
    ]));
    var bar = el("div", { class: "progress-bar" }, [
      el("div", {
        class: "progress-bar-fill",
        style: "width:" + Math.round((state.quizIndex / total) * 100) + "%",
      }),
    ]);
    progressWrap.appendChild(bar);
    root.appendChild(progressWrap);

    var panel = el("div", { class: "panel" });
    panel.appendChild(el("span", { class: "question-tag" }, [q.topicName + " ・ " + modeLabel(q.type)]));
    panel.appendChild(el("div", { class: "question-text" }, [q.prompt]));

    if (q.type === "fill") {
      renderFillBody(panel, q);
      root.appendChild(panel);
      return;
    }

    var bodyNode;
    if (q.type === "link") {
      bodyNode = el("div", { class: "link-list" });
      q.listItems.forEach(function (item) {
        var row = el("div", { class: "link-row" + (item.isTarget ? " link-row-target" : "") }, [
          el("span", { class: "link-row-num" }, [item.displayNum]),
          el("span", { class: "link-row-label" }, [item.isTarget ? "？？？" : item.label]),
        ]);
        bodyNode.appendChild(row);
      });
    } else {
      bodyNode = el("div", { class: "question-text" }, [q.bodyText]);
    }
    panel.appendChild(bodyNode);

    var choiceList = el("div", { class: "choice-list" });
    var answered = false;
    var feedbackHolder = el("div");

    q.choices.forEach(function (choice) {
      var btn = el("button", {
        class: "choice-btn btn",
        onclick: function () {
          if (answered) return;
          answered = true;
          var isCorrect = choice === q.correct;
          if (isCorrect) state.score++;
          state.log.push({ q: q, chosen: choice, correct: q.correct, isCorrect: isCorrect });

          Array.prototype.forEach.call(choiceList.children, function (b) {
            b.disabled = true;
            var label = b.getAttribute("data-choice");
            if (label === q.correct) b.classList.add("correct");
            else if (label === choice && !isCorrect) b.classList.add("wrong");
          });

          feedbackHolder.innerHTML = "";
          feedbackHolder.appendChild(buildFeedback(q, isCorrect));
        },
      }, [choice]);
      btn.setAttribute("data-choice", choice);
      choiceList.appendChild(btn);
    });

    panel.appendChild(choiceList);
    panel.appendChild(feedbackHolder);
    root.appendChild(panel);
  }

  var CIRCLED_NUMS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

  function renderFillBody(panel, q) {
    var textNode = el("div", { class: "question-text" });
    var parts = q.blanksContextText.split(/§(\d+)§/);
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        if (parts[i]) textNode.appendChild(document.createTextNode(parts[i]));
      } else {
        var n = parseInt(parts[i], 10);
        textNode.appendChild(el("span", { class: "blank-mark" }, [CIRCLED_NUMS[n - 1] || "?"]));
      }
    }
    panel.appendChild(textNode);

    var answered = q.blankChoiceSets.map(function () { return false; });
    var chosenAnswers = q.blankChoiceSets.map(function () { return null; });
    var feedbackHolder = el("div");

    var groupsWrap = el("div", { class: "fill-groups" });
    q.blankChoiceSets.forEach(function (set, idx) {
      var groupWrap = el("div", { class: "fill-group" });
      groupWrap.appendChild(el("div", { class: "fill-group-label" }, [CIRCLED_NUMS[idx] || String(idx + 1)]));
      var choiceList = el("div", { class: "choice-list" });
      set.choices.forEach(function (choice) {
        var btn = el("button", {
          class: "choice-btn btn",
          onclick: function () {
            if (answered[idx]) return;
            answered[idx] = true;
            chosenAnswers[idx] = choice;
            var isCorrect = choice === set.answer;

            Array.prototype.forEach.call(choiceList.children, function (b) {
              b.disabled = true;
              var label = b.getAttribute("data-choice");
              if (label === set.answer) b.classList.add("correct");
              else if (label === choice && !isCorrect) b.classList.add("wrong");
            });

            if (answered.every(function (a) { return a; })) {
              finishFillQuestion();
            }
          },
        }, [choice]);
        btn.setAttribute("data-choice", choice);
        choiceList.appendChild(btn);
      });
      groupWrap.appendChild(choiceList);
      groupsWrap.appendChild(groupWrap);
    });
    panel.appendChild(groupsWrap);
    panel.appendChild(feedbackHolder);

    function finishFillQuestion() {
      var allCorrect = q.blankChoiceSets.every(function (set, idx) {
        return chosenAnswers[idx] === set.answer;
      });
      if (allCorrect) state.score++;
      state.log.push({
        q: q,
        chosen: chosenAnswers.join("、"),
        correct: q.blankChoiceSets.map(function (s) { return s.answer; }).join("、"),
        isCorrect: allCorrect,
      });
      feedbackHolder.appendChild(buildFeedback(q, allCorrect));
    }
  }

  function modeLabel(type) {
    if (type === "fill") return "穴埋め";
    if (type === "link") return "関連付け";
    return "条文番号あて";
  }

  function buildFeedback(q, isCorrect) {
    var wrap = el("div", { class: "feedback-panel" });
    wrap.appendChild(el("div", { class: "ref", style: "color:" + (isCorrect ? "var(--correct)" : "var(--wrong)") }, [
      (isCorrect ? "○ 正解！ " : "× 不正解 ") + q.article.displayNum + "（" + q.article.label + "）",
    ]));
    wrap.appendChild(el("div", { style: "white-space:pre-wrap" }, [q.article.text]));

    var nextRow = el("div", { class: "next-btn-row" });
    var isLast = state.quizIndex >= state.quiz.length - 1;
    nextRow.appendChild(el("button", {
      class: "btn btn-primary",
      onclick: function () {
        if (isLast) {
          renderResultScreen();
        } else {
          state.quizIndex++;
          renderQuizScreen();
        }
      },
    }, [isLast ? "結果を見る" : "次の問題へ"]));
    wrap.appendChild(nextRow);
    return wrap;
  }

  // ---------- Screen: Result ----------
  function renderResultScreen() {
    root.innerHTML = "";
    var total = state.quiz.length;
    var panel = el("div", { class: "panel" });
    panel.appendChild(el("div", { class: "score-hero" }, [
      el("div", { class: "score-num" }, [state.score + " / " + total]),
      el("div", { class: "score-total" }, [Math.round((state.score / total) * 100) + "% 正解"]),
    ]));

    var wrongs = state.log.filter(function (l) { return !l.isCorrect; });
    if (wrongs.length > 0) {
      panel.appendChild(el("h2", { class: "section-title" }, ["復習: 間違えた問題"]));
      var list = el("div", { class: "review-list" });
      wrongs.forEach(function (l) {
        list.appendChild(el("div", { class: "review-item" }, [
          el("div", { class: "ref" }, [l.q.article.displayNum + "（" + l.q.article.label + "）"]),
          el("div", {}, [
            el("span", { class: "your-answer" }, ["あなたの回答: " + l.chosen]),
            document.createTextNode("　"),
            el("span", { class: "right-answer" }, ["正解: " + l.correct]),
          ]),
        ]));
      });
      panel.appendChild(list);
    } else {
      panel.appendChild(el("p", { class: "section-desc" }, ["全問正解です！お見事。"]));
    }

    var backRow = el("div", { class: "back-row" }, [
      el("button", { class: "btn btn-primary", onclick: function () { startQuiz(); } }, ["もう一度同じ設定で挑戦"]),
      el("button", { class: "btn", onclick: renderModeScreen }, ["モード選択に戻る"]),
      el("button", { class: "btn", onclick: renderTopicScreen }, ["トピック選択に戻る"]),
      el("button", { class: "btn", onclick: renderSubjectScreen }, ["科目選択に戻る"]),
    ]);
    panel.appendChild(backRow);

    root.appendChild(panel);
  }

  renderSubjectScreen();
})();
