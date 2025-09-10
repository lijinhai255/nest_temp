/**
 * 性能指标定义
 * 包含各种Web性能指标的定义、分段标准以及优化建议
 */

// 性能指标及其分段标准
const PERFORMANCE_METRICS = {
  // 首次内容绘制 (First Contentful Paint)
  FCP: {
    name: '首次内容绘制',
    description: '页面从开始加载到页面内容的任何部分在屏幕上完成渲染的时间',
    thresholds: [
      { range: '0-1.8s', rating: '良好', color: '#0CCE6B' },
      { range: '1.8-3s', rating: '需要改进', color: '#FFA400' },
      { range: '3s+', rating: '较差', color: '#FF4E42' }
    ],
    optimizationTips: [
      '减少关键资源的数量和大小',
      '优化CSS加载，避免阻塞渲染',
      '使用服务端渲染(SSR)或静态站点生成(SSG)',
      '优化服务器响应时间',
      '实现关键CSS内联'
    ]
  },
  
  // 最大内容绘制 (Largest Contentful Paint)
  LCP: {
    name: '最大内容绘制',
    description: '视口内可见的最大图像或文本块完成渲染的时间',
    thresholds: [
      { range: '0-2.5s', rating: '良好', color: '#0CCE6B' },
      { range: '2.5-4s', rating: '需要改进', color: '#FFA400' },
      { range: '4s+', rating: '较差', color: '#FF4E42' }
    ],
    optimizationTips: [
      '优化最大内容元素(通常是图像或视频)',
      '实现图片懒加载，但确保关键图像立即加载',
      '优化图片格式和大小，考虑使用WebP等现代格式',
      '使用CDN加速资源加载',
      '优化服务器响应时间',
      '预加载重要资源'
    ]
  },
  
  // 首次输入延迟 (First Input Delay)
  FID: {
    name: '首次输入延迟',
    description: '用户首次与页面交互到浏览器实际能够响应该交互的时间',
    thresholds: [
      { range: '0-100ms', rating: '良好', color: '#0CCE6B' },
      { range: '100-300ms', rating: '需要改进', color: '#FFA400' },
      { range: '300ms+', rating: '较差', color: '#FF4E42' }
    ],
    optimizationTips: [
      '减少JavaScript执行时间',
      '拆分长任务（>50ms）',
      '优化第三方脚本的加载',
      '使用Web Workers处理复杂计算',
      '延迟加载非关键JavaScript',
      '移除未使用的JavaScript代码'
    ]
  },
  
  // 累积布局偏移 (Cumulative Layout Shift)
  CLS: {
    name: '累积布局偏移',
    description: '页面加载过程中元素意外移动的总和',
    thresholds: [
      { range: '0-0.1', rating: '良好', color: '#0CCE6B' },
      { range: '0.1-0.25', rating: '需要改进', color: '#FFA400' },
      { range: '0.25+', rating: '较差', color: '#FF4E42' }
    ],
    optimizationTips: [
      '为图像和视频元素指定尺寸属性',
      '为广告、嵌入和iframe预留空间',
      '避免在现有内容上方插入内容',
      '优先使用transform动画，而非影响布局的属性',
      '避免使用网络字体导致FOIT/FOUT',
      '使用固定大小的占位符加载动态内容'
    ]
  },
  
  // 交互到可用时间 (Time to Interactive)
  TTI: {
    name: '交互到可用时间',
    description: '页面完全可交互所需的时间',
    thresholds: [
      { range: '0-3.8s', rating: '良好', color: '#0CCE6B' },
      { range: '3.8-7.3s', rating: '需要改进', color: '#FFA400' },
      { range: '7.3s+', rating: '较差', color: '#FF4E42' }
    ],
    optimizationTips: [
      '最小化主线程工作',
      '减少JavaScript执行时间',
      '延迟加载非必要的JavaScript',
      '移除未使用的代码',
      '采用代码分割技术',
      '优化第三方脚本'
    ]
  },
  
  // 速度指数 (Speed Index)
  SI: {
    name: '速度指数',
    description: '页面内容填充的速度，衡量视觉上完成加载的速度',
    thresholds: [
      { range: '0-3.4s', rating: '良好', color: '#0CCE6B' },
      { range: '3.4-5.8s', rating: '需要改进', color: '#FFA400' },
      { range: '5.8s+', rating: '较差', color: '#FF4E42' }
    ],
    optimizationTips: [
      '优化关键渲染路径',
      '减少页面资源的数量和大小',
      '优化图像加载策略',
      '实现渐进式渲染',
      '使用骨架屏(Skeleton Screens)',
      '优先加载可视区域内容'
    ]
  },
  
  // 首字节时间 (Time to First Byte)
  TTFB: {
    name: '首字节时间',
    description: '从用户请求页面到接收到第一个字节的时间',
    thresholds: [
      { range: '0-800ms', rating: '良好', color: '#0CCE6B' },
      { range: '800-1800ms', rating: '需要改进', color: '#FFA400' },
      { range: '1800ms+', rating: '较差', color: '#FF4E42' }
    ],
    optimizationTips: [
      '优化服务器性能',
      '实现有效的缓存策略',
      '使用CDN',
      '优化数据库查询',
      '减少重定向',
      '使用HTTP/2或HTTP/3',
      '优化DNS解析时间'
    ]
  },
  
  // 完全加载时间 (Total Load Time)
  TLT: {
    name: '完全加载时间',
    description: '页面完全加载所需的总时间',
    thresholds: [
      { range: '0-5s', rating: '良好', color: '#0CCE6B' },
      { range: '5-8s', rating: '需要改进', color: '#FFA400' },
      { range: '8s+', rating: '较差', color: '#FF4E42' }
    ],
    optimizationTips: [
      '优化和压缩资源',
      '实现资源的懒加载',
      '减少HTTP请求数量',
      '使用浏览器缓存',
      '优化第三方资源',
      '使用资源提示（如preload、prefetch）',
      '实现代码分割'
    ]
  },
  
  // 总阻塞时间 (Total Blocking Time)
  TBT: {
    name: '总阻塞时间',
    description: 'FCP和TTI之间所有长任务（超过50ms）阻塞主线程的总时间',
    thresholds: [
      { range: '0-200ms', rating: '良好', color: '#0CCE6B' },
      { range: '200-600ms', rating: '需要改进', color: '#FFA400' },
      { range: '600ms+', rating: '较差', color: '#FF4E42' }
    ],
    optimizationTips: [
      '减少主线程工作量',
      '优化JavaScript执行',
      '拆分长任务',
      '延迟加载非关键JavaScript',
      '使用Web Workers处理复杂计算',
      '减少第三方脚本的影响',
      '实现代码分割'
    ]
  }
};

export default PERFORMANCE_METRICS;