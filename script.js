const modeButtons = document.querySelectorAll('.mode-btn');
const panels = {
  prepare: document.querySelector('#prepare-panel'),
  review: document.querySelector('#review-panel'),
};

const prepareForm = document.querySelector('#prepare-form');
const prepareResult = document.querySelector('#prepare-result');
const prepareQuestionGroups = document.querySelector('#prepare-question-groups');

const reviewForm = document.querySelector('#review-form');
const transcriptInput = document.querySelector('#transcript');
const jdInput = document.querySelector('#jd');
const roleInput = document.querySelector('#interviewer-role');
const resultSection = document.querySelector('#result');
const scoreOutput = document.querySelector('#score');
const issueList = document.querySelector('#issue-list');
const adviceList = document.querySelector('#advice-list');
const roleFocusList = document.querySelector('#role-focus-list');
const templateOutput = document.querySelector('#template-output');

const transcriptFile = document.querySelector('#transcript-file');
const jdFile = document.querySelector('#jd-file');

modeButtons.forEach((button) => {
  button.addEventListener('click', () => switchMode(button.dataset.mode));
});

bindFileReader(transcriptFile, transcriptInput, '#transcript-file-name');
bindFileReader(jdFile, jdInput, '#jd-file-name');

prepareForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const projects = document.querySelector('#project-experience').value.trim();
  const jobBackground = document.querySelector('#job-background').value.trim();
  const details = document.querySelector('#prepare-details').value.trim();
  const depthLevel = Number(document.querySelector('#depth-level').value);

  const groups = generatePrepareQuestions({
    projects,
    jobBackground,
    details,
    depthLevel,
  });

  renderPrepareQuestions(groups);
  prepareResult.classList.remove('hidden');
  prepareResult.scrollIntoView({ behavior: 'smooth' });
});

reviewForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const transcript = transcriptInput.value.trim();
  const jd = jdInput.value.trim();
  const role = roleInput.value;
  const strictMode = document.querySelector('#strict-mode').checked;
  const needNetworkBenchmark = document.querySelector('#need-network-benchmark').checked;

  const report = localAnalyze({
    transcript,
    jd,
    role,
    strictMode,
    needNetworkBenchmark,
  });

  renderReviewReport(report);
  resultSection.classList.remove('hidden');
  resultSection.scrollIntoView({ behavior: 'smooth' });
});

function switchMode(mode) {
  modeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === mode);
  });

  Object.entries(panels).forEach(([panelMode, panel]) => {
    panel.classList.toggle('hidden', panelMode !== mode);
  });
}

function bindFileReader(fileInput, targetTextarea, fileNameSelector) {
  const fileNameNode = document.querySelector(fileNameSelector);

  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    fileNameNode.textContent = `已加载：${file.name}`;
    const text = await file.text();
    targetTextarea.value = text;
  });
}

function generatePrepareQuestions({ projects, jobBackground, details, depthLevel }) {
  const projectItems = projects
    .split(/\n+/)
    .map((line) => line.replace(/^[-•\d.\s]+/, '').trim())
    .filter(Boolean);

  const fallbackProject = '你最近最能体现价值的核心项目';
  const finalProjects = projectItems.length ? projectItems : [fallbackProject];

  const keySkills = extractTopKeywords(`${jobBackground} ${details}`, 6);
  const backgroundHint = keySkills.length ? `（岗位重点：${keySkills.join('、')}）` : '';

  return finalProjects.map((project) => buildQuestionLayers(project, keySkills, backgroundHint, depthLevel));
}

function buildQuestionLayers(project, keySkills, backgroundHint, depthLevel) {
  const skillA = keySkills[0] || '业务理解';
  const skillB = keySkills[1] || '数据分析';
  const skillC = keySkills[2] || '跨团队协作';

  const layers = [
    {
      title: 'L1｜基础还原（你做了什么）',
      approach:
        '回答思路：用 STAR 快速搭建主线。先一句话给结论，再讲背景与目标，重点突出你的职责边界，最后用 1-2 个结果指标收尾。',
      questions: [
        `请用 1 分钟介绍项目“${project}”的背景、目标、你的角色与结果。${backgroundHint}`,
        `这个项目最关键的成功指标是什么？为什么选它，而不是其他指标？`,
        `你在项目中最核心的 2-3 个动作分别是什么？`,
      ],
    },
    {
      title: 'L2｜能力验证（你为什么能做成）',
      approach:
        '回答思路：围绕“判断依据 + 方法动作 + 结果证明”来讲，不只说做了什么，更要说为什么这么做，以及如何验证做对了。',
      questions: [
        `围绕“${skillA}”，你做过最有效的一次判断是什么？依据是什么？`,
        `围绕“${skillB}”，你如何定义问题并验证方案有效？`,
        `如果把这个项目交给别人复刻，哪些方法可以被标准化沉淀？`,
      ],
    },
    {
      title: 'L3｜压力追问（你如何处理复杂情况）',
      approach:
        '回答思路：先给出当时的约束条件（资源/时间/冲突），再说明你的取舍逻辑与推进动作，最后讲结果和复盘，让面试官看到抗压与 owner 意识。',
      questions: [
        `项目推进中遇到最大阻力是什么？你如何拆解并推动各方达成一致？（重点看 ${skillC}）`,
        '如果资源被砍掉 30%，你会怎么做优先级重排？哪些目标必须保、哪些可降级？',
        '请讲一个“差点失败”的时刻：你如何补救、复盘后改了什么机制？',
      ],
    },
    {
      title: 'L4｜迁移与战略（你是否可持续复用）',
      approach:
        '回答思路：把项目经验抽象成方法论，再落到新场景的执行路径。建议用“90 天计划 + 里程碑 + 风险预案”来体现战略视角。',
      questions: [
        '如果入职后让你在 90 天内复制这类成果，你会如何制定路线图与里程碑？',
        '这个项目中你沉淀了哪些可迁移的方法论？在新业务里会如何调整？',
        '站在更高视角，这个项目对业务长期竞争力的意义是什么？',
      ],
    },
  ];

  return {
    project,
    layers: layers.slice(0, depthLevel),
  };
}

function renderPrepareQuestions(groups) {
  prepareQuestionGroups.innerHTML = '';

  groups.forEach((group) => {
    const wrapper = document.createElement('article');
    wrapper.className = 'question-group';

    const heading = document.createElement('h4');
    heading.textContent = `项目：${group.project}`;
    wrapper.appendChild(heading);

    group.layers.forEach((layer) => {
      const layerTitle = document.createElement('h5');
      layerTitle.textContent = layer.title;
      wrapper.appendChild(layerTitle);

      const approach = document.createElement('p');
      approach.className = 'layer-approach';
      approach.textContent = layer.approach;
      wrapper.appendChild(approach);

      const ul = document.createElement('ul');
      layer.questions.forEach((question) => {
        const li = document.createElement('li');
        li.textContent = question;
        ul.appendChild(li);
      });

      wrapper.appendChild(ul);
    });

    prepareQuestionGroups.appendChild(wrapper);
  });
}

function extractTopKeywords(text, topN) {
  const stopWords = new Set(['负责', '需要', '以及', '我们', '你们', '这个', '那个', '进行', '相关', '经验', '能力']);
  const freq = new Map();

  tokenize(text)
    .filter((word) => word.length >= 2 && !stopWords.has(word))
    .forEach((word) => {
      freq.set(word, (freq.get(word) || 0) + 1);
    });

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

function localAnalyze({ transcript, jd, role, strictMode, needNetworkBenchmark }) {
  const transcriptLength = transcript.length;
  const shortAnswer = transcriptLength < 180;
  const tooManyFillers = countMatches(transcript, ['然后', '就是', '那个', '嗯', '可能']) >= 10;
  const lacksData = countMatches(transcript, ['%', '增长', '转化', '成本', 'ROI', '留存']) <= 1;
  const weakStructure = !containsAny(transcript, ['背景', '目标', '行动', '结果', 'STAR', '复盘']);
  const lowJDAlignment = calculateJDAlignment(transcript, jd) < 0.28;

  const issues = [];
  const advice = [];

  if (shortAnswer) {
    issues.push('回答内容偏短，信息密度不足，难以体现完整能力闭环。');
    advice.push('每个关键问题用“背景-目标-行动-结果（STAR）”至少讲 60~90 秒。');
  }

  if (tooManyFillers) {
    issues.push('口头填充词较多，可能影响表达专业感。');
    advice.push('先给结论再展开，句间留 0.5 秒停顿替代“嗯、就是”等口头词。');
  }

  if (lacksData) {
    issues.push('量化证据不足，业务影响不够具体。');
    advice.push('补充 2~3 个核心指标（如转化率、成本、效率、满意度）与前后对比。');
  }

  if (weakStructure) {
    issues.push('回答结构不稳定，重点不够突出。');
    advice.push('先用一句话结论，再按 STAR 顺序展开，最后补充复盘与迁移能力。');
  }

  if (lowJDAlignment) {
    issues.push('与岗位 JD 的关键词匹配度偏低，可能让面试官感知“对岗性”不足。');
    advice.push('将 JD 的高频能力词（如协同、增长、项目管理）映射到过往案例。');
  }

  if (needNetworkBenchmark) {
    issues.push('对常见面试追问准备可能不足（如失败案例、优先级冲突、跨部门分歧）。');
    advice.push('提前准备“失败复盘 + 冲突沟通 + 资源受限”三类高频追问的标准答案。');
  }

  if (!issues.length) {
    issues.push('未发现明显短板，整体回答较完整。');
    advice.push('进一步加强数字化成果描述与岗位关键词复用，提升说服力。');
  }

  const scoreBase = 88 - issues.length * (strictMode ? 8 : 6);
  const score = Math.max(45, Math.min(95, scoreBase));

  return {
    score,
    issues,
    advice,
    roleFocus: getRoleFocus(role),
    talkTemplate: buildTemplate(role),
  };
}

function calculateJDAlignment(transcript, jd) {
  const jdKeywords = tokenize(jd).filter((w) => w.length >= 2);
  if (!jdKeywords.length) return 0.5;

  const transcriptTokens = new Set(tokenize(transcript));
  const matched = jdKeywords.filter((word) => transcriptTokens.has(word)).length;
  return matched / jdKeywords.length;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\u4e00-\u9fa5]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function countMatches(text, keywords) {
  return keywords.reduce(
    (total, keyword) => total + ((text.match(new RegExp(keyword, 'g')) || []).length),
    0,
  );
}

function containsAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function getRoleFocus(role) {
  if (role === '业务Leader') {
    return [
      '重点突出“业务结果”：你做的动作如何直接影响收入、效率或用户价值。',
      '展示优先级判断：在资源有限时如何取舍。',
      '补充战略理解：短期目标与长期方向如何统一。',
    ];
  }

  if (role === '跨部门同事') {
    return [
      '强调协作接口：你如何定义边界、同步节奏与风险。',
      '体现沟通效率：分歧出现时，你如何达成共识。',
      '多用“共同目标”语言，避免只强调单部门 KPI。',
    ];
  }

  return [
    '突出稳定性与价值观匹配：动机、抗压、职业规划是否一致。',
    '表达组织适配：你偏好的管理/协作方式与团队文化如何匹配。',
    '注意逻辑与礼貌：回答简洁、正向，不抱怨前团队。',
  ];
}

function buildTemplate(role) {
  const roleTail =
    role === '业务Leader'
      ? '这次经历让我更清楚业务杠杆在哪里，也验证了我能在不确定环境下拿结果。'
      : role === '跨部门同事'
        ? '这次经历也让我沉淀出跨团队推进的方法，后续可以快速复制到类似项目。'
        : '这次经历让我更确定自己的职业方向，也更清楚我能为团队带来的长期价值。';

  return `【可直接使用的话术】\n
针对这个问题，我先给结论：我能在目标不清晰、资源有限的情况下，把项目推进到可量化结果。\n
背景：当时我们面临 ...\n目标：核心目标是 ...（指标：...）\n行动：我主要做了三件事，分别是 ...\n结果：最终达成 ...（建议给出2-3个数字）\n复盘：如果再做一次，我会在 ... 环节前置优化。\n
${roleTail}`;
}

function renderReviewReport(report) {
  scoreOutput.textContent = `${report.score} / 100`;
  renderList(issueList, report.issues);
  renderList(adviceList, report.advice);
  renderList(roleFocusList, report.roleFocus);
  templateOutput.textContent = report.talkTemplate;
}

function renderList(listNode, items) {
  listNode.innerHTML = '';
  items.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    listNode.appendChild(li);
  });
}
