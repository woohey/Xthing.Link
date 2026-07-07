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
  archive: '历史归档',
  aquatics: '水族生态',
  attendance: '考勤',
  biotope: '原生生境',
  community: '社区',
  dashboard: '仪表盘',
  iot: 'IoT',
  'knowledge-graph': '知识图谱',
  labor: '蓝领用工',
  literature: '文学阅读',
  'mobile-app': '移动应用',
  reading: '阅读伴侣',
  recruiting: '招聘',
  'smart-hardware': '智能硬件',
  startup: '创业项目',
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

export function deployLabel(deployType?: string, tags: string[] = []) {
  const normalizedTags = tags.map((tag) => tag.toLowerCase());
  if (deployType === 'planned' && normalizedTags.includes('archive')) {
    return '历史归档';
  }

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

export function projectHeroAsset(project: ProjectLike) {
  if (project.id === '8bees') {
    return {
      src: '/media/8bees/logo.png',
      alt: '8Bees Logo',
    };
  }

  if (project.id === 'aquasmart') {
    return {
      src: '/media/aquasmart/logo.png',
      alt: 'AquaSmart Logo',
    };
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
