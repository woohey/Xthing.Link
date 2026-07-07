import { ROUTES } from './routes';

type ProjectLike = {
  id: string;
  data: {
    deployType?: string;
    demoSlug?: string;
    demoUrl?: string;
    repoUrl?: string;
    stack?: string[];
    tags?: string[];
    status?: string;
  };
};

const STATUS_LABELS: Record<string, string> = {
  idea: '构想中',
  wip: '进行中',
  shipped: '已发布',
};

const DEPLOY_LABELS: Record<string, string> = {
  'static-deployed': '独立部署',
  embedded: '站内演示',
  'github-only': '代码仓库',
  planned: '规划中',
};

const TAG_LABELS: Record<string, string> = {
  ai: 'AI',
  biotope: '原生生境',
  dashboard: '仪表盘',
  iot: 'IoT',
  'knowledge-graph': '知识图谱',
  literature: '文学阅读',
  reading: '阅读伴侣',
  visualization: '可视化',
};

const TECH_TAGS = new Set([
  'astro',
  'charts',
  'flask',
  'jinja2',
  'minimax',
  'python',
  'react',
  'typescript',
  'vite',
  'vitest',
]);

function external(url: string) {
  return /^https?:\/\//.test(url);
}

export function statusLabel(status?: string) {
  return status ? STATUS_LABELS[status] ?? status : null;
}

export function deployLabel(deployType?: string) {
  return deployType ? DEPLOY_LABELS[deployType] ?? deployType : null;
}

export function displayStack(project: ProjectLike) {
  return project.data.stack ?? [];
}

export function displayTopicTags(project: ProjectLike) {
  return (project.data.tags ?? [])
    .filter((tag) => !TECH_TAGS.has(tag.toLowerCase()))
    .map((tag) => TAG_LABELS[tag.toLowerCase()] ?? tag);
}

export function projectDetailHref(project: ProjectLike) {
  return `${ROUTES.works}/${project.id}/`;
}

export function projectExperienceUrl(project: ProjectLike) {
  if (project.id === 'aquaworld') return '/Aquaworld/';

  if (project.data.deployType === 'embedded') {
    return `${ROUTES.demos}/${project.data.demoSlug || project.id}/`;
  }

  if (project.data.deployType === 'static-deployed') {
    return project.data.demoUrl ?? null;
  }

  return null;
}

export function projectActions(project: ProjectLike) {
  const actions = [
    {
      label: '详情',
      href: projectDetailHref(project),
      external: false,
      tone: 'secondary',
    },
  ];

  const experienceUrl = projectExperienceUrl(project);
  if (experienceUrl) {
    actions.push({
      label: project.data.deployType === 'embedded' ? '交互演示' : '在线体验',
      href: experienceUrl,
      external: external(experienceUrl),
      tone: 'accent',
    });
  }

  if (project.data.repoUrl) {
    actions.push({
      label: 'GitHub',
      href: project.data.repoUrl,
      external: true,
      tone: 'secondary',
    });
  }

  return actions;
}
